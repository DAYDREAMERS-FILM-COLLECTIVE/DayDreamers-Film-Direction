# Daydreamers Film Society

> An interactive cinema screening and seat reservation platform with cryptographic QR admission, university verification, and a live door management CMS.

---

## Overview

**Daydreamers** is a full-stack cinema ticketing and event administration platform built for student film societies. It features an atmospheric front-of-house booking experience with interactive seat selection, institution-verified reservations, automated signed QR passes, and an admin CMS with live camera QR scanning and real-time seat locking.

> [!NOTE]
> All student tickets are cryptographically signed with HMAC-SHA256 tokens to prevent forgery, ticket transfer fraud, and duplicate entry.

---

## Features

- **Atmospheric Screening Interface**: Film showcase with synopsis, directors, metadata chips, show dates, and hall information.
- **Dogstudio Sweeping Wall Transition**: Full-screen horizontal plum wall transition executed via GSAP on menu toggle and page changes across all mobile and desktop viewports.
- **Interactive 70-Seat Map**: Dynamic seat selection supporting both **Individual** (1 seat) and **Group** (up to 4 seats) reservation modes.
- **University Identity Enforcement**: Enforces institutional email validation (`@rvu.edu.in` or `@blr.rvu.edu.in`) and ensures student USN uniqueness per showing.
- **Cryptographic QR Tickets**: Generates signed admission tokens encoded as QR codes, displayed immediately in-browser and dispatched via email through Resend.
- **Admin CMS & Visual Seat Locker**:
  - Film catalogue management (create, update, delete).
  - Visual seat locker to place administrative holds on specific seats before public release.
  - Attendee roster with instant search by USN, email, or reservation reference.
  - Live door QR scanner using device camera or manual token entry with duplicate-check detection.

---

## Project Structure

```text
.
├── admin.html          # Admin CMS, seat locker, roster, and live door scanner
├── fonts/              # Self-hosted typography (Gilroy Thin & UltraLight)
├── index.html          # Society landing page and past exhibitions
├── menu.html           # Standalone overlay menu view
├── package.json        # Dependencies and startup scripts
├── screening.html      # Main film bill, schedule carousel, and seat reservation
├── textures/           # WebGL and noise textures for visual atmosphere
└── server/
    ├── crypto.js       # HMAC-SHA256 signature generator and token verification
    ├── db.js           # PostgreSQL connection pool with Supabase SSL handling
    ├── email.js        # Resend dispatch service with QR ticket attachments
    ├── index.js        # Express REST API endpoints and static file server
    └── schema.sql      # Supabase PostgreSQL DDL migration schema
```

---

## Architecture

```text
Browser Client (Desktop / Mobile)
  │
  ├──> Static Pages (index.html, screening.html, admin.html)
  │
  └──> REST API (Express Server on Node.js)
         │
         ├──> Supabase PostgreSQL (Movies, Showings, Locked Seats, Bookings)
         ├──> Cryptographic Signer (HMAC-SHA256 QR Tokens)
         └──> Resend Email API (Automated PDF/Image Passes)
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18 or later)
- [Supabase](https://supabase.com/) PostgreSQL database

### 1. Clone and Install Dependencies

```bash
git clone git@github.com:Wired-Navi0x17/DayDreamers-Film-Direction.git
cd DayDreamers-Film-Direction
npm install
```

### 2. Configure Environment Variables

Copy the sample environment file and configure your credentials:

```bash
cp .env.example .env
```

Set the following variables in `.env`:

| Variable | Description |
| :--- | :--- |
| `DATABASE_URL` | Supabase PostgreSQL connection URI (`postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres`) |
| `SUPABASE_URL` | Supabase project URL (`https://[ref].supabase.co`) |
| `SUPABASE_ANON_KEY` | Supabase anonymous public API key |
| `TICKET_SECRET` | Secret key used to sign and verify HMAC ticket QR tokens |
| `RESEND_API_KEY` | API key from Resend for sending email passes |
| `SENDER_EMAIL` | Sender address for tickets (e.g. `tickets@yourdomain.com`) |
| `PORT` | Local server port (defaults to `8000`) |

### 3. Initialize the Database Schema

Run the SQL migration script in your Supabase SQL Editor or via `psql`:

```bash
psql $DATABASE_URL -f server/schema.sql
```

> [!TIP]
> The schema creates tables for `movies`, `showings`, `locked_seats`, and `bookings` with automatic foreign keys, cascade deletions, and USN uniqueness constraints.

### 4. Start the Application

```bash
npm start
```

Once running, access the application locally:

- **Public Screening & Booking**: `http://localhost:8000/screening.html`
- **Society Homepage**: `http://localhost:8000/index.html`
- **Admin CMS & Scanner**: `http://localhost:8000/admin.html`

### 5. Deploy to Netlify

The repository is pre-configured with `netlify.toml` and serverless functions in `netlify/functions/api.js`:

1. Import this repository into [Netlify](https://app.netlify.com/).
2. In **Site Configuration > Environment Variables**, add the variables from `.env`:
   - `DATABASE_URL`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `TICKET_SECRET`
   - `RESEND_API_KEY`
   - `SENDER_EMAIL`
3. Deploy the site. Netlify automatically hosts all static assets from the root and routes all `/api/*` requests to the serverless function.

---

## API Endpoints

### Public Routes

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/movies` | Fetch all active film titles on the bill |
| `GET` | `/api/showings` | Fetch scheduled showtimes filtered by movie or date |
| `GET` | `/api/seats/status` | Get occupied and locked seat IDs for a given showing |
| `POST` | `/api/bookings` | Create an individual or group reservation and generate signed QR passes |

### Admin Routes

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/movies` | Add a new film to the catalogue |
| `DELETE` | `/api/movies/:id` | Remove a film from the catalogue |
| `POST` | `/api/seats/lock` | Toggle administrative seat hold (`locked` / `unlocked`) |
| `GET` | `/api/admin/bookings` | Retrieve full attendee reservation roster with search |
| `POST` | `/api/bookings/verify` | Verify scanned QR token signature and confirm door check-in |

---

## Security & Verification Rules

- **Institution Emails**: Reservations require valid `@rvu.edu.in` or `@blr.rvu.edu.in` email addresses.
- **Unique USN Enforcement**: A student USN can only hold one seat per film showing. Duplicate submissions within group or individual bookings are automatically rejected.
- **Seat Race Condition Protection**: Seat reservation transactions check existing locks and reservations atomically to prevent double booking.
- **Door Check-in Idempotency**: Once scanned and checked in, re-scanning the same ticket flags a warning with the exact timestamp of initial admission.
