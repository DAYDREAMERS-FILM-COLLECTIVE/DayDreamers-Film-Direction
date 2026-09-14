# Implementation & Cross-Verification TODO

## Status Overview
- [x] **Phase 1: Database Reset & Schema Creation (Supabase PostgreSQL)**
- [x] **Phase 2: Express API Backend Server Setup**
- [x] **Phase 3: Top Screening UI Redesign (Matching Reference Image)**
- [x] **Phase 4: Frontend API Integration & Ticket Form with USN**
- [x] **Phase 5: Admin CMS Upgrade with Seat Locker & Live Door QR Scanner**
- [x] **Phase 6: End-to-End Automated Testing & Cross-Verification**

---

## Detailed Task Breakdown

### Phase 1: Database Reset & Schema Creation
- [x] Connect to Supabase via `DATABASE_URL` using PostgreSQL.
- [x] Completely drop old existing tables (`seats`, `showtimes`, `tickets`, etc.).
- [x] Execute DDL to create `movies`, `showings`, `locked_seats`, and `bookings` tables with foreign keys and unique constraints.
- [x] Insert real film records (Neon Reverie, The Last Reel, Silent Orbit) and authentic schedule entries (no fake reviews or placeholder spam).
- [x] Verify tables and relationships via SQL query.

### Phase 2: Express Backend API Server Setup
- [x] Initialize `package.json` with `express`, `pg`, `cors`, `dotenv`, `qrcode`, `resend`.
- [x] Create `server/db.js` pool connection with SSL handling.
- [x] Create `server/crypto.js` with HMAC-SHA256 signature generation and validation routines.
- [x] Implement `GET /api/movies` and `POST/PUT/DELETE /api/movies`.
- [x] Implement `GET /api/showings` and `POST/DELETE /api/showings`.
- [x] Implement `GET /api/seats/status` (computes occupied from bookings + locked_seats).
- [x] Implement `POST /api/seats/lock` (admin toggles seat lock).
- [x] Implement `POST /api/bookings`:
  - Enforce atomic transaction check (prevent double booking).
  - Generate human-readable reference code (`DD-XXXX`).
  - Calculate cryptographic HMAC signature.
  - Compile Base64 QR code PNG using `qrcode`.
  - Dispatch Resend email asynchronously with QR pass attachment.
- [x] Implement `POST /api/bookings/verify` (validates QR payload signature, checks in attendee).
- [x] Implement `GET /api/admin/bookings` (attendee roster with search by USN, email, name).

### Phase 3: Top Screening UI Redesign
- [x] Match reference image layout in `booking/screening.html`:
  - 3-column Hero section:
    - Left: Large Movie Poster with framed backdrop.
    - Center: Hall label (`D BLOCK / 3RD FLOOR`), large serif title, director (`— DIR. ...`), metadata chips, blurb, and dual buttons (`RESERVE SEATS`, `VIEW VENUE`).
    - Right: `NEXT SHOW` card with prominent date/time, separator line, and interactive date carousel (`<`, dates, `>`).
    - Strictly remove all instances of the word "Friday".
  - "CURRENT BILL" row with `Now Screening` title, description subtitle, and 3-card movie grid with time and `RESERVE SEATS ->` action.
- [x] Preserve dark cinema gold/cream color palette and existing voxel 3D scroll scrub.

### Phase 4: Frontend API Integration & Ticket Form
- [x] Fetch live movies and showings from `/api/movies` and `/api/showings`.
- [x] Fetch live seat availability from `/api/seats/status` for the selected film and date.
- [x] Update reservation dialog (`#modal`):
  - Add Full Name, USN, and Email address inputs with client-side validation.
  - On submit, call `POST /api/bookings`.
  - Display live cryptographic QR pass with film details, venue, seats, attendee details, and download button.

### Phase 5: Admin CMS Upgrade with Seat Locker & Live Door Scanner
- [x] Build `booking/admin.html` (upgrading `temp/cms_Example.html`):
  - Tab 1: Film Management (live list, Add Film modal, delete film).
  - Tab 2: Visual Seat Map Locker (select movie & showing, interactive 70-seat map, click to toggle locked/unlocked state).
  - Tab 3: Attendee Bookings Roster (table of all reservations with USN, name, email, seats, status, and search filter).
  - Tab 4: Live Door QR Scanner (camera feed via `html5-qrcode` + manual input, instant HMAC check, marks `checked_in = true`, alerts if duplicate/reused).

### Phase 6: Automated Verification & Testing
- [x] Test database queries and verify table integrity.
- [x] Test all API endpoints via HTTP requests.
- [x] Test frontend booking flow in browser: select movie -> choose date -> pick seats -> enter USN/Name/Email -> receive signed QR code pass.
- [x] Test admin seat locking: lock seat C4 in CMS, verify it appears occupied in frontend.
- [x] Test door check-in scanner: scan/verify ticket, ensure status becomes Checked In, verify duplicate scan is rejected.
