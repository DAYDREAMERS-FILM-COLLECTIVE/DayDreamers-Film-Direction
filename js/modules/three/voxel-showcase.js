/**
 * js/modules/three/voxel-showcase.js
 * 3D Room Assembly Instanced Voxel Showcase with Scroll Interpolation.
 * Enforces GPU safeguards: 20,000 instance limit, 1.0x pixel ratio cap, webglcontextlost handling.
 */

import { THREE } from './three-core.js';
import { enable2DFallback } from '../screening/seatmap.js';

let booted = false;
let running = false;
let posterImg = null;
let voxelObserver = null;
let renderer = null;
let scene = null;
let camera = null;
let scrollListener = null;
let resizeListener = null;

const targetCameraZ = 180;
const initCameraZ = targetCameraZ / 5;

function makeProceduralPoster() {
  const c = document.createElement('canvas');
  c.width = 900;
  c.height = 600;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 900, 600);
  g.addColorStop(0, '#1A0B17');
  g.addColorStop(0.35, '#3A1F33');
  g.addColorStop(0.7, '#6D3B56');
  g.addColorStop(1, '#C89BB2');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 900, 600);
  ctx.fillStyle = '#F2E9ED';
  ctx.font = 'bold 52px "Playfair Display", serif';
  ctx.textAlign = 'center';
  ctx.fillText('DAYDREAMERS', 450, 270);
  ctx.font = '22px "Inter", sans-serif';
  ctx.fillStyle = '#C89BB2';
  ctx.fillText('FEATURED PRESENTATION', 450, 330);
  return c;
}

function setStageVisible(on) {
  const stage = document.getElementById('voxelStage');
  const fallbackImg = document.getElementById('voxelFallback');
  try {
    if (stage) stage.style.opacity = on ? '1' : '0';
    if (fallbackImg) fallbackImg.style.opacity = on ? '0' : '1';
  } catch (e) {}
}

function framePoint(x, y, targetZ, randRangeZ) {
  const h = 0.5;
  const d = targetCameraZ;
  const D = -targetZ + d;
  const H = (h / d) * D;
  const s = H / h;
  return { s, p: new THREE.Vector3(x * s, y * s, targetZ) };
}

function renderFrame() {
  if (!running || !renderer || !scene || !camera || window.isScrollingToBooking) return;
  renderer.render(scene, camera);
}

function sizeStage() {
  if (!renderer || !camera) return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderFrame();
}

let ticking = false;
let lastP = -1;

function applyScroll() {
  ticking = false;
  if (!running || !renderer || !scene || !camera || window.isScrollingToBooking) return;
  const s = document.getElementById('showcase');
  if (!s) return;
  const r = s.getBoundingClientRect();
  if (r.bottom <= 0 || r.top >= window.innerHeight) return;
  const totalH = r.height - window.innerHeight;
  let p = totalH > 0 ? (0 - r.top) / totalH : 0;
  if (p < 0) p = 0;
  if (p > 1) p = 1;
  if (Math.abs(p - lastP) < 0.001) return;
  lastP = p;
  camera.position.z = initCameraZ + (targetCameraZ - initCameraZ) * p;
  renderFrame();
}

function onScroll() {
  if (!ticking) {
    ticking = true;
    requestAnimationFrame(applyScroll);
  }
}

function watchSection() {
  const s = document.getElementById('showcase');
  if (voxelObserver) {
    try { voxelObserver.disconnect(); } catch (e) {}
    voxelObserver = null;
  }
  if (!s || !booted) {
    running = false;
    setStageVisible(false);
    return;
  }

  if (window.IntersectionObserver) {
    voxelObserver = new IntersectionObserver((entries) => {
      const vis = entries[0].isIntersecting;
      running = vis;
      setStageVisible(vis);
      if (vis) renderFrame();
    }, { threshold: 0 });
    voxelObserver.observe(s);
  }

  const r = s.getBoundingClientRect();
  const visNow = r.bottom > 0 && r.top < window.innerHeight;
  running = visNow;
  setStageVisible(visNow);
  if (visNow) renderFrame();
}

function boot() {
  if (booted) return;
  const stage = document.getElementById('voxelStage');
  const section = document.getElementById('showcase');
  if (!stage || !section || !posterImg) return;
  booted = true;

  const aspect = (posterImg.naturalWidth || posterImg.width) / (posterImg.naturalHeight || posterImg.height);
  let nRow = 130;
  let nCol = Math.round(nRow * aspect);
  const total = nRow * nCol;

  // Safeguard: strictly cap instanced cubes to 20,000 max
  if (total > 20000) {
    const k = Math.sqrt(19900 / total);
    nRow = Math.floor(nRow * k);
    nCol = Math.floor(nCol * k);
  }
  const randRangeZ = 2 * targetCameraZ * 0.99;
  const instanceSize = 220 / nRow;

  try {
    renderer = new THREE.WebGLRenderer({
      canvas: stage,
      alpha: true,
      antialias: false,
      powerPreference: 'low-power'
    });
  } catch (err) {
    booted = false;
    enable2DFallback();
    return;
  }

  // Cap pixel ratio to 1.0 to prevent multi-gigabyte framebuffer churn on Wayland
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1));
  renderer.shadowMap.enabled = false;

  // Gracefully handle GPU driver reset / context loss on Linux Wayland/Hyprland
  stage.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    running = false;
    booted = false;
    setStageVisible(false);
    console.warn('voxelStage: WebGL context lost. Safely halting rendering and enabling 2D fallback.');
    enable2DFallback();
  }, false);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, 2, 0.5, 1000);
  camera.position.set(0, 0, initCameraZ);

  const geom = new THREE.BoxGeometry(instanceSize, instanceSize, instanceSize);
  geom.translate(0, 0, -0.5 * instanceSize);
  const mat = new THREE.MeshBasicMaterial();
  const mesh = new THREE.InstancedMesh(geom, mat, nCol * nRow);
  const m4 = new THREE.Matrix4();
  const white = new THREE.Color('white');
  let c = 0;

  for (let ri = 0; ri < nRow; ri++) {
    for (let ci = 0; ci < nCol; ci++) {
      const fp = framePoint(
        (ci - nCol / 2 + 0.5) * instanceSize,
        (nRow / 2 - ri + 0.5) * instanceSize,
        THREE.MathUtils.randFloatSpread(randRangeZ) * instanceSize,
        randRangeZ
      );
      m4.makeScale(fp.s, fp.s, fp.s);
      m4.setPosition(fp.p);
      mesh.setMatrixAt(c, m4);
      mesh.setColorAt(c, white);
      c++;
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  scene.add(mesh);

  const can = document.createElement('canvas');
  can.width = nCol;
  can.height = nRow;
  const ctx = can.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(posterImg, 0, 0, posterImg.naturalWidth || posterImg.width, posterImg.naturalHeight || posterImg.height, 0, 0, nCol, nRow);
  const data = ctx.getImageData(0, 0, nCol, nRow).data;
  const col = new THREE.Color();
  const n = nCol * nRow;

  for (let i = 0; i < n; i++) {
    col.setRGB(data[i * 4] / 255, data[i * 4 + 1] / 255, data[i * 4 + 2] / 255, THREE.SRGBColorSpace);
    mesh.setColorAt(i, col);
  }
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

  sizeStage();
  resizeListener = sizeStage;
  window.addEventListener('resize', resizeListener);

  scrollListener = onScroll;
  window.addEventListener('scroll', scrollListener, { passive: true });
  applyScroll();

  watchSection();
  setStageVisible(true);
}

function maybeBoot() {
  if (booted || !posterImg) return;
  if (!document.getElementById('showcase')) return;
  boot();
}

export function initVoxelShowcase() {
  if (typeof window === 'undefined') return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return;
  if (window.matchMedia && window.matchMedia('(max-width: 768px)').matches) return;
  if (!window.WebGLRenderingContext) return;
  if (window.is2DFallbackActive) return;

  const stage = document.getElementById('voxelStage');
  if (!stage) return;

  const imgUrl = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=80';
  const img = new Image();
  img.crossOrigin = 'anonymous';

  const fallbackTimer = setTimeout(() => {
    if (!posterImg) {
      posterImg = makeProceduralPoster();
      maybeBoot();
    }
  }, 1200);

  img.onload = () => {
    clearTimeout(fallbackTimer);
    posterImg = img;
    maybeBoot();
  };

  img.onerror = () => {
    clearTimeout(fallbackTimer);
    if (!posterImg) {
      posterImg = makeProceduralPoster();
      maybeBoot();
    }
  };

  img.src = imgUrl;

  window.__checkVoxelVisibility = watchSection;
  window.__voxelVisible = setVoxelVisible;
}

export function setVoxelVisible(on) {
  if (on) {
    maybeBoot();
    watchSection();
  } else {
    running = false;
    setStageVisible(false);
  }
}

export function destroyVoxelShowcase() {
  running = false;
  booted = false;
  if (voxelObserver) {
    try { voxelObserver.disconnect(); } catch (e) {}
    voxelObserver = null;
  }
  if (scrollListener) {
    window.removeEventListener('scroll', scrollListener);
    scrollListener = null;
  }
  if (resizeListener) {
    window.removeEventListener('resize', resizeListener);
    resizeListener = null;
  }
  if (renderer) {
    try { renderer.dispose(); } catch (e) {}
    renderer = null;
  }
  scene = null;
  camera = null;
  setStageVisible(false);
}
