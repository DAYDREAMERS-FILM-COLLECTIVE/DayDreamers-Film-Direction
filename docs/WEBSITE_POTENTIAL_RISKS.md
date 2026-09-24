---
doc: WEBSITE_POTENTIAL_RISKS
scope: latent risks — not yet observed breaking prod, but likely under load, env change, or attack
audience: antigravity (harden after actuals) + humans
repo_root: .
date: 2026-09-18
rule: OPTIONS ONLY. No direct fix prescribed — each risk lists 2+ approaches. Fix File A first.
---

# Website Potential Risks — What Could Break Next

These are **not** today's outages. Each lists the trigger that would turn it into one, plus hardening options. Antigravity: do File A (`WEBSITE_ACTUAL_ISSUES.md`) first; then take these in severity order.

---

## HIGH LIKELIHOOD / HIGH IMPACT

### P1. Concurrent double-sell (seats, USN, email) — no serializable guard
- **Where:** `./server/app.js:491-553,562-609` (`BEGIN` default `READ COMMITTED`, SELECT-checks then INSERTs, no `FOR UPDATE`/advisory lock); `./server/schema.sql:57` (only `UNIQUE(showing_id, user_usn)` — no seat-overlap or email constraint).
- **Trigger:** two users book the same seat within the same ~100ms window (opening rush, group + individual overlap).
- **Consequence:** both pass checks; seat/email double-sold (USN loser gets 500 unique-violation, others get silent duplicates).
- **Options:** (a) add exclusion/overlap guard — e.g. `SELECT ... FOR UPDATE` on showing row or advisory lock per `showing_id`, + `UNIQUE(showing_id, user_email)`; (b) move to serializable retry loop; (c) pre-reserve seats via `locked_seats`-style hold with TTL.

### P2. Admin tokens never expire + `Set` leaks + serverless split-brain
- **Where:** `./server/app.js:19-50` (`adminSessions Set`, `iat` never validated, no `exp`, nonce unchecked, unbounded growth); `./netlify/functions/api.js:1-4`.
- **Trigger:** token theft, or long-lived Netlify deployment with many logins / cold starts.
- **Consequence:** stolen token valid forever; logout/revoke impossible without rotating `ADMIN_JWT_SECRET`; memory growth; per-instance `Set` divergence.
- **Options:** (a) short-lived HMAC tokens with `exp` + server-side denylist; (b) stateless JWT verify-only (drop `Set`); (c) rotate secret + force re-login procedure documented.

### P3. Secrets in URLs (query/body token acceptance)
- **Where:** `./server/app.js:52-62` (`?admin_key/?token`, body `key/passkey/token`).
- **Trigger:** admin shares a link, proxy/CDN logs, browser history, `Referer` leak.
- **Consequence:** credential capture from logs.
- **Options:** (a) accept only `Authorization: Bearer` + `x-admin-key` header, reject query/body tokens; (b) keep query support but never log URLs + mark deprecated.

### P4. MITM-able Postgres + open CORS + huge body limit
- **Where:** `./server/db.js:21-27` (strips `sslmode`, `rejectUnauthorized:false`, silent empty string); `./server/app.js:72` (`cors()` open); `:79-80` (`50mb` JSON).
- **Trigger:** network attacker, malicious site driving public booking/check-in, large-payload DoS.
- **Consequence:** DB interception; CSRF-style cross-origin abuse of open endpoints; memory/CPU DoS.
- **Options:** (a) pin CA / `rejectUnauthorized:true` + allowlist CORS origins + lower body limit (e.g. `1mb`, higher only where QR uploads need it); (b) keep open CORS but add rate-limit + CSRF tokens on state-changing public routes.

### P5. Error + email injection disclosure
- **Where:** `./server/app.js:664,781,895` (`500 ... + err.message` leaks constraint/column internals); `./server/email.js:56-60` (name/film/hall interpolated unescaped into HTML).
- **Trigger:** attacker forces DB errors; booker with HTML/JS in name field.
- **Consequence:** schema fingerprinting; stored HTML/JS in mailbox clients.
- **Options:** (a) generic public 500s + detailed server logs; escape/sanitize all email template fields; (b) add WAF-style input stripping (weaker alone).

### P6. `DD-XXXX` entropy (~1M, case-insensitive) + lock-without-conflict-check
- **Where:** `./server/app.js:386-393` (32-char ×4), `:690-692` (`UPPER()` defeats index, enumeration-friendly); `:367-373` (lock allows already-booked seats); `:519-522` overlap check correct single-threaded only.
- **Trigger:** enumeration via open check-in (A2) or locker confusion (`occupiedSeats` mixing).
- **Consequence:** code guessing; admin locks booked seat (UX contradiction).
- **Options:** (a) longer ref codes + case-sensitive lookup + rate-limit + conflict check on lock; (b) keep format but add per-IP throttling + lock-vs-booked validation.

---

## MEDIUM

### P7. QR generation inside open transaction (pool exhaustion)
- **Where:** `./server/app.js:583,646` (`await QRCode.toDataURL()` per attendee while holding `pool.connect()` client, `max:10`).
- **Trigger:** group-booking rush (4 QR renders × concurrent users).
- **Consequence:** latency spikes, pool timeouts, wider rollback window.
- **Options:** (a) generate QR after COMMIT outside transaction; (b) raise pool + add statement timeout (partial).

### P8. Dual check-in state (`status` + `checked_in`) diverges
- **Where:** `./server/app.js:711,743-744` (sets both) vs `:852,869-870` (verify path touches `checked_in` only).
- **Trigger:** mixed use of both endpoints after schema fix (A1).
- **Consequence:** rows where `status ≠ checked_in`, stats miscounts.
- **Options:** (a) single source of truth (`checked_in` boolean + timestamp, drop `status`); (b) DB trigger/constraint keeping them in sync.

### P9. Supply-chain / offline contradiction (esm.sh + unpkg + cdnjs, no SRI)
- **Where:** `./js/modules/three/menu-glass.js:165-187` (`esm.sh three@0.136.0` loaders + `miroleon.github.io` HDR/FBX fallbacks) vs local `js/vendor/three.module.js`; `index.html:43`, `screening.html:38` (GSAP, no fallback/SRI); `admin.html:13` (unpkg); `netlify.toml` (no CSP/HSTS/Permissions-Policy).
- **Trigger:** CDN outage, version skew (`outputColorSpace`/passes API), compromised CDN.
- **Consequence:** silent 3D downgrade, broken transitions timing, scanner dead (A9), XSS persistence.
- **Options:** (a) vendor all loaders locally + importmap, add SRI + CSP; (b) keep CDN but add `onerror` local fallback + integrity hashes.

### P10. `assets/` uncached in prod + router stale-CSS risk
- **Where:** `./netlify.toml:20-30` (immutable only `/fonts,/textures`, not `/assets` = 60 scrub frames + poster + FBX/HDR); `./server/app.js:927-936` (local does cache them — prod/local diverge).
- **Trigger:** repeat visits re-download megabytes of frames; CSS swap staleness on router nav.
- **Consequence:** slow showcase, bandwidth cost.
- **Options:** (a) extend immutable caching to `/assets/*` + unify cache-buster scheme; (b) lazy-load frames with `loading`/intersection (partial).

### P11. Mobile / touch / motion gaps
- **Where:** `./js/modules/screening/seatmap.js:147-156` (hover-only `#tip`); `./js/modules/screening/main.js:27-73` (fixed 2.4s scroll assumes desktop heights); `scrub-showcase.js:206-224` (no 2D/coarse guard, preloads 60×1080p, `destroy` doesn't abort); `menu-glass.js:235-239` (full bloom on touch); `admin.css` (only 900px breakpoint; 320px table/seat squeeze); burger 815px vs page menu 768px flip; `booking-modal.js:71` pattern vs regex divergence; `admin.html:142-145` anchor-tabs not focusable.
- **Trigger:** real phones, small tablets, reduced-motion users, keyboard users.
- **Consequence:** stuck tooltip, scroll jump, jank/heat, layout squeeze, a11y failures.
- **Options:** (a) pointer-event tooltips + 44px targets, responsive scroll measurement, `matchMedia('(pointer:coarse)')`/`prefers-reduced-motion` guards, abortable preloads, 500/600px admin tier; (b) targeted fixes per device report (slower).

### P12. `src/` mistaken as live code + stale docs drift
- **Where:** `src/` (~51 files, `react-native/zustand/zod`, zero live imports); `MODULARIZATION_PLAN.md`, `CODEBASE_ANALYSIS.md`, `README.md` staleness (see A21).
- **Trigger:** new contributor/AI agent edits `src/` expecting UI change, or follows stale port/count docs.
- **Consequence:** wasted work, zero-effect "fixes", misrouted changes.
- **Options:** (a) add `src/README.md` "reference-only" banner + keep `CODEBASE_METADATA.md` as canonical map; (b) move `src/` out of deploy root (bigger change).

### P13. Repo-root static serving over-exposure
- **Where:** `./server/app.js:926-938` (`express.static(repoRoot)` + `/.netlify/functions/api` prefix strip); `netlify.toml: publish="."`.
- **Trigger:** misconfigured deploy/bundling serves `server/` source or dotfiles.
- **Consequence:** source/secret exposure (`.env` currently gitignored and unpublished — verify per deploy).
- **Options:** (a) serve only allowlisted dirs (`index.html`, `css/`, `js/`, `assets/`, `fonts/`, `textures/`) + confirm Netlify ignores dotfiles; (b) add explicit deny rules + deploy smoke test.

---

## How to work this list

1. Finish File A first — several risks above (P1, P6, P8) assume A1–A3 are fixed.
2. For each P-item: reproduce the trigger in staging, choose one option, note the choice in the PR.
3. Re-verify: concurrent booking test (P1), token-expiry test (P2), CORS/SSL review (P4), CDN-offline test (P9), 320px + touch + reduced-motion pass (P11).
