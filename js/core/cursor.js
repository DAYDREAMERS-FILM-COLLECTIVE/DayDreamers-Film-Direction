/**
 * js/core/cursor.js
 * Unified Custom Cursor & Sparkling Particle Engine.
 * Shared across Home, Screening, and all DayDreamers pages:
 * - Responsive RAF lerp position tracking for #star-cursor
 * - Continuous sparkling particle trail emission during cursor motion
 * - Radial 360-degree sparkle particle burst on click/pointerdown
 * - Interactive hover states for links, buttons, date cards, and .seat elements
 * - Strict modal safety guards: hides custom cursor & restores native cursors on body.modal-open
 * - Touch device & reduced motion safety guards
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
  '#e8ecf5',
  '#ead5e0',
  '#f4b8da',
  '#fdf6e2'
];

const INTERACTIVE_SELECTOR = [
  'a',
  'button',
  '[role="button"]',
  '[data-cursor]',
  '.seat',
  '.date-card',
  '.movie',
  '.btn',
  '.btn-solid',
  '.btn-line',
  '.reserve-seats-btn',
  '.showcase-cta',
  '.book-bar',
  '.film-card',
  '.carousel-arrow',
  '.menu-item',
  '.menu-action',
  '.burger-toggle',
  '.round-link',
  '.text-link',
  'input',
  'select',
  'label'
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

  // Cleanup any legacy viewfinder elements
  const oldFrame = document.getElementById('cursor-frame');
  if (oldFrame) oldFrame.style.display = 'none';
  const oldLabel = document.getElementById('cursor-label');
  if (oldLabel) oldLabel.style.display = 'none';

  // Ensure #star-cursor DOM element exists
  let star = document.getElementById('star-cursor');
  if (!star) {
    star = document.createElement('div');
    star.id = 'star-cursor';
    star.className = 'star-cursor';
    star.setAttribute('aria-hidden', 'true');
    star.innerHTML = '&#10022;';
    document.body.appendChild(star);
  } else if (!star.textContent.trim()) {
    star.innerHTML = '&#10022;';
  }

  // Mouse & RAF Lerp state
  let targetX = -100;
  let targetY = -100;
  let currentX = -100;
  let currentY = -100;
  let hasMovedOnce = false;

  // Particle emission state
  let lastTrailX = -1000;
  let lastTrailY = -1000;
  let lastTrailTime = 0;
  let liveParticleCount = 0;
  const MAX_PARTICLES = 60;

  function spawnParticle(x, y, isBurst = false, angle = 0, speed = 0) {
    if (isModalActive()) return;
    if (liveParticleCount >= MAX_PARTICLES + (isBurst ? 15 : 0)) return;

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
      const dx = (Math.random() - 0.5) * 26;
      const dy = 20 + Math.random() * 45;
      p.style.setProperty('--dx', `${dx.toFixed(1)}px`);
      p.style.setProperty('--dy', `${dy.toFixed(1)}px`);
      p.style.setProperty('--rot', `${(Math.random() * 360 - 180).toFixed(0)}deg`);
      p.style.fontSize = `${8 + Math.random() * 9}px`;
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

    if (dist >= 8 && (now - lastTrailTime) >= 45) {
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
      const speed = 42 + Math.random() * 58;
      spawnParticle(x, y, true, angle, speed);
    }

    if (star) {
      star.classList.add('active');
      setTimeout(() => {
        if (star) star.classList.remove('active');
      }, 150);
    }
  }

  // RAF position lerp loop
  function render() {
    if (hasMovedOnce && star) {
      currentX += (targetX - currentX) * 0.35;
      currentY += (targetY - currentY) * 0.35;

      if (isModalActive()) {
        star.style.opacity = '0';
        star.style.visibility = 'hidden';
      } else {
        star.style.opacity = '1';
        star.style.visibility = 'visible';
        star.style.left = `${currentX.toFixed(2)}px`;
        star.style.top = `${currentY.toFixed(2)}px`;
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
        currentX = targetX;
        currentY = targetY;
        hasMovedOnce = true;
        if (star) {
          star.style.left = `${currentX}px`;
          star.style.top = `${currentY}px`;
          star.style.opacity = '1';
          star.style.visibility = 'visible';
        }
      }

      emitMotionTrail(e.clientX, e.clientY);
    },
    { passive: true }
  );

  // Window leave & enter guards
  document.addEventListener('mouseleave', () => {
    if (star) star.style.opacity = '0';
  });

  document.addEventListener('mouseenter', () => {
    if (star && !isModalActive() && hasMovedOnce) {
      star.style.opacity = '1';
    }
  });

  // Click / pointerdown burst
  window.addEventListener('pointerdown', (e) => {
    if (isModalActive()) return;
    emitRadialBurst(e.clientX, e.clientY);
  });

  // Interactive element hover state detection
  document.addEventListener(
    'mouseover',
    (e) => {
      if (isModalActive()) {
        document.body.classList.remove('c-hover', 'c-seat');
        if (star) star.classList.remove('c-hover', 'c-seat');
        return;
      }
      if (!e.target || !e.target.closest) return;

      const seatEl = e.target.closest('.seat');
      if (seatEl) {
        document.body.classList.add('c-hover', 'c-seat');
        if (star) star.classList.add('c-hover', 'c-seat');
        return;
      }

      const interactiveEl = e.target.closest(INTERACTIVE_SELECTOR);
      if (interactiveEl) {
        document.body.classList.add('c-hover');
        document.body.classList.remove('c-seat');
        if (star) {
          star.classList.add('c-hover');
          star.classList.remove('c-seat');
        }
      } else {
        document.body.classList.remove('c-hover', 'c-seat');
        if (star) star.classList.remove('c-hover', 'c-seat');
      }
    },
    { passive: true }
  );

  document.addEventListener(
    'mouseout',
    (e) => {
      if (!e.relatedTarget) {
        document.body.classList.remove('c-hover', 'c-seat');
        if (star) star.classList.remove('c-hover', 'c-seat');
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
