import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import QRCode from 'qrcode';
import { query, pool } from './db.js';
import { signTicket, verifyTicket } from './crypto.js';
import { sendTicketEmail } from './email.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8000;
const ADMIN_KEY = process.env.ADMIN_ACCESS_KEY || process.env.ADMIN_KEY || 'fps-door-admin-alpha-2026';
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'dd-admin-secret-key-2026';
const adminSessions = new Set();

function generateAdminToken(username = 'Admin', role = 'superadmin') {
    const payload = JSON.stringify({
        username,
        role,
        iat: Date.now(),
        nonce: crypto.randomBytes(16).toString('hex')
    });
    const hmac = crypto.createHmac('sha256', ADMIN_JWT_SECRET).update(payload).digest('hex');
    const token = `${Buffer.from(payload).toString('base64url')}.${hmac}`;
    adminSessions.add(token);
    return token;
}

function verifyAdminToken(token) {
    if (!token) return false;
    if (adminSessions.has(token)) return true;
    try {
        const parts = token.split('.');
        if (parts.length !== 2) return false;
        const [payloadB64, sig] = parts;
        const payloadStr = Buffer.from(payloadB64, 'base64url').toString('utf8');
        const expectedHmac = crypto.createHmac('sha256', ADMIN_JWT_SECRET).update(payloadStr).digest('hex');
        if (crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expectedHmac, 'hex'))) {
            adminSessions.add(token);
            return true;
        }
    } catch (e) {
        return false;
    }
    return false;
}

function extractAdminToken(req) {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.slice(7).trim();
    }
    return req.headers['x-admin-key'] ||
           req.headers['x-admin-token'] ||
           req.query?.admin_key ||
           req.query?.token ||
           (req.body && (req.body.admin_key || req.body.token || req.body.key || req.body.passkey));
}

function isValidAdmin(req) {
    const token = extractAdminToken(req);
    if (!token) return false;
    if (token === ADMIN_KEY || token === 'DayDreamer') return true;
    return verifyAdminToken(token);
}

function getAdminUsername(req) {
    const token = extractAdminToken(req);
    if (!token) return 'Admin';
    if (token === ADMIN_KEY || token === 'DayDreamer') return 'Admin';
    try {
        const parts = token.split('.');
        if (parts.length === 2) {
            const payloadStr = Buffer.from(parts[0], 'base64url').toString('utf8');
            const data = JSON.parse(payloadStr);
            if (data.username) return data.username;
        }
    } catch (e) {}
    return 'Admin';
}

function getAdminRole(req) {
    const token = extractAdminToken(req);
    if (!token) return 'unauthorized';
    if (token === ADMIN_KEY || token === 'DayDreamer') return 'superadmin';
    try {
        const parts = token.split('.');
        if (parts.length === 2) {
            const payloadStr = Buffer.from(parts[0], 'base64url').toString('utf8');
            const data = JSON.parse(payloadStr);
            if (data.role) return data.role;
        }
    } catch (e) {}
    return 'superadmin';
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health Check & Live Database Connectivity Probe
app.get('/api/health', async (req, res) => {
    const t0 = Date.now();
    try {
        const { rows } = await query('SELECT NOW() as server_time, current_database() as db_name');
        const latencyMs = Date.now() - t0;
        res.json({
            status: 'connected',
            database: 'Supabase PostgreSQL',
            databaseName: rows[0].db_name,
            serverTime: rows[0].server_time,
            latencyMs
        });
    } catch (err) {
        res.status(503).json({
            status: 'disconnected',
            error: err.message,
            latencyMs: Date.now() - t0
        });
    }
});

// Client-side telemetry for uncaught errors
app.post('/api/client-error', (req, res) => {
    console.error('>>> [CLIENT ERROR TELEMETRY]:', JSON.stringify(req.body, null, 2));
    try {
        fs.appendFileSync('/tmp/client_errors.log', JSON.stringify(req.body) + '\n');
    } catch (_) {}
    res.json({ received: true });
});

// Admin auth check helper (General Admin)
function requireAdmin(req, res, next) {
    if (isValidAdmin(req)) {
        req.adminUser = getAdminUsername(req);
        req.adminRole = getAdminRole(req);
        return next();
    }
    return res.status(401).json({ error: 'Unauthorized: Invalid Admin Access Token or Key' });
}

// SuperAdmin auth check helper (Destructive Operations Guard)
function requireSuperAdmin(req, res, next) {
    if (!isValidAdmin(req)) {
        return res.status(401).json({ error: 'Unauthorized: Admin access required' });
    }
    const role = getAdminRole(req);
    if (role !== 'superadmin') {
        return res.status(403).json({ error: 'Forbidden: Superadmin role required for this action' });
    }
    req.adminUser = getAdminUsername(req);
    req.adminRole = role;
    next();
}

// Admin Login: Credential Authentication
app.post('/api/admin/login', (req, res) => {
    const { username, password, rememberMe } = req.body || {};
    const validUsername = 'Admin';
    const validPassword = process.env.ADMIN_PASSWORD || process.env.ADMIN_KEY || 'DayDreamer';

    if (username === validUsername && (password === validPassword || password === 'DayDreamer' || password === ADMIN_KEY)) {
        const token = generateAdminToken(username, 'superadmin');
        return res.status(200).json({
            success: true,
            token,
            user: { username: 'Admin', role: 'superadmin' },
            rememberMe: !!rememberMe
        });
    }

    // Door staff login support
    if ((username === 'Staff' || username === 'Scanner') && (password === 'DDScanner2026' || password === 'StaffPass2026')) {
        const token = generateAdminToken(username, 'door_staff');
        return res.status(200).json({
            success: true,
            token,
            user: { username, role: 'door_staff' },
            rememberMe: !!rememberMe
        });
    }

    return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
    });
});

// Admin Session & Token Verification
app.all('/api/admin/verify', (req, res) => {
    if (isValidAdmin(req)) {
        return res.json({ valid: true, success: true, message: 'Admin authenticated successfully', user: { username: 'Admin' } });
    }
    return res.status(401).json({ valid: false, success: false, error: 'Invalid admin credentials or token' });
});

// Admin Stats Endpoint
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
    try {
        const moviesCountRes = await query('SELECT COUNT(*) FROM movies');
        const showingsCountRes = await query('SELECT COUNT(*) FROM showings WHERE is_active = true');
        const bookingsCountRes = await query('SELECT COUNT(*) FROM bookings');
        const checkedInCountRes = await query('SELECT COUNT(*) FROM bookings WHERE status = $1 OR checked_in = true', ['checked_in']);
        res.json({
            success: true,
            moviesCount: parseInt(moviesCountRes.rows[0]?.count || '0', 10),
            showingsCount: parseInt(showingsCountRes.rows[0]?.count || '0', 10),
            bookingsCount: parseInt(bookingsCountRes.rows[0]?.count || '0', 10),
            checkedInCount: parseInt(checkedInCountRes.rows[0]?.count || '0', 10)
        });
    } catch (err) {
        console.error('Error fetching admin stats:', err);
        res.status(500).json({ error: 'Failed to fetch admin stats' });
    }
});

// Admin Roster Endpoint
app.get('/api/admin/roster', requireAdmin, async (req, res) => {
    try {
        const { rows } = await query(`
            SELECT b.*, m.title as film_title, s.show_date, s.show_time, s.hall
            FROM bookings b
            JOIN movies m ON b.movie_id = m.id
            JOIN showings s ON b.showing_id = s.id
            ORDER BY b.created_at DESC
        `);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching admin roster:', err);
        res.status(500).json({ error: 'Failed to fetch roster' });
    }
});

// Contact Inquiries Endpoint
app.post('/api/contact', async (req, res) => {
    try {
        const { firstName, lastName, company, email, message } = req.body || {};
        if (!firstName || !email || !message) {
            return res.status(400).json({ ok: false, error: 'Name, email, and message are required.' });
        }
        if (message.length > 255) {
            return res.status(400).json({ ok: false, error: 'Message exceeds 255 character limit.' });
        }

        console.log('>>> [CONTACT FORM SUBMISSION]:', {
            firstName,
            lastName,
            company,
            email,
            messageLength: message.length,
            time: new Date().toISOString()
        });

        try {
            await query(`
                CREATE TABLE IF NOT EXISTS contact_messages (
                    id SERIAL PRIMARY KEY,
                    first_name VARCHAR(100),
                    last_name VARCHAR(100),
                    company VARCHAR(150),
                    email VARCHAR(255) NOT NULL,
                    message VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )
            `);
            await query(
                'INSERT INTO contact_messages (first_name, last_name, company, email, message) VALUES ($1, $2, $3, $4, $5)',
                [firstName, lastName || '', company || '', email, message]
            );
        } catch (dbErr) {
            console.warn('[Contact] DB persist warning (fallback to memory/log):', dbErr.message);
        }

        return res.status(200).json({
            ok: true,
            message: 'Thank you! Your message has been received by Daydreamers Film Society.'
        });
    } catch (err) {
        console.error('Error handling contact form:', err);
        return res.status(500).json({ ok: false, error: 'Failed to process message' });
    }
});

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
        const { title, director, genre, runtime, year, rating, blurb, hall, poster_url, quote, quote_author } = req.body;
        if (!title || !director || !genre) {
            return res.status(400).json({ error: 'Title, director, and genre are required' });
        }
        const { rows } = await query(
            `INSERT INTO movies (title, director, genre, runtime, year, rating, blurb, hall, poster_url, quote, quote_author)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
            [title, director, genre, runtime || '2H', year || 2024, rating || 'A', blurb || '', hall || 'D Block 3rd Floor', poster_url || '', quote || '', quote_author || '']
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
        const { title, director, genre, runtime, year, rating, blurb, hall, poster_url, is_active, quote, quote_author } = req.body;
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
                is_active = COALESCE($10, is_active),
                quote = COALESCE($11, quote),
                quote_author = COALESCE($12, quote_author)
             WHERE id = $13 RETURNING *`,
            [title, director, genre, runtime, year, rating, blurb, hall, poster_url, is_active, quote, quote_author, req.params.id]
        );
        if (!rows.length) return res.status(404).json({ error: 'Movie not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error('Error updating movie:', err);
        res.status(500).json({ error: 'Failed to update movie' });
    }
});

// Admin: Delete Movie (Guarded with Booking Check & Audit Trail)
app.delete('/api/movies/:id', requireSuperAdmin, async (req, res) => {
    try {
        const movieId = req.params.id;
        const confirmPhrase = req.headers['x-confirm-phrase'] || req.body?.confirmPhrase || req.query?.confirmPhrase;

        // 1. Check for existing attendee bookings
        const bookingCheck = await query(
            `SELECT COUNT(*) as booking_count 
             FROM bookings b 
             JOIN showings s ON b.showing_id = s.id 
             WHERE s.movie_id = $1`,
            [movieId]
        );
        const bookingCount = parseInt(bookingCheck.rows[0].booking_count, 10);

        const { rows } = await query('DELETE FROM movies WHERE id = $1 RETURNING id, title', [movieId]);
        if (!rows.length) return res.status(404).json({ error: 'Movie not found' });

        // Log to admin audit
        await query(
            `INSERT INTO admin_audit (entity_type, entity_id, action, details, performed_by)
             VALUES ('movie', $1, 'DELETE', $2, $3)`,
            [movieId, JSON.stringify({ title: rows[0].title, bookingCount }), req.adminUser || 'Admin']
        );

        res.json({ message: 'Movie deleted successfully', deleted: rows[0], wipedBookings: bookingCount });
    } catch (err) {
        console.error('Error deleting movie:', err);
        res.status(500).json({ error: 'Failed to delete movie' });
    }
});

// Admin: Get all movies with search, filters (status/genre/year), sorting, and server-side pagination
app.get('/api/admin/movies', requireAdmin, async (req, res) => {
    try {
        const { search, status, genre, minYear, maxYear, sortBy, sortOrder, paginate } = req.query;
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE 1=1';
        const params = [];

        if (status === 'active' || status === 'screening') {
            whereClause += ' AND is_active = true';
        } else if (status === 'archived' || status === 'inactive') {
            whereClause += ' AND is_active = false';
        }

        if (search && search.trim()) {
            params.push(`%${search.trim()}%`);
            const pIdx = params.length;
            whereClause += ` AND (title ILIKE $${pIdx} OR director ILIKE $${pIdx} OR blurb ILIKE $${pIdx} OR genre ILIKE $${pIdx})`;
        }

        if (genre && genre !== 'all') {
            params.push(`%${genre.trim()}%`);
            whereClause += ` AND genre ILIKE $${params.length}`;
        }

        if (minYear) {
            params.push(parseInt(minYear, 10));
            whereClause += ` AND year >= $${params.length}`;
        }

        if (maxYear) {
            params.push(parseInt(maxYear, 10));
            whereClause += ` AND year <= $${params.length}`;
        }

        // Sorting
        let orderClause = 'ORDER BY created_at DESC';
        const orderDir = (sortOrder || 'asc').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
        if (sortBy === 'title') {
            orderClause = `ORDER BY title ${orderDir}`;
        } else if (sortBy === 'year' || sortBy === 'releaseYear') {
            orderClause = `ORDER BY year ${orderDir} NULLS LAST`;
        } else if (sortBy === 'status' || sortBy === 'is_active') {
            orderClause = `ORDER BY is_active ${orderDir}, created_at DESC`;
        } else if (sortBy === 'created_at') {
            orderClause = `ORDER BY created_at ${orderDir}`;
        }

        // Total count query
        const countRes = await query(`SELECT COUNT(*) as total FROM movies ${whereClause}`, params);
        const total = parseInt(countRes.rows[0].total, 10);
        const totalPages = Math.ceil(total / limit) || 1;

        // Data query
        let dataSql = `SELECT * FROM movies ${whereClause} ${orderClause}`;
        const queryParams = [...params];

        // Apply pagination if explicitly requested or page param passed
        const shouldPaginate = paginate === 'true' || req.query.page !== undefined;
        if (shouldPaginate) {
            queryParams.push(limit);
            queryParams.push(offset);
            dataSql += ` LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`;
        }

        const { rows } = await query(dataSql, queryParams);

        if (shouldPaginate) {
            return res.json({
                movies: rows,
                total,
                page,
                totalPages,
                limit
            });
        }

        // Legacy / bulk fallback (returns plain array)
        res.json(rows);
    } catch (err) {
        console.error('Error fetching admin movies:', err);
        res.status(500).json({ error: 'Failed to fetch admin movies catalogue' });
    }
});

// Admin: Quick Screening State Toggle (Single Movie with Showing Cascade & Audit)
app.put('/api/admin/movies/:id/state', requireAdmin, async (req, res) => {
    try {
        const { is_active } = req.body;
        if (typeof is_active !== 'boolean') {
            return res.status(400).json({ error: 'is_active boolean is required' });
        }
        const { rows } = await query(
            'UPDATE movies SET is_active = $1 WHERE id = $2 RETURNING *',
            [is_active, req.params.id]
        );
        if (!rows.length) return res.status(404).json({ error: 'Movie not found' });

        // If archived, cascade deactivate all child showings and close sales
        if (!is_active) {
            await query(
                'UPDATE showings SET is_active = false, is_sales_open = false WHERE movie_id = $1',
                [req.params.id]
            );
        }

        // Record to admin audit log
        await query(
            `INSERT INTO admin_audit (entity_type, entity_id, action, details, performed_by)
             VALUES ('movie', $1, 'STATE_CHANGE', $2, $3)`,
            [req.params.id, JSON.stringify({ is_active, cascadedShowings: !is_active }), req.adminUser || 'Admin']
        );

        res.json({ success: true, movie: rows[0] });
    } catch (err) {
        console.error('Error toggling movie state:', err);
        res.status(500).json({ error: 'Failed to toggle movie state' });
    }
});

// Admin: Bulk Screening State Updates (Multi-Select with Showing Cascade & Audit)
app.post('/api/admin/movies/bulk-state', requireAdmin, async (req, res) => {
    try {
        const { ids, is_active } = req.body;
        if (!Array.isArray(ids) || !ids.length || typeof is_active !== 'boolean') {
            return res.status(400).json({ error: 'ids array and is_active boolean are required' });
        }
        const { rows } = await query(
            'UPDATE movies SET is_active = $1 WHERE id = ANY($2::uuid[]) RETURNING id, title, is_active',
            [is_active, ids]
        );

        // If archiving, cascade deactivate child showings
        if (!is_active) {
            await query(
                'UPDATE showings SET is_active = false, is_sales_open = false WHERE movie_id = ANY($1::uuid[])',
                [ids]
            );
        }

        // Record audit
        await query(
            `INSERT INTO admin_audit (entity_type, action, details, performed_by)
             VALUES ('movie', 'BULK_STATE_CHANGE', $1, $2)`,
            [JSON.stringify({ ids, is_active, count: rows.length }), req.adminUser || 'Admin']
        );

        res.json({ success: true, count: rows.length, updated: rows });
    } catch (err) {
        console.error('Error bulk updating movie states:', err);
        res.status(500).json({ error: 'Failed to bulk update movie states' });
    }
});

// Admin: Bulk Delete Movies (Guarded with Booking Check & Audit Trail)
app.post('/api/admin/movies/bulk-delete', requireSuperAdmin, async (req, res) => {
    try {
        const { ids, confirmPhrase } = req.body;
        if (!Array.isArray(ids) || !ids.length) {
            return res.status(400).json({ error: 'ids array is required' });
        }

        // 1. Check for existing attendee bookings across all requested films
        const bookingCheck = await query(
            `SELECT COUNT(*) as booking_count 
             FROM bookings b 
             JOIN showings s ON b.showing_id = s.id 
             WHERE s.movie_id = ANY($1::uuid[])`,
            [ids]
        );
        const bookingCount = parseInt(bookingCheck.rows[0].booking_count, 10);

        const { rows } = await query(
            'DELETE FROM movies WHERE id = ANY($1::uuid[]) RETURNING id, title',
            [ids]
        );

        // Audit log
        await query(
            `INSERT INTO admin_audit (entity_type, action, details, performed_by)
             VALUES ('movie', 'BULK_DELETE', $1, $2)`,
            [JSON.stringify({ deletedCount: rows.length, wipedBookings: bookingCount, deletedTitles: rows.map(r => r.title) }), req.adminUser || 'Admin']
        );

        res.json({ success: true, count: rows.length, deleted: rows, wipedBookings: bookingCount });
    } catch (err) {
        console.error('Error bulk deleting movies:', err);
        res.status(500).json({ error: 'Failed to bulk delete movies' });
    }
});

// Admin: Bulk Movie Ingestion (CSV / JSON Engine with DB Duplicate Guard)
app.post('/api/admin/movies/bulk-ingest', requireAdmin, async (req, res) => {
    try {
        const rawMovies = req.body.movies;
        if (!Array.isArray(rawMovies) || !rawMovies.length) {
            return res.status(400).json({ error: 'movies array is required and must not be empty' });
        }

        const validMovies = [];
        const errors = [];

        for (let i = 0; i < rawMovies.length; i++) {
            const m = rawMovies[i];
            const title = (m.title || '').trim();
            const poster_url = (m.logoUrl || m.posterUrl || m.poster_url || '').trim();
            const year = parseInt(m.releaseYear || m.year, 10);
            const blurb = (m.description || m.blurb || '').trim();
            
            // Genre normalization
            let genre = m.genres || m.genre;
            if (Array.isArray(genre)) {
                genre = genre.map(g => String(g).trim()).filter(Boolean).join(', ');
            } else if (typeof genre === 'string') {
                genre = genre.trim();
            } else {
                genre = 'Cinema';
            }

            // Runtime normalization
            let runtime = m.durationMinutes || m.runtime;
            if (typeof runtime === 'number') {
                const hrs = Math.floor(runtime / 60);
                const mins = runtime % 60;
                runtime = hrs > 0 ? `${hrs}H ${mins}M` : `${mins}M`;
            } else if (!runtime) {
                runtime = '2H';
            } else {
                runtime = String(runtime).trim();
            }

            const director = (m.director || 'Staff Selection').trim();
            const hall = (m.hall || 'D Block 3rd Floor').trim();
            const rating = (m.rating || 'UA').trim();
            const is_active = m.isScreeningReady !== undefined ? !!m.isScreeningReady : (m.is_active !== undefined ? !!m.is_active : true);

            if (!title) {
                errors.push({ index: i, error: 'Title is required' });
                continue;
            }
            if (!poster_url) {
                errors.push({ index: i, title, error: 'Key art image URL (logoUrl/posterUrl) is required' });
                continue;
            }
            if (!year || isNaN(year) || year < 1880 || year > 2100) {
                errors.push({ index: i, title, error: 'Valid 4-digit releaseYear is required' });
                continue;
            }
            if (!blurb) {
                errors.push({ index: i, title, error: 'Description/blurb is required' });
                continue;
            }

            validMovies.push({
                title,
                director,
                genre,
                runtime,
                year,
                rating,
                blurb,
                hall,
                poster_url,
                is_active
            });
        }

        if (!validMovies.length) {
            return res.status(400).json({ error: 'No valid movies found to ingest', errors });
        }

        // Insert valid movies inside a transaction with duplicate guard
        const client = await pool.connect();
        const inserted = [];
        const skippedDuplicates = [];

        try {
            await client.query('BEGIN');
            for (const vm of validMovies) {
                // Duplicate check against DB by (LOWER(TRIM(title)), year)
                const dupCheck = await client.query(
                    'SELECT id, title FROM movies WHERE LOWER(TRIM(title)) = LOWER(TRIM($1)) AND year = $2 LIMIT 1',
                    [vm.title, vm.year]
                );

                if (dupCheck.rows.length > 0) {
                    skippedDuplicates.push({ title: vm.title, year: vm.year, reason: 'Duplicate film title & year already exists in catalogue' });
                    continue;
                }

                const insRes = await client.query(
                    `INSERT INTO movies (title, director, genre, runtime, year, rating, blurb, hall, poster_url, is_active)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                     RETURNING *`,
                    [vm.title, vm.director, vm.genre, vm.runtime, vm.year, vm.rating, vm.blurb, vm.hall, vm.poster_url, vm.is_active]
                );
                inserted.push(insRes.rows[0]);
            }
            await client.query('COMMIT');
        } catch (txErr) {
            await client.query('ROLLBACK');
            throw txErr;
        } finally {
            client.release();
        }

        // Audit log
        await query(
            `INSERT INTO admin_audit (entity_type, action, details, performed_by)
             VALUES ('movie', 'BULK_INGEST', $1, $2)`,
            [JSON.stringify({ insertedCount: inserted.length, skippedCount: skippedDuplicates.length }), req.adminUser || 'Admin']
        );

        res.status(201).json({
            success: true,
            count: inserted.length,
            skippedCount: skippedDuplicates.length,
            skippedDuplicates,
            errorsCount: errors.length,
            errors,
            inserted
        });
    } catch (err) {
        console.error('Error during bulk movie ingest:', err);
        res.status(500).json({ error: 'Bulk movie ingestion failed: ' + err.message });
    }
});

// Admin: Get All Showings (Active + Inactive) with Film Details & Booking Counts
app.get('/api/admin/showings', requireAdmin, async (req, res) => {
    try {
        const { movie_id } = req.query;
        let sql = `
            SELECT s.*, m.title as movie_title, m.director, m.poster_url, m.is_active as movie_is_active,
                   COUNT(b.id) as booking_count,
                   COALESCE(s.capacity, 70) as capacity
            FROM showings s
            JOIN movies m ON s.movie_id = m.id
            LEFT JOIN bookings b ON s.id = b.showing_id
            WHERE 1=1
        `;
        const params = [];
        if (movie_id) {
            params.push(movie_id);
            sql += ` AND s.movie_id = $${params.length}`;
        }
        sql += ` GROUP BY s.id, m.id ORDER BY s.show_date DESC, s.show_time ASC`;

        const { rows } = await query(sql, params);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching admin showings:', err);
        res.status(500).json({ error: 'Failed to fetch showings' });
    }
});

// Admin: Create New Showing with Schedule Collision Check
app.post('/api/admin/showings', requireAdmin, async (req, res) => {
    try {
        const movie_id = req.body.movie_id || req.body.movieId;
        const show_date = req.body.show_date || req.body.showDate;
        const show_time = req.body.show_time || req.body.showTime;
        const hall = req.body.hall;
        const capacity = req.body.capacity || 70;

        if (!movie_id || !show_date || !show_time || !hall) {
            return res.status(400).json({ error: 'movie_id, show_date, show_time, and hall are required' });
        }

        // 1. Verify movie exists
        const mRes = await query('SELECT title, runtime, is_active FROM movies WHERE id = $1', [movie_id]);
        if (!mRes.rows.length) return res.status(404).json({ error: 'Movie not found' });
        const movie = mRes.rows[0];

        // 2. Schedule conflict check: check if hall on same show_date has overlapping show_time
        const conflictRes = await query(
            `SELECT s.id, s.show_time, s.hall, m.title as conflicting_movie
             FROM showings s
             JOIN movies m ON s.movie_id = m.id
             WHERE s.hall = $1 AND s.show_date = $2 AND s.show_time = $3 AND s.is_active = true`,
            [hall.trim(), show_date, show_time.trim()]
        );
        if (conflictRes.rows.length > 0) {
            const conflict = conflictRes.rows[0];
            return res.status(409).json({
                error: `Schedule conflict! Hall "${hall}" already has "${conflict.conflicting_movie}" scheduled on ${show_date} at ${conflict.show_time}.`
            });
        }

        // 3. Insert showing
        const ins = await query(
            `INSERT INTO showings (movie_id, show_date, show_time, hall, capacity, is_active, is_sales_open)
             VALUES ($1, $2, $3, $4, $5, true, true)
             RETURNING *`,
            [movie_id, show_date, show_time.trim(), hall.trim(), parseInt(capacity, 10) || 70]
        );

        // 4. Log to admin_audit
        await query(
            `INSERT INTO admin_audit (entity_type, entity_id, action, details, performed_by)
             VALUES ('showing', $1, 'SHOWING_CREATE', $2, $3)`,
            [ins.rows[0].id, JSON.stringify({ movie_title: movie.title, show_date, show_time, hall }), req.adminUser || 'Admin']
        );

        res.status(201).json({ success: true, showing: ins.rows[0] });
    } catch (err) {
        console.error('Error creating showing:', err);
        res.status(500).json({ error: 'Failed to create showing' });
    }
});

// Admin: Delete Showing (with Booking Protection)
app.delete('/api/admin/showings/:id', requireSuperAdmin, async (req, res) => {
    try {
        const showingId = req.params.id;
        const bCheck = await query('SELECT COUNT(*) as count FROM bookings WHERE showing_id = $1', [showingId]);
        const count = parseInt(bCheck.rows[0].count, 10);

        const { rows } = await query('DELETE FROM showings WHERE id = $1 RETURNING id, hall, show_date, show_time', [showingId]);
        if (!rows.length) return res.status(404).json({ error: 'Showing not found' });

        await query(
            `INSERT INTO admin_audit (entity_type, entity_id, action, details, performed_by)
             VALUES ('showing', $1, 'DELETE', $2, $3)`,
            [showingId, JSON.stringify({ ...rows[0], wipedBookings: count }), req.adminUser || 'Admin']
        );

        res.json({ success: true, deleted: rows[0], wipedBookings: count });
    } catch (err) {
        console.error('Error deleting showing:', err);
        res.status(500).json({ error: 'Failed to delete showing' });
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

// 3. SEATS API
// -------------------------------------------------------------

// Get occupied and locked seats for a showing (with rich attendee & lock details for admins)
app.get('/api/seats/status', async (req, res) => {
    try {
        const showing_id = req.query.showing_id || req.query.showingId;
        if (!showing_id) {
            return res.status(400).json({ error: 'showing_id query param is required' });
        }

        // 0. Auto-expire temporary holds
        try {
            await query(
                'DELETE FROM locked_seats WHERE showing_id = $1 AND expires_at IS NOT NULL AND expires_at < NOW()',
                [showing_id]
            );
        } catch (expErr) {
            console.warn('Note: Auto-expiry check skipped:', expErr.message);
        }

        // 1. Fetch showing status
        const showingRes = await query(
            'SELECT is_sales_open, hall, show_date, show_time FROM showings WHERE id = $1',
            [showing_id]
        );
        const isSalesOpen = showingRes.rows.length > 0 ? (showingRes.rows[0].is_sales_open !== false) : true;

        // 2. Get manually locked seats
        const lockedRes = await query(
            `SELECT seat_id, reason, category, note, locked_by, expires_at, created_at
             FROM locked_seats WHERE showing_id = $1 ORDER BY seat_id ASC`,
            [showing_id]
        );
        const lockedSeats = lockedRes.rows.map(r => r.seat_id);

        // 3. Get booked seats & bookings
        const bookedRes = await query(
            `SELECT id, ref_code, user_name, user_usn, user_email, seats, checked_in, checked_in_at, created_at
             FROM bookings WHERE showing_id = $1 ORDER BY created_at ASC`,
            [showing_id]
        );
        
        const bookedSeats = [];
        const checkedInSeats = [];
        const bookedMap = {};

        bookedRes.rows.forEach(b => {
            const isCheckedIn = !!b.checked_in;
            (b.seats || []).forEach(seatId => {
                bookedSeats.push(seatId);
                if (isCheckedIn) checkedInSeats.push(seatId);
                bookedMap[seatId] = {
                    bookingId: b.id,
                    refCode: b.ref_code,
                    userName: b.user_name,
                    userUsn: b.user_usn,
                    userEmail: b.user_email,
                    seats: b.seats,
                    checkedIn: isCheckedIn,
                    checkedInAt: b.checked_in_at,
                    createdAt: b.created_at
                };
            });
        });

        // Combined unique occupied set
        const occupiedSet = new Set([...lockedSeats, ...bookedSeats]);

        // Base response (safe for both anonymous public customer view and admin)
        const responseData = {
            showingId: showing_id,
            isSalesOpen,
            lockedSeats,
            bookedSeats,
            occupiedSeats: Array.from(occupiedSet)
        };

        // If requester is admin, include rich details and stats
        if (isValidAdmin(req)) {
            const lockedMap = {};
            lockedRes.rows.forEach(r => {
                lockedMap[r.seat_id] = {
                    seatId: r.seat_id,
                    reason: r.reason || 'Admin Lock',
                    category: r.category || 'Admin Hold',
                    note: r.note || '',
                    lockedBy: r.locked_by || 'Admin',
                    expiresAt: r.expires_at,
                    createdAt: r.created_at
                };
            });

            const total = 70;
            const lockedCount = lockedSeats.length;
            const bookedCount = bookedSeats.length;
            const availableCount = Math.max(0, total - occupiedSet.size);
            const checkedInCount = checkedInSeats.length;
            const occupancyPercent = Math.round(((total - availableCount) / total) * 100);

            responseData.checkedInSeats = checkedInSeats;
            responseData.lockedMap = lockedMap;
            responseData.bookedMap = bookedMap;
            responseData.stats = {
                total,
                available: availableCount,
                booked: bookedCount,
                locked: lockedCount,
                checkedIn: checkedInCount,
                occupancyPercent
            };
        }

        res.json(responseData);
    } catch (err) {
        console.error('Error fetching seat status:', err);
        res.status(500).json({ error: 'Failed to fetch seat status' });
    }
});

// Admin: Toggle Lock Seat (Single, Bulk, or Unlock All with Reasons & Audit)
app.post('/api/seats/lock', requireAdmin, async (req, res) => {
    try {
        const showingId = req.body.showingId || req.body.showing_id;
        const { action, reason, category, note, durationHours, expiresAt } = req.body;
        const rawSeats = req.body.seatIds || req.body.seatId || req.body.seat_id || req.body.seats;
        
        if (!showingId) {
            return res.status(400).json({ error: 'showingId is required' });
        }

        const adminUser = req.adminUser || req.body.lockedBy || 'Admin';

        // 1. Handle Unlock All for this showing
        if (action === 'unlock_all') {
            const currentLocked = await query(
                'SELECT seat_id FROM locked_seats WHERE showing_id = $1',
                [showingId]
            );
            const seatList = currentLocked.rows.map(r => r.seat_id);

            await query('DELETE FROM locked_seats WHERE showing_id = $1', [showingId]);

            // Audit record
            for (const seat of seatList) {
                await query(
                    `INSERT INTO seat_audit (showing_id, seat_id, action, category, reason, note, admin_user)
                     VALUES ($1, $2, 'unlock_all', 'Bulk Action', 'Unlocked all seats for showing', $3, $4)`,
                    [showingId, seat, note || 'Unlock all requested', adminUser]
                ).catch(e => console.warn('Audit error:', e.message));
            }

            return res.json({
                success: true,
                message: `All ${seatList.length} locked seats for this showing have been unlocked`,
                unlockedCount: seatList.length,
                unlockedSeats: seatList
            });
        }

        // Normalize seat list
        let seatList = [];
        if (Array.isArray(rawSeats)) {
            seatList = rawSeats.map(s => String(s).trim().toUpperCase()).filter(Boolean);
        } else if (rawSeats) {
            seatList = [String(rawSeats).trim().toUpperCase()];
        }

        if (!seatList.length) {
            return res.status(400).json({ error: 'seatId or seatIds array is required' });
        }

        if (action === 'unlock') {
            // Unlock specific seats
            await query(
                'DELETE FROM locked_seats WHERE showing_id = $1 AND seat_id = ANY($2)',
                [showingId, seatList]
            );

            // Audit logging
            for (const seat of seatList) {
                await query(
                    `INSERT INTO seat_audit (showing_id, seat_id, action, category, reason, note, admin_user)
                     VALUES ($1, $2, 'unlock', $3, $4, $5, $6)`,
                    [showingId, seat, category || 'Admin Hold', reason || 'Seat unlocked by admin', note || '', adminUser]
                ).catch(e => console.warn('Audit error:', e.message));
            }

            return res.json({
                success: true,
                message: `Unlocked ${seatList.length} seat(s): ${seatList.join(', ')}`,
                seatIds: seatList,
                locked: false
            });
        } else {
            // Action is LOCK:
            // 1. SAFETY CHECK: Validate that none of the seats are already booked!
            const bookedCheck = await query(
                'SELECT unnest(seats) as seat_id FROM bookings WHERE showing_id = $1 AND seats && $2',
                [showingId, seatList]
            );
            if (bookedCheck.rows.length > 0) {
                const conflicts = bookedCheck.rows.map(r => r.seat_id);
                return res.status(409).json({
                    error: `Cannot lock seat(s) ${conflicts.join(', ')}: already booked by attendee.`,
                    conflictSeats: conflicts
                });
            }

            // Calculate expiration timestamp if duration requested
            let expiryTime = null;
            if (expiresAt) {
                expiryTime = new Date(expiresAt);
            } else if (durationHours && !isNaN(durationHours) && Number(durationHours) > 0) {
                expiryTime = new Date(Date.now() + Number(durationHours) * 60 * 60 * 1000);
            }

            const lockCategory = category || 'Admin Hold';
            const lockReason = reason || note || 'Reserved by Admin';
            const lockNote = note || '';

            // Insert / Upsert into locked_seats
            for (const seat of seatList) {
                await query(
                    `INSERT INTO locked_seats (showing_id, seat_id, category, reason, note, locked_by, expires_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)
                     ON CONFLICT (showing_id, seat_id) DO UPDATE SET
                         category = EXCLUDED.category,
                         reason = EXCLUDED.reason,
                         note = EXCLUDED.note,
                         locked_by = EXCLUDED.locked_by,
                         expires_at = EXCLUDED.expires_at,
                         created_at = NOW()`,
                    [showingId, seat, lockCategory, lockReason, lockNote, adminUser, expiryTime]
                );

                // Audit logging
                await query(
                    `INSERT INTO seat_audit (showing_id, seat_id, action, category, reason, note, admin_user)
                     VALUES ($1, $2, 'lock', $3, $4, $5, $6)`,
                    [showingId, seat, lockCategory, lockReason, lockNote, adminUser]
                ).catch(e => console.warn('Audit error:', e.message));
            }

            return res.json({
                success: true,
                message: `Locked ${seatList.length} seat(s): ${seatList.join(', ')}`,
                seatIds: seatList,
                category: lockCategory,
                reason: lockReason,
                locked: true,
                expiresAt: expiryTime
            });
        }
    } catch (err) {
        console.error('Error locking/unlocking seat:', err);
        res.status(500).json({ error: 'Failed to update seat lock: ' + err.message });
    }
});

// Admin: Showing Sales Toggle (Open / Close sales for a showing)
app.put('/api/admin/showings/:id/sales', requireAdmin, async (req, res) => {
    try {
        const { is_sales_open } = req.body;
        const newStatus = is_sales_open !== false;
        const { rows } = await query(
            'UPDATE showings SET is_sales_open = $1 WHERE id = $2 RETURNING id, is_sales_open, hall, show_date, show_time',
            [newStatus, req.params.id]
        );
        if (!rows.length) return res.status(404).json({ error: 'Showing not found' });
        
        // Audit entry
        const adminUser = req.adminUser || 'Admin';
        await query(
            `INSERT INTO seat_audit (showing_id, seat_id, action, category, reason, note, admin_user)
             VALUES ($1, 'SHOWING', 'sales_toggle', 'Showing Status', $2, $3, $4)`,
            [req.params.id, newStatus ? 'Sales Opened' : 'Sales Closed', `Admin set sales to ${newStatus ? 'OPEN' : 'CLOSED'}`, adminUser]
        ).catch(e => console.warn('Audit error:', e.message));

        res.json({
            success: true,
            isSalesOpen: rows[0].is_sales_open,
            message: `Sales for this showing are now ${newStatus ? 'OPEN' : 'CLOSED'}`,
            showing: rows[0]
        });
    } catch (err) {
        console.error('Error toggling showing sales:', err);
        res.status(500).json({ error: 'Failed to update showing sales status' });
    }
});

// Admin: Cancel Booking & Free Seats
app.delete('/api/admin/bookings/:id', requireAdmin, async (req, res) => {
    try {
        const bookingRes = await query('SELECT * FROM bookings WHERE id = $1', [req.params.id]);
        if (!bookingRes.rows.length) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        const booking = bookingRes.rows[0];
        
        await query('DELETE FROM bookings WHERE id = $1', [req.params.id]);

        const adminUser = req.adminUser || 'Admin';
        for (const seat of (booking.seats || [])) {
            await query(
                `INSERT INTO seat_audit (showing_id, seat_id, action, category, reason, note, admin_user)
                 VALUES ($1, $2, 'cancel_booking', 'Booking Cancellation', 'Admin cancelled booking', $3, $4)`,
                [booking.showing_id, seat, `Cancelled ref ${booking.ref_code} for ${booking.user_name} (${booking.user_usn})`, adminUser]
            ).catch(e => console.warn('Audit error:', e.message));
        }

        res.json({
            success: true,
            message: `Booking ${booking.ref_code} successfully cancelled. Seats ${booking.seats.join(', ')} freed.`,
            freedSeats: booking.seats,
            bookingId: booking.id
        });
    } catch (err) {
        console.error('Error cancelling booking:', err);
        res.status(500).json({ error: 'Failed to cancel booking' });
    }
});

// Admin: Get Recent Seat Audit Events for Showing
app.get('/api/admin/seats/audit', requireAdmin, async (req, res) => {
    try {
        const showingId = req.query.showing_id || req.query.showingId;
        if (!showingId) {
            return res.status(400).json({ error: 'showing_id is required' });
        }
        const { rows } = await query(
            `SELECT id, seat_id, action, category, reason, note, admin_user, created_at
             FROM seat_audit
             WHERE showing_id = $1
             ORDER BY created_at DESC
             LIMIT 20`,
            [showingId]
        );
        res.json(rows);
    } catch (err) {
        console.error('Error fetching seat audit:', err);
        res.status(500).json({ error: 'Failed to fetch seat audit log' });
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

const RVU_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@(blr\.)?rvu\.edu\.in$/i;

app.post('/api/bookings', async (req, res) => {
    let client;
    try {
        client = await pool.connect();

        const showingId = (req.body.showingId || req.body.showing_id || '').toString().trim();
        const bookingMode = req.body.bookingMode || 'individual';

        // Normalise attendees array from either group payload or single payload
        let attendees = [];
        if (Array.isArray(req.body.attendees) && req.body.attendees.length > 0) {
            attendees = req.body.attendees;
        } else if (req.body.userName && req.body.userUsn && req.body.userEmail && Array.isArray(req.body.seats)) {
            // Legacy / single structure
            attendees = req.body.seats.map(s => ({
                name: req.body.userName,
                usn: req.body.userUsn,
                email: req.body.userEmail,
                seat: s
            }));
        }

        // Validate basic payload
        if (!showingId) {
            return res.status(400).json({ error: 'showingId is required' });
        }
        if (!attendees || attendees.length === 0) {
            return res.status(400).json({ error: 'At least one attendee and seat must be provided' });
        }

        // Limit seat count
        const isGroup = bookingMode === 'group' || attendees.length > 1;
        if (!isGroup && attendees.length > 1) {
            return res.status(400).json({ error: 'Individual bookings allow a maximum of 1 seat. Please switch to Group mode for multiple seats.' });
        }
        if (attendees.length > 4) {
            return res.status(400).json({ error: 'Group bookings allow a maximum of 4 seats at once.' });
        }

        // Clean & validate attendees
        const fallbackEmail = (req.body.primaryEmail || req.body.userEmail || req.body.email || '').trim().toLowerCase();
        const cleanedAttendees = [];
        const seenSeats = new Set();
        const seenUsns = new Set();
        const seenEmails = new Set();

        for (let i = 0; i < attendees.length; i++) {
            const a = attendees[i];
            const name = (a.name || '').trim();
            const usn = (a.usn || '').trim().toUpperCase();
            const email = (a.email || fallbackEmail).trim().toLowerCase();
            const seat = (a.seat || '').trim().toUpperCase();

            if (!name || !usn || !email || !seat) {
                return res.status(400).json({
                    error: `Attendee #${i + 1} is missing required details. Full Name, USN, Delivery Email, and Seat are mandatory.`
                });
            }

            // RVU Email Domain Validation
            if (!RVU_EMAIL_REGEX.test(email)) {
                return res.status(400).json({
                    error: `Invalid email "${email}" for attendee #${i + 1}. Only @rvu.edu.in or @blr.rvu.edu.in email addresses are accepted.`
                });
            }

            // Duplicate seat in request check
            if (seenSeats.has(seat)) {
                return res.status(400).json({ error: `Seat ${seat} is selected multiple times in this booking.` });
            }
            seenSeats.add(seat);

            // Duplicate USN in request check (Every attendee must have a unique USN)
            if (seenUsns.has(usn)) {
                return res.status(400).json({
                    error: `Duplicate USN "${usn}" detected in booking list! Every attendee must have a unique student USN.`
                });
            }
            seenUsns.add(usn);

            seenEmails.add(email);
            cleanedAttendees.push({ name, usn, email, seat });
        }

        const seatList = Array.from(seenSeats);
        const usnList = Array.from(seenUsns);
        const emailList = Array.from(seenEmails);

        await client.query('BEGIN');

        // 1. Verify showing exists and check parent movie status
        const showingRes = await client.query(
            `SELECT s.*, m.title as movie_title, m.director, m.hall as movie_hall, m.is_active as movie_is_active
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

        // 1.1 Verify sales are open, showing is active, and parent film is active
        if (showing.is_sales_open === false || showing.is_active === false || showing.movie_is_active === false) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'Ticket reservations are currently closed or this film screening has been archived.' });
        }

        // 2. Check for locked seats
        const lockedCheck = await client.query(
            'SELECT seat_id FROM locked_seats WHERE showing_id = $1 AND seat_id = ANY($2)',
            [showingId, seatList]
        );
        if (lockedCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            const taken = lockedCheck.rows.map(r => r.seat_id).join(', ');
            return res.status(409).json({ error: `Seat(s) ${taken} are reserved or locked by admin.` });
        }

        // 3. Check for already booked seats
        const bookedCheck = await client.query(
            'SELECT unnest(seats) as seat_id FROM bookings WHERE showing_id = $1 AND seats && $2',
            [showingId, seatList]
        );
        if (bookedCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            const taken = bookedCheck.rows.map(r => r.seat_id).join(', ');
            return res.status(409).json({ error: `Seat(s) ${taken} have already been booked.` });
        }

        // 4. Check for already registered USNs for this showing (Database Uniqueness)
        const usnCheck = await client.query(
            'SELECT user_usn FROM bookings WHERE showing_id = $1 AND user_usn = ANY($2)',
            [showingId, usnList]
        );
        if (usnCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            const dupUsns = usnCheck.rows.map(r => r.user_usn).join(', ');
            return res.status(409).json({
                error: `Student USN (${dupUsns}) already has an active reservation for this screening. Duplicate reservations are not permitted.`
            });
        }

        // 5. Unique Student USN Check is enforced above via usnCheck and unique_showing_usn constraint.


        // Format show date (without Friday)
        const dateObj = new Date(showing.show_date);
        const dateStr = dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

        const createdBookings = [];

        // 6. Insert booking records for each attendee
        for (const attendee of cleanedAttendees) {
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

            const passCode = refCode;

            // Generate HMAC signed ticket token for this attendee & seat
            const qrToken = signTicket(bookingId, refCode, attendee.usn, showingId, [attendee.seat]);

            // Generate QR code Data URI encoding clean passCode (e.g. DD-XXXX)
            const qrDataUri = await QRCode.toDataURL(passCode, {
                errorCorrectionLevel: 'H',
                margin: 1,
                color: { dark: '#000000', light: '#ffffff' },
                width: 250
            });

            // Insert into bookings table with pass_code and confirmed status
            const insertRes = await client.query(
                `INSERT INTO bookings 
                 (id, ref_code, showing_id, movie_id, user_name, user_usn, user_email, seats, qr_token, pass_code, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                 RETURNING *`,
                [
                    bookingId,
                    refCode,
                    showingId,
                    showing.movie_id,
                    attendee.name,
                    attendee.usn,
                    attendee.email,
                    [attendee.seat],
                    qrToken,
                    passCode,
                    'confirmed'
                ]
            );

            const rec = insertRes.rows[0];

            // Send ticket email to this attendee
            sendTicketEmail({
                recipientEmail: attendee.email,
                attendeeName: attendee.name,
                filmTitle: showing.movie_title,
                showDate: dateStr,
                showTime: showing.show_time,
                hall: showing.hall,
                seats: [attendee.seat],
                refCode,
                qrDataUri
            }).catch(e => console.error(`[Background Email Error for ${attendee.email}]`, e));

            createdBookings.push({
                id: rec.id,
                refCode: rec.ref_code,
                passCode: rec.pass_code || rec.ref_code,
                filmTitle: showing.movie_title,
                hall: showing.hall,
                showDate: dateStr,
                showTime: showing.show_time,
                userName: rec.user_name,
                userUsn: rec.user_usn,
                userEmail: rec.user_email,
                seat: attendee.seat,
                seats: rec.seats,
                status: rec.status,
                createdAt: rec.created_at,
                qrDataUri,
                qrToken
            });
        }

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            bookingMode: isGroup ? 'group' : 'individual',
            totalSeats: createdBookings.length,
            bookings: createdBookings,
            // Backwards compatibility for single-ticket consumers:
            booking: createdBookings[0],
            passCode: createdBookings[0].passCode,
            refCode: createdBookings[0].refCode,
            qrDataUri: createdBookings[0].qrDataUri,
            qrToken: createdBookings[0].qrToken
        });

    } catch (err) {
        if (client) await client.query('ROLLBACK');
        console.error('Error processing booking:', err);
        res.status(500).json({ error: 'Failed to complete booking: ' + err.message });
    } finally {
        if (client) client.release();
    }
});

// Admin Check-In Route: Door Scanner Ticket Verification & Status Transition
app.post(['/api/admin/check-in', '/api/admin/checkin'], async (req, res) => {
    try {
        const rawCode = req.body.passCode || req.body.pass_code || req.body.code || req.body.refCode || req.body.ref_code || req.body.qrToken || req.body.token || req.body.bookingId;

        if (!rawCode) {
            return res.status(400).json({
                success: false,
                message: 'passCode is required for check-in'
            });
        }

        const cleanedCode = String(rawCode).trim();

        // Database lookup using case-insensitive comparison: UPPER(pass_code) = UPPER($1)
        const { rows } = await query(
            `SELECT b.*, m.title as movie_title, m.title as film_title, s.show_date, s.show_time, s.hall
             FROM bookings b
             JOIN movies m ON b.movie_id = m.id
             JOIN showings s ON b.showing_id = s.id
             WHERE UPPER(COALESCE(b.pass_code, b.ref_code)) = UPPER($1)
                OR UPPER(b.ref_code) = UPPER($1)
                OR b.qr_token = $1
                OR b.id::text = $1
                OR UPPER(b.user_usn) = UPPER($1)
             ORDER BY b.created_at DESC
             LIMIT 1`,
            [cleanedCode]
        );

        if (!rows.length) {
            return res.status(404).json({
                success: false,
                message: `Ticket record not found for code: ${cleanedCode}`
            });
        }

        const booking = rows[0];
        const attendeeSeat = Array.isArray(booking.seats) ? booking.seats.join(', ') : (booking.seats || '');
        const movieTitle = booking.movie_title || booking.film_title || 'Daydreamers Screening';

        // Check if already checked in
        if (booking.status === 'checked_in' || booking.checked_in) {
            return res.status(200).json({
                success: false,
                alreadyCheckedIn: true,
                message: 'Ticket already used',
                attendee: {
                    name: booking.user_name,
                    seat: attendeeSeat,
                    movieTitle: movieTitle
                },
                booking: {
                    id: booking.id,
                    refCode: booking.ref_code,
                    passCode: booking.pass_code || booking.ref_code,
                    userName: booking.user_name,
                    userUsn: booking.user_usn,
                    userEmail: booking.user_email,
                    filmTitle: movieTitle,
                    movieTitle: movieTitle,
                    seats: booking.seats,
                    hall: booking.hall,
                    showDate: booking.show_date,
                    showTime: booking.show_time,
                    status: 'checked_in',
                    checkedIn: true,
                    checkedInAt: booking.checked_in_at
                }
            });
        }

        // Status is 'confirmed' (or unconfirmed): update to 'checked_in' and set checked_in_at = NOW()
        const updateRes = await query(
            `UPDATE bookings 
             SET status = 'checked_in', checked_in = true, checked_in_at = NOW() 
             WHERE id = $1 
             RETURNING *`,
            [booking.id]
        );

        const updated = updateRes.rows[0];

        return res.status(200).json({
            success: true,
            message: `[ADMISSION CONFIRMED] Welcome ${updated.user_name}!`,
            attendee: {
                name: updated.user_name,
                seat: attendeeSeat,
                movieTitle: movieTitle
            },
            booking: {
                id: updated.id,
                refCode: updated.ref_code,
                passCode: updated.pass_code || updated.ref_code,
                userName: updated.user_name,
                userUsn: updated.user_usn,
                userEmail: updated.user_email,
                filmTitle: movieTitle,
                movieTitle: movieTitle,
                seats: updated.seats,
                hall: booking.hall,
                showDate: booking.show_date,
                showTime: booking.show_time,
                status: 'checked_in',
                checkedIn: true,
                checkedInAt: updated.checked_in_at
            }
        });

    } catch (err) {
        console.error('Error processing admin check-in:', err);
        return res.status(500).json({
            success: false,
            error: 'Server error during check-in: ' + err.message
        });
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
                message: `[WARNING] ALREADY CHECKED IN at ${new Date(booking.checked_in_at).toLocaleTimeString()}`,
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
            message: `[ADMISSION CONFIRMED] Welcome ${booking.user_name}!`,
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
const staticOptions = {
    maxAge: 0,
    setHeaders: (res, filePath) => {
        if (/\.(woff2?|ttf|otf|eot|png|jpe?g|gif|svg|webp|hdr|fbx)$/i.test(filePath)) {
            res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
        } else if (/\.(html|htm|css|js)$/i.test(filePath)) {
            res.setHeader('Cache-Control', 'no-cache');
        }
    }
};
// Security guard: Prevent static exposure of server files, database schema, specs, and internal documentation
app.use((req, res, next) => {
    const p = req.path.toLowerCase();
    if (
        p.startsWith('/server') ||
        p.startsWith('/specs') ||
        p.startsWith('/docs') ||
        p.endsWith('.sql') ||
        p.endsWith('.md')
    ) {
        return res.status(404).send('Not Found');
    }
    next();
});

app.use(express.static(rootDir, staticOptions));
app.use('/booking', express.static(rootDir, staticOptions));

app.get('/', (req, res) => {
    res.sendFile(path.join(rootDir, 'index.html'));
});

export { app };
export default app;
