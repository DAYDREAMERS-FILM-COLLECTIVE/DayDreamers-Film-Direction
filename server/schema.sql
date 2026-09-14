-- DayDreamers Film Society Database Schema (Supabase PostgreSQL)

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Movies Table
CREATE TABLE IF NOT EXISTS movies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    director TEXT NOT NULL,
    genre TEXT NOT NULL,
    runtime TEXT NOT NULL,
    year INTEGER,
    rating TEXT,
    blurb TEXT NOT NULL,
    hall TEXT NOT NULL,
    poster_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Showings Table
CREATE TABLE IF NOT EXISTS showings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    show_date DATE NOT NULL,
    show_time TEXT NOT NULL,
    hall TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Locked Seats Table (Admin Manual Lock)
CREATE TABLE IF NOT EXISTS locked_seats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    showing_id UUID NOT NULL REFERENCES showings(id) ON DELETE CASCADE,
    seat_id TEXT NOT NULL,
    reason TEXT DEFAULT 'Reserved by Admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE (showing_id, seat_id)
);

-- 5. Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ref_code VARCHAR(16) UNIQUE NOT NULL,
    showing_id UUID NOT NULL REFERENCES showings(id) ON DELETE CASCADE,
    movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    user_usn TEXT NOT NULL,
    user_email TEXT NOT NULL,
    seats TEXT[] NOT NULL,
    qr_token TEXT NOT NULL,
    checked_in BOOLEAN DEFAULT false,
    checked_in_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_showing_usn UNIQUE (showing_id, user_usn)
);

-- 6. Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_showings_movie ON showings(movie_id);
CREATE INDEX IF NOT EXISTS idx_bookings_showing ON bookings(showing_id);
CREATE INDEX IF NOT EXISTS idx_bookings_usn ON bookings(user_usn);
CREATE INDEX IF NOT EXISTS idx_locked_seats_showing ON locked_seats(showing_id);
