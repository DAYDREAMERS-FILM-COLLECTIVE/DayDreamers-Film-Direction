/**
 * js/core/cursor.js
 * Shared custom cursor controller:
 * 1. Director viewfinder cursor (#cursor-frame, #cursor-label) with GSAP quickTo lerping.
 * 2. Star sprinkle cursor (#star-cursor) with dynamic particles.
 * Includes touch device detection, reduced-motion preferences, and 2D fallback guards.
 */

export function initCursor() {
  const isTouch = ('ontouchstart' in window) || 
                  (navigator.maxTouchPoints > 0) || 
                  window.matchMedia('(pointer: coarse)').matches ||
                  window.matchMedia('(hover: none)').matches;

  const is2DFallback = Boolean(window.is2DFallbackActive || (document.body && document.body.classList.contains('seatmap-2d-mode')));

  const frame = document.getElementById('cursor-frame');
  const label = document.getElementById('cursor-label');
  const star = document.getElementById('star-cursor');
  const tip = document.getElementById('tip');

  // Guard: Touch devices or 2D fallback mode -> disable custom cursors completely
  if (isTouch || is2DFallback) {
    if (frame) frame.style.display = 'none';
    if (label) label.style.display = 'none';
    if (star) star.style.display = 'none';
    if (tip) tip.style.display = 'none';
    if (document.body) document.body.style.cursor = 'auto';
    return;
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof window.gsap !== 'undefined';

  // 1. Director Viewfinder Cursor (screening.html)
  if (frame && hasGsap) {
    try {
      window.gsap.set(frame, { xPercent: -50, yPercent: -50 });
      if (label) {
        window.gsap.set(label, { xPercent: -50, yPercent: -140 });
      }

      const fx = window.gsap.quickTo(frame, 'x', { duration: 0.08, ease: 'power2.out' });
      const fy = window.gsap.quickTo(frame, 'y', { duration: 0.08, ease: 'power2.out' });
      const lx = label ? window.gsap.quickTo(label, 'x', { duration: 0.08, ease: 'power2.out' }) : null;
      const ly = label ? window.gsap.quickTo(label, 'y', { duration: 0.08, ease: 'power2.out' }) : null;

      window.addEventListener('mousemove', function(e) {
        fx(e.clientX);
        fy(e.clientY);
        if (lx && ly) {
          lx(e.clientX);
          ly(e.clientY);
        }
      });

      document.addEventListener('mouseover', function(e) {
        let t = null;
        if (e.target && e.target.closest) {
          t = e.target.closest('[data-cursor], a, button, .seat');
        }
        document.body.classList.remove('c-hover', 'c-label', 'c-seat');
        if (!t) return;

        document.body.classList.add('c-hover');
        let holder = null;
        if (t.closest) {
          holder = t.closest('[data-cursor]');
        }
        let text = holder ? holder.getAttribute('data-cursor') : '';
        const isSeat = t.classList && t.classList.contains('seat') && !t.classList.contains('occupied');
        if (!text && isSeat) {
          text = 'PICK';
        }
        if (isSeat) {
          document.body.classList.add('c-seat');
        }
        if (text && label) {
          label.textContent = text;
          document.body.classList.add('c-label');
        }
      });

      document.addEventListener('mousedown', function() {
        if (!reduceMotion) {
          window.gsap.to(frame, { scale: 0.9, duration: 0.08, ease: 'power2.out' });
        }
      });

      document.addEventListener('mouseup', function() {
        if (!reduceMotion) {
          window.gsap.to(frame, { scale: 1, duration: 0.12, ease: 'power2.out' });
        }
      });
    } catch (e) {
      if (frame) frame.style.display = 'none';
      if (label) label.style.display = 'none';
      if (document.body) document.body.style.cursor = 'auto';
    }
  } else if (frame) {
    frame.style.display = 'none';
    if (label) label.style.display = 'none';
  }

  // 2. Star Cursor with dynamic sprinkles (index.html)
  if (star) {
    try {
      const sprinkleChars = [
        '\u2726', '\u2727', '\u274B', '\u2736', '\u2737',
        '\u2738', '\u2739', '\u273A', '\u273B', '\u273C',
        '\u273D', '\u2740', '\u2726', '\u2727', '\u2736'
      ];
      const colors = ['#e8ecf5', '#c9d2e4', '#ffffff', '#aeb8cc'];
      let lastX = 0, lastY = 0, lastSprinkle = 0, liveSprinkles = 0;

      function createSprinkle(x, y) {
        liveSprinkles += 1;
        const el = document.createElement('div');
        el.className = 'sprinkle';
        el.textContent = sprinkleChars[Math.floor(Math.random() * sprinkleChars.length)];
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        el.style.color = colors[Math.floor(Math.random() * colors.length)];
        el.style.fontSize = (8 + Math.random() * 10) + 'px';
        el.style.transform = 'translate(-50%, -50%) rotate(' + (Math.random() * 360) + 'deg)';
        document.body.appendChild(el);
        setTimeout(function() {
          el.remove();
          liveSprinkles -= 1;
        }, 900);
      }

      document.addEventListener('mousemove', function(e) {
        const x = e.clientX, y = e.clientY;
        star.style.left = x + 'px';
        star.style.top = y + 'px';
        star.style.transform = 'translate(-50%, -50%) rotate(' + (x * 0.05) + 'deg)';
        const now = Date.now();
        const dx = x - lastX, dy = y - lastY;
        if (now - lastSprinkle > 60 && liveSprinkles < 40 && Math.sqrt(dx * dx + dy * dy) > 6) {
          lastSprinkle = now;
          createSprinkle(x, y);
        }
        lastX = x;
        lastY = y;
      });

      document.addEventListener('click', function(e) {
        for (let i = 0; i < 5; i++) {
          (function(n) {
            setTimeout(function() {
              if (liveSprinkles < 40) {
                createSprinkle(
                  e.clientX + (Math.random() - 0.5) * 30,
                  e.clientY + (Math.random() - 0.5) * 30
                );
              }
            }, n * 60);
          })(i);
        }
      });

      if (document.body) document.body.style.cursor = 'none';
    } catch (starErr) {
      if (star) star.style.display = 'none';
      if (document.body) document.body.style.cursor = 'auto';
    }
  }
}

// Attach globally for legacy access
if (typeof window !== 'undefined') {
  window.initCursor = initCursor;
}

// Auto-run when DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCursor);
  } else {
    initCursor();
  }
}
