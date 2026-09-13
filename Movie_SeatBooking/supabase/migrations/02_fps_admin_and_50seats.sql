-- ============================================================================
-- RVU FILM PRODUCTION SOCIETY (FPS) - 35MM CINEMA MIGRATION
-- 5 Rows (A-E) x 10 Columns (1-10) = 50 Seats per Screening
-- Admin CMS Procedures & RLS Write Policies
-- ============================================================================

-- 1. Enable public write policies for Admin CMS functions on the University Portal
DROP POLICY IF EXISTS "Public insert movies" ON movies;
DROP POLICY IF EXISTS "Public update movies" ON movies;
DROP POLICY IF EXISTS "Public delete movies" ON movies;
CREATE POLICY "Public insert movies" ON movies FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update movies" ON movies FOR UPDATE USING (true);
CREATE POLICY "Public delete movies" ON movies FOR DELETE USING (true);

DROP POLICY IF EXISTS "Public insert showtimes" ON showtimes;
DROP POLICY IF EXISTS "Public update showtimes" ON showtimes;
DROP POLICY IF EXISTS "Public delete showtimes" ON showtimes;
CREATE POLICY "Public insert showtimes" ON showtimes FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update showtimes" ON showtimes FOR UPDATE USING (true);
CREATE POLICY "Public delete showtimes" ON showtimes FOR DELETE USING (true);

DROP POLICY IF EXISTS "Public insert seats" ON seats;
DROP POLICY IF EXISTS "Public update seats" ON seats;
DROP POLICY IF EXISTS "Public delete seats" ON seats;
CREATE POLICY "Public insert seats" ON seats FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update seats" ON seats FOR UPDATE USING (true);
CREATE POLICY "Public delete seats" ON seats FOR DELETE USING (true);

DROP POLICY IF EXISTS "Public insert bookings" ON bookings;
DROP POLICY IF EXISTS "Public update bookings" ON bookings;
CREATE POLICY "Public insert bookings" ON bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update bookings" ON bookings FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public insert booking_seats" ON booking_seats;
CREATE POLICY "Public insert booking_seats" ON booking_seats FOR INSERT WITH CHECK (true);

-- 2. Admin Procedure to create a new showtime and automatically populate its 50 seats (5 rows x 10 cols)
CREATE OR REPLACE FUNCTION admin_create_showtime(
    p_movie_id UUID,
    p_auditorium_name TEXT,
    p_start_time TIMESTAMPTZ,
    p_price_regular NUMERIC(10,2) DEFAULT 150.00,
    p_price_vip NUMERIC(10,2) DEFAULT 250.00
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_showtime_id UUID;
    v_row_char CHAR(1);
    v_col INT;
    v_tier TEXT;
    v_rows CHAR(1)[] := ARRAY['A', 'B', 'C', 'D', 'E'];
BEGIN
    INSERT INTO showtimes (movie_id, auditorium_name, start_time, price_regular, price_vip)
    VALUES (p_movie_id, p_auditorium_name, p_start_time, p_price_regular, p_price_vip)
    RETURNING id INTO v_showtime_id;

    FOREACH v_row_char IN ARRAY v_rows LOOP
        IF v_row_char IN ('D', 'E') THEN
            v_tier := 'vip';
        ELSE
            v_tier := 'regular';
        END IF;

        FOR v_col IN 1..10 LOOP
            INSERT INTO seats (
                showtime_id,
                row_label,
                col_number,
                seat_tier,
                status
            ) VALUES (
                v_showtime_id,
                v_row_char,
                v_col,
                v_tier,
                'available'
            );
        END LOOP;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'showtime_id', v_showtime_id,
        'seats_created', 50
    );
END;
$$;

-- 3. Reset existing showtime seats to exactly 5 Rows (A-E) x 10 Columns (1-10) = 50 Seats
-- Delete any seats outside rows A-E
DELETE FROM seats WHERE row_label > 'E';

-- Ensure all existing showtimes have rows A-E, cols 1-10
DO $$
DECLARE
    v_st RECORD;
    v_row CHAR(1);
    v_col INT;
    v_tier TEXT;
    v_rows CHAR(1)[] := ARRAY['A', 'B', 'C', 'D', 'E'];
BEGIN
    FOR v_st IN SELECT id FROM showtimes LOOP
        FOREACH v_row IN ARRAY v_rows LOOP
            IF v_row IN ('D', 'E') THEN
                v_tier := 'vip';
            ELSE
                v_tier := 'regular';
            END IF;

            FOR v_col IN 1..10 LOOP
                IF NOT EXISTS (
                    SELECT 1 FROM seats 
                    WHERE showtime_id = v_st.id AND row_label = v_row AND col_number = v_col
                ) THEN
                    INSERT INTO seats (showtime_id, row_label, col_number, seat_tier, status)
                    VALUES (v_st.id, v_row, v_col, v_tier, 'available');
                ELSE
                    -- Update tier to match new scheme: A-C Regular, D-E VIP
                    UPDATE seats 
                    SET seat_tier = v_tier
                    WHERE showtime_id = v_st.id AND row_label = v_row AND col_number = v_col;
                END IF;
            END LOOP;
        END LOOP;
    END LOOP;
END $$;
