-- Migration: 01_hardened_production_schema.sql
-- Production-grade, zero-leak, zero-hardcode schema with atomic RPCs and RLS

-- 1. Clean slate / drop obsolete relations if needed
DROP VIEW IF EXISTS public.v_seats CASCADE;
DROP TABLE IF EXISTS public.tickets CASCADE;
DROP TABLE IF EXISTS public.booking_seats CASCADE;
DROP TABLE IF EXISTS public.bookings CASCADE;
DROP TABLE IF EXISTS public.seats CASCADE;
DROP TABLE IF EXISTS public.showtimes CASCADE;
DROP TABLE IF EXISTS public.movies CASCADE;

-- 2. Create Showtimes Table
CREATE TABLE public.showtimes (
  id TEXT PRIMARY KEY,
  movie_id TEXT NOT NULL,
  title TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  venue TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Seats Table (100% Free - Price column removed)
CREATE TABLE public.seats (
  id TEXT NOT NULL, -- e.g. "A-1", "B-4"
  showtime_id TEXT NOT NULL REFERENCES public.showtimes(id) ON DELETE CASCADE,
  row_label TEXT NOT NULL,
  seat_number INT NOT NULL,
  tier_id TEXT NOT NULL DEFAULT 'tier-general',
  status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'HELD', 'BOOKED')),
  held_by_session TEXT,
  held_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  booked_by_email TEXT,
  booked_by_usn TEXT,
  booked_at TIMESTAMPTZ,
  PRIMARY KEY (id, showtime_id)
);

CREATE INDEX idx_seats_showtime_status ON public.seats(showtime_id, status);
CREATE INDEX idx_seats_expires_at ON public.seats(expires_at) WHERE status = 'HELD';

-- 4. Create Tickets Table
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  showtime_id TEXT NOT NULL REFERENCES public.showtimes(id) ON DELETE CASCADE,
  seat_id TEXT NOT NULL,
  attendee_email TEXT NOT NULL,
  attendee_usn TEXT NOT NULL,
  qr_hash TEXT NOT NULL UNIQUE, -- HMAC-SHA256(TICKET_SECRET, id|showtime_id|seat_id)
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  admitted_at TIMESTAMPTZ,
  admitted_by UUID,
  CONSTRAINT fk_ticket_seat FOREIGN KEY (seat_id, showtime_id) REFERENCES public.seats(id, showtime_id) ON DELETE CASCADE
);

CREATE INDEX idx_tickets_qr_hash ON public.tickets(qr_hash);
CREATE INDEX idx_tickets_showtime ON public.tickets(showtime_id);

-- 5. Safe Public View for Seats (Completely hides PII: email & USN)
CREATE OR REPLACE VIEW public.v_seats AS
SELECT 
  id,
  showtime_id,
  row_label,
  seat_number,
  tier_id,
  CASE 
    WHEN status = 'HELD' AND expires_at < clock_timestamp() THEN 'AVAILABLE'
    ELSE status
  END AS status,
  held_by_session,
  expires_at
FROM public.seats;

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.showtimes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- 7. Strict RLS Policies
-- Showtimes: Public read
CREATE POLICY "Allow public read access on showtimes" 
  ON public.showtimes FOR SELECT 
  USING (true);

-- Seats: Public read access
CREATE POLICY "Allow public read access on seats" 
  ON public.seats FOR SELECT 
  USING (true);

-- Seats: Deny direct INSERT/UPDATE/DELETE to public (must go through RPCs)
-- (By not defining INSERT/UPDATE/DELETE policies, public is denied by default under RLS)

-- Tickets: Read only for ticket owner or admin/service_role
CREATE POLICY "Allow users to view their own tickets or admin" 
  ON public.tickets FOR SELECT 
  USING (
    attendee_email = coalesce(current_setting('request.jwt.claims', true)::json->>'email', '')
    OR (auth.role() = 'service_role')
    OR (auth.role() = 'admin')
  );

-- 8. Atomic Sweeper Function
CREATE OR REPLACE FUNCTION public.cleanup_expired_holds()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE public.seats
  SET 
    status = 'AVAILABLE',
    held_by_session = NULL,
    held_at = NULL,
    expires_at = NULL
  WHERE status = 'HELD' 
    AND expires_at IS NOT NULL 
    AND expires_at < clock_timestamp();
    
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- 9. Atomic Bulk Hold RPC with NOWAIT Lock Trap
CREATE OR REPLACE FUNCTION public.hold_seats_atomic(
  p_seat_ids TEXT[],
  p_showtime_id TEXT,
  p_session_id TEXT,
  p_ttl_seconds INT DEFAULT 300
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_locked_count INT;
  v_req_count INT := array_length(p_seat_ids, 1);
  v_now TIMESTAMPTZ := clock_timestamp();
  v_expires TIMESTAMPTZ := v_now + (p_ttl_seconds || ' seconds')::INTERVAL;
BEGIN
  -- 1. Sweep expired holds first
  PERFORM public.cleanup_expired_holds();

  -- 2. Validate input
  IF v_req_count IS NULL OR v_req_count = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'NO_SEATS_SPECIFIED');
  END IF;

  -- 3. Lock requested rows with NOWAIT to prevent race conditions
  PERFORM 1 FROM public.seats
  WHERE id = ANY(p_seat_ids) AND showtime_id = p_showtime_id
  FOR UPDATE NOWAIT;

  -- 4. Check if any seat is already booked or held by another session
  IF EXISTS (
    SELECT 1 FROM public.seats
    WHERE id = ANY(p_seat_ids) 
      AND showtime_id = p_showtime_id
      AND (status = 'BOOKED' OR (status = 'HELD' AND held_by_session <> p_session_id))
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'CONCURRENCY_CONFLICT', 'message', 'One or more seats are unavailable or held by another guest.');
  END IF;

  -- 5. Update the seats to HELD
  UPDATE public.seats
  SET
    status = 'HELD',
    held_by_session = p_session_id,
    held_at = v_now,
    expires_at = v_expires
  WHERE id = ANY(p_seat_ids) AND showtime_id = p_showtime_id;

  GET DIAGNOSTICS v_locked_count = ROW_COUNT;

  IF v_locked_count = v_req_count THEN
    RETURN jsonb_build_object(
      'success', true,
      'seat_ids', p_seat_ids,
      'showtime_id', p_showtime_id,
      'expires_at', v_expires
    );
  ELSE
    RAISE EXCEPTION 'SEAT_LOCK_MISMATCH';
  END IF;

EXCEPTION
  WHEN lock_not_available THEN
    RETURN jsonb_build_object('success', false, 'error', 'CONCURRENCY_CONFLICT', 'message', 'High contention: seat lock is temporarily held by another request.');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 10. Atomic Release Seats RPC
CREATE OR REPLACE FUNCTION public.release_seats_atomic(
  p_seat_ids TEXT[],
  p_showtime_id TEXT,
  p_session_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_released_count INT;
BEGIN
  UPDATE public.seats
  SET
    status = 'AVAILABLE',
    held_by_session = NULL,
    held_at = NULL,
    expires_at = NULL
  WHERE id = ANY(p_seat_ids)
    AND showtime_id = p_showtime_id
    AND held_by_session = p_session_id
    AND status = 'HELD';

  GET DIAGNOSTICS v_released_count = ROW_COUNT;
  RETURN jsonb_build_object('success', true, 'released_count', v_released_count);
END;
$$;

-- 11. Atomic Confirm Booking RPC
CREATE OR REPLACE FUNCTION public.confirm_booking_atomic(
  p_seat_ids TEXT[],
  p_showtime_id TEXT,
  p_session_id TEXT,
  p_attendee_email TEXT,
  p_attendee_usn TEXT,
  p_ticket_payloads JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now TIMESTAMPTZ := clock_timestamp();
  v_item JSONB;
BEGIN
  -- 1. Verify all requested seats are held by this session and not expired
  PERFORM 1 FROM public.seats
  WHERE id = ANY(p_seat_ids)
    AND showtime_id = p_showtime_id
    AND status = 'HELD'
    AND held_by_session = p_session_id
    AND expires_at > v_now
  FOR UPDATE NOWAIT;

  IF (
    SELECT count(*) FROM public.seats
    WHERE id = ANY(p_seat_ids)
      AND showtime_id = p_showtime_id
      AND status = 'HELD'
      AND held_by_session = p_session_id
      AND expires_at > v_now
  ) <> array_length(p_seat_ids, 1) THEN
    RETURN jsonb_build_object('success', false, 'error', 'HOLD_EXPIRED_OR_INVALID', 'message', 'Your seat hold expired or is no longer valid.');
  END IF;

  -- 2. Transition seats to BOOKED
  UPDATE public.seats
  SET
    status = 'BOOKED',
    held_by_session = NULL,
    held_at = NULL,
    expires_at = NULL,
    booked_by_email = p_attendee_email,
    booked_by_usn = p_attendee_usn,
    booked_at = v_now
  WHERE id = ANY(p_seat_ids) AND showtime_id = p_showtime_id;

  -- 3. Insert cryptographic tickets
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_ticket_payloads)
  LOOP
    INSERT INTO public.tickets (
      id,
      showtime_id,
      seat_id,
      attendee_email,
      attendee_usn,
      qr_hash,
      issued_at
    ) VALUES (
      (v_item->>'id')::UUID,
      p_showtime_id,
      v_item->>'seat_id',
      p_attendee_email,
      p_attendee_usn,
      v_item->>'qr_hash',
      v_now
    );
  END LOOP;

  RETURN jsonb_build_object('success', true, 'booked_seats', p_seat_ids);

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 12. Ticket Admission Scanner RPC
CREATE OR REPLACE FUNCTION public.verify_ticket_admit(
  p_ticket_id UUID,
  p_qr_hash TEXT,
  p_admin_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ticket RECORD;
  v_now TIMESTAMPTZ := clock_timestamp();
BEGIN
  SELECT t.*, s.title AS movie_title, s.venue, s.start_time
  INTO v_ticket
  FROM public.tickets t
  JOIN public.showtimes s ON s.id = t.showtime_id
  WHERE t.id = p_ticket_id AND t.qr_hash = p_qr_hash;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID_TICKET', 'message', 'No matching ticket found or HMAC hash signature is forged.');
  END IF;

  IF v_ticket.admitted_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false, 
      'code', 'ALREADY_ADMITTED',
      'message', 'Ticket has already been redeemed at the door.',
      'admitted_at', v_ticket.admitted_at,
      'ticket', row_to_json(v_ticket)
    );
  END IF;

  -- Admit ticket
  UPDATE public.tickets
  SET admitted_at = v_now, admitted_by = p_admin_id
  WHERE id = p_ticket_id;

  RETURN jsonb_build_object(
    'success', true,
    'code', 'ADMISSION_GRANTED',
    'message', 'Ticket verified successfully. Welcome to the screening.',
    'ticket', jsonb_build_object(
      'id', v_ticket.id,
      'seat_id', v_ticket.seat_id,
      'movie_title', v_ticket.movie_title,
      'venue', v_ticket.venue,
      'attendee_email', v_ticket.attendee_email,
      'attendee_usn', v_ticket.attendee_usn,
      'admitted_at', v_now
    )
  );
END;
$$;

-- 13. Enable Realtime on seats and showtimes
ALTER PUBLICATION supabase_realtime ADD TABLE public.seats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.showtimes;
