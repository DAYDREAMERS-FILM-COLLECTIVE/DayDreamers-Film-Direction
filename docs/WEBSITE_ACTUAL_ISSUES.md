---
doc: WEBSITE_ACTUAL_ISSUES
scope: live bugs that break or degrade the site today
audience: antigravity (fix executor) + humans
repo_root: .
date: 2026-09-18
rule: DIRECT FIX = safe trivial edit Antigravity may apply as written. OPTIONS = logic-level issue, pick one approach, do not mix.
---

# Website Actual Issues — What Is Broken Today

All items verified against the current tree. `file:line` numbers are exact. Nothing here is hypothetical — each has a user-visible symptom now.

How Antigravity should use this file:

1. Fix in severity order (Critical → High → Medium).
2. `DIRECT FIX` items: apply as written (no logic change).
3. `OPTIONS` items: choose ONE option per issue and apply it fully.
4. After each fix: restart server (`npm start`), retest the stated repro.

---

## CRITICAL

### A1. Fresh database cannot take bookings — `pass_code` / `status` missing from schema
- **Where:** `./server/schema.sql:44-58` (defines `bookings` with `ref_code, qr_token, checked_in` only) vs `./server/app.js:126,590-593,629,673-744` (writes/reads `pass_code`, `status`).
- **Symptom:** fresh `psql $DATABASE_URL -f server/schema.sql` then `POST /api/bookings` → `500 Failed to complete booking` (`column pass_code does not exist`). `GET /api/admin/stats` → 500 (`column status does not exist`). Check-in → 500.
- **Impact:** full booking + admin-stats + door flow down on any fresh provision.
- **Fix — OPTIONS (pick one):**
  - Option 1 (recommended): migrate schema forward — add `pass_code TEXT`, `status TEXT DEFAULT 'confirmed'` to `bookings` in `schema.sql`, plus index on `pass_code`. Then backfill existing rows (`pass_code = ref_code`).
  - Option 2: align code backward — replace all `pass_code` reads with `ref_code` and all `status` reads with `checked_in`. Larger diff, loses ref/token split.

### A2. Door check-in endpoint has no auth
- **Where:** `./server/app.js:671` (`app.post(['/api/admin/check-in','/api/admin/checkin'], ...)` — no `requireAdmin`) vs `./server/app.js:789` (`/api/bookings/verify` — has `requireAdmin`).
- **Symptom:** anyone can `POST /api/admin/check-in {passCode:"DD-XXXX"}` logged-out and flip tickets to `checked_in`. Scanner sends headers (`./js/modules/admin/qr-scanner.js:137-139`) but server ignores them here.
- **Impact:** malicious mass check-in; victim told "already used" at door; code-enumeration oracle (404 vs 200).
- **Fix — OPTIONS (pick one):**
  - Option 1: add `requireAdmin` to the check-in route and keep door tablets logged in.
  - Option 2: keep it public but add a separate per-door PIN/rate-limit + audit log (weaker, needs extra work).

### A3. Hardcoded admin credentials work when env is missing
- **Where:** `./server/app.js:17-18,67,94-96` (`ADMIN_KEY` fallback `fps-door-admin-alpha-2026`, `ADMIN_JWT_SECRET` fallback, `token === 'DayDreamer'`, password accepts `DayDreamer`/`ADMIN_KEY`); `./server/crypto.js:3` (HMAC fallback); `./js/modules/admin/auth.js:141` (client hardcodes `Admin / DayDreamer / fps-door-admin-alpha-2026`).
- **Symptom:** `Admin / DayDreamer` logs into admin on any deploy without env set. Client-side check also blocks legitimate server-side password rotation.
- **Impact:** full admin takeover (movies, seats, roster PII, check-in).
- **Fix — OPTIONS (pick one):**
  - Option 1 (recommended): remove all fallbacks — require env (`throw` at boot if missing), delete `|| 'DayDreamer'` branches, remove client hardcoded check and rely on `POST /api/admin/login` response only.
  - Option 2: keep fallbacks dev-only behind `NODE_ENV !== 'production'` gate.

### A4. Seatmap 2D fallback recurses on second visit (stack overflow)
- **Where:** `./js/modules/screening/seatmap.js:301-307` (`fallback:toggled` listener calls `enable2DFallback()` again) + `./js/modules/screening/state.js:170` (dispatch) + `./js/modules/screening/main.js` (re-`initScreening` on router revisit without unbinding; `seatmapWindowEventsBound` persists).
- **Symptom:** first load safe; revisit screening via SPA router on a WebGL-less device → infinite `enable2DFallback → setIs2DFallback → fallback:toggled → enable2DFallback` → stack overflow / frozen tab.
- **Impact:** tablet/older-device hard crash on second visit.
- **Fix — DIRECT FIX:** guard re-entry:
  ```js
  export function enable2DFallback() {
    if (state.is2DFallback || window.is2DFallbackActive) return;
    // ... rest unchanged
  }
  ```
  Plus remove the `fallback:toggled → enable2DFallback()` re-call (listener should only `arcSeats()`), and unbind/clear `seatmapWindowEventsBound` in `destroyScreening`.

---

## HIGH

### A5. QR has no cryptographic protection (HMAC is dead code)
- **Where:** `./server/app.js:580-588` (`qrToken = signTicket(...)` stored, but `qrDataUri = QRCode.toDataURL(passCode)` — QR image is plain `DD-XXXX`); `./server/crypto.js:5-28`; `./server/email.js`.
- **Symptom:** emailed QR is just short ref code. `verifyTicket()` path (`app.js:797-819`) never exercised by real scans; check-in matches plain strings.
- **Impact:** forged QR for any enumerated code; `TICKET_SECRET` rotation protects nothing.
- **Fix — OPTIONS (pick one):**
  - Option 1: encode the signed `qrToken` in the QR (`toDataURL(qrToken)`), update scanner to send `qrToken`, verify HMAC first then DB.
  - Option 2: keep short QR but lengthen `refCode` entropy + rate-limit check-in (weaker, no tamper proof).

### A6. Router injects wrong page + desyncs URL
- **Where:** `./js/core/router.js:71-88` (`getViewFromUrl('menu.html') → null`), `:122-140,178-188` (falls back to `index.html` content but `pushState(menu.html)` + wrong stylesheet).
- **Symptom:** URL says `menu.html`, content is home with wrong CSS.
- **Fix — DIRECT FIX:** handle `null` view explicitly — either redirect `menu.html` to `index.html#menu` or add a real `menu` view + stylesheet case; never `pushState` a URL whose content was not rendered. Also abort (no `pushState`) when fetch fails (`:162-189`).

### A7. Fallback movies let users submit guaranteed-404 bookings
- **Where:** `./js/modules/screening/api.js:60-94` (`fallback-1/2/3` when API empty/fails) + `./js/modules/screening/seatmap.js:206-209` (enables `confirmBtn`) → `POST /api/bookings` → `./server/app.js:501` `404 Showing not found`.
- **Symptom:** user picks seats on demo data, submits, gets 404.
- **Fix — DIRECT FIX:** when showing is a fallback (`id startsWith 'fallback-'`), disable `#confirmBtn` with hint "Showtimes unavailable — try again later", and skip `submitBooking`.

### A8. Scanner manual USN search always 404
- **Where:** `./js/modules/admin/qr-scanner.js:229-238` (form says "USN or DD-XXXX" but always sends `{passCode}`) vs `./server/app.js:673-697` (searches `pass_code/ref_code/qr_token/id` only, no `user_usn`). Correct USN path (`POST /api/bookings/verify`, `app.js:820`) is never called.
- **Symptom:** correct USN → "not found".
- **Fix — OPTIONS (pick one):**
  - Option 1: route USN-pattern input to `POST /api/bookings/verify {usn}` with admin headers.
  - Option 2: change form label to "DD-XXXX / token only" (hides the gap, worse UX).

### A9. Scanner CDN URL is unversioned (scanner silently dead)
- **Where:** `./admin.html:13` (`<script src="https://unpkg.com/html5-qrcode">`) + `./js/modules/admin/qr-scanner.js:13-16` (only `console.warn` + return when global missing).
- **Symptom:** if CDN resolves HTML/redirect/ESM, camera scanner stays on "Ready" forever with no user error.
- **Fix — DIRECT FIX:** pin versioned file, e.g. `https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js`, plus a visible error banner when `window.Html5QrcodeScanner` is undefined.

### A10. Client blocks server password rotation
- **Where:** `./js/modules/admin/auth.js:141` hardcodes accepted passwords.
- **Symptom:** custom `ADMIN_PASSWORD` works server-side (`app.js:96`) but is rejected client-side before the request.
- **Fix — DIRECT FIX:** delete the client-side password allowlist; always `POST /api/admin/login` and render server response.

### A11. `*.md` docs are silently untracked (this file included)
- **Where:** `./.gitignore:40-43` (`*.md` + `!README.md`).
- **Symptom:** `CODEBASE_METADATA.md`, this file, and the risks file never appear in `git status`; fresh clones lose them.
- **Fix — DIRECT FIX (needs approval since it touches `.gitignore`):** add `!CODEBASE_METADATA.md`, `!WEBSITE_ACTUAL_ISSUES.md`, `!WEBSITE_POTENTIAL_RISKS.md`.

### A12. No-cursor single point of failure + contradictions
- **Where:** `css/components/cursor.css:68-115` + `css/pages/home.css:15-18` (`cursor:none !important` globally) vs `css/pages/screening.css:1363-1373` (`cursor:pointer !important`); `home.css` lacks the `body.modal-open` restore that `cursor.css:151-180` has.
- **Symptom:** if `js/core/cursor.js` fails to load, desktop has no visible cursor; text fields lose affordance outside modals (home).
- **Fix — DIRECT FIX:** only hide native cursor when JS cursor is active (`body.has-custom-cursor {cursor:none}` set by `cursor.js` on success), add `modal-open` restore to `home.css`, keep `cursor:text` on inputs.

---

## MEDIUM

### A13. Stale seat-status race on fast movie switch
- **Where:** `./js/modules/screening/seatmap.js:212-233` (no abort/token).
- **Symptom:** rapid movie switching → older `fetchSeatStatus` resolves last, wrong showing's occupied seats displayed → phantom available/occupied.
- **Fix — DIRECT FIX:** add request token/`AbortController`; ignore responses not matching current `showingId`.

### A14. Duplicate listeners on router revisit
- **Where:** `./js/modules/screening/main.js:299-321,365-371` (`setupBookingModes/bindDateArrows` re-added per `initScreening`; `destroyScreening` only kills observer/scrub).
- **Symptom:** N× `setBookingMode`/arrow handler per click after N visits (leak + double actions).
- **Fix — DIRECT FIX:** guard with bound flags or remove listeners in `destroyScreening`.

### A15. UTC/local date mix shifts pills near IST midnight
- **Where:** `./js/modules/screening/api.js:139-142` (`d.getUTCDate()` + `d.getMonth()` local).
- **Symptom:** day/month/year off-by-one in `#datePills/#sumDate/#formShowing` near midnight.
- **Fix — DIRECT FIX:** use all-local (`getDate/getMonth/getFullYear`) or all-UTC consistently.

### A16. 2D fallback kills sweep wall permanently + touches dead nodes
- **Where:** `./js/modules/screening/seatmap.js:35-49` (`getElementById('voxelStage'/'voxelFallback')` are null in `screening.html:150-162`; `wall.style.display='none'` never restored in `arcSeats` path).
- **Symptom:** WebGL-less devices lose page-transition curtain for the session.
- **Fix — DIRECT FIX:** null-guard already present — add wall restore in `arcSeats()` / `destroyScreening` instead of permanent `display:none` (use class toggle).

### A17. Email sent before DB COMMIT (phantom tickets)
- **Where:** `./server/app.js:614` (`sendTicketEmail` fire-and-forget inside loop) before `:646 COMMIT`.
- **Symptom:** if later attendee fails or COMMIT fails → ROLLBACK, but earlier attendees already got "Official Admission Pass" for non-existent bookings. Email failure is also swallowed (booking still returns success).
- **Fix — OPTIONS (pick one):**
  - Option 1 (recommended): COMMIT first, then send emails off-transaction with retry flag.
  - Option 2: keep in-transaction but record `email_status` per booking + retry job.

### A18. Wrong-screen USN check-in
- **Where:** `./server/app.js:820-833,869-870` (USN lookup `ORDER BY created_at DESC LIMIT 1`, no `showing_id` scope, then marks checked-in).
- **Symptom:** door for Film A consumes ticket for Film B.
- **Fix — DIRECT FIX:** require `showingId` alongside `usn` for USN verification, or reject USN-only verify with "scan QR / enter DD-XXXX".

### A19. Modal traps user while submitting
- **Where:** `./js/modules/screening/booking-modal.js:103-109,354-359,368-379` (`closeBookingModal` early-returns when `isSubmitting`; backdrop/Escape blocked post-success).
- **Symptom:** hung network → no cancel path; must reload and risk double-submit.
- **Fix — DIRECT FIX:** add abort/timeout to submit + allow cancel (abort request), keep success-step lock only until passes render.

### A20. Cache-buster + preload mismatches (stale CSS / wasted bytes)
- **Where:** `./screening.html:31-37` (`?v=fresh3` on CSS) vs `./index.html:36-42`, `./admin.html:33-34` (bare paths); `./index.html:21-24` + `./screening.html:16-19` preload `textures/menu-glass-normal.jpeg` but `rg` shows zero JS/CSS consumers (only the preload tags); LCP poster + 60 scrub frames have no preload.
- **Symptom:** stale CSS after router swaps; wasted texture bytes; slow showcase first paint.
- **Fix — DIRECT FIX:** use one cache-buster scheme on all pages; drop the unused texture preload (or wire it into `menu-glass.js`); add `preload` for `assets/showcase-poster.jpg`.

### A21. Docs already stale (wrong counts/ports/structure)
- **Where:** `./MODULARIZATION_PLAN.md:3-9` (monolith counts vs current 329/820/362 shells), `./README.md:34-48,122` (omits `css/js/src`, says PORT 8000 vs `server/index.js` 3000, attributes API to `index.js`), `./CODEBASE_ANALYSIS.md:44-46`.
- **Impact:** Antigravity/human mis-navigation.
- **Fix — DIRECT FIX:** correct numbers/ports/paths in place (docs-only, no logic).

### A22. Small safe fixes batch (apply all)
- `js/modules/admin/auth.js:194-195` — wrap `localStorage` access in `try` (private-mode throw aborts `bootstrap`). DIRECT FIX.
- `js/modules/admin/qr-scanner.js:33-39` — `await/catch` the `clear()` promise (unhandled rejection + held camera). DIRECT FIX.
- `js/modules/screening/booking-modal.js:138,141` — guard `qrDataUri` before `img src`/`download` (avoids `src="undefined"`). DIRECT FIX.
- `js/modules/admin/bookings.js:87-88` — CSV via `Blob + URL.createObjectURL` instead of `encodeURI(data:)` (large rosters exceed URL length). DIRECT FIX.
- `js/modules/screening/booking-modal.js:71` — fix RVU `pattern` double-escape to match `RVU_EMAIL_REGEX`. DIRECT FIX.
- `css/components/footer.css:25,30` — add fallbacks `var(--gold, #C89BB2)`, `var(--muted, #A88698)` (home defines neither). DIRECT FIX.
- `menu.html:283-473` — add same `file://` guard as other pages (currently inconsistent). DIRECT FIX.
