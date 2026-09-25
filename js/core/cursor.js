/**
 * js/core/cursor.js
 * Advanced Multi-State Animated Custom Cursor Engine.
 * Shared across Home, Screening, Contact, and Menu:
 * - Dual-layer physics: precision core dot (instant tracking) + smooth trailing aura ring (fluid inertia)
 * - Autonomous organic aura breathing and rotation
 * - Context-aware interactive hover states:
 *   • Links / Buttons (.c-link-hover): magnetic expanded glowing lens
 *   • Text Inputs (.c-text-hover): sleek animated optical I-beam with cross-ticks
 *   • Seats (.c-seat-hover): 4-quadrant targeting reticle with pulsed rose glow
 *   • Media / Cards (.c-media-hover): cinematic expanded aperture ring
 * - Spring scale compression, shockwave ripple, and radial sparkle burst on pointerdown
 * - Continuous sparkling particle trail emission during swift motion
 * - Strict modal safety guards and touch device auto-detection
 */

let isInitialized = false;

function isTouchDevice() {
  return (
    typeof window !== 'undefined' &&
    (('ontouchstart' in window) ||
      (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) ||
      window.matchMedia('(pointer: coarse)').matches ||
      window.matchMedia('(hover: none)').matches)
  );
}

function isModalActive() {
  if (typeof document === 'undefined') return false;
  return Boolean(
    (document.body && document.body.classList.contains('modal-open')) ||
    document.querySelector('.modal-open') ||
    document.querySelector('.booking-modal.open') ||
    document.querySelector('#bookingModal.open')
  );
}

const SPARKLE_CHARS = [
  '\u2726', '\u2727', '\u274B', '\u2736', '\u2737',
  '\u2738', '\u2739', '\u273A', '\u273B', '\u273C',
  '\u273D', '\u2740', '\u2728'
];

const SPARKLE_COLORS = [
  '#ffffff',
  '#fff4fa',
  '#c89bb2',
  '#ffd700',
  '#38d9d4',
  '#e8ecf5',
  '#98e4eb',
  '#fdf6e2'
];

const LINK_SELECTOR = [
  'a',
  'button',
  '[role="button"]',
  '[data-cursor]',
  '.btn',
  '.btn-solid',
  '.btn-line',
  '.reserve-seats-btn',
  '.burger-toggle',
  '.site-header-button',
  '.menu-camera-icon-btn',
  '.menu-item a',
  '.menu-action',
  '.round-link',
  '.text-link',
  '.faq-question',
  '.faq-cat-btn',
  '.sidebar-nav-btn',
  '.contact-scroll-top'
].join(', ');

const TEXT_SELECTOR = [
  'input',
  'textarea',
  'select',
  '[contenteditable="true"]',
  '.contact-input',
  '.form-control'
].join(', ');

const MEDIA_SELECTOR = [
  '.movie',
  '.film-card',
  '.movie-thumb',
  '.showcase-cta',
  '.carousel-arrow',
  '.carousel-card',
  '[data-cursor="PLAY"]',
  '[data-cursor="CAMERA"]'
].join(', ');

export function initCursor() {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  if (isInitialized) return;

  // Touch guard: do not initialize custom cursor on touch viewports
  if (isTouchDevice()) {
    const starEl = document.getElementById('star-cursor');
    if (starEl) starEl.style.display = 'none';
    if (document.body) document.body.style.cursor = 'auto';
    return;
  }

  isInitialized = true;

  // Create or upgrade #star-cursor container with dot + ring
  let container = document.getElementById('star-cursor');
  if (!container) {
    container = document.createElement('div');
    container.id = 'star-cursor';
    container.className = 'star-cursor custom-cursor-container';
    container.setAttribute('aria-hidden', 'true');
    document.body.appendChild(container);
  }

  container.innerHTML = `
    <div class="cursor-ring" aria-hidden="true"></div>
    <div class="cursor-dot" aria-hidden="true"></div>
  `;

  const dot = container.querySelector('.cursor-dot');
  const ring = container.querySelector('.cursor-ring');

  // Mouse & RAF Lerp state
  let targetX = -100;
  let targetY = -100;
  let dotX = -100;
  let dotY = -100;
  let ringX = -100;
  let ringY = -100;
  let hasMovedOnce = false;

  // Particle emission state
  let lastTrailX = -1000;
  let lastTrailY = -1000;
  let lastTrailTime = 0;
  let liveParticleCount = 0;
  const MAX_PARTICLES = 50;

  function spawnParticle(x, y, isBurst = false, angle = 0, speed = 0) {
    if (isModalActive()) return;
    if (liveParticleCount >= MAX_PARTICLES + (isBurst ? 16 : 0)) return;

    liveParticleCount++;
    const p = document.createElement('div');
    p.className = 'star-particle sprinkle';
    p.setAttribute('aria-hidden', 'true');
    p.textContent = SPARKLE_CHARS[Math.floor(Math.random() * SPARKLE_CHARS.length)];
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    p.style.color = SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)];

    if (isBurst) {
      const dx = Math.cos(angle) * speed;
      const dy = Math.sin(angle) * speed;
      p.style.setProperty('--dx', `${dx.toFixed(1)}px`);
      p.style.setProperty('--dy', `${dy.toFixed(1)}px`);
      p.style.setProperty('--rot', `${(Math.random() * 720 - 360).toFixed(0)}deg`);
      p.style.fontSize = `${10 + Math.random() * 12}px`;
    } else {
      const dx = (Math.random() - 0.5) * 24;
      const dy = 16 + Math.random() * 38;
      p.style.setProperty('--dx', `${dx.toFixed(1)}px`);
      p.style.setProperty('--dy', `${dy.toFixed(1)}px`);
      p.style.setProperty('--rot', `${(Math.random() * 360 - 180).toFixed(0)}deg`);
      p.style.fontSize = `${7 + Math.random() * 8}px`;
    }

    document.body.appendChild(p);

    setTimeout(() => {
      p.remove();
      liveParticleCount = Math.max(0, liveParticleCount - 1);
    }, 850);
  }

  function emitMotionTrail(x, y) {
    if (isModalActive()) return;
    const now = performance.now();
    const dx = x - lastTrailX;
    const dy = y - lastTrailY;
    const dist = Math.hypot(dx, dy);

    if (dist >= 12 && (now - lastTrailTime) >= 50) {
      lastTrailTime = now;
      lastTrailX = x;
      lastTrailY = y;
      spawnParticle(x, y, false);
    }
  }

  function emitRadialBurst(x, y) {
    if (isModalActive()) return;
    const count = 12;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * (Math.PI * 2) + (Math.random() - 0.5) * 0.35;
      const speed = 40 + Math.random() * 55;
      spawnParticle(x, y, true, angle, speed);
    }

    if (container) {
      container.classList.add('is-clicking');
      setTimeout(() => {
        if (container) container.classList.remove('is-clicking');
      }, 200);
    }
  }

  // RAF position lerp loop
  function render() {
    if (hasMovedOnce && container) {
      // Snappy core dot lerp
      dotX += (targetX - dotX) * 0.65;
      dotY += (targetY - dotY) * 0.65;

      // Smooth fluid trailing aura ring lerp
      ringX += (targetX - ringX) * 0.18;
      ringY += (targetY - ringY) * 0.18;

      if (isModalActive()) {
        container.style.opacity = '0';
        container.style.visibility = 'hidden';
      } else {
        container.style.opacity = '1';
        container.style.visibility = 'visible';

        if (dot) {
          dot.style.transform = `translate3d(${dotX.toFixed(1)}px, ${dotY.toFixed(1)}px, 0)`;
        }
        if (ring) {
          ring.style.transform = `translate3d(${ringX.toFixed(1)}px, ${ringY.toFixed(1)}px, 0)`;
        }
      }
    }

    if (typeof window !== 'undefined' && window.requestAnimationFrame) {
      window.requestAnimationFrame(render);
    }
  }

  if (typeof window !== 'undefined' && window.requestAnimationFrame) {
    window.requestAnimationFrame(render);
  }

  // Mouse move listener
  window.addEventListener(
    'mousemove',
    (e) => {
      targetX = e.clientX;
      targetY = e.clientY;

      if (!hasMovedOnce) {
        dotX = ringX = targetX;
        dotY = ringY = targetY;
        hasMovedOnce = true;
        if (container) {
          container.style.opacity = '1';
          container.style.visibility = 'visible';
        }
      }

      emitMotionTrail(e.clientX, e.clientY);
    },
    { passive: true }
  );

  // Window leave & enter guards
  document.addEventListener('mouseleave', () => {
    if (container) container.style.opacity = '0';
  });

  document.addEventListener('mouseenter', () => {
    if (container && !isModalActive() && hasMovedOnce) {
      container.style.opacity = '1';
    }
  });

  // Pointer down / click burst
  window.addEventListener('pointerdown', (e) => {
    if (isModalActive()) return;
    emitRadialBurst(e.clientX, e.clientY);
  });

  // Comprehensive Context-Aware Hover Detection
  function clearAllHoverClasses() {
    document.body.classList.remove('c-link-hover', 'c-text-hover', 'c-seat-hover', 'c-media-hover');
    if (container) {
      container.classList.remove('c-link-hover', 'c-text-hover', 'c-seat-hover', 'c-media-hover');
    }
  }

  document.addEventListener(
    'mouseover',
    (e) => {
      if (isModalActive()) {
        clearAllHoverClasses();
        return;
      }
      if (!e.target || !e.target.closest) return;

      // 1. Seat selection hover
      const seatEl = e.target.closest('.seat:not(.occupied)');
      if (seatEl) {
        clearAllHoverClasses();
        document.body.classList.add('c-seat-hover');
        if (container) container.classList.add('c-seat-hover');
        return;
      }

      // 2. Text input / text selection hover
      const textEl = e.target.closest(TEXT_SELECTOR);
      if (textEl) {
        clearAllHoverClasses();
        document.body.classList.add('c-text-hover');
        if (container) container.classList.add('c-text-hover');
        return;
      }

      // 3. Media / cards hover
      const mediaEl = e.target.closest(MEDIA_SELECTOR);
      if (mediaEl) {
        clearAllHoverClasses();
        document.body.classList.add('c-media-hover');
        if (container) container.classList.add('c-media-hover');
        return;
      }

      // 4. Links / Buttons interactive hover
      const linkEl = e.target.closest(LINK_SELECTOR);
      if (linkEl) {
        clearAllHoverClasses();
        document.body.classList.add('c-link-hover');
        if (container) container.classList.add('c-link-hover');
        return;
      }

      // Default: clear
      clearAllHoverClasses();
    },
    { passive: true }
  );

  document.addEventListener(
    'mouseout',
    (e) => {
      if (!e.relatedTarget) {
        clearAllHoverClasses();
      }
    },
    { passive: true }
  );
}

// Backward compatibility alias & global bindings
export const initStarCursor = initCursor;

if (typeof window !== 'undefined') {
  window.initCursor = initCursor;
  window.initStarCursor = initStarCursor;
}

// Auto-run on DOM ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initCursor());
  } else {
    initCursor();
  }
}
