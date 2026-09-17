/**
 * js/modules/three/menu-glass.js
 * Liquid Glass 3D Canvas for Hamburger Drawer Menu.
 * Responds to menuGlass:start and menuGlass:stop events from sweep-wall.js.
 */

import { THREE, OrbitControls } from './three-core.js';

let renderer = null;
let running = false;
let scene = null;
let camera = null;
let controls = null;
let composer = null;
let displacementPass = null;
let gradePass = null;
let animFrameId = null;

let isUserInteracting = false;
let transitionProgress = 0;
const transitionTime = 9;
const transitionIncrement = 1 / (60 * transitionTime);
const transitionStartCameraPosition = new THREE.Vector3();
const transitionStartCameraQuaternion = new THREE.Quaternion();
let theta = 0;
let pushT = 1;
let t0 = 0;
let frameErrors = 0;
let handAnimationLoaded = false;
let initialized = false;

function fallbackTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const x = c.getContext('2d');
  const imgd = x.createImageData(256, 256);
  let xi, yi, v, o;
  for (yi = 0; yi < 256; yi++) {
    for (xi = 0; xi < 256; xi++) {
      v = Math.floor(128 + 100 * Math.sin(xi * 0.11) * Math.sin(yi * 0.13) + 27 * Math.sin(xi * 0.031 + yi * 0.043));
      o = (yi * 256 + xi) * 4;
      imgd.data[o] = v;
      imgd.data[o + 1] = 255 - v;
      imgd.data[o + 2] = 128;
      imgd.data[o + 3] = 255;
    }
  }
  x.putImageData(imgd, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.minFilter = THREE.NearestFilter;
  return t;
}

function easeInOutCubic(x) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function onWindowResize() {
  if (camera) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }
  if (renderer) {
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

function updateCameraMovement() {
  theta += 0.0016;
  const targetPosition = new THREE.Vector3(Math.sin(theta) * 3, Math.sin(theta), Math.cos(theta) * 3);
  const targetQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -theta, 0));

  if (isUserInteracting) {
    if (transitionProgress > 0) transitionProgress = 0;
    transitionStartCameraPosition.copy(camera.position);
    transitionStartCameraQuaternion.copy(camera.quaternion);
  } else {
    if (transitionProgress < 1) {
      transitionProgress += transitionIncrement;
      const easedProgress = easeInOutCubic(transitionProgress);
      camera.position.lerpVectors(transitionStartCameraPosition, targetPosition, easedProgress);
      camera.quaternion.slerp(transitionStartCameraQuaternion, targetQuaternion, easedProgress);
    } else {
      camera.position.copy(targetPosition);
      camera.quaternion.copy(targetQuaternion);
    }
  }
  if (scene) camera.lookAt(scene.position);
}

function animate() {
  if (!running) return;
  animFrameId = requestAnimationFrame(animate);

  try {
    if (controls) controls.update();
    const nowSecs = (performance.now() - t0) / 1000;

    if (pushT < 1) {
      pushT = Math.min(1, pushT + 1 / (60 * 5));
      camera.fov = 45 - 3 * easeInOutCubic(pushT);
      camera.updateProjectionMatrix();
    } else if (transitionProgress >= 1) {
      handAnimationLoaded = true;
    }

    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
    updateCameraMovement();
    frameErrors = 0;
  } catch (frameErr) {
    frameErrors += 1;
    if (frameErrors > 5) running = false;
  }
}

export function initMenuGlass() {
  if (initialized) return;
  const canvas = document.getElementById('menuGlass');
  if (!canvas) return;

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.WebGLRenderingContext) return;
  if (window.is2DFallbackActive) return;

  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'low-power'
    });
  } catch (err) {
    renderer = null;
    return;
  }

  renderer.setClearColor(0x11151c);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = false;

  // Safeguard: halt loop on GPU context loss
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    running = false;
    stopMenuGlass();
    console.warn('menuGlass: WebGL context lost. Safely halting rendering.');
  }, false);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 10);

  const isTouch = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || window.innerWidth <= 768;
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enabled = !isTouch;
  controls.dampingFactor = 1;
  controls.enablePan = false;
  controls.enableZoom = false;

  const angleLimit = Math.PI / 7;
  controls.minPolarAngle = Math.PI / 2 - angleLimit;
  controls.maxPolarAngle = Math.PI / 2 + angleLimit;

  controls.addEventListener('start', () => { isUserInteracting = true; });
  controls.addEventListener('end', () => {
    isUserInteracting = false;
    transitionStartCameraPosition.copy(camera.position);
    transitionStartCameraQuaternion.copy(camera.quaternion);
    transitionProgress = 0;
  });

  const fill = new THREE.DirectionalLight(0xffb46b, 0.55);
  fill.position.set(-6, 2, 6);
  scene.add(fill);

  const ambient = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambient);

  // Fallback 3D geometric centerpiece
  const geom = new THREE.IcosahedronGeometry(2, 2);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x6d3b56,
    roughness: 0.3,
    metalness: 0.8
  });
  const mesh = new THREE.Mesh(geom, mat);
  scene.add(mesh);

  window.addEventListener('resize', onWindowResize);
  initialized = true;
}

export function startMenuGlass() {
  if (!initialized) initMenuGlass();
  if (running || !renderer) return;

  running = true;
  if (!handAnimationLoaded) {
    pushT = 0;
    camera.fov = 45;
  } else {
    pushT = 1;
    camera.fov = 42;
  }
  t0 = performance.now();
  camera.updateProjectionMatrix();
  onWindowResize();
  animate();
}

export function stopMenuGlass() {
  running = false;
  if (animFrameId) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
}

// Bind custom events from sweep-wall.js
if (typeof window !== 'undefined') {
  window.addEventListener('menuGlass:start', startMenuGlass);
  window.addEventListener('menuGlass:stop', stopMenuGlass);

  // Pre-warm menu glass in idle callback
  const warm = () => {
    if (!window.is2DFallbackActive && !initialized) {
      initMenuGlass();
    }
  };
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(warm, { timeout: 2500 });
  } else {
    setTimeout(warm, 1000);
  }
}
