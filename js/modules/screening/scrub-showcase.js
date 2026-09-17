/**
 * js/modules/screening/scrub-showcase.js
 * High-Performance 2D Canvas Scrub Engine for Showcase Sequence.
 * Preloads all 60 baked 1080p frames and renders with cover-fit math on RAF.
 */

const TOTAL_FRAMES = 60;
const frames = new Array(TOTAL_FRAMES);

let canvas = null;
let ctx = null;
let scrollProgress = 0;
let lastRenderedIndex = -1;
let rafId = null;
let framesLoaded = false;

/**
 * Preload all 60 frames into memory and decode them.
 */
async function preloadFrames() {
  const promises = [];

  for (let i = 0; i < TOTAL_FRAMES; i++) {
    const pad = String(i).padStart(2, '0');
    const img = new Image();
    img.src = `/assets/showcase-frames/frame_${pad}.webp`;
    frames[i] = img;

    if (typeof img.decode === 'function') {
      promises.push(img.decode().catch(() => {}));
    } else {
      promises.push(new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      }));
    }
  }

  await Promise.all(promises);
  framesLoaded = true;
  render();
}

/**
 * Draw the frame using cover-fit math to fill the canvas without distortion or letterboxing.
 */
function drawFrame(frameIndex) {
  if (!ctx || !canvas) return;
  const img = frames[frameIndex];
  if (!img) return;

  const cw = canvas.width;
  const ch = canvas.height;
  const iw = img.naturalWidth || 1920;
  const ih = img.naturalHeight || 1080;

  // Cover-fit math: scale proportionally to fill entire canvas viewport
  const scale = Math.max(cw / iw, ch / ih);
  const dw = Math.ceil(iw * scale);
  const dh = Math.ceil(ih * scale);
  const dx = Math.round((cw - dw) / 2);
  const dy = Math.round((ch - dh) / 2);

  ctx.drawImage(img, dx, dy, dw, dh);
  lastRenderedIndex = frameIndex;
}

/**
 * Update text overlay fade and crisp poster image cross-fade.
 */
function updateOverlays(p) {
  // Ensure the text ("Cinema, One Cube at a Time") remains at opacity: 1 and visible throughout scrub
  const copyEls = document.querySelectorAll('.showcase-copy, .showcase-content, .featured-presentation');
  copyEls.forEach((el) => {
    el.style.opacity = '1';
    el.style.visibility = 'visible';
    el.style.pointerEvents = 'auto';
  });

  // Between p = 0.75 and p = 0.88, smoothly fade in crisp poster to 100%
  // Hold fully visible from p = 0.88 to p = 1.0
  const posterEl = document.getElementById('showcasePoster') || document.getElementById('voxelFallback');
  if (posterEl) {
    let posterOpacity = 0;
    if (p <= 0.75) {
      posterOpacity = 0;
    } else if (p >= 0.88) {
      posterOpacity = 1;
    } else {
      posterOpacity = (p - 0.75) / 0.13;
    }
    posterEl.style.opacity = posterOpacity.toFixed(3);
  }
}

/**
 * Render frame based on current scrollProgress with dirty check.
 */
function render() {
  const p = scrollProgress;

  // Map frame scrubbing to the first 75% of the scroll track:
  const scrubP = Math.min(1, Math.max(0, p / 0.75));
  const frameIndex = Math.min(59, Math.floor(scrubP * 59));

  if (frameIndex !== lastRenderedIndex) {
    drawFrame(frameIndex);
  }

  updateOverlays(p);
}

/**
 * Set scroll progression (0.0 to 1.0) and schedule render on RAF.
 */
export function setScrubProgress(progress) {
  scrollProgress = Math.min(1, Math.max(0, progress));
  if (!rafId) {
    rafId = requestAnimationFrame(() => {
      rafId = null;
      render();
    });
  }
}

/**
 * Update canvas buffer dimensions to match window.
 */
function resizeCanvas() {
  if (!canvas) return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);

  lastRenderedIndex = -1; // Force repaint on dimension change
  render();
}

/**
 * Calculate progress relative to #showcase sticky container.
 */
function onScroll() {
  const showcaseEl = document.getElementById('showcase');
  if (!showcaseEl) return;

  const rect = showcaseEl.getBoundingClientRect();
  const maxScroll = rect.height - window.innerHeight;
  const p = maxScroll > 0 ? Math.min(Math.max(-rect.top / maxScroll, 0), 1) : 0;

  setScrubProgress(p);
}

/**
 * Initialize 2D Canvas Scrub Engine.
 */
export function initScrubShowcase() {
  canvas = document.getElementById('scrubCanvas');
  if (!canvas) return;

  ctx = canvas.getContext('2d', { alpha: false });

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });

  preloadFrames().then(() => {
    onScroll();
    render();
  });

  if (typeof window !== 'undefined') {
    window.__setScrubProgress = setScrubProgress;
    window.__checkScrubVisibility = onScroll;
  }
}
