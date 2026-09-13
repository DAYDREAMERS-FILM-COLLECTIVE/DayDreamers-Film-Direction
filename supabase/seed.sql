-- Seed showtimes and seats for the 3 featured films
INSERT INTO public.showtimes (id, movie_id, title, start_time, venue) VALUES
  ('st-01', 'film-01', 'THE NEON PROTOCOL', '2026-09-20 19:00:00+05:30', 'FPS Screening Auditorium Alpha'),
  ('st-02', 'film-01', 'THE NEON PROTOCOL', '2026-09-20 22:15:00+05:30', 'FPS Screening Auditorium Alpha'),
  ('st-03', 'film-02', 'MONOLITH SILENCE', '2026-09-21 18:30:00+05:30', 'FPS Main Auditorium 70mm'),
  ('st-04', 'film-02', 'MONOLITH SILENCE', '2026-09-21 21:45:00+05:30', 'FPS Main Auditorium 70mm'),
  ('st-05', 'film-03', 'PRISM DRIFT', '2026-09-22 20:00:00+05:30', 'FPS Chamber Theater')
ON CONFLICT (id) DO NOTHING;

-- Generate 50 parametric seats per showtime (Rows A-E, seats 1-10)
-- Rows A & B are 'tier-director', Rows C, D, E are 'tier-general'
DO $$
DECLARE
  r_showtime RECORD;
  r_char TEXT;
  s_num INT;
  t_id TEXT;
  s_id TEXT;
BEGIN
  FOR r_showtime IN SELECT id FROM public.showtimes LOOP
    FOREACH r_char IN ARRAY ARRAY['A', 'B', 'C', 'D', 'E'] LOOP
      IF r_char IN ('A', 'B') THEN
        t_id := 'tier-director';
      ELSE
        t_id := 'tier-general';
      END IF;

      FOR s_num IN 1..10 LOOP
        s_id := r_char || '-' || LPAD(s_num::TEXT, 2, '0');
        INSERT INTO public.seats (
          id,
          showtime_id,
          row_label,
          seat_number,
          tier_id,
          status
        ) VALUES (
          s_id,
          r_showtime.id,
          r_char,
          s_num,
          t_id,
          'AVAILABLE'
        )
        ON CONFLICT (id, showtime_id) DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;
END;
$$;
