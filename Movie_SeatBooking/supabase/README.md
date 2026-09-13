# RVU Campus Cinema - Supabase Database & Concurrency Engine

## Quick Setup Instructions

1. Open your **Supabase Dashboard** -> Project -> **SQL Editor**.
2. Run `migrations/01_schema_and_concurrency.sql`:
   - Creates all tables (`movies`, `showtimes`, `seats`, `bookings`, `booking_seats`).
   - Creates indexes for sub-100ms lookups.
   - Installs atomic concurrency RPCs (`acquire_seat_locks`, `release_seat_locks`, `confirm_booking_atomic`, `verify_ticket_atomic`, `get_showtime_seats`).
   - Configures Row Level Security (RLS) with public reads.
   - Adds the `seats` table to `supabase_realtime` publication.
3. Run `seed.sql`:
   - Seeds 3 movies (*Oppenheimer*, *Interstellar*, *Spider-Man: Across the Spider-Verse*).
   - Seeds 7 multi-auditorium showtimes.
   - Automatically populates 64 seats (Rows A-H, Columns 1-8) for each showtime with Regular (A-F) and VIP (G-H) tiers.

---

## Concurrency Protection & Edge-Case Architecture

### 1. Row-Level Locking (`SELECT ... FOR UPDATE`)
When multiple students click on the same seat simultaneously:
- Candidate seats are selected and locked with `FOR UPDATE` in sorted order by `id` (eliminating database deadlocks).
- The transaction verifies that every requested seat satisfies:
  ```sql
  status = 'available' OR (status = 'locked' AND (locked_until < clock_timestamp() OR locked_by_session = p_session_id))
  ```
- If any seat fails, the RPC immediately aborts and returns an informative error to the conflicting student without making partial modifications.

### 2. Database-Level Lazy Lock Dissolution
- No periodic cron job is required to unfreeze abandoned seats.
- Any read query (`get_showtime_seats`) or lock acquisition RPC automatically treats any seat with `status = 'locked' AND locked_until < clock_timestamp()` as `available`.
- If a student closes their laptop or loses network connectivity mid-booking, their lock dissolves automatically after 5 minutes (300 seconds).

### 3. Atomic Booking Commit (`confirm_booking_atomic`)
- Guarantees that the session holds unexpired locks on all candidate seats at the instant of commit.
- Creates the immutable booking record, links seats in `booking_seats`, transitions seat statuses to `'booked'`, and clears lock timestamps in a single atomic transaction.

### 4. Admin Entry Validation (`verify_ticket_atomic`)
- Used by `/verify` route at auditorium doors.
- Looks up booking by tamper-proof ticket hash or student USN.
- Performs atomic one-time check-in by setting `checked_in_at = clock_timestamp()`.
- Alerts door staff immediately if a ticket has already been used with the exact previous check-in timestamp.
