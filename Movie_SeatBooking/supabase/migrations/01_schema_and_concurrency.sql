-- ============================================================================
-- RVU CAMPUS CINEMA PLATFORM - DATABASE SCHEMA & CONCURRENCY ENGINE
-- 7 Rows x 10 Columns Continuous Tiered Layout (70 Seats per Showtime)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DROP FUNCTION IF EXISTS acquire_seat_locks(UUID, UUID[], UUID, INT);
DROP FUNCTION IF EXISTS release_seat_locks(UUID[], UUID);
DROP FUNCTION IF EXISTS confirm_booking_atomic(UUID, UUID[], UUID, TEXT, TEXT, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS confirm_booking_atomic(UUID, UUID[], UUID, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS verify_ticket_atomic(TEXT, TEXT);
DROP FUNCTION IF EXISTS get_showtime_seats(UUID, UUID);

DROP TABLE IF EXISTS booking_seats CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS seats CASCADE;
DROP TABLE IF EXISTS showtimes CASCADE;
DROP TABLE IF EXISTS movies CASCADE;

-- Table: movies
CREATE TABLE movies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    tagline TEXT,
    description TEXT NOT NULL,
    poster_url TEXT NOT NULL,
    backdrop_url TEXT NOT NULL,
    trailer_url TEXT,
    duration_mins INT NOT NULL CHECK (duration_mins > 0),
    genre TEXT NOT NULL,
    age_rating TEXT NOT NULL DEFAULT 'UA',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Table: showtimes
CREATE TABLE showtimes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    auditorium_name TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    price_regular NUMERIC(10,2) NOT NULL DEFAULT 150.00,
    price_vip NUMERIC(10,2) NOT NULL DEFAULT 250.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Table: seats (70 seats: Rows A-G, Columns 1-10)
CREATE TABLE seats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    showtime_id UUID NOT NULL REFERENCES showtimes(id) ON DELETE CASCADE,
    row_label CHAR(1) NOT NULL,
    col_number INT NOT NULL CHECK (col_number > 0 AND col_number <= 10),
    seat_tier TEXT NOT NULL DEFAULT 'regular' CHECK (seat_tier IN ('regular', 'vip')),
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'locked', 'booked')),
    locked_until TIMESTAMPTZ,
    locked_by_session UUID,
    CONSTRAINT uq_seat_showtime_position UNIQUE(showtime_id, row_label, col_number)
);

-- Table: bookings
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    showtime_id UUID NOT NULL REFERENCES showtimes(id) ON DELETE RESTRICT,
    booking_mode TEXT NOT NULL DEFAULT 'individual' CHECK (booking_mode IN ('individual', 'group')),
    user_name TEXT NOT NULL,
    usn TEXT NOT NULL,
    rvu_email TEXT NOT NULL,
    total_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    ticket_hash TEXT NOT NULL UNIQUE,
    attendees JSONB DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
    checked_in_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Table: booking_seats
CREATE TABLE booking_seats (
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    seat_id UUID NOT NULL REFERENCES seats(id) ON DELETE RESTRICT,
    seat_price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    PRIMARY KEY (booking_id, seat_id)
);

-- Indexes
CREATE INDEX idx_seats_showtime_status ON seats(showtime_id, status);
CREATE INDEX idx_seats_locked_until ON seats(locked_until) WHERE status = 'locked';
CREATE INDEX idx_seats_lookup ON seats(showtime_id, row_label, col_number);
CREATE INDEX idx_bookings_ticket_hash ON bookings(ticket_hash);
CREATE INDEX idx_bookings_usn ON bookings(usn);
CREATE INDEX idx_bookings_showtime ON bookings(showtime_id);
CREATE INDEX idx_showtimes_movie_time ON showtimes(movie_id, start_time);

-- ----------------------------------------------------------------------------
-- Concurrency RPC Functions
-- ----------------------------------------------------------------------------

-- A. GET SHOWTIME SEATS (With Lazy Lock Expiration)
CREATE OR REPLACE FUNCTION get_showtime_seats(
    p_showtime_id UUID,
    p_session_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    showtime_id UUID,
    row_label CHAR(1),
    col_number INT,
    seat_tier TEXT,
    raw_status TEXT,
    effective_status TEXT,
    locked_until TIMESTAMPTZ,
    is_my_lock BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.showtime_id,
        s.row_label,
        s.col_number,
        s.seat_tier,
        s.status AS raw_status,
        CASE 
            WHEN s.status = 'booked' THEN 'booked'
            WHEN s.status = 'locked' AND s.locked_until >= clock_timestamp() THEN 
                CASE 
                    WHEN p_session_id IS NOT NULL AND s.locked_by_session = p_session_id THEN 'selected_by_me'
                    ELSE 'locked_by_other'
                END
            ELSE 'available'
        END AS effective_status,
        s.locked_until,
        (p_session_id IS NOT NULL AND s.status = 'locked' AND s.locked_by_session = p_session_id AND s.locked_until >= clock_timestamp()) AS is_my_lock
    FROM seats s
    WHERE s.showtime_id = p_showtime_id
    ORDER BY s.row_label ASC, s.col_number ASC;
END;
$$;


-- B. ACQUIRE SEAT LOCKS (Strict 5-minute atomic lock with individual/group quota guard)
CREATE OR REPLACE FUNCTION acquire_seat_locks(
    p_showtime_id UUID,
    p_seat_ids UUID[],
    p_session_id UUID,
    p_hold_seconds INT DEFAULT 300
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_locked_count INT;
    v_requested_count INT;
    v_conflict_count INT;
    v_new_expiry TIMESTAMPTZ;
BEGIN
    v_requested_count := array_length(p_seat_ids, 1);
    IF v_requested_count IS NULL OR v_requested_count = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'No seats specified');
    END IF;

    -- Quota guard: max 4 seats per reservation
    IF v_requested_count > 4 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Maximum 4 seats allowed per reservation');
    END IF;

    IF p_session_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Valid session ID required');
    END IF;

    v_new_expiry := clock_timestamp() + (p_hold_seconds || ' seconds')::INTERVAL;

    -- 1. Lock rows in deterministic sorted order
    PERFORM id
    FROM seats
    WHERE id = ANY(p_seat_ids)
      AND showtime_id = p_showtime_id
    ORDER BY id
    FOR UPDATE;

    -- 2. Verify all exist
    SELECT COUNT(*) INTO v_locked_count
    FROM seats
    WHERE id = ANY(p_seat_ids)
      AND showtime_id = p_showtime_id;

    IF v_locked_count <> v_requested_count THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'One or more selected seats do not exist for this screening'
        );
    END IF;

    -- 3. Check conflicts (booked OR locked by other unexpired)
    SELECT COUNT(*) INTO v_conflict_count
    FROM seats
    WHERE id = ANY(p_seat_ids)
      AND showtime_id = p_showtime_id
      AND (
          status = 'booked'
          OR (status = 'locked' AND locked_until >= clock_timestamp() AND locked_by_session <> p_session_id)
      );

    IF v_conflict_count > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'One or more seats have just been reserved or booked by another student',
            'conflict_count', v_conflict_count
        );
    END IF;

    -- 4. Update to locked
    UPDATE seats
    SET status = 'locked',
        locked_by_session = p_session_id,
        locked_until = v_new_expiry
    WHERE id = ANY(p_seat_ids)
      AND showtime_id = p_showtime_id;

    RETURN jsonb_build_object(
        'success', true,
        'locked_count', v_requested_count,
        'locked_until', v_new_expiry,
        'session_id', p_session_id
    );
END;
$$;


-- C. RELEASE SEAT LOCKS
CREATE OR REPLACE FUNCTION release_seat_locks(
    p_seat_ids UUID[],
    p_session_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_released_count INT;
BEGIN
    IF p_session_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Session ID required');
    END IF;

    PERFORM id
    FROM seats
    WHERE id = ANY(p_seat_ids)
      AND locked_by_session = p_session_id
      AND status = 'locked'
    FOR UPDATE;

    UPDATE seats
    SET status = 'available',
        locked_by_session = NULL,
        locked_until = NULL
    WHERE id = ANY(p_seat_ids)
      AND locked_by_session = p_session_id
      AND status = 'locked';

    GET DIAGNOSTICS v_released_count = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true,
        'released_count', v_released_count
    );
END;
$$;


-- D. CONFIRM BOOKING ATOMIC (With Individual and Group Booking Support)
CREATE OR REPLACE FUNCTION confirm_booking_atomic(
    p_showtime_id UUID,
    p_seat_ids UUID[],
    p_session_id UUID,
    p_user_name TEXT,
    p_usn TEXT,
    p_email TEXT,
    p_ticket_hash TEXT,
    p_attendees JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_seat_count INT;
    v_eligible_count INT;
    v_booking_id UUID;
    v_total_amount NUMERIC(10,2) := 0.00;
    v_sanitized_usn TEXT;
    v_seat RECORD;
    v_showtime RECORD;
    v_booking_mode TEXT;
BEGIN
    IF p_user_name IS NULL OR length(trim(p_user_name)) < 3 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Full Name must be at least 3 characters');
    END IF;

    v_sanitized_usn := upper(trim(p_usn));
    IF v_sanitized_usn IS NULL OR length(v_sanitized_usn) < 5 THEN
        RETURN jsonb_build_object('success', false, 'error', 'A valid RV University USN is required');
    END IF;

    IF p_email IS NULL OR p_email !~* '^[a-zA-Z0-9._%+-]+@rvu\.edu\.in$' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Strictly an RVU student email (@rvu.edu.in) is required');
    END IF;

    v_seat_count := array_length(p_seat_ids, 1);
    IF v_seat_count IS NULL OR v_seat_count = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'No seats provided for booking');
    END IF;

    IF v_seat_count = 1 THEN
        v_booking_mode := 'individual';
    ELSE
        v_booking_mode := 'group';
    END IF;

    SELECT * INTO v_showtime FROM showtimes WHERE id = p_showtime_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Showtime does not exist');
    END IF;

    PERFORM id
    FROM seats
    WHERE id = ANY(p_seat_ids)
      AND showtime_id = p_showtime_id
    ORDER BY id
    FOR UPDATE;

    SELECT COUNT(*) INTO v_eligible_count
    FROM seats
    WHERE id = ANY(p_seat_ids)
      AND showtime_id = p_showtime_id
      AND status = 'locked'
      AND locked_by_session = p_session_id
      AND locked_until >= clock_timestamp();

    IF v_eligible_count <> v_seat_count THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Your 5-minute seat hold has expired or seats were released. Please reselect your seats.'
        );
    END IF;

    FOR v_seat IN 
        SELECT id, seat_tier FROM seats WHERE id = ANY(p_seat_ids)
    LOOP
        IF v_seat.seat_tier = 'vip' THEN
            v_total_amount := v_total_amount + v_showtime.price_vip;
        ELSE
            v_total_amount := v_total_amount + v_showtime.price_regular;
        END IF;
    END LOOP;

    INSERT INTO bookings (
        showtime_id,
        booking_mode,
        user_name,
        usn,
        rvu_email,
        total_amount,
        ticket_hash,
        attendees,
        status
    ) VALUES (
        p_showtime_id,
        v_booking_mode,
        trim(p_user_name),
        v_sanitized_usn,
        lower(trim(p_email)),
        v_total_amount,
        p_ticket_hash,
        p_attendees,
        'confirmed'
    ) RETURNING id INTO v_booking_id;

    FOR v_seat IN 
        SELECT id, seat_tier FROM seats WHERE id = ANY(p_seat_ids)
    LOOP
        INSERT INTO booking_seats (
            booking_id,
            seat_id,
            seat_price
        ) VALUES (
            v_booking_id,
            v_seat.id,
            CASE WHEN v_seat.seat_tier = 'vip' THEN v_showtime.price_vip ELSE v_showtime.price_regular END
        );
    END LOOP;

    UPDATE seats
    SET status = 'booked',
        locked_by_session = NULL,
        locked_until = NULL
    WHERE id = ANY(p_seat_ids)
      AND showtime_id = p_showtime_id;

    RETURN jsonb_build_object(
        'success', true,
        'booking_id', v_booking_id,
        'ticket_hash', p_ticket_hash,
        'total_amount', v_total_amount,
        'seat_count', v_seat_count,
        'usn', v_sanitized_usn,
        'user_name', trim(p_user_name),
        'rvu_email', lower(trim(p_email))
    );
END;
$$;


-- E. VERIFY TICKET ATOMIC (Door Scanner)
CREATE OR REPLACE FUNCTION verify_ticket_atomic(
    p_ticket_hash TEXT DEFAULT NULL,
    p_usn TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_booking RECORD;
    v_movie RECORD;
    v_showtime RECORD;
    v_seats_text TEXT;
BEGIN
    IF (p_ticket_hash IS NULL OR trim(p_ticket_hash) = '') AND (p_usn IS NULL OR trim(p_usn) = '') THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Please provide a ticket QR hash or student USN');
    END IF;

    SELECT * INTO v_booking
    FROM bookings
    WHERE (p_ticket_hash IS NOT NULL AND ticket_hash = trim(p_ticket_hash))
       OR (p_usn IS NOT NULL AND usn = upper(trim(p_usn)))
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'Ticket not found in RVU database'
        );
    END IF;

    SELECT * INTO v_showtime FROM showtimes WHERE id = v_booking.showtime_id;
    SELECT * INTO v_movie FROM movies WHERE id = v_showtime.movie_id;

    SELECT string_agg(s.row_label || s.col_number::text, ', ' ORDER BY s.row_label, s.col_number)
    INTO v_seats_text
    FROM booking_seats bs
    JOIN seats s ON s.id = bs.seat_id
    WHERE bs.booking_id = v_booking.id;

    IF v_booking.checked_in_at IS NOT NULL THEN
        RETURN jsonb_build_object(
            'valid', false,
            'already_checked_in', true,
            'checked_in_at', v_booking.checked_in_at,
            'error', 'TICKET ALREADY USED FOR ADMISSION',
            'ticket', jsonb_build_object(
                'booking_id', v_booking.id,
                'user_name', v_booking.user_name,
                'usn', v_booking.usn,
                'email', v_booking.rvu_email,
                'movie_title', v_movie.title,
                'auditorium', v_showtime.auditorium_name,
                'start_time', v_showtime.start_time,
                'seats', v_seats_text
            )
        );
    END IF;

    UPDATE bookings
    SET checked_in_at = clock_timestamp()
    WHERE id = v_booking.id;

    RETURN jsonb_build_object(
        'valid', true,
        'already_checked_in', false,
        'checked_in_at', clock_timestamp(),
        'message', 'ENTRY APPROVED: Welcome to RVU Cinema!',
        'ticket', jsonb_build_object(
            'booking_id', v_booking.id,
            'user_name', v_booking.user_name,
            'usn', v_booking.usn,
            'email', v_booking.rvu_email,
            'movie_title', v_movie.title,
            'auditorium', v_showtime.auditorium_name,
            'start_time', v_showtime.start_time,
            'seats', v_seats_text,
            'total_amount', v_booking.total_amount
        )
    );
END;
$$;

-- RLS
ALTER TABLE movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE showtimes ENABLE ROW LEVEL SECURITY;
ALTER TABLE seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_seats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read movies" ON movies FOR SELECT USING (true);
CREATE POLICY "Public read showtimes" ON showtimes FOR SELECT USING (true);
CREATE POLICY "Public read seats" ON seats FOR SELECT USING (true);
CREATE POLICY "Public read bookings" ON bookings FOR SELECT USING (true);
CREATE POLICY "Public read booking_seats" ON booking_seats FOR SELECT USING (true);

-- Realtime Publication
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'seats'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE seats;
    END IF;
END $$;
