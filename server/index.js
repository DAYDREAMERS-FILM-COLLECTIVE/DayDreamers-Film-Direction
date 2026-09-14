import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import QRCode from 'qrcode';
import { query, pool } from './db.js';
import { signTicket, verifyTicket } from './crypto.js';
import { sendTicketEmail } from './email.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8000;
const ADMIN_KEY = process.env.ADMIN_ACCESS_KEY || 'fps-door-admin-alpha-2026';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Admin auth check helper
function requireAdmin(req, res, next) {
    const key = req.headers['x-admin-key'] || req.query.admin_key || req.body.admin_key;
    if (!key || key !== ADMIN_KEY) {
        return res.status(401).json({ error: 'Unauthorized: Invalid Admin Access Key' });
    }
    next();
}

// -------------------------------------------------------------
// 1. MOVIES API
// -------------------------------------------------------------

// List active movies
app.get('/api/movies', async (req, res) => {
    try {
        const { rows } = await query(
            'SELECT * FROM movies WHERE is_active = true ORDER BY created_at ASC'
        );
        res.json(rows);
    } catch (err) {
        console.error('Error fetching movies:', err);
        res.status(500).json({ error: 'Failed to fetch movies' });
    }
});

// Get single movie with showings
app.get('/api/movies/:id', async (req, res) => {
    try {
        const movieRes = await query('SELECT * FROM movies WHERE id = $1', [req.params.id]);
        if (!movieRes.rows.length) {
            return res.status(404).json({ error: 'Movie not found' });
        }
        const showingsRes = await query(
            'SELECT * FROM showings WHERE movie_id = $1 AND is_active = true ORDER BY show_date ASC, show_time ASC',
            [req.params.id]
        );
        res.json({
            ...movieRes.rows[0],
            showings: showingsRes.rows
        });
    } catch (err) {
        console.error('Error fetching movie details:', err);
        res.status(500).json({ error: 'Failed to fetch movie details' });
    }
});

// Admin: Add Movie
app.post('/api/movies', requireAdmin, async (req, res) => {
    try {
        const { title, director, genre, runtime, year, rating, blurb, hall, poster_url } = req.body;
        if (!title || !director || !genre) {
            return res.status(400).json({ error: 'Title, director, and genre are required' });
        }
        const { rows } = await query(
            `INSERT INTO movies (title, director, genre, runtime, year, rating, blurb, hall, poster_url)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [title, director, genre, runtime || '2H', year || 2024, rating || 'A', blurb || '', hall || 'D Block 3rd Floor', poster_url || '']
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('Error adding movie:', err);
        res.status(500).json({ error: 'Failed to add movie' });
    }
});

// Admin: Update Movie
app.put('/api/movies/:id', requireAdmin, async (req, res) => {
    try {
        const { title, director, genre, runtime, year, rating, blurb, hall, poster_url, is_active } = req.body;
        const { rows } = await query(
            `UPDATE movies SET 
                title = COALESCE($1, title),
                director = COALESCE($2, director),
                genre = COALESCE($3, genre),
                runtime = COALESCE($4, runtime),
                year = COALESCE($5, year),
                rating = COALESCE($6, rating),
                blurb = COALESCE($7, blurb),
                hall = COALESCE($8, hall),
                poster_url = COALESCE($9, poster_url),
                is_active = COALESCE($10, is_active)
             WHERE id = $11 RETURNING *`,
            [title, director, genre, runtime, year, rating, blurb, hall, poster_url, is_active, req.params.id]
        );
        if (!rows.length) return res.status(404).json({ error: 'Movie not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error('Error updating movie:', err);
        res.status(500).json({ error: 'Failed to update movie' });
    }
});

// Admin: Delete Movie
app.delete('/api/movies/:id', requireAdmin, async (req, res) => {
    try {
        const { rows } = await query('DELETE FROM movies WHERE id = $1 RETURNING id, title', [req.params.id]);
        if (!rows.length) return res.status(404).json({ error: 'Movie not found' });
        res.json({ message: 'Movie deleted successfully', deleted: rows[0] });
    } catch (err) {
        console.error('Error deleting movie:', err);
        res.status(500).json({ error: 'Failed to delete movie' });
    }
});

// -------------------------------------------------------------
// 2. SHOWINGS API
// -------------------------------------------------------------

app.get('/api/showings', async (req, res) => {
    try {
        let sql = `
            SELECT s.*, m.title as movie_title, m.director, m.genre, m.runtime
            FROM showings s
            JOIN movies m ON s.movie_id = m.id
            WHERE s.is_active = true
        `;
        const params = [];
        const targetMovieId = req.query.movie_id || req.query.movieId;
        if (targetMovieId) {
            params.push(targetMovieId);
            sql += ` AND s.movie_id = $1`;
        }
        sql += ` ORDER BY s.show_date ASC, s.show_time ASC`;
        const { rows } = await query(sql, params);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching showings:', err);
        res.status(500).json({ error: 'Failed to fetch showings' });
    }
});

app.post('/api/showings', requireAdmin, async (req, res) => {
    try {
        const { movie_id, show_date, show_time, hall } = req.body;
        if (!movie_id || !show_date || !show_time) {
            return res.status(400).json({ error: 'movie_id, show_date, and show_time are required' });
        }
        const { rows } = await query(
            `INSERT INTO showings (movie_id, show_date, show_time, hall)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [movie_id, show_date, show_time, hall || 'D Block 3rd Floor']
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('Error adding showing:', err);
        res.status(500).json({ error: 'Failed to add showing' });
    }
});

app.delete('/api/showings/:id', requireAdmin, async (req, res) => {
    try {
        const { rows } = await query('DELETE FROM showings WHERE id = $1 RETURNING id', [req.params.id]);
        if (!rows.length) return res.status(404).json({ error: 'Showing not found' });
        res.json({ message: 'Showing deleted', id: rows[0].id });
    } catch (err) {
        console.error('Error deleting showing:', err);
        res.status(500).json({ error: 'Failed to delete showing' });
    }
});

// -------------------------------------------------------------
// 3. SEATS API
// -------------------------------------------------------------

// Get occupied and locked seats for a showing
app.get('/api/seats/status', async (req, res) => {
    try {
        const showing_id = req.query.showing_id || req.query.showingId;
        if (!showing_id) {
            return res.status(400).json({ error: 'showing_id query param is required' });
        }

        // 1. Get manually locked seats
        const lockedRes = await query(
            'SELECT seat_id, reason FROM locked_seats WHERE showing_id = $1',
            [showing_id]
        );
        const lockedSeats = lockedRes.rows.map(r => r.seat_id);

        // 2. Get booked seats
        const bookedRes = await query(
            'SELECT unnest(seats) as seat_id FROM bookings WHERE showing_id = $1',
            [showing_id]
        );
        const bookedSeats = bookedRes.rows.map(r => r.seat_id);

        // Combined unique occupied set
        const occupiedSet = new Set([...lockedSeats, ...bookedSeats]);

        res.json({
            showingId: showing_id,
            lockedSeats,
            bookedSeats,
            occupiedSeats: Array.from(occupiedSet)
        });
    } catch (err) {
        console.error('Error fetching seat status:', err);
        res.status(500).json({ error: 'Failed to fetch seat status' });
    }
});

// Admin: Toggle Lock Seat
app.post('/api/seats/lock', requireAdmin, async (req, res) => {
    try {
        const showingId = req.body.showingId || req.body.showing_id;
        const seatId = req.body.seatId || req.body.seat_id;
        const { action, reason } = req.body;
        if (!showingId || !seatId) {
            return res.status(400).json({ error: 'showingId and seatId are required' });
        }

        if (action === 'unlock') {
            await query(
                'DELETE FROM locked_seats WHERE showing_id = $1 AND seat_id = $2',
                [showingId, seatId]
            );
            return res.json({ message: `Seat ${seatId} unlocked`, seatId, locked: false });
        } else {
            // Lock seat
            await query(
                `INSERT INTO locked_seats (showing_id, seat_id, reason)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (showing_id, seat_id) DO NOTHING`,
                [showingId, seatId, reason || 'admin_lock']
            );
            return res.json({ message: `Seat ${seatId} locked`, seatId, locked: true });
        }
    } catch (err) {
        console.error('Error locking/unlocking seat:', err);
        res.status(500).json({ error: 'Failed to update seat lock' });
    }
});

// -------------------------------------------------------------
// 4. BOOKINGS API
// -------------------------------------------------------------

function generateRefCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `DD-${code}`;
}

app.post('/api/bookings', async (req, res) => {
    const client = await pool.connect();
    try {
        const { showingId, userName, userUsn, userEmail, seats } = req.body;

        // Validation
        if (!showingId || !userName || !userUsn || !userEmail) {
            return res.status(400).json({ error: 'All fields (Name, USN, Email, Showing) are required' });
        }
        if (!Array.isArray(seats) || seats.length === 0) {
            return res.status(400).json({ error: 'At least one seat must be selected' });
        }

        // Email basic regex
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userEmail.trim())) {
            return res.status(400).json({ error: 'Invalid email address' });
        }

        await client.query('BEGIN');

        // Check showing exists
        const showingRes = await client.query(
            `SELECT s.*, m.title as movie_title, m.director, m.hall as movie_hall
             FROM showings s
             JOIN movies m ON s.movie_id = m.id
             WHERE s.id = $1`,
            [showingId]
        );
        if (!showingRes.rows.length) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Showing not found' });
        }
        const showing = showingRes.rows[0];

        // Check for seat collisions in locked_seats or existing bookings
        const lockedCheck = await client.query(
            'SELECT seat_id FROM locked_seats WHERE showing_id = $1 AND seat_id = ANY($2)',
            [showingId, seats]
        );
        if (lockedCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            const taken = lockedCheck.rows.map(r => r.seat_id).join(', ');
            return res.status(409).json({ error: `Seat(s) ${taken} are reserved or locked by admin.` });
        }

        const bookedCheck = await client.query(
            'SELECT unnest(seats) as seat_id FROM bookings WHERE showing_id = $1 AND seats && $2',
            [showingId, seats]
        );
        if (bookedCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            const taken = bookedCheck.rows.map(r => r.seat_id).join(', ');
            return res.status(409).json({ error: `Seat(s) ${taken} have already been booked.` });
        }

        // Generate unique reference code and ID
        let refCode = generateRefCode();
        let unique = false;
        while (!unique) {
            const checkRef = await client.query('SELECT id FROM bookings WHERE ref_code = $1', [refCode]);
            if (checkRef.rows.length === 0) {
                unique = true;
            } else {
                refCode = generateRefCode();
            }
        }

        const idRes = await client.query('SELECT gen_random_uuid() as uuid');
        const bookingId = idRes.rows[0].uuid;

        // Generate HMAC signed ticket token
        const qrToken = signTicket(bookingId, refCode, userUsn.trim().toUpperCase(), showingId, seats);

        // Generate QR code Data URI
        const qrDataUri = await QRCode.toDataURL(qrToken, {
            errorCorrectionLevel: 'H',
            margin: 1,
            color: {
                dark: '#000000',
                light: '#ffffff'
            },
            width: 250
        });

        // Insert booking record
        const insertRes = await client.query(
            `INSERT INTO bookings 
             (id, ref_code, showing_id, movie_id, user_name, user_usn, user_email, seats, qr_token)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [
                bookingId,
                refCode,
                showingId,
                showing.movie_id,
                userName.trim(),
                userUsn.trim().toUpperCase(),
                userEmail.trim().toLowerCase(),
                seats,
                qrToken
            ]
        );

        await client.query('COMMIT');

        const booking = insertRes.rows[0];

        // Format show date (without Friday!)
        const dateObj = new Date(showing.show_date);
        const dateStr = dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

        // Trigger asynchronous email dispatch (fire-and-forget in isolated try/catch)
        sendTicketEmail({
            recipientEmail: booking.user_email,
            attendeeName: booking.user_name,
            filmTitle: showing.movie_title,
            showDate: dateStr,
            showTime: showing.show_time,
            hall: showing.hall,
            seats: booking.seats,
            refCode: booking.ref_code,
            qrDataUri
        }).catch(e => console.error('[Background Email Error]', e));

        res.status(201).json({
            success: true,
            booking: {
                id: booking.id,
                refCode: booking.ref_code,
                filmTitle: showing.movie_title,
                hall: showing.hall,
                showDate: dateStr,
                showTime: showing.show_time,
                userName: booking.user_name,
                userUsn: booking.user_usn,
                userEmail: booking.user_email,
                seats: booking.seats,
                createdAt: booking.created_at
            },
            qrDataUri,
            qrToken
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error processing booking:', err);
        res.status(500).json({ error: 'Failed to complete booking: ' + err.message });
    } finally {
        client.release();
    }
});

// Admin: Door Scanner Ticket Verification
app.post('/api/bookings/verify', requireAdmin, async (req, res) => {
    try {
        const qrToken = req.body.qrToken || req.body.token;
        const usn = req.body.usn || req.body.userUsn;
        const refCode = req.body.refCode || req.body.ref_code;

        let booking = null;

        if (qrToken) {
            // Verify HMAC signature
            const ver = verifyTicket(qrToken);
            if (!ver.valid) {
                return res.status(400).json({
                    valid: false,
                    tampered: true,
                    message: `Security Check Failed: ${ver.error}`
                });
            }
            const { bId } = ver.payload;
            const { rows } = await query(
                `SELECT b.*, m.title as film_title, s.show_date, s.show_time, s.hall
                 FROM bookings b
                 JOIN movies m ON b.movie_id = m.id
                 JOIN showings s ON b.showing_id = s.id
                 WHERE b.id = $1`,
                [bId]
            );
            if (!rows.length) {
                return res.status(404).json({ valid: false, message: 'Ticket record not found in database' });
            }
            booking = rows[0];
        } else if (usn) {
            const { rows } = await query(
                `SELECT b.*, m.title as film_title, s.show_date, s.show_time, s.hall
                 FROM bookings b
                 JOIN movies m ON b.movie_id = m.id
                 JOIN showings s ON b.showing_id = s.id
                 WHERE b.user_usn = $1
                 ORDER BY b.created_at DESC LIMIT 1`,
                [usn.trim().toUpperCase()]
            );
            if (!rows.length) {
                return res.status(404).json({ valid: false, message: `No ticket found for USN: ${usn}` });
            }
            booking = rows[0];
        } else if (refCode) {
            const { rows } = await query(
                `SELECT b.*, m.title as film_title, s.show_date, s.show_time, s.hall
                 FROM bookings b
                 JOIN movies m ON b.movie_id = m.id
                 JOIN showings s ON b.showing_id = s.id
                 WHERE b.ref_code = $1`,
                [refCode.trim().toUpperCase()]
            );
            if (!rows.length) {
                return res.status(404).json({ valid: false, message: `No ticket found for Reference: ${refCode}` });
            }
            booking = rows[0];
        } else {
            return res.status(400).json({ error: 'Provide qrToken, usn, or refCode to verify' });
        }

        // Check if already checked in
        if (booking.checked_in) {
            return res.status(409).json({
                valid: false,
                duplicate: true,
                message: `⚠️ ALREADY CHECKED IN at ${new Date(booking.checked_in_at).toLocaleTimeString()}`,
                booking: {
                    refCode: booking.ref_code,
                    userName: booking.user_name,
                    userUsn: booking.user_usn,
                    filmTitle: booking.film_title,
                    seats: booking.seats,
                    checkedInAt: booking.checked_in_at
                }
            });
        }

        // Mark as checked in
        const updateRes = await query(
            'UPDATE bookings SET checked_in = true, checked_in_at = NOW() WHERE id = $1 RETURNING *',
            [booking.id]
        );

        res.json({
            valid: true,
            message: `✅ ADMISSION CONFIRMED — Welcome ${booking.user_name}!`,
            booking: {
                id: booking.id,
                refCode: booking.ref_code,
                userName: booking.user_name,
                userUsn: booking.user_usn,
                userEmail: booking.user_email,
                filmTitle: booking.film_title,
                seats: booking.seats,
                hall: booking.hall,
                showDate: booking.show_date,
                showTime: booking.show_time,
                checkedIn: true,
                checkedInAt: updateRes.rows[0].checked_in_at
            }
        });

    } catch (err) {
        console.error('Error verifying booking:', err);
        res.status(500).json({ error: 'Verification failed: ' + err.message });
    }
});

// Admin: Get all attendee bookings
app.get('/api/admin/bookings', requireAdmin, async (req, res) => {
    try {
        let sql = `
            SELECT b.*, m.title as film_title, s.show_date, s.show_time, s.hall
            FROM bookings b
            JOIN movies m ON b.movie_id = m.id
            JOIN showings s ON b.showing_id = s.id
        `;
        const params = [];
        if (req.query.search) {
            params.push(`%${req.query.search.trim()}%`);
            sql += ` WHERE b.ref_code ILIKE $1 OR b.user_name ILIKE $1 OR b.user_usn ILIKE $1 OR b.user_email ILIKE $1 OR m.title ILIKE $1`;
        }
        sql += ` ORDER BY b.created_at DESC`;

        const { rows } = await query(sql, params);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching admin bookings:', err);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});

// -------------------------------------------------------------
// 5. STATIC FILES & CATCH-ALL
// -------------------------------------------------------------
const rootDir = path.resolve(__dirname, '..');
app.use('/booking', express.static(path.join(rootDir, 'booking')));
app.use('/temp', express.static(path.join(rootDir, 'temp')));
app.use(express.static(rootDir));

app.get('/', (req, res) => {
    res.redirect('/booking/index.html');
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🎬 Daydreamers Film Club API Server listening on http://0.0.0.0:${PORT}`);
    console.log(`   Public Web: http://localhost:${PORT}/booking/screening.html`);
    console.log(`   Admin CMS:  http://localhost:${PORT}/booking/admin.html`);
});
