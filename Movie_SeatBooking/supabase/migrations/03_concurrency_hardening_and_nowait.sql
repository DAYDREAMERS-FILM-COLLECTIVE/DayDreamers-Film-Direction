-- ============================================================================
-- RVU CAMPUS CINEMA PLATFORM - CONCURRENCY HARDENING & NOWAIT LOCKS
-- 500-User Flash Crowd Defense on Supabase Free Tier
-- ============================================================================

-- A. GET SHOWTIME AVAILABILITY COUNTER (Fast single query without row locks)
CREATE OR REPLACE FUNCTION get_showtime_availability(p_showtime_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_total INT := 0;
    v_booked INT := 0;
    v_locked INT := 0;
    v_available INT := 0;
BEGIN
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'booked'),
        COUNT(*) FILTER (WHERE status = 'locked' AND locked_until >= clock_timestamp()),
        COUNT(*) FILTER (WHERE status = 'available' OR (status = 'locked' AND locked_until < clock_timestamp()))
    INTO v_total, v_booked, v_locked, v_available
    FROM seats
    WHERE showtime_id = p_showtime_id;

    RETURN jsonb_build_object(
        'total_seats', v_total,
        'booked_seats', v_booked,
        'locked_seats', v_locked,
        'available_seats', v_available,
        'is_sold_out', (v_available = 0)
    );
END;
$$;

-- B. ACQUIRE SEAT LOCKS WITH NOWAIT AND 55P03 FAST-FAIL
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
    v_available_count INT;
BEGIN
    v_requested_count := array_length(p_seat_ids, 1);
    IF v_requested_count IS NULL OR v_requested_count = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'No seats specified');
    END IF;

    -- Strict Quota guard: max 4 seats per student
    IF v_requested_count > 4 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Maximum 4 seats allowed per student');
    END IF;

    IF p_session_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Valid session ID required');
    END IF;

    -- 1. FAST SOLD-OUT BAILOUT (Zero row locks taken if showtime has no available seats)
    SELECT COUNT(*) INTO v_available_count
    FROM seats
    WHERE showtime_id = p_showtime_id
      AND (status = 'available' OR (status = 'locked' AND locked_until < clock_timestamp()));

    IF v_available_count = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'SOLD_OUT',
            'detail', 'All seats for this premiere screening have been booked or reserved'
        );
    END IF;

    v_new_expiry := clock_timestamp() + (p_hold_seconds || ' seconds')::INTERVAL;

    -- 2. NOWAIT ROW LOCKS (Catch 55P03 lock_not_available immediately)
    BEGIN
        PERFORM id
        FROM seats
        WHERE id = ANY(p_seat_ids)
          AND showtime_id = p_showtime_id
        ORDER BY id
        FOR UPDATE NOWAIT;
    EXCEPTION
        WHEN lock_not_available THEN -- Postgres error 55P03
            RETURN jsonb_build_object(
                'success', false,
                'error', 'SEAT_CONTESTED',
                'detail', 'Another student is simultaneously clicking this seat'
            );
    END;

    -- 3. Verify all requested seats exist for this showtime
    SELECT COUNT(*) INTO v_locked_count
    FROM seats
    WHERE id = ANY(p_seat_ids)
      AND showtime_id = p_showtime_id;

    IF v_locked_count <> v_requested_count THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'One or more selected seats do not exist for this premiere'
        );
    END IF;

    -- 4. Check status conflicts (booked OR locked by other session whose hold hasn't expired)
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
            'error', 'SEAT_CONTESTED',
            'detail', 'One or more seats have just been claimed by another student',
            'conflict_count', v_conflict_count
        );
    END IF;

    -- 5. Atomically transition to locked
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
