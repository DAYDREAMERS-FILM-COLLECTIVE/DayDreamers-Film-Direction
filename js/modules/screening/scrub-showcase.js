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

const posterImg = typeof Image !== 'undefined' ? new Image() : null;
if (posterImg) {
  posterImg.src = '/assets/showcase-poster.jpg';
  posterImg.onload = () => {
    if (lastRenderedIndex === -1 && ctx && canvas) {
      drawSingleImage(posterImg);
    }
  };
}

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
 * Draw image with cover-fit math to fill canvas without distortion.
 */
function drawSingleImage(img) {
  if (!ctx || !canvas || !img) return;
  const cw = canvas.width;
  const ch = canvas.height;
  const iw = img.naturalWidth || 1920;
  const ih = img.naturalHeight || 1080;

  const scale = Math.max(cw / iw, ch / ih);
  const dw = Math.ceil(iw * scale);
  const dh = Math.ceil(ih * scale);
  const dx = Math.round((cw - dw) / 2);
  const dy = Math.round((ch - dh) / 2);

  ctx.drawImage(img, dx, dy, dw, dh);
}

/**
 * Draw the frame using cover-fit math to fill the canvas without distortion or letterboxing.
 */
function drawFrame(frameIndex) {
  if (!ctx || !canvas) return;
  const img = frames[frameIndex];
  if (!img || !img.complete || img.naturalWidth === 0) {
    if (posterImg && posterImg.complete && posterImg.naturalWidth > 0) {
      drawSingleImage(posterImg);
    }
    return;
  }

  drawSingleImage(img);
  lastRenderedIndex = frameIndex;
}

/**
 * Update text overlay fade and crisp poster image cross-fade.
 */
function updateOverlays(p) {
  // Fade showcase text overlay out between p = 0.15 and p = 0.35
  const copyEls = document.querySelectorAll('.showcase-copy, .showcase-content, .featured-presentation');
  let textOpacity = 1;
  if (p <= 0.15) {
    textOpacity = 1;
  } else if (p >= 0.35) {
    textOpacity = 0;
  } else {
    textOpacity = 1 - (p - 0.15) / (0.35 - 0.15);
  }

  copyEls.forEach((el) => {
    el.style.opacity = textOpacity.toFixed(3);
    el.style.visibility = textOpacity > 0 ? 'visible' : 'hidden';
    el.style.pointerEvents = textOpacity > 0.1 ? 'auto' : 'none';
  });

  // Ensure canvas opacity strictly remains at 1.0 (no exit fade)
  if (canvas) {
    canvas.style.opacity = '1';
    canvas.style.display = 'block';
  }

  // Once p >= 0.65, clamp to frame 59 or assets/showcase-poster.jpg
  const posterEl = document.getElementById('showcasePoster') || document.getElementById('voxelFallback');
  if (posterEl) {
    let posterOpacity = 0;
    if (p >= 0.65) {
      posterOpacity = 1;
    } else if (p >= 0.50) {
      posterOpacity = (p - 0.50) / 0.15;
    } else {
      posterOpacity = 0;
    }
    posterEl.style.opacity = posterOpacity.toFixed(3);
  }
}

/**
 * Render frame based on current scrollProgress with dirty check.
 */
function render() {
  const p = scrollProgress;

  // Scrub frames 0 to 59 smoothly across p = 0.0 to p = 0.65:
  let frameIndex = 0;
  if (p < 0.65) {
    const scrubP = p / 0.65;
    frameIndex = Math.min(TOTAL_FRAMES - 1, Math.floor(scrubP * TOTAL_FRAMES));
  } else {
    // Once p >= 0.65, clamp to frame 59 (or assets/showcase-poster.jpg)
    frameIndex = TOTAL_FRAMES - 1;
  }

  if (frameIndex !== lastRenderedIndex || lastRenderedIndex === -1) {
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
 * p = clamp((scrollY - showcaseTop) / (showcaseHeight - windowHeight), 0, 1)
 */
function onScroll() {
  const showcaseEl = document.getElementById('showcase');
  if (!showcaseEl) return;

  const rect = showcaseEl.getBoundingClientRect();
  const showcaseTop = rect.top + window.scrollY;
  const showcaseHeight = rect.height;
  const windowHeight = window.innerHeight;
  const maxScroll = showcaseHeight - windowHeight;

  const p = maxScroll > 0 ? Math.min(Math.max((window.scrollY - showcaseTop) / maxScroll, 0), 1) : 0;

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

/**
 * Clean up listeners and animation frames.
 */
export function destroyScrubShowcase() {
  window.removeEventListener('resize', resizeCanvas);
  window.removeEventListener('scroll', onScroll);
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  canvas = null;
  ctx = null;
}
