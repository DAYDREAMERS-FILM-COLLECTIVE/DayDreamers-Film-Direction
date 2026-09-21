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
    quote TEXT,
    quote_author TEXT,
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
    capacity INTEGER DEFAULT 70,
    is_active BOOLEAN DEFAULT true,
    is_sales_open BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Locked Seats Table (Admin Manual Lock)
CREATE TABLE IF NOT EXISTS locked_seats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    showing_id UUID NOT NULL REFERENCES showings(id) ON DELETE CASCADE,
    seat_id TEXT NOT NULL,
    category TEXT DEFAULT 'Admin Hold',
    reason TEXT DEFAULT 'Reserved by Admin',
    note TEXT,
    locked_by TEXT DEFAULT 'Admin',
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE (showing_id, seat_id)
);

-- 5. Seat Audit Log Table (Admin Actions Tracking)
CREATE TABLE IF NOT EXISTS seat_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    showing_id UUID NOT NULL REFERENCES showings(id) ON DELETE CASCADE,
    seat_id TEXT NOT NULL,
    action TEXT NOT NULL,
    category TEXT,
    reason TEXT,
    note TEXT,
    admin_user TEXT DEFAULT 'Admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. System & Admin Audit Trail Table
CREATE TABLE IF NOT EXISTS admin_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type TEXT NOT NULL, -- 'movie', 'showing', 'booking', 'system'
    entity_id TEXT,
    action TEXT NOT NULL,      -- 'DELETE', 'BULK_DELETE', 'STATE_CHANGE', 'INGEST', 'SHOWING_CREATE'
    details JSONB,
    performed_by TEXT DEFAULT 'Admin',
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. Bookings Table
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

-- 8. Indexes for Performance & Scalability
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_movies_title_trgm ON movies USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_movies_is_active ON movies(is_active);
CREATE INDEX IF NOT EXISTS idx_movies_year ON movies(year);
CREATE INDEX IF NOT EXISTS idx_movies_created_at ON movies(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_showings_movie ON showings(movie_id);
CREATE INDEX IF NOT EXISTS idx_showings_hall_date ON showings(hall, show_date, show_time);
CREATE INDEX IF NOT EXISTS idx_bookings_showing ON bookings(showing_id);
CREATE INDEX IF NOT EXISTS idx_bookings_usn ON bookings(user_usn);
CREATE INDEX IF NOT EXISTS idx_locked_seats_showing ON locked_seats(showing_id);
CREATE INDEX IF NOT EXISTS idx_locked_seats_expiry ON locked_seats(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_seat_audit_showing ON seat_audit(showing_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_entity ON admin_audit(entity_type, entity_id);
