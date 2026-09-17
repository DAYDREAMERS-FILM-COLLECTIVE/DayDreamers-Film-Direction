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

let instancedMesh = null;
let meshWidth = 0;
let meshHeight = 0;

let origX = null;
let origY = null;
let origZ = null;
let origS = null;
let origRotX = null;
let origRotY = null;
let origRotZ = null;
let flatX = null;
let flatY = null;
let totalCubes = 0;
let instanceSize = 0;

let currentP = 0;
let targetP = 0;
let lastRenderedP = -1;
let rafId = null;

const tempMatrix = new THREE.Matrix4();
const tempEuler = new THREE.Euler();
const tempScale = new THREE.Vector3();
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
    if (fallbackImg && !on) fallbackImg.style.opacity = '1';
  } catch (e) {}
}

function framePoint(x, y, targetZ) {
  const h = 0.5;
  const d = targetCameraZ;
  const D = Math.max(1, -targetZ + d);
  const H = (h / d) * D;
  const s = Math.max(0.01, H / h);
  return { s, p: new THREE.Vector3(x * s, y * s, targetZ) };
}

function updateCubeMatrices(p) {
  if (!instancedMesh || !origX) return;
  const isComplete = p >= 0.999;
  for (let i = 0; i < totalCubes; i++) {
    const x = isComplete ? flatX[i] : THREE.MathUtils.lerp(origX[i], flatX[i], p);
    const y = isComplete ? flatY[i] : THREE.MathUtils.lerp(origY[i], flatY[i], p);
    const z = isComplete ? 0 : THREE.MathUtils.lerp(origZ[i], 0, p);
    const s = isComplete ? instanceSize : THREE.MathUtils.lerp(origS[i], instanceSize, p);

    if (isComplete || !origRotX) {
      tempMatrix.makeScale(s, s, s);
      tempMatrix.setPosition(x, y, z);
    } else {
      const rx = THREE.MathUtils.lerp(origRotX[i], 0, p);
      const ry = THREE.MathUtils.lerp(origRotY[i], 0, p);
      const rz = THREE.MathUtils.lerp(origRotZ[i], 0, p);
      tempEuler.set(rx, ry, rz);
      tempMatrix.makeRotationFromEuler(tempEuler);
      tempMatrix.scale(tempScale.set(s, s, s));
      tempMatrix.setPosition(x, y, z);
    }
    instancedMesh.setMatrixAt(i, tempMatrix);
  }
  instancedMesh.instanceMatrix.needsUpdate = true;
}

function renderFrame() {
  if (!running || !renderer || !scene || !camera || !instancedMesh) return;

  // Lerp scroll progress p toward target with damping factor 0.08
  currentP += (targetP - currentP) * 0.08;
  if (Math.abs(targetP - currentP) < 0.0005) {
    currentP = targetP;
  }

  const p = currentP;

  // Dirty check: Only recalculate instance matrices if Math.abs(p - lastRenderedP) >= 0.0005
  if (Math.abs(p - lastRenderedP) >= 0.0005) {
    updateCubeMatrices(p);
    lastRenderedP = p;
  }

  // Camera follows p
  camera.position.z = initCameraZ + (targetCameraZ - initCameraZ) * p;

  // Smooth cross-fade when p >= 0.92 to reveal clean cinema frame backing
  const fallbackImg = document.getElementById('voxelFallback');
  if (p >= 0.92) {
    const fade = Math.min(1, (p - 0.92) / 0.08); // 0.0 -> 1.0
    instancedMesh.material.opacity = Math.max(0, 1.0 - fade);
    if (fallbackImg) fallbackImg.style.opacity = String(fade);
  } else {
    instancedMesh.material.opacity = 1.0;
    if (fallbackImg) fallbackImg.style.opacity = '0';
  }

  renderer.render(scene, camera);
}

function startRenderLoop() {
  if (rafId) return;
  function tick() {
    if (!running) {
      rafId = null;
      return;
    }
    renderFrame();
    rafId = requestAnimationFrame(tick);
  }
  rafId = requestAnimationFrame(tick);
}

function stopRenderLoop() {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

function sizeStage() {
  if (!renderer || !camera) return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();

  if (instancedMesh && meshWidth > 0 && meshHeight > 0) {
    const frustumHeight = 2 * 180 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const frustumWidth = frustumHeight * camera.aspect;
    const coverScale = Math.max(frustumWidth / meshWidth, frustumHeight / meshHeight);
    instancedMesh.scale.set(coverScale, coverScale, coverScale);
  }

  renderFrame();
}

function applyScroll() {
  // Calculate scroll progress strictly relative to #showcase
  const showcaseEl = document.getElementById('showcase');
  if (!showcaseEl) return;
  const rect = showcaseEl.getBoundingClientRect();
  const maxScroll = rect.height - window.innerHeight;
  const p = maxScroll > 0 ? Math.min(Math.max(-rect.top / maxScroll, 0), 1) : 0;
  targetP = p;
}

function onScroll() {
  applyScroll();
}

function watchSection() {
  const s = document.getElementById('showcase');
  if (voxelObserver) {
    try { voxelObserver.disconnect(); } catch (e) {}
    voxelObserver = null;
  }
  if (!s || !booted) {
    running = false;
    stopRenderLoop();
    setStageVisible(false);
    return;
  }

  if (window.IntersectionObserver) {
    voxelObserver = new IntersectionObserver((entries) => {
      const vis = entries[0].isIntersecting;
      running = vis;
      setStageVisible(vis);
      if (vis) {
        applyScroll();
        startRenderLoop();
      } else {
        stopRenderLoop();
      }
    }, { threshold: 0 });
    voxelObserver.observe(s);
  }

  const r = s.getBoundingClientRect();
  const visNow = r.bottom > 0 && r.top < window.innerHeight;
  running = visNow;
  setStageVisible(visNow);
  if (visNow) {
    applyScroll();
    startRenderLoop();
  } else {
    stopRenderLoop();
  }
}

function boot() {
  if (booted) return;
  const stage = document.getElementById('voxelStage');
  const section = document.getElementById('showcase');
  if (!stage || !section || !posterImg) return;
  booted = true;

  const aspect = (posterImg.naturalWidth || posterImg.width) / (posterImg.naturalHeight || posterImg.height);
  let nRow = Math.round(Math.sqrt(16000 / aspect));
  let nCol = Math.round(nRow * aspect);
  let total = nRow * nCol;

  // Safeguard: strictly calibrate to 16,000 cubes max
  if (total > 16000) {
    const k = Math.sqrt(16000 / total);
    nRow = Math.floor(nRow * k);
    nCol = Math.floor(nCol * k);
    total = nRow * nCol;
  }
  totalCubes = total;

  const randRangeZ = 320;
  instanceSize = 220 / nRow;
  const instanceSpacing = instanceSize; // Exact contiguous pitch: spacing == size (no gaps at p=1.0)
  meshWidth = nCol * instanceSpacing;
  meshHeight = nRow * instanceSpacing;

  origX = new Float32Array(total);
  origY = new Float32Array(total);
  origZ = new Float32Array(total);
  origS = new Float32Array(total);
  origRotX = new Float32Array(total);
  origRotY = new Float32Array(total);
  origRotZ = new Float32Array(total);
  flatX = new Float32Array(total);
  flatY = new Float32Array(total);

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
    stopRenderLoop();
    setStageVisible(false);
    console.warn('voxelStage: WebGL context lost. Safely halting rendering and enabling 2D fallback.');
    enable2DFallback();
  }, false);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, 2, 0.5, 1000);
  camera.position.set(0, 0, initCameraZ);

  const geom = new THREE.BoxGeometry(1, 1, 1);
  const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 1.0 });
  instancedMesh = new THREE.InstancedMesh(geom, mat, total);
  const m4 = new THREE.Matrix4();
  const white = new THREE.Color('white');
  let c = 0;

  for (let ri = 0; ri < nRow; ri++) {
    for (let ci = 0; ci < nCol; ci++) {
      const targetGridX = (ci - (nCol - 1) / 2) * instanceSize;
      const targetGridY = ((nRow - 1) / 2 - ri) * instanceSize;
      const rawZ = THREE.MathUtils.randFloatSpread(randRangeZ);
      const targetZ = Math.min(170, Math.max(-180, rawZ));
      const fp = framePoint(targetGridX, targetGridY, targetZ);

      flatX[c] = targetGridX;
      flatY[c] = targetGridY;
      origX[c] = fp.p.x;
      origY[c] = fp.p.y;
      origZ[c] = fp.p.z;
      origS[c] = fp.s * instanceSize;
      origRotX[c] = THREE.MathUtils.randFloatSpread(Math.PI * 0.4);
      origRotY[c] = THREE.MathUtils.randFloatSpread(Math.PI * 0.4);
      origRotZ[c] = THREE.MathUtils.randFloatSpread(Math.PI * 0.3);

      tempEuler.set(origRotX[c], origRotY[c], origRotZ[c]);
      m4.makeRotationFromEuler(tempEuler);
      m4.scale(tempScale.set(origS[c], origS[c], origS[c]));
      m4.setPosition(fp.p.x, fp.p.y, fp.p.z);
      instancedMesh.setMatrixAt(c, m4);
      instancedMesh.setColorAt(c, white);
      c++;
    }
  }
  instancedMesh.instanceMatrix.needsUpdate = true;
  if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;
  scene.add(instancedMesh);

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
    instancedMesh.setColorAt(i, col);
  }
  if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;

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
    stopRenderLoop();
    setStageVisible(false);
  }
}

export function destroyVoxelShowcase() {
  running = false;
  booted = false;
  stopRenderLoop();
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
  if (instancedMesh) {
    try {
      if (instancedMesh.geometry) instancedMesh.geometry.dispose();
      if (instancedMesh.material) instancedMesh.material.dispose();
    } catch (e) {}
    instancedMesh = null;
  }
  origX = null;
  origY = null;
  origZ = null;
  origS = null;
  origRotX = null;
  origRotY = null;
  origRotZ = null;
  flatX = null;
  flatY = null;
  totalCubes = 0;
  scene = null;
  camera = null;
  setStageVisible(false);
}
