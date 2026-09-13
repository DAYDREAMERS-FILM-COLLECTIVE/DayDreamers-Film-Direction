# Dogstudio-Inspired 3D Experiential Campus Cinema Platform

## Staged Execution Roadmap

- [x] **Phase 1: Three.js Scene Setup, Procedural 50-Seat Auditorium & Lighting Rigs**
  - [x] 1.1 Color tokens & atmospheric palette: Deep archival ink (`#080706`), surfaces (`#131110`), hairline borders (`#26221f`), crimson (`#d83128`), warm paper (`#eee9df`), muted sepia (`#8c867e`).
  - [x] 1.2 Procedural 3D Auditorium (zero external Blender dependency):
    - Curved 16:9 cylindrical screen mesh mapping dynamic trailer/movie texture
    - 5 stepped risers with dark concrete/matte wood materials
    - 5x10 continuous seating block: 50 individual chair meshes (Rows A–C Regular `#221f1d`, Rows D–E VIP `#3a2c20`) with shared armrests
    - Raycasting pointer interaction (`onPointerOver`, `onPointerOut`, `onPointerDown`)
    - Dynamic seat states: Available, Hovered (+3mm Y-lift + emissive), Selected (crimson `#d83128` + overhead pinlight), Held (pulsing amber `#78350f`), Booked (sunken charcoal, 0.2 opacity)
  - [x] 1.3 Volumetric Lighting & Atmospheric Dust Particles:
    - Real-time volumetric projector cone radiating from rear booth to screen
    - Interactive particle field (`THREE.Points`, 1,200 motes) reacting to mouse velocity
    - Subtle cinematic postprocessing (Bloom, Vignette)
- [ ] **Phase 2: Lenis Inertial Scroll, GSAP Camera Rig & Dogstudio Viewfinder Cursor**
  - [ ] 2.1 Lenis smooth inertial scrolling integration across viewports
  - [ ] 2.2 GSAP 4-act camera choreography (Act I Projection Booth -> Act II The Descent -> Act III Seat Claim -> Act IV Tear-off pass)
  - [ ] 2.3 35mm camera viewfinder custom magnetic cursor with lerp tracking
  - [ ] 2.4 Ambient audio controller (`src/lib/audio.js`) with theater drone, shutter click, and stamp SFX
- [ ] **Phase 3: Supabase Real-Time Concurrency Integration (`NOWAIT` locks + 5-min timer)**
  - [ ] 3.1 Deferred WebSocket subscription (connected exclusively in Act II/auditorium view)
  - [ ] 3.2 Non-blocking `NOWAIT` atomic lock exception trap (`55P03` -> `SEAT_CONTESTED` in <50ms)
  - [ ] 3.3 Lazy expiration handling & atomic countdown hold dock
- [ ] **Phase 4: Perforated Pass Checkout, RVU Validation & EmailJS Delivery**
  - [ ] 4.1 ReactBits-inspired perforated ticket slide-over modal
  - [ ] 4.2 Individual (1 seat) & Group (2–4 seats) RVU credential validation (`@rvu.edu.in` + USN)
  - [ ] 4.3 Client-side HMAC QR generation and EmailJS dispatch
- [ ] **Phase 5: Admin Door Scanner (`/admin`) & Performance Optimization (60 FPS audit)**
  - [ ] 5.1 Admin CMS pass gate (`fps2026`) with live camera QR scanner
  - [ ] 5.2 Student roster search and single-use entry check-in
  - [ ] 5.3 60 FPS WebGL audit & memory disposal cleanup

