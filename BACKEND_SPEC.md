# Backend & CMS System Specification

## 1. Overview
This document specifies the architecture, database schema, security model, and API contracts for the Daydreamers Film Club ticketing and screening platform.

---

## 2. Database Schema (PostgreSQL on Supabase)

### `movies` Table
Stores the catalogue of films featured on the platform.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique film identifier |
| `title` | `TEXT` | `NOT NULL` | Film title |
| `director` | `TEXT` | `NOT NULL` | Director name |
| `genre` | `TEXT` | `NOT NULL` | Genre (e.g. 'Sci-Fi', 'Drama') |
| `runtime` | `TEXT` | `NOT NULL` | Runtime formatted (e.g. '2H 14M') |
| `year` | `INT` | `DEFAULT 2024` | Release year |
| `rating` | `TEXT` | `DEFAULT 'A'` | Film certification / age rating |
| `blurb` | `TEXT` | `NOT NULL` | Synopsis / description |
| `hall` | `TEXT` | `NOT NULL` | Screening venue / hall (e.g. 'D Block 3rd Floor') |
| `poster_url` | `TEXT` | | Poster image URL |
| `is_active` | `BOOLEAN` | `DEFAULT true` | Shown on public site |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Record creation timestamp |

### `showings` Table
Schedules specific screening dates and times for films.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique showing identifier |
| `movie_id` | `UUID` | `REFERENCES movies(id) ON DELETE CASCADE` | Associated film |
| `show_date` | `DATE` | `NOT NULL` | Screening date (e.g. '2026-09-18') |
| `show_time` | `TEXT` | `NOT NULL` | Screening time (e.g. '21:00') |
| `hall` | `TEXT` | `NOT NULL` | Hall / venue name |
| `is_active` | `BOOLEAN` | `DEFAULT true` | Active showing toggle |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Record creation timestamp |

### `locked_seats` Table
Allows administrators to manually reserve/lock seats in the CMS.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Lock record identifier |
| `showing_id` | `UUID` | `REFERENCES showings(id) ON DELETE CASCADE` | Specific showing |
| `seat_id` | `TEXT` | `NOT NULL` | Seat code (e.g. 'C4', 'A1') |
| `reason` | `TEXT` | `DEFAULT 'admin_lock'` | Reason for locking |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Record creation timestamp |
| **Constraint** | `UNIQUE(showing_id, seat_id)` | | Prevents duplicate locks |

### `bookings` Table
Records attendee reservations with cryptographic verification tokens.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique booking identifier |
| `ref_code` | `VARCHAR(12)` | `UNIQUE NOT NULL` | Human-readable reference code (e.g. 'DD-9X2K') |
| `showing_id` | `UUID` | `REFERENCES showings(id) ON DELETE CASCADE` | Screened showing |
| `movie_id` | `UUID` | `REFERENCES movies(id) ON DELETE CASCADE` | Screened movie |
| `user_name` | `TEXT` | `NOT NULL` | Attendee full name |
| `user_usn` | `TEXT` | `NOT NULL` | Attendee University Serial Number |
| `user_email` | `TEXT` | `NOT NULL` | Attendee email address |
| `seats` | `TEXT[]` | `NOT NULL` | Array of reserved seat IDs (e.g. `['C4', 'C5']`) |
| `qr_token` | `TEXT` | `NOT NULL` | Signed payload string |
| `checked_in` | `BOOLEAN` | `DEFAULT false` | Door check-in status |
| `checked_in_at` | `TIMESTAMPTZ` | | Timestamp of door scan |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Reservation timestamp |

---

## 3. Cryptographic QR Token & Ticket Signing

To prevent forged or duplicate tickets:
1. **Payload**:
   ```json
   {
     "bId": "<booking_uuid>",
     "ref": "DD-9X2K",
     "usn": "1RVU22CSE045",
     "shId": "<showing_uuid>",
     "seats": ["C4", "C5"]
   }
   ```
2. **Signature**:
   `signature = HMAC-SHA256(bId + ":" + usn + ":" + seats.sort().join(','), TICKET_SECRET)`
3. **QR Encoded String**:
   Base64URL-encoded JSON containing `{ p: payload, s: signature }`.
4. **Offline & Online Verification**:
   - Door scanner decodes JSON payload and recalculates HMAC using the server's `TICKET_SECRET`.
   - Checks if signature matches.
   - If verified, queries database to check if `checked_in` is already true (preventing screenshot sharing/double entry).
   - Updates `checked_in = true` and records `checked_in_at = NOW()`.

---

## 4. API Endpoints

### Public API
- `GET /api/movies`: List all active films.
- `GET /api/showings?movie_id=...`: List upcoming dates & showtimes.
- `GET /api/seats/status?showing_id=...`: Returns `{ occupiedSeats: [...], lockedSeats: [...] }`.
- `POST /api/bookings`: Create a reservation.
  - Body: `{ showingId, userName, userUsn, userEmail, seats }`
  - Response: `{ booking: {...}, qrDataUri: "data:image/png;base64,..." }`

### Admin API (Protected by `ADMIN_ACCESS_KEY`)
- `POST /api/movies`: Create a film.
- `PUT /api/movies/:id`: Update film details.
- `DELETE /api/movies/:id`: Remove film.
- `POST /api/showings`: Add showing date & time.
- `DELETE /api/showings/:id`: Remove showing.
- `POST /api/seats/lock`: Toggle lock on seats `{ showingId, seatId, action: 'lock'|'unlock' }`.
- `GET /api/admin/bookings`: Retrieve all bookings with USN search & filter.
- `POST /api/bookings/verify`: Validate QR token or USN and check in attendee.

---

## 5. Resend Email Transactional Dispatch
- Background asynchronous worker triggers `resend.emails.send()`.
- Email includes:
  - Cinema branding & greeting.
  - Film title, date, time, and venue hall.
  - Seat numbers.
  - Embedded QR code pass image (CID inline attachment).
- Wrapped in isolated `try/catch` so email network latency never delays booking response.
