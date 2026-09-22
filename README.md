<div align="center">

# Daydreamers Film Direction

An interactive cinema screening and seat reservation platform with cryptographic QR admission and an administrative door management CMS.

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg?style=flat-square)](https://www.gnu.org/licenses/gpl-3.0)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![Database: PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://supabase.com)
[![Express](https://img.shields.io/badge/Express-4.x-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com)
[![CSS3](https://img.shields.io/badge/CSS3-Vanilla-1572B6?style=flat-square&logo=css3&logoColor=white)](https://www.w3.org/Style/CSS/)

[Live Demo (Self-Hosted)](https://github.com/DAYDREAMERS-FILM-COLLECTIVE/DayDreamers-Film-Direction) • [Bug Report](https://github.com/DAYDREAMERS-FILM-COLLECTIVE/DayDreamers-Film-Direction/issues?q=is%3Aissue+is%3Aopen+label%3Abug) • [Feature Request](https://github.com/DAYDREAMERS-FILM-COLLECTIVE/DayDreamers-Film-Direction/issues?q=is%3Aissue+is%3Aopen+label%3Aenhancement)

<br>

<img src="assets/showcase-poster.jpg" alt="Daydreamers Screening Showcase" width="600" />

</div>

---

## Key Features

- **Interactive Auditorium Seat Selection**: Real-time 70-seat cinema map (rows A–G × 10) supporting Individual (1 seat) and Group (up to 4 seats) modes with live occupied and hold state polling via `GET /api/seats/status`.
- **Dynamic QR Pass Generation**: Cryptographically signed admission tokens (`HMAC-SHA256`) with unique reference codes (`DD-XXXX`), rendered directly in-browser and dispatched via email through Resend.
- **Admin Door Scanner & CMS**: Integrated camera QR scanner (`html5-qrcode`) and manual USN/passcode lookup with duplicate entry detection, live seat locker for holds, film catalogue CRUD, and roster CSV export.
- **Vanilla ES Module Architecture**: Zero-framework client built on native ES modules, local Three.js r160 vendor (`js/vendor/three.module.js`), protocol-guarded module loading, and FOUC-guarded admin authentication gates.

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | HTML5, Vanilla CSS3, Vanilla JavaScript (ES Modules), Three.js r160 (vendored), html5-qrcode 2.3.8 (vendored) |
| **Backend & API** | Node.js (>= 18, ESM), Express 4, `serverless-http`, CORS, `dotenv` |
| **Database & Security** | PostgreSQL 8 via `pg` Pool (Supabase SSL), HMAC-SHA256 (`crypto`), `qrcode`, Resend 3 |
| **Hosting & Deploy** | Netlify (`netlify.toml`, `netlify/functions/api.js`), Local Express server (`server/index.js`) |

---

## Getting Started

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** (package-lock.json present; no pnpm/yarn)
- **Git** and access to a PostgreSQL database (e.g., Supabase)

### Installation & Local Setup

```bash
# 1. Clone repository
git clone https://github.com/DAYDREAMERS-FILM-COLLECTIVE/DayDreamers-Film-Direction.git
cd DayDreamers-Film-Direction

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env and supply your DATABASE_URL and TICKET_SECRET

# 4. Initialize database schema
psql $DATABASE_URL -f server/schema.sql

# 5. Start development server
npm run dev
```

> **Note**: `npm start` runs `node server/index.js` for production. `npm run dev` starts the server in watch mode. Always use `server/index.js` as the entrypoint (never invoke `node server/app.js` directly).

### Local Endpoints

- **Society Landing**: [http://localhost:3000/](http://localhost:3000/)
- **Screening Showcase & Booking**: [http://localhost:3000/screening.html](http://localhost:3000/screening.html)
- **Admin CMS & Door Scanner**: [http://localhost:3000/admin.html](http://localhost:3000/admin.html)

---

## Environment Variables

| Variable | Required | Default / Example | Description |
| :--- | :---: | :--- | :--- |
| `DATABASE_URL` | **Yes** | `postgresql://postgres:...@db....supabase.co:5432/postgres` | PostgreSQL connection string for `pg` Pool |
| `SUPABASE_URL` | No | `https://[YOUR-PROJECT-REF].supabase.co` | Supabase project URL (optional / unused by backend) |
| `SUPABASE_ANON_KEY` | No | *(empty)* | Supabase anon public key (optional / unused by backend) |
| `TICKET_SECRET` | **Yes** | `daydreamers-ticket-hmac-secret-key` | Secret key used for HMAC-SHA256 ticket pass signing |
| `RESEND_API_KEY` | No | `re_...` | Resend API key for email delivery (simulated if absent) |
| `SENDER_EMAIL` | No | `DayDreamers Film Society <tickets@yourdomain.com>` | Sender address for ticket dispatch emails |
| `ADMIN_ACCESS_KEY` | **Yes** | `fps-door-admin-alpha-2026` | Admin secret passkey for gate authorization (alias: `ADMIN_KEY`) |
| `ADMIN_PASSWORD` | No | `DayDreamer` | Admin login password credential |
| `ADMIN_JWT_SECRET` | No | `dd-admin-secret-key-2026` | Secret key for signing admin session tokens (alias: `JWT_SECRET`) |
| `PORT` | No | `3000` | Port for local HTTP server (defaults to 3000) |

<details>
<summary>View full .env template</summary>

```env
# Supabase Database Connection URL
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres

# Supabase API Credentials
SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
SUPABASE_ANON_KEY=

# Secret key used for signing and verifying ticket QR HMAC codes
TICKET_SECRET=daydreamers-ticket-hmac-secret-key

# Resend API Key for dispatching email tickets with QR code passes
RESEND_API_KEY=re_...
SENDER_EMAIL=DayDreamers Film Society <tickets@yourdomain.com>

# Server Port
PORT=8000
```

</details>

---

## Project Structure

```text
.
├── admin.html          # Admin CMS, seat locker, bookings roster, and door QR scanner
├── contact.html        # Contact, institutional inquiry, and legal information page
├── index.html          # Society landing page, film archive, and interactive glass menu
├── menu.html           # Standalone sweep-wall transition reference
├── screening.html      # Film bill, interactive 70-seat reservation, and pass generator
├── assets/             # Curated showcase posters, WebP backgrounds, and branding
├── css/                # Vanilla design tokens, components, and responsive stylesheets
├── fonts/              # Self-hosted Gilroy typefaces (Bebas Neue / Playfair via Google Fonts CDN)
├── js/                 # Client ES modules (core router, screening, admin, Three.js)
├── netlify/            # Serverless function bridge (netlify/functions/api.js)
├── server/             # Express API, PostgreSQL pool, HMAC crypto, and email dispatch
├── src/                # Reference-only React Native mirror (not built in web deployment)
├── textures/           # WebGL canvas noise, normal maps, and grain overlays
├── .env.example        # Environment variable blueprint
├── LICENSE             # GNU General Public License v3.0
├── netlify.toml        # Netlify deployment, redirect, and caching rules
├── package.json        # Node.js project metadata and backend dependencies
└── README.md           # Repository documentation and architecture guide
```

> **Note**: `test-hero-demo.html` and `test-lens.html` are dev-only test fixtures omitted from the tree.

---

## API Endpoints

### Public Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/movies` | Retrieve list of all active scheduled films |
| `GET` | `/api/movies/:id` | Retrieve detailed metadata for a specific film |
| `GET` | `/api/showings` | Retrieve available showing dates, times, and hall capacity |
| `GET` | `/api/seats/status` | Fetch real-time seat availability (available, booked, locked) |
| `POST` | `/api/bookings` | Reserve up to 4 seats, validate institutional email & USN, sign QR pass |
| `POST` | `/api/admin/login` | Verify admin credentials and issue HMAC session token |
| `POST` | `/api/admin/check-in` | Door scanner check-in *(open by design for volunteers and camera scanners)* |

### Admin Endpoints (Require Admin Passkey or Bearer Token)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `ALL` | `/api/admin/verify` | Validate existing admin session token or access key |
| `GET` | `/api/admin/stats` | Retrieve aggregate metrics (total bookings, check-ins, capacity) |
| `GET` | `/api/admin/roster` | Retrieve complete attendee roster with search filter |
| `GET` | `/api/admin/bookings` | Fetch all bookings with search query and check-in timestamps |
| `POST` | `/api/movies` | Add a new film to the catalogue schedule |
| `PUT` | `/api/movies/:id` | Partially update a film's metadata or active status |
| `DELETE` | `/api/movies/:id` | Remove a film from the schedule |
| `POST` | `/api/showings` | Create a new showing slot for a film |
| `DELETE` | `/api/showings/:id` | Delete a scheduled showing slot |
| `POST` | `/api/seats/lock` | Place or release administrative holds on individual seats |
| `POST` | `/api/bookings/verify` | Manually verify cryptographic HMAC ticket tokens |

---

## Contributing

1. **Fork the Repository**: Navigate to [DAYDREAMERS-FILM-COLLECTIVE/DayDreamers-Film-Direction](https://github.com/DAYDREAMERS-FILM-COLLECTIVE/DayDreamers-Film-Direction) and click **Fork**.
2. **Create a Feature Branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Commit Changes**: Follow conventional commit guidelines:
   ```bash
   git commit -m "feat: add interactive auditorium tooltip"
   ```
4. **Push to Your Fork**:
   ```bash
   git push origin feature/your-feature-name
   ```
5. **Open a Pull Request**: Submit a Pull Request against the `main` branch with a summary of changes and testing steps.

---

## License

This project is licensed under the **GNU General Public License v3.0**. See the [LICENSE](LICENSE) file for details.
