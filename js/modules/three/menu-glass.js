/**
 * js/modules/three/menu-glass.js
 * Three.js Fractal Glass Distortion Scene for Hamburger Drawer Menu.
 * Based on Miro Leon Bucher's ShaderPass distortion pipeline, tailored to
 * Daydreamers' Deep Midnight Plum (#1A0B17) & Rosé Gold (#C89BB2) cinema palette.
 *
 * Responds to 'menuGlass:start' and 'menuGlass:stop' events from burger-menu.js.
 * Consumes 0% GPU/CPU when the menu is closed.
 */

import * as THREE from 'https://esm.sh/three@0.136.0';
import { RGBELoader } from 'https://esm.sh/three@0.136.0/examples/jsm/loaders/RGBELoader.js';
import { EffectComposer } from 'https://esm.sh/three@0.136.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://esm.sh/three@0.136.0/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'https://esm.sh/three@0.136.0/examples/jsm/postprocessing/ShaderPass.js';
import { AfterimagePass } from 'https://esm.sh/three@0.136.0/examples/jsm/postprocessing/AfterimagePass.js';
import { UnrealBloomPass } from 'https://esm.sh/three@0.136.0/examples/jsm/postprocessing/UnrealBloomPass.js';
import { FBXLoader } from 'https://esm.sh/three@0.136.0/examples/jsm/loaders/FBXLoader.js';
import { OrbitControls } from 'https://esm.sh/three@0.136.0/examples/jsm/controls/OrbitControls.js';

let renderer = null;
let running = false;
let scene = null;
let camera = null;
let controls = null;
let composer = null;
let displacementPass = null;
let bloomPass = null;
let animFrameId = null;
let initialized = false;

let isUserInteracting = false;
let transitionProgress = 0;
const transitionTime = 4;
const transitionIncrement = 1 / (60 * transitionTime);
const transitionStartCameraPosition = new THREE.Vector3();
const transitionStartCameraQuaternion = new THREE.Quaternion();

let theta = 0;
let t0 = 0;
let frameErrors = 0;

// Entrance animation: hands descend slowly from top of viewport
let handsGroup = null;
let introStartTime = 0;
const INTRO_DURATION_MS = 2500; // 2.5s slow, elegant descent
const START_Y = 5.2;            // Placed well above viewport top
const REST_Y = -0.2;            // Resting center position

function easeInOutCubic(x) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function onWindowResize() {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (composer) {
    composer.setSize(window.innerWidth, window.innerHeight);
  }
  if (bloomPass) {
    bloomPass.resolution.set(window.innerWidth, window.innerHeight);
  }
}

function updateCameraMovement() {
  theta += 0.003;
  const targetPosition = new THREE.Vector3(
    Math.sin(theta) * 2.8,
    Math.sin(theta * 0.7) * 1.2,
    Math.cos(theta) * 3.2
  );
  const targetQuaternion = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(0, -theta * 0.5, 0)
  );

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

/**
 * Animate hands descending smoothly from top into rest position,
 * followed by a gentle ambient floating breath.
 */
function updateHandsMovement(nowSecs) {
  const targetObj = handsGroup || (scene ? scene.getObjectByName('fallbackSculpture') : null);
  if (!targetObj) return;

  const elapsed = performance.now() - introStartTime;
  const progress = Math.min(Math.max(elapsed / INTRO_DURATION_MS, 0), 1);

  // Smooth ease-out quart for graceful deceleration: 1 - (1 - t)^4
  const eased = 1 - Math.pow(1 - progress, 4);

  // Vertical descent from START_Y to REST_Y
  const currentBaseY = START_Y + (REST_Y - START_Y) * eased;

  // Subtle floating breathing wave once settled
  const settleFactor = Math.max(0, (progress - 0.75) / 0.25);
  const breathY = Math.sin(nowSecs * 1.1) * 0.07 * settleFactor;

  targetObj.position.y = currentBaseY + breathY;

  // Gentle angular tilt leveling out as hands land
  targetObj.rotation.x = -0.16 * (1 - eased);
  targetObj.rotation.y = Math.sin(nowSecs * 0.4) * 0.06;
}

function animate() {
  if (!running) return;
  animFrameId = requestAnimationFrame(animate);

  try {
    if (controls) controls.update();
    const nowSecs = (performance.now() - t0) / 1000;

    updateHandsMovement(nowSecs);
    updateCameraMovement();

    if (composer) {
      composer.render();
    } else if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
    frameErrors = 0;
  } catch (err) {
    frameErrors += 1;
    if (frameErrors > 10) {
      console.warn('[menuGlass] Halting due to consecutive render errors:', err);
      stopMenuGlass();
    }
  }
}

/**
 * Initialize WebGL canvas, Three.js scene, lights, model, and post-processing pipeline.
 */
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
      powerPreference: 'high-performance',
      alpha: true
    });
  } catch (_) {
    renderer = null;
    return;
  }

  // Theme matching: Deep Midnight Plum background
  renderer.setClearColor(0x1A0B17, 1);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Safeguard: handle WebGL context loss
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    stopMenuGlass();
    console.warn('[menuGlass] WebGL context lost. Rendering halted.');
  }, false);

  canvas.addEventListener('webglcontextrestored', () => {
    initialized = false;
    initMenuGlass();
  }, false);

  // 1. Scene & Atmosphere
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x1A0B17, 0.16);

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0.5, 9);

  // 2. Interactive OrbitControls
  const isTouch = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || window.innerWidth <= 768;
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enabled = !isTouch;
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

  // 3. Cinematic Lighting (Warm Rosé Gold & Deep Plum Rim)
  const dirLight = new THREE.DirectionalLight(0xC89BB2, 0.9);
  dirLight.position.set(-4, 3, 5);
  scene.add(dirLight);

  const pointLight1 = new THREE.PointLight(0xE6B8CF, 2.4, 22);
  pointLight1.position.set(0, 3, 2);
  scene.add(pointLight1);

  const pointLight2 = new THREE.PointLight(0x6D3B56, 1.8, 20);
  pointLight2.position.set(3, -2, -2);
  scene.add(pointLight2);

  const ambientLight = new THREE.AmbientLight(0x3A1F33, 0.7);
  scene.add(ambientLight);

  // 4. HDR Environment map (local with remote CDN fallback)
  try {
    const rgbeLoader = new RGBELoader();
    const loadHdr = (url, onFail) => {
      rgbeLoader.load(url, (hdrEquirect) => {
        hdrEquirect.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = hdrEquirect;
      }, undefined, onFail);
    };
    loadHdr('/assets/3d/GRADIENT_01_01_comp.hdr', () => {
      loadHdr('https://miroleon.github.io/daily-assets/GRADIENT_01_01_comp.hdr');
    });
  } catch (_) {}

  // 5. Pristine Satin Metallic Physical Material (Zero scratches / zero fingertip lines)
  const handsMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x6e5263, // Polished titanium rosé plum
    roughness: 0.18,  // Smooth, luxurious satin finish
    metalness: 0.94,  // High reflectivity for soft highlights
    clearcoat: 0.45,
    clearcoatRoughness: 0.12,
    envMapIntensity: 1.6
  });

  // Load 3D Hands FBX model (local first, CDN fallback, procedural sculpture backup)
  let modelLoaded = false;
  const setupModel = (object) => {
    object.traverse((child) => {
      if (child.isLine || child.isLineSegments || child.isLineLoop) {
        child.visible = false;
      }
      if (child.isMesh) {
        child.material = handsMaterial;
        if (child.geometry) {
          child.geometry.computeVertexNormals();
        }
        child.castShadow = false;
        child.receiveShadow = false;
      }
    });

    handsGroup = object;
    handsGroup.position.set(0, START_Y, 0);
    const scale = window.innerWidth <= 768 ? 0.042 : 0.052;
    handsGroup.scale.setScalar(scale);
    scene.add(handsGroup);
    modelLoaded = true;
    introStartTime = performance.now();
  };

  try {
    const fbxLoader = new FBXLoader();
    fbxLoader.load(
      '/assets/3d/two_hands_01.fbx',
      setupModel,
      undefined,
      () => {
        // Fallback to remote CDN if local is unavailable
        fbxLoader.load(
          'https://miroleon.github.io/daily-assets/two_hands_01.fbx',
          setupModel,
          undefined,
          () => {
            if (!modelLoaded) createProceduralSculpture(handsMaterial);
          }
        );
      }
    );
  } catch (_) {
    createProceduralSculpture(handsMaterial);
  }

  // Backup fallback sculpture after 2.5s if FBX is slow to load
  setTimeout(() => {
    if (!modelLoaded && scene) {
      createProceduralSculpture(handsMaterial);
    }
  }, 2500);

  // 6. Post-Processing Pipeline (RenderPass + AfterimagePass + UnrealBloomPass)
  // Stripped of grid-displacement pass to remove all line and stripe distortions across the hands
  try {
    composer = new EffectComposer(renderer);

    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const afterimagePass = new AfterimagePass();
    afterimagePass.uniforms.damp.value = 0.90; // Dreamy cinema motion blur trails
    composer.addPass(afterimagePass);

    bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.25, // bloom strength
      0.55, // radius
      0.16  // threshold
    );
    composer.addPass(bloomPass);
  } catch (err) {
    console.warn('[menuGlass] Post-processing pipeline disabled, using standard renderer:', err);
    composer = null;
  }

  window.addEventListener('resize', onWindowResize, { passive: true });
  initialized = true;
}

/**
 * Procedural fallback sculpture: Mobius Torus Knot in metallic rosé plum.
 */
function createProceduralSculpture(material) {
  if (!scene || scene.getObjectByName('fallbackSculpture')) return;
  const geom = new THREE.TorusKnotGeometry(1.5, 0.42, 128, 32, 2, 3);
  geom.computeVertexNormals();
  const mesh = new THREE.Mesh(geom, material);
  mesh.name = 'fallbackSculpture';
  mesh.position.set(0, START_Y, 0);
  scene.add(mesh);
  introStartTime = performance.now();
}

/**
 * Start animation loop when burger menu opens.
 */
export function startMenuGlass() {
  if (!initialized) initMenuGlass();
  if (running || !renderer) return;

  running = true;
  t0 = performance.now();
  introStartTime = performance.now();

  const targetObj = handsGroup || (scene ? scene.getObjectByName('fallbackSculpture') : null);
  if (targetObj) {
    targetObj.position.y = START_Y;
  }

  onWindowResize();
  animate();
}

/**
 * Stop animation loop when burger menu closes (0% GPU).
 */
export function stopMenuGlass() {
  running = false;
  if (animFrameId) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
}

// Bind custom events from burger-menu.js
if (typeof window !== 'undefined') {
  window.addEventListener('menuGlass:start', startMenuGlass);
  window.addEventListener('menuGlass:stop', stopMenuGlass);

  // Pre-warm Three.js and shaders during idle time
  const warm = () => {
    if (!window.is2DFallbackActive && !initialized) {
      try { initMenuGlass(); } catch (_) {}
    }
  };
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(warm, { timeout: 2500 });
  } else {
    setTimeout(warm, 1000);
  }
}
