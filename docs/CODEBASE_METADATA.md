---
project: Daydreamers Film Society
root: .
file: CODEBASE_METADATA.md
generated: 2026-09-18
audience: [humans, ai-agents]
entry_points: [index.html, screening.html, contact.html, admin.html]
backend_entry: server/index.js
api_entry: server/app.js
serverless_entry: api/index.js
run: ["npm install", "npm start"]
urls: ["http://localhost:3000/", "http://localhost:3000/screening.html", "http://localhost:3000/contact.html", "http://localhost:3000/admin.html"]
status: full-reference
---

# CODEBASE_METADATA — Daydreamers Film Society

> Single reference for humans and AI agents. Live implementation is vanilla HTML + modular ES JS + Express + Supabase Postgres. `specs/mobile/` (formerly `src/`) is a **reference-only** React-Native/TS mirror and is **not** part of the build.

## 1. Overview

**Daydreamers** is a full-stack cinema ticketing and event administration platform for a student film society:

- Atmospheric front-of-house booking experience (film bill, schedule carousel, 70-seat map).
- Institution-verified reservations: RVU email (`@rvu.edu.in`, `@blr.rvu.edu.in`) + one seat per USN per showing.
- Signed QR admission passes (HMAC-SHA256), shown in-browser and emailed via Resend.
- Admin CMS: film catalogue CRUD, visual seat locker (admin holds), attendee roster with search + CSV export, live door QR scanner (camera + manual token entry) with duplicate-check-in detection.
- Signature visuals: Dogstudio-style sweeping plum wall transition (GSAP), star-sprinkle custom cursor, Three.js liquid-glass menu canvas + voxel/scrub showcase, film-grain/noise atmosphere.

**User roles / flows:**

| Role | Entry | Flow |
|---|---|---|
| Visitor | `./index.html` | Hero → manifesto → film archive cards → dialog → join form |
| Booker | `./screening.html` | Pick film → pick date/showtime → seatmap (Individual 1 / Group ≤4) → attendee form → QR passes |
| Admin | `./admin.html` | Passkey gate → Catalogue / Seat Locker / Bookings / Scanner tabs |
| Door staff | `./admin.html` → Scanner tab | Camera scan or manual ref/token → verify → check-in (idempotent, warns on re-scan) |

Seat states: `available` → `picked` (local) → `booked` (DB) / `locked` (admin hold). Booked + locked = `occupied` (unselectable).

## 2. How to Use This File

### If you are a human

1. New here? Read §1, §3, §4, then open the page you care about in §6.
2. Booking bug? Read §6 screening flow → §7 `seatmap.js` / `booking-modal.js` → §5 `POST /api/bookings`.
3. Admin/scanner bug? Read §6 admin flow → §7 `auth.js` + `qr-scanner.js` → §5 auth + check-in endpoints.
4. Styling bug? Read §8 (which CSS file owns what + 4 palettes).
5. DB question? Read §11 + `./server/schema.sql`.
6. Confused by `src/`? Read §9 first — do not wire it into the build.

### If you are an AI agent

- API change → start at `./server/app.js` (§5 endpoint table), then `./server/schema.sql` (§11), then `js/modules/screening/api.js` + `js/modules/admin/*.js`.
- UI change → identify page in §6, module in §7, stylesheet in §8. Never add static `<script type="module" src=...>`; pages use protocol-guard + dynamic injection (see §6.5).
- Do not import from `src/` (§9). Live code is `js/` + `css/` only.
- Do not paste `.env` secrets. Use env *names* from `.env.example` (§3.4).
- Respect `file://` guard, FOUC guard, Hydrate-Then-Listen, offline Three vendor (§12).

## 3. Tech Stack & How to Run

### 3.1 Stack (measured)

| Layer | Tech | Evidence |
|---|---|---|
| Runtime | Node.js 18+ | `./README.md`, `./package.json` |
| Backend | Express 4, `cors`, `50mb` JSON/urlencoded | `./server/app.js:1-80` |
| DB | Supabase Postgres via `pg` Pool (SSL `rejectUnauthorized:false`, `max:10`) | `./server/db.js`, `./server/schema.sql` |
| QR | `qrcode` (`QRCode.toDataURL`) | `./server/app.js`, `./package.json` |
| Email | `resend@3` | `./server/email.js`, `./package.json` |
| Crypto | Node `crypto` HMAC-SHA256 | `./server/crypto.js`, `./server/app.js:21-50` |
| Frontend | Vanilla HTML/CSS/ES modules, no SPA framework | `./index.html`, `./screening.html`, `./admin.html` |
| Animation | GSAP 3.12.5 CDN (cdnjs) | `index.html` / `screening.html` / `menu.html` head |
| Scanner | `html5-qrcode` (unpkg, global `Html5Qrcode`) | `./admin.html` head |
| 3D | Three.js r160 local vendor + importmap, OrbitControls | `./js/vendor/three.module.js` (53,044 lines), `./js/vendor/addons/controls/OrbitControls.js` (1,417 lines) |
| Serverless | Vercel Serverless Functions (Node.js runtime) | `./api/index.js`, `./vercel.json` |
| Fonts | Self-hosted Gilroy Thin/UltraLight `.woff2` + Google Fonts | `./fonts/*`, HTML heads, `./css/base.css` |

`package.json` (`daydreamers-film-backend`, `type: module`):

| Script | Command |
|---|---|
| `npm start` | `node server/index.js` |
| `npm run dev` | `node --watch server/index.js` |

Dependencies: `cors, dotenv, express, html5-qrcode, pg, qrcode, resend`. No `react / react-native / zustand / typescript / vite` — that is why `src/` is not built (§9).

### 3.2 Local run

```bash
npm install
cp .env.example .env   # then fill values, see §3.4
psql $DATABASE_URL -f server/schema.sql
npm start
```

Open (per `./.agents/rules/dev-server.md`):

- Home: `http://localhost:3000/`
- Screening & Box Office: `http://localhost:3000/screening.html`
- Admin CMS: `http://localhost:3000/admin.html`

Notes:

- `server/index.js` (18 lines) loads `.env.local` then `.env`, then `app.listen(PORT || 3000, '0.0.0.0')`.
- `server/app.js:16` has its own `PORT` default `8000`, unused when launched via `server/index.js`.
- Must serve over HTTP. Opening HTML via `file://` shows a guard warning and halts module injection (§12.4).
- After changes, restart the server (`node server/index.js`).

### 3.3 Deploy (Vercel)

`./vercel.json` (`version=2`, `cleanUrls=true`):

| Rule | Effect |
|---|---|
| `/api/(.*) → /api/index.js` | API requests proxied to native Vercel serverless function |
| `/booking/* → /:splat` (301) | Backward-compat redirect |
| `/server/*`, `/specs/*`, `/docs/*`, `*.sql → /404.html` | Security rewrites to prevent static exposure |
| `/fonts/*`, `/assets/*`, `/textures/*` | Immutable `Cache-Control: public, max-age=604800, immutable` |
| `/*` | `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` |

`./api/index.js`: `export default app` exporting `./server/app.js` directly into Vercel's Node.js serverless runtime. Static files are served by Vercel Global CDN in prod, and by `express.static(repoRoot)` locally (`./server/app.js:1814-1819`).

Caveat: `adminSessions Set` (`./server/app.js:19`) is in-memory. On serverless it is not shared across cold-starts — HMAC token verification path is what survives (§5.2).

### 3.4 Environment variables (names only — never commit values)

From `./.env.example` + code defaults:

| Variable | Purpose | Default / note |
|---|---|---|
| `DATABASE_URL` | Supabase Postgres URI | Required; fatal log if missing; `?sslmode` stripped in `db.js` |
| `SUPABASE_URL` | Supabase project URL | In example; unused by backend |
| `SUPABASE_ANON_KEY` | Supabase anon key | In example; unused by backend |
| `TICKET_SECRET` | HMAC key for ticket QR tokens | `fps-cryptographic-ticket-secret-2026-key` fallback |
| `RESEND_API_KEY` | Resend email API key | Optional — if missing, email is simulated |
| `SENDER_EMAIL` | Ticket sender address | `tickets@daydreamers.club` fallback |
| `ADMIN_ACCESS_KEY` / `ADMIN_KEY` | Admin passkey / API key | `fps-door-admin-alpha-2026` fallback; `DayDreamer` also accepted (legacy) |
| `ADMIN_JWT_SECRET` / `JWT_SECRET` | HMAC key for admin session tokens | `dd-admin-secret-key-2026` fallback |
| `ADMIN_PASSWORD` | Admin login password | Falls back to `ADMIN_KEY`, then `DayDreamer` |
| `PORT` | Local port | `3000` via `index.js` |
| `DEBUG_SQL` | Verbose query logging | Optional |

`.env` itself is gitignored. Do not paste real keys into docs/issues.

## 4. Repository Map

Root (this folder only — no subfolder docs):

```text
.
├── CODEBASE_METADATA.md      # this file (new, root-level, separate from README)
├── README.md                 # product overview + setup (structure block is stale, see note)
├── CODEBASE_ANALYSIS.md      # older analysis (partly stale: mentions server/app.js split)
├── MODULARIZATION_PLAN.md    # extraction blueprint (HTML line counts now outdated)
├── LICENSE
├── package.json / package-lock.json
├── vercel.json
├── 404.html
├── api/index.js              # Vercel serverless function entrypoint (§3.3)
├── index.html                # 820 lines — society landing (live)
├── screening.html            # 329 lines — film bill + seat booking (live)
├── admin.html                # 362 lines — admin CMS + scanner (live)
├── contact.html              # contact + legal page
├── menu.html                 # 475 lines — standalone sweep-wall workbench (reference)
├── css/                      # live stylesheets (§8)
├── js/                       # live JS files: core + modules + local vendor (§7)
├── specs/mobile/             # REFERENCE-ONLY React-Native/TS mirror (§9, not built)
├── server/                   # Express backend (§5)
├── assets/                   # showcase poster + 3D + 60 scrub frames (§10)
├── fonts/                    # Gilroy-Thin.woff2, Gilroy-UltraLight.woff2 (§10)
├── textures/                 # menu-glass-normal.jpeg (§10)
├── .env / .env.example      # secrets (gitignored) / template
└── node_modules/ / .git/    # toolchain (not documented)
```

Measured line counts (`wc -l`): `index.html` 820, `screening.html` 329, `admin.html` 362, `menu.html` 475, `server/app.js` 1817, `server/index.js` 19, `server/crypto.js` 66, `server/db.js` 45, `server/email.js` 96, `server/schema.sql` 64, `api/index.js` 3.

Staleness notes:

- `README.md` structure block omits `css/ js/ src/` — use this file instead.
- `MODULARIZATION_PLAN.md` cites monolith sizes (`screening` ~3,434, `index` ~3,930, `admin` ~1,029) — the current HTML shells are already slim (329/820/362) because CSS/JS were extracted.
- `CODEBASE_ANALYSIS.md` describes `server/app.js` as a future split — it is still one 945-line file.

Git tracking gotcha: `./.gitignore` ignores `*.md` except `README.md`. This new root file will be **untracked** until an exception (e.g. `!CODEBASE_METADATA.md`) is added. No other file was touched to create this document.

## 5. Backend

### 5.1 Endpoints (`./server/app.js`, verified via `grep app.(get|post|put|delete|all|use)`)

Auth: `extractAdminToken()` accepts `Authorization: Bearer <t>` OR `x-admin-key` / `x-admin-token` OR `?admin_key` / `?token` OR body `admin_key/token/key/passkey`. `isValidAdmin()` = token equals `ADMIN_KEY` or `DayDreamer`, else HMAC session verify. `requireAdmin` → `401 {error}`.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/admin/login` | public | `{username:'Admin', password, rememberMe}` → `{success, token, user}` |
| `ALL` | `/api/admin/verify` | public check | Validate token/key → `{valid, success, user}` |
| `GET` | `/api/admin/stats` | admin | Counts: movies, active showings, bookings, checked-in |
| `GET` | `/api/admin/roster` | admin | All bookings joined with movies + showings |
| `GET` | `/api/movies` | public | Active movies ordered by `created_at` |
| `GET` | `/api/movies/:id` | public | Movie + its active showings |
| `POST` | `/api/movies` | admin | Insert film (`title, director, genre, runtime, year, rating, blurb, hall, poster_url`) |
| `PUT` | `/api/movies/:id` | admin | Partial update incl. `is_active` |
| `DELETE` | `/api/movies/:id` | admin | Delete (cascades to showings/bookings) |
| `GET` | `/api/showings` | public | Active showings + movie join; `?movie_id` / `?movieId` filter |
| `POST` | `/api/showings` | admin | Insert `movie_id, show_date, show_time, hall` |
| `DELETE` | `/api/showings/:id` | admin | Delete showing |
| `GET` | `/api/seats/status?showing_id=` | public | `{lockedSeats, bookedSeats, occupiedSeats}` from `locked_seats` + `unnest(bookings.seats)` |
| `POST` | `/api/seats/lock` | admin | `{showingId, seatId, action, reason}`; `unlock` → DELETE else `INSERT ... ON CONFLICT DO NOTHING` |
| `POST` | `/api/bookings` | public | Transactional 1–4 seat booking + QR + email (§5.3) |
| `POST` | `/api/admin/check-in`, `/api/admin/checkin` | none (open) | Door check-in by `passCode/refCode/qrToken/bookingId`; idempotent, flags re-scan |
| `POST` | `/api/bookings/verify` | admin | HMAC-checked verify by `qrToken`+`bId` or `usn` or `refCode`; `409` if already checked in |
| `GET` | `/api/admin/bookings?search=` | admin | Roster with `ILIKE` on ref/name/USN/email/film |
| `USE/GET` | static `/`, `/booking`, `/` | public | `express.static(repoRoot)`; `GET / → index.html` |

### 5.2 Admin session tokens (`./server/app.js:21-50`)

`generateAdminToken(username)`: `payload = JSON({username, iat: Date.now(), nonce: rand16hex})`, `hmac = HMAC-SHA256(ADMIN_JWT_SECRET, payload)`, `token = base64url(payload).hmacHex`, stored in in-memory `Set`. `verifyAdminToken()`: `Set.has` OR recompute + `timingSafeEqual`, then memoize. No expiry. Serverless note applies (§3.3).

### 5.3 Booking (`POST /api/bookings`, `./server/app.js:397-670`)

- Modes: `individual` (exactly 1 seat), `group` (≤4 seats).
- Validation: RVU email regex `/^[...+]@(blr\.)?rvu\.edu\.in$/i`; in-request duplicate seats/USN/email rejected; DB checks per attendee: seat not in `locked_seats`, no `seats && $2` overlap, no existing `user_usn=ANY`, no existing `user_email=ANY` for that showing.
- Per attendee: `refCode = DD-XXXX`, `qrToken = signTicket(...)`, `qrDataUri = QRCode.toDataURL(refCode, {EC:H, margin:1, width:250})`, `INSERT status='confirmed'`.
- Email (`./server/email.js:96` lines): `sendTicketEmail({...})` per attendee **without await** (`.catch` log) before `COMMIT` — email failure does not fail booking. Without `RESEND_API_KEY` → `{success:true, simulated:true}`.
- Response: `{bookingMode, totalSeats, bookings[], booking, passCode, refCode, qrDataUri, qrToken}`. Accepts both `showingId/showing_id` key spellings.

### 5.4 Ticket crypto (`./server/crypto.js:66` lines)

`signTicket(bookingId, refCode, usn, showingId, seats)`: `seatStr = sorted(seats).join(',')`, `data = bId:ref:usn:shId:seatStr`, `sig = HMAC-SHA256(TICKET_SECRET, data).hex`, `token = base64url(JSON({p:{bId, ref, usn, shId, seats}, s:sig}))`. `verifyTicket()` accepts base64url or raw JSON, recomputes, `timingSafeEqual`. Note: the QR image encodes the human `refCode` (`DD-XXXX`), not the full signed token — verification joins QR/manual code + DB + HMAC.

### 5.5 DB layer (`./server/db.js:45` lines)

`pg Pool`, strips `?...` query params from `DATABASE_URL`, `ssl {rejectUnauthorized:false}`, `max:10`, `idle 30s`, `connect timeout 10s`. `query(text, params)` with optional `DEBUG_SQL` timing log. Missing `DATABASE_URL` logs fatal but does not throw at import.

## 6. Frontend Pages

### 6.1 `index.html` (820 lines) — society landing

- Head: 5× `preconnect` (Google Fonts, cdnjs, esm.sh, miroleon), Google Fonts bundle (DM Mono/Sans, Heebo, Playfair, Plus Jakarta, Inter, Bebas), `prefetch screening.html`, preload Gilroy ×2 + `menu-glass-normal.jpeg`, `modulepreload three.module.js`, local `importmap` (`three`, `three/addons/`), CSS `base + sweep-wall + cursor + footer + burger-menu + home.css` (enabled) / `screening.css` (disabled, toggled by router), GSAP CDN, `wallEnter` session guard.
- Body: `#star-cursor`, `header.site-header > .brand + #burgerToggle`, `#sweepWall`, persistent menu (`#menuGlass` canvas + `#site-menu` with 5 `a[data-nav]` + footer), `#siteLoader`, `#routerWrapper > main[data-router-view=home]`: `#home, #about (+#screeningCircle), #films>#film-archive (3 .film-card), #process, #people, #events, #gallery, #learn, quote chapters, #join>#join-form, footer, dialog#film-dialog`.
- Scripts (end of body): inline reveal/dialog/join IIFE (`window.initHome/destroyHome`), idle prefetcher (`screening.html`, `/api/movies`, `/api/showings`), protocol-guard injector for `core/cursor, burger-menu, core/router, core/sweep-wall, home/main, three/menu-glass`.

### 6.2 `screening.html` (329 lines) — bill + booking

- Head mirrors index but `prefetch/prerender index.html`, CSS with `?v=fresh3`, `home.css` disabled / `screening.css` enabled.
- Body shell same (`#star-cursor, #sweepWall, header.screening-header>#brandLink+#burgerToggle, menu, #siteLoader, #routerWrapper`): `#grain, #backdrop, #vignette, #tip`, `main#bookingView[data-router-view=screening]`: `#details` hero (`#detPosterImg, #detHall/Title/Dir/Meta/Blurb, #heroReserveBtn, #dateShowtime + #prevDateBtn/#datePills/#nextDateBtn`), `#movies>#moviesGrid + #moviesEmpty`, `#showcase (#showcasePoster + #scrubCanvas)`, `#booking` (`#btnModeIndividual/#btnModeGroup + #modeHint`, `#seatmap` in `.seatmap-persp`, legend, `aside.summary`: `#sumFilm/Hall/Date/Showtime, #picked/#sumCount/#sumSeatsList, #confirmBtn[disabled]`), `#venue`, footer, `#modal` (`#bookingFormStep`: `#formFilm/Showing/Seats + #attendeeForm>#attendeesContainer + #bkError + #bkSubmitBtn`; `#ticketSuccessStep`: `#passesList + #donePassBtn`).
- Injects same 6 modules + `screening/main`. Extra 600ms inline script clears `wall-entering` + loader pointer-events.
- Flows: `main.js: paintDetails/selectMovie/renderMovies/renderDates` → `seatmap.js: buildSeatmap/rebuildSeatsAnimated/handleSeatToggle/refreshSummary` (`ROWS A-G ×10`, `#tip, #picked/#sumCount/#sumSeatsList/#confirmBtn`, `state.js` store) → `booking-modal.js: openBookingModal/handleBookingSubmit/renderTicketSuccess` (`POST /api/bookings`).

### 6.3 `admin.html` (362 lines) — CMS + scanner

- Head: Google Fonts (Inter, Playfair, JetBrains Mono), `html5-qrcode` (unpkg), inline `<style#foucGuard>` (`#adminContent{display:none}` until `body.authenticated`), same local `importmap`, CSS `base + pages/admin.css` only.
- Body: `#adminAuthGate` (`#brandLink, #authParticles, 6 .accent-line, #loginCard: #loginError + #adminLoginForm>#adminUsername/#adminPassword/#togglePasswordBtn/#rememberMeCheckbox/#loginSubmitBtn`), `#adminContent` (`#adminLogoutBtn`, sidebar `data-action=navigate` tabs `#tabCatalogue/#tabSeatLocker/#tabBookings/#tabScanner`; `#tabCatalogue`: `#addMovieForm>#newMovieForm(...) + #moviesList`; `#tabSeatLocker`: `#seatMovieSelect/#seatShowingSelect + #adminSeatGrid`; `#tabBookings`: `#bookingSearchInput + export-csv + #bookingsList`; `#tabScanner`: `#reader + restart-scanner + #manualVerifyForm>#manualInput + #scanResultCard (#scanStatusBanner, #scName/Usn/Film/Seats/Show/Hall/Ref/Time, reset-scan)`).
- Single guard injector → `js/modules/admin/main.js`; everything else via ES imports. No GSAP/cursor/router/sweep here.
- Flows: `auth.js` gate (`login/verifyPasskey/checkExistingAuth/unlockDashboard ↔ body.authenticated`) → `main.js: switchTab/showSection/bootstrap` (`data-action` delegation) → `movies.js / seat-locker.js / bookings.js / qr-scanner.js` (`Html5Qrcode` + `getAuthHeaders()` → verify/check-in).

### 6.4 `menu.html` (475 lines) — standalone workbench

Self-contained sweep-wall reference: inline ~215-line `<style>`, body `#grain/#sweepWall/header/#demoView/nav#menuView (6 a[data-nav])`, one ~190-line classic script (GSAP wipe `xPercent -100→0→100`, `toggleMenu/leavePage/splitNav`, reduced-motion + bfcache handling). Loads **no** `js/` modules. Use it to study the wall interaction in isolation.

### 6.5 Universal loader pattern (all live pages)

No static `<script type="module" src=...>`. Inline guard: if `location.protocol === 'file:'` → alert + replace body with `npm start → http://localhost:3000` message and halt; else `loadModule(src)` appends `<script type="module">` for the page's bundle. Consequences: ES modules require HTTP; `three` resolves offline via local importmap; inline `onclick=` handlers do not work from modules (event delegation via `data-action` instead).

## 7. JS Modules (live)

Vendor excluded below (`three.module.js` 53,044 lines, `OrbitControls.js` 1,417 lines — do not edit).

### 7.1 `js/core/*`

| File | Lines | Exports | Role |
|---|---|---|---|
| `js/core/cursor.js` | 322 | `initCursor` (=`initStarCursor`) | Star `✦` cursor, `#star-cursor[data-cursor]` tooltips |
| `js/core/router.js` | 321 | `prefetch, navigateTo, initRouter` | SPA fetch-swap `#routerWrapper`, toggles `#pageStyleHome/#pageStyleScreening`, calls `initHome/destroyHome` vs `initScreening/destroyScreening` |
| `js/core/sweep-wall.js` | 333 | `prewarmSweep, setBurger, swapViews, toggleMenu, leavePage, initSweepWall` | Plum wall wipe + burger state + routing |

### 7.2 `js/modules/screening/*`

| File | Lines | Key exports | DOM touched |
|---|---|---|---|
| `api.js` | 213 | `fetchMovies, fetchShowings, fetchSeatStatus, submitBooking` (+ `LOCAL_MOVIES`, `fallbackShowings`) | `GET /api/movies`, `/api/showings?movie_id=`, `/api/seats/status?showing_id=`, `POST /api/bookings` |
| `state.js` | 171 | store + `getState/getActiveShowing/set*/togglePickedSeat/clearPickedSeats` + events (`showing:changed`, `mode:changed`, …) | mirrors `window.picked/bookingMode/selectedShowingId` |
| `seatmap.js` | 325 | `buildSeatmap, rebuildSeatsAnimated, handleSeatToggle, refreshSummary, enable2DFallback` (`ROWS A-G`, `10/row`) | `#seatmap, #tip, #picked/#sumCount/#sumSeatsList/#confirmBtn` |
| `booking-modal.js` | 384 | `openBookingModal, closeBookingModal, resetBookingForm, renderTicketSuccess, handleBookingSubmit, initBookingModal` | `#modal, #attendeeForm>#attendeesContainer, #bkError/#bkSubmitBtn, #ticketSuccessStep>#passesList` |
| `main.js` | 406 | `initScreening, destroyScreening, selectMovie, renderMovies/Dates, paintDetails` | `#det*, #datePills/#dateShowtime, #moviesGrid/#moviesEmpty, mode buttons` |
| `scrub-showcase.js` | 239 | `initScrubShowcase, destroyScrubShowcase, setScrubProgress` | `#scrubCanvas/#showcasePoster` (60-frame scroll scrub) |

### 7.3 `js/modules/admin/*`

| File | Lines | Key exports | DOM touched |
|---|---|---|---|
| `auth.js` | 390 | `getAdminToken/Key, getAuthHeaders, isAuthenticated, login, verifyPasskey, unlockDashboard, initAuth*` | `#adminAuthGate/#adminContent, #adminLoginForm, #loginError, #adminLogoutBtn` |
| `movies.js` | 128 | `getMovies, loadMovies, deleteMovie, handleAddMovieSubmit, toggleAddMovieForm, initMovies` | `#moviesList, #addMovieForm>#newMovieForm` |
| `seat-locker.js` | 162 | `initSeatLocker (=renderSeatLockerGrid), onSeatMovieChange/ShowingChange, renderAdminSeats, toggleSeatLock` | `#seatMovieSelect/#seatShowingSelect, #adminSeatGrid` |
| `bookings.js` | 95 | `getBookings, loadBookings (=loadBookingsRoster), exportBookingsCsv` | `#bookingsList, #bookingSearchInput` |
| `qr-scanner.js` | 239 | `startQrScanner, stopQrScanner, restartScanner, verifyAndCheckIn, handleManualLookupSubmit, sanitizeQrCode, populateDetails, resetScanView` | `#reader, #manualVerifyForm>#manualInput, #scanStatusBanner/#sc*` |
| `main.js` | 284 | `switchTab (=showSection), bootstrap` + `data-action` delegation | all four tab sections |

### 7.4 `js/modules/three/*` + misc

| File | Lines | Exports | Notes |
|---|---|---|---|
| `three-core.js` | 16 | `THREE, OrbitControls` | thin importmap bridge |
| `menu-glass.js` | 449 | `initMenuGlass, startMenuGlass, stopMenuGlass` | `#menuGlass` + `menu-glass-normal.jpeg` + FBX/HDR fallback |
| `voxel-showcase.js` | 472 | `initVoxelShowcase, setVoxelVisible, destroyVoxelShowcase` | 3D showcase; falls back to 2D seatmap (`?nowebgl=1`) |
| `home/main.js` | 118 | `initHome, destroyHome` | landing reveals/dialog/join bindings |
| `burger-menu/burger-menu.js` | 423 | menu open/close/nav state | consumed by `router.js` + `sweep-wall.js` |

Load graph: page guard → `cursor + burger-menu + router + sweep-wall + home/main + three/menu-glass (+ screening/main | admin/main)` → feature imports (`state/api/seatmap/booking-modal/scrub-showcase` or `admin/*` siblings).

## 8. Styles & Design Tokens

| File | Lines | Owns |
|---|---|---|
| `css/base.css` | 46 | reset, Gilroy `@font-face` (`/fonts/*.woff2`), `.bebas/.serif` helpers |
| `css/components/cursor.css` | 180 | `#star-cursor`, sprinkle particles, `cursor:none` on fine pointers, native restore on touch/modal |
| `css/components/sweep-wall.css` | 38 | canonical `.sweep-wall` (`#3A1F33`, `translate3d(-100%,0,0)`), `.wall-entering`, `.nav-overlay` |
| `css/components/footer.css` | 33 | shared screening footer (duplicated at tail of `screening.css`) |
| `css/burger-menu/burger-menu.css` | 682 | burger button/panel/list/footer/loader, breakpoints, reduced-motion; single source (`home.css` defers to it) |
| `css/pages/home.css` | 2,276 | editorial paper landing (hero/manifesto/film-grid/events/gallery/school/chapters/join/dialog) |
| `css/pages/screening.css` | 1,373 | box-office: backdrop/vignette/grain, showcase sticky + `#scrubCanvas`, dual `.movies-grid` defs, 3D hall/seatmap + 2D fallback, sticky summary, modal/ticket, `.reveal` |
| `css/pages/admin.css` | 986 | squared auth gate + grid CMS (sidebar/tables/forms/seat-grid/scanner) |

Four incompatible palettes (do not assume one global theme):

- `home.css`: `--ink #11100f, --paper #eee9df, --red #d83128, --mute #9f9b94, --line #c9c3b8`.
- `screening.css` (+ `src/screening/constants/theme.ts` mirror): plum `#1A0B17/#261223/#3A1F33/#6D3B56`, rose `#C89BB2/#F2E9ED`, `--red #C84668`, `--seat clamp(22px,3.1vw,38px)`.
- `admin.css`: `--bg #08090d, --panel #151822, --gold #e3b94e` (≠ screening rose), `--danger #e05252, --success #38b000, --warning #ffb703`.
- `burger-menu.css`: `--menu-bg #1A0B17, --menu-panel #3A1F33, --menu-cream #F2E9ED, --menu-accent #C89BB2`.

Duplication: `sweep-wall` CSS is copy-pasted into `home.css` + `screening.css`; `footer.css` is duplicated at `screening.css` tail. Canonical edits belong in `components/` unless intentionally page-scoped.

## 9. `src/` — Reference-Only Mirror (Not Built)

`src/` holds ~51 files (47 TS/TSX): `App.tsx`, `index.ts`, `core/*` (Header, StarCursor, SweepWall, `useLayoutStore`), `home/*` (HomeScreen + Hero/Manifesto/Gallery/Activities/Join), `menu/*` (MenuDrawer + BurgerToggle/NavList/Footer/GlassCanvas), `screening/*` (ScreeningScreen, api, store, schema, types, `theme`/`seatmapConfig`, Seatmap/Viewport/Button, ScrubShowcase, MovieGrid, HeroSection, DateCarousel, ReservationSummary, BookingModal), `admin/*` (AdminScreen, `adminApi`, `useAdminStore`, AuthGate, Sidebar, FilmCatalogue, SeatLocker, BookingsRoster, DoorQrScanner). All import `react-native / react-native-svg / zustand / zod`.

Why reference-only: `package.json` has no React deps or bundler; `vercel.json` and `express.static(rootDir)` serve only root HTML which load only `/css/*.css` + `/js/**/*.js`; live code never imports `src/`. Treat `src/` as a future/native-port spec. For behavior truth, read `js/` + `server/`, not `src/`.

## 10. Assets, Fonts, Textures

| Path | Count | Used by |
|---|---|---|
| `assets/showcase-poster.jpg` | 1 | scrub fallback (`scrub-showcase.js`) |
| `assets/3d/two_hands_01.fbx`, `GRADIENT_01_01_comp.hdr` | 2 | `menu-glass.js` (+ esm.sh/miroleon fallback) |
| `assets/showcase-frames/frame_00-59.webp` | 60 | scroll scrub (`scrub-showcase.js`) |
| `fonts/Gilroy-Thin.woff2`, `Gilroy-UltraLight.woff2` | 2 | preloaded in `index.html`/`screening.html`, `@font-face` in `base/home/screening.css`, immutable-cached |
| `textures/menu-glass-normal.jpeg` | 1 | preloaded; reserved for glass material |
| `assets/textures/` | 0 | does not exist — no duplication with top-level `textures/` |

## 11. Data Dictionary (`./server/schema.sql`, 64 lines)

```sql
movies(id UUID PK, title, director, genre, runtime, year, rating, blurb, hall,
       poster_url, is_active BOOL default true, created_at timestamptz)
showings(id UUID PK, movie_id → movies CASCADE, show_date DATE, show_time TEXT,
         hall, is_active BOOL default true, created_at timestamptz)
locked_seats(id UUID PK, showing_id → showings CASCADE, seat_id TEXT,
             reason default 'Reserved by Admin', created_at timestamptz,
             UNIQUE(showing_id, seat_id))
bookings(id UUID PK, ref_code VARCHAR(16) UNIQUE, showing_id → showings CASCADE,
         movie_id → movies CASCADE, user_name, user_usn, user_email,
         seats TEXT[], qr_token TEXT, checked_in BOOL default false,
         checked_in_at timestamptz, created_at timestamptz,
         UNIQUE(showing_id, user_usn))
indexes: idx_showings_movie, idx_bookings_showing, idx_bookings_usn, idx_locked_seats_showing
```

Drift: live `app.js` also reads/writes `bookings.pass_code/status` and uses `gen_random_uuid()`, `seats && $2`, `unnest(seats)` — not present in the checked-in DDL. Live DB has been migrated beyond `schema.sql`; update the SQL before fresh provisioning.

## 12. Concepts Index

1. **Seat lifecycle:** `available → picked → booked`, plus `locked` (admin). `occupied = booked ∪ locked`. Locker uses gold (locked) vs red (booked); booking uses its own picked/occupied styling.
2. **RVU + USN rules:** email must match RVU domains; `(showing_id, user_usn)` unique; per-showing email reuse also rejected in code.
3. **Check-in idempotency:** re-scan returns `alreadyCheckedIn:true` + original timestamp instead of double-counting.
4. **FOUC guard:** `admin.html` inline `#foucGuard` hides `#adminContent` until `auth.js` adds `body.authenticated` — must stay inline in `<head>`, not in external CSS.
5. **Hydrate-Then-Listen:** state consumers render from `store.activeShowing` first, then subscribe to `showing:changed` — prevents missing the first payload.
6. **Offline Three:** local `importmap` (`three`, `three/addons/`) + `js/vendor/` — no CDN required for 3D.
7. **`file://` guard:** dynamic module injection only on HTTP(S); `file://` shows `npm start` warning and halts.
8. **No inline handlers:** `onclick=` does not resolve from ES modules — use `data-action` + delegated `addEventListener`.
9. **Root-absolute assets:** CSS `url()` must be `/fonts/...`, not relative, so extracted stylesheets resolve from any page.
10. **Dual key spellings:** API accepts `showingId/showing_id`, `movieId/movie_id`, `passCode/pass_code/refCode/...` — keep both when editing.
11. **Fire-and-forget email:** booking commits even if Resend fails; check server logs, not booking response, for mail errors.
12. **Two QR-adjacent codes:** `refCode` (human `DD-XXXX`, inside QR image) vs `qrToken` (signed HMAC payload for verification).

## 13. Maintenance

- Add endpoint: `server/app.js` (+ `requireAdmin` if admin) → update §5 table → update `js/modules/*/api` or `adminApi` callers → test local + Vercel (`/api/*` rewrite).
- Add page section: edit the page HTML → page module in §7 → page CSS in §8 (check palette first).
- Add JS module: place under `js/modules/<area>/`, import via page `main.js` orchestrator, use `data-action` delegation, handle `file://` + no-WebGL fallbacks.
- DB change: migrate live Supabase first, then backport `./server/schema.sql` (§11 drift).
- `src/` change: docs/spec only — mirror the behavior in `js/` + `server/` if it must go live.
- Before commit: restart server, visit `/`, `/screening.html`, `/admin.html`; test Individual + Group booking, locker toggle, roster search, scanner + re-scan warning.
- This file is intentionally gitignored by default (`*.md` except `README.md`); add `!CODEBASE_METADATA.md` to `.gitignore` if it should be tracked. No other file was modified to produce this document.
