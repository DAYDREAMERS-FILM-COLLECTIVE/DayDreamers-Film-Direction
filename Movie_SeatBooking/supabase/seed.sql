-- ============================================================================
-- RVU CAMPUS CINEMA PLATFORM - SEED DATA
-- 3 Featured Movies, Multi-Slot Showtimes, and 64-Seat Grids (Rows A-H, Cols 1-8)
-- ============================================================================

DO $$
DECLARE
    v_movie_oppenheimer UUID;
    v_movie_interstellar UUID;
    v_movie_spiderman UUID;
    
    v_showtime_id UUID;
    v_showtimes UUID[];
    v_row_char CHAR(1);
    v_col INT;
    v_tier TEXT;
    v_row_chars CHAR(1)[] := ARRAY['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
BEGIN
    -- 1. SEED MOVIES
    INSERT INTO movies (title, tagline, description, poster_url, backdrop_url, trailer_url, duration_mins, genre, age_rating, is_active)
    VALUES (
        'Oppenheimer',
        'The world forever changes.',
        'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb during the Manhattan Project.',
        'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1578836537282-3171d77f8632?q=80&w=1600&auto=format&fit=crop',
        'https://www.youtube.com/watch?v=uYPbbksJxIg',
        180,
        'Biography / Drama / History',
        'A',
        true
    ) RETURNING id INTO v_movie_oppenheimer;

    INSERT INTO movies (title, tagline, description, poster_url, backdrop_url, trailer_url, duration_mins, genre, age_rating, is_active)
    VALUES (
        'Interstellar',
        'Mankind was born on Earth. It was never meant to die here.',
        'When Earth faces environmental collapse, a team of interstellar explorers travel through a wormhole near Saturn in search of a new home for humanity.',
        'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=800&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1600&auto=format&fit=crop',
        'https://www.youtube.com/watch?v=zSWdZVtXT7E',
        169,
        'Sci-Fi / Adventure / Drama',
        'UA',
        true
    ) RETURNING id INTO v_movie_interstellar;

    INSERT INTO movies (title, tagline, description, poster_url, backdrop_url, trailer_url, duration_mins, genre, age_rating, is_active)
    VALUES (
        'Spider-Man: Across the Spider-Verse',
        'It''s how you wear the mask that matters.',
        'Miles Morales is catapulted across the Multiverse, where he encounters a team of Spider-People charged with protecting its very existence.',
        'https://images.unsplash.com/photo-1635805737707-575885ab0820?q=80&w=800&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=1600&auto=format&fit=crop',
        'https://www.youtube.com/watch?v=cqGjhVJWtEg',
        140,
        'Animation / Action / Adventure',
        'U',
        true
    ) RETURNING id INTO v_movie_spiderman;

    -- 2. SEED SHOWTIMES FOR TODAY & UPCOMING DAYS
    -- Oppenheimer Showtimes
    INSERT INTO showtimes (movie_id, auditorium_name, start_time, price_regular, price_vip)
    VALUES 
        (v_movie_oppenheimer, 'Campus Audi 1 - Main Stage', (CURRENT_DATE + TIME '14:30:00') AT TIME ZONE 'Asia/Kolkata', 150.00, 250.00),
        (v_movie_oppenheimer, 'Campus Audi 1 - Main Stage', (CURRENT_DATE + TIME '18:30:00') AT TIME ZONE 'Asia/Kolkata', 180.00, 280.00),
        (v_movie_oppenheimer, 'Campus Audi 2 - Film Lab', (CURRENT_DATE + 1 + TIME '17:00:00') AT TIME ZONE 'Asia/Kolkata', 140.00, 240.00);

    -- Interstellar Showtimes
    INSERT INTO showtimes (movie_id, auditorium_name, start_time, price_regular, price_vip)
    VALUES 
        (v_movie_interstellar, 'Campus Audi 1 - Main Stage', (CURRENT_DATE + TIME '21:00:00') AT TIME ZONE 'Asia/Kolkata', 160.00, 260.00),
        (v_movie_interstellar, 'Campus Audi 2 - Film Lab', (CURRENT_DATE + 1 + TIME '13:30:00') AT TIME ZONE 'Asia/Kolkata', 140.00, 240.00);

    -- Spider-Man Showtimes
    INSERT INTO showtimes (movie_id, auditorium_name, start_time, price_regular, price_vip)
    VALUES 
        (v_movie_spiderman, 'Campus Audi 2 - Film Lab', (CURRENT_DATE + TIME '16:00:00') AT TIME ZONE 'Asia/Kolkata', 130.00, 220.00),
        (v_movie_spiderman, 'Campus Audi 1 - Main Stage', (CURRENT_DATE + 1 + TIME '19:30:00') AT TIME ZONE 'Asia/Kolkata', 150.00, 250.00);

    -- 3. POPULATE 70-SEAT GRID FOR EVERY SHOWTIME (Rows A-G, Cols 1-10)
    -- Rows A to E = 'regular'
    -- Rows F to G = 'vip'
    v_row_chars := ARRAY['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    FOR v_showtime_id IN (SELECT id FROM showtimes) LOOP
        FOREACH v_row_char IN ARRAY v_row_chars LOOP
            IF v_row_char IN ('F', 'G') THEN
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
    END LOOP;

    -- Pre-book 2 demo seats in the first showtime for visual richness
    SELECT id INTO v_showtime_id FROM showtimes ORDER BY start_time ASC LIMIT 1;
    UPDATE seats 
    SET status = 'booked'
    WHERE showtime_id = v_showtime_id 
      AND row_label = 'D' AND col_number IN (4, 5);

    RAISE NOTICE 'RVU Cinema database successfully seeded with movies, showtimes, and 70-seat layouts.';
END $$;
