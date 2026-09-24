/**
 * js/modules/three/contact-ribbon.js
 * Cinematic 35mm Celluloid Film Strip 3D WebGL Background.
 *
 * Rich sculptural film ribbons flowing dynamically in 3D studio space.
 * Features authentic 35mm sprocket perforations, frame dividers, vintage edge numbers,
 * realistic clearcoat celluloid specular reflections, and cinematic 3-point lighting.
 * 
 * Clean, artistic, imaginative — zero cyberpunk, zero floating dust particles.
 */

import * as THREE from '/js/vendor/three.module.js';

let renderer = null;
let scene = null;
let camera = null;
let animFrameId = null;
let resizeHandler = null;
let mouseMoveHandler = null;

// Primary hero film strip
let heroMesh = null;
let heroGeom = null;
let heroMat = null;

// Secondary ambient background ribbon
let ambientMesh = null;
let ambientGeom = null;
let ambientMat = null;

// Target and smoothed mouse coordinates for fluid parallax
const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };

/**
 * 3D Torus Knot Curve Generator for the Hero Film Strip
 */
function getHeroKnotPoint(t, p = 2, q = 3, radius = 14, tube = 5.2, out = new THREE.Vector3()) {
  const phi = t * Math.PI * 2;
  const r = radius + tube * Math.cos(q * phi);
  out.x = r * Math.cos(p * phi);
  out.y = r * Math.sin(p * phi);
  out.z = tube * Math.sin(q * phi);
  return out;
}

/**
 * 3D Winding Architectural Curve for Secondary Ambient Film Ribbon
 */
function getAmbientCurvePoint(t, out = new THREE.Vector3()) {
  const phi = t * Math.PI * 2;
  out.x = 22 * Math.sin(phi * 2.0) * Math.cos(phi);
  out.y = 16 * Math.cos(phi * 2.0);
  out.z = 18 * Math.sin(phi) - 6;
  return out;
}

/**
 * Compute smooth Frenet-Serret coordinate frames along a curve function
 */
function computeCurveFrames(segments, pointFunc) {
  const frames = [];
  const tangent = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const binormal = new THREE.Vector3();
  const pPrev = new THREE.Vector3();
  const pNext = new THREE.Vector3();

  const points = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    points.push(pointFunc(t, new THREE.Vector3()));
  }

  pointFunc(0, pPrev);
  pointFunc(0.001, pNext);
  tangent.subVectors(pNext, pPrev).normalize();

  let tempVec = new THREE.Vector3(0, 0, 1);
  if (Math.abs(tangent.dot(tempVec)) > 0.9) {
    tempVec.set(0, 1, 0);
  }
  normal.crossVectors(tangent, tempVec).normalize();
  binormal.crossVectors(tangent, normal).normalize();

  let curNormal = normal.clone();
  let curBinormal = binormal.clone();
  let curTangent = tangent.clone();

  for (let i = 0; i <= segments; i++) {
    const idxPrev = (i - 1 + segments) % segments;
    const idxNext = (i + 1) % segments;
    tangent.subVectors(points[idxNext], points[idxPrev]).normalize();

    const axis = new THREE.Vector3().crossVectors(curTangent, tangent);
    const angle = curTangent.angleTo(tangent);
    if (axis.lengthSq() > 1e-6 && angle > 1e-6) {
      axis.normalize();
      curNormal.applyAxisAngle(axis, angle);
      curBinormal.applyAxisAngle(axis, angle);
    }
    curTangent.copy(tangent);

    frames.push({
      point: points[i].clone(),
      tangent: curTangent.clone(),
      normal: curNormal.clone(),
      binormal: curBinormal.clone()
    });
  }

  return frames;
}

/**
 * Build dynamic 3D film ribbon geometry with chamfered width
 */
function createRibbonGeometry(frames, segments, baseWidth = 3.6, twistFreq = 4.0) {
  const positions = [];
  const uvs = [];
  const normals = [];
  const indices = [];

  const leftPt = new THREE.Vector3();
  const rightPt = new THREE.Vector3();

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const frame = frames[i];

    // Elegant undulation in ribbon width
    const width = baseWidth * (0.88 + 0.24 * Math.sin(t * Math.PI * twistFreq));

    leftPt.copy(frame.point).addScaledVector(frame.binormal, width * 0.5);
    rightPt.copy(frame.point).addScaledVector(frame.binormal, -width * 0.5);

    positions.push(leftPt.x, leftPt.y, leftPt.z);
    positions.push(rightPt.x, rightPt.y, rightPt.z);

    // Coordinate mapping along film strip length
    const v = t * 24.0;
    uvs.push(0, v);
    uvs.push(1, v);

    // Normal calculation from frame
    normals.push(frame.normal.x, frame.normal.y, frame.normal.z);
    normals.push(frame.normal.x, frame.normal.y, frame.normal.z);

    if (i < segments) {
      const base = i * 2;
      indices.push(base, base + 1, base + 2);
      indices.push(base + 1, base + 3, base + 2);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();

  return geom;
}

/**
 * Generate Authentic High-Res 35mm Celluloid Film Strip Canvas Texture
 * Incorporates sprocket perforations, frame dividers, vintage edge markings, and celluloid gloss.
 */
function createCelluloidFilmTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 2048;
  const ctx = canvas.getContext('2d');

  // 1. Base translucent smoked celluloid tone (Warm Oyster / Slate Emulsion)
  const grad = ctx.createLinearGradient(0, 0, 1024, 0);
  grad.addColorStop(0.00, '#1c1c20');   // Outer dark sprocket rail
  grad.addColorStop(0.12, '#28272b');   // Rail body
  grad.addColorStop(0.15, '#e4ded4');   // Film aperture edge highlight
  grad.addColorStop(0.50, '#f2ede4');   // Center frame translucent celluloid
  grad.addColorStop(0.85, '#e4ded4');   // Right aperture edge highlight
  grad.addColorStop(0.88, '#28272b');   // Right rail body
  grad.addColorStop(1.00, '#1c1c20');   // Outer dark rail
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 2048);

  // 2. Film Frame Intervals (Repeating every 256px down the strip)
  const frameHeight = 256;
  const numFrames = 2048 / frameHeight;

  ctx.lineWidth = 1;

  for (let f = 0; f < numFrames; f++) {
    const yTop = f * frameHeight;
    const yBottom = yTop + frameHeight;

    // Dark Celluloid Frame Separation Bar
    ctx.fillStyle = '#1e1e22';
    ctx.fillRect(150, yTop, 724, 14);

    // Frame Border Lines (Inner aperture framing)
    ctx.strokeStyle = 'rgba(28, 26, 32, 0.45)';
    ctx.lineWidth = 2;
    ctx.strokeRect(154, yTop + 14, 716, frameHeight - 14);

    // Subtle exposure vignette inside frame
    const frameGrad = ctx.createRadialGradient(512, yTop + frameHeight / 2, 40, 512, yTop + frameHeight / 2, 340);
    frameGrad.addColorStop(0, 'rgba(255, 253, 248, 0.65)');
    frameGrad.addColorStop(0.7, 'rgba(235, 227, 215, 0.4)');
    frameGrad.addColorStop(1, 'rgba(200, 190, 175, 0.55)');
    ctx.fillStyle = frameGrad;
    ctx.fillRect(156, yTop + 16, 712, frameHeight - 18);

    // Frame Metadata Typography inside each frame
    ctx.fillStyle = 'rgba(40, 36, 44, 0.35)';
    ctx.font = 'bold 16px "DM Mono", monospace';
    ctx.fillText(`DAYDREAMERS — FRAME ${(f + 1).toString().padStart(2, '0')}`, 174, yTop + 40);

    ctx.font = '12px "DM Mono", monospace';
    ctx.fillText('35MM 400TX  •  AUDITORIUM D ARCHIVE', 174, yTop + frameHeight - 20);

    // Subtle optical sound track line running along left margin
    ctx.strokeStyle = 'rgba(220, 205, 185, 0.4)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(136, yTop);
    ctx.lineTo(136, yBottom);
    ctx.stroke();

    // Secondary optical track
    ctx.strokeStyle = 'rgba(18, 16, 20, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(142, yTop);
    ctx.lineTo(142, yBottom);
    ctx.stroke();
  }

  // 3. Sprocket Perforations (4 per frame interval = 32 per strip)
  const sprocketPitch = 64;
  const numSprockets = 2048 / sprocketPitch;
  const spWidth = 60;
  const spHeight = 42;
  const spCorner = 8;

  function drawRoundedRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  for (let s = 0; s < numSprockets; s++) {
    const y = s * sprocketPitch + 11;

    // Left Rail Sprocket Perforation
    // Dark void hole
    ctx.fillStyle = '#0f0f12';
    drawRoundedRect(44, y, spWidth, spHeight, spCorner);
    ctx.fill();
    // Crisp sprocket bevel edge
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 1.5;
    drawRoundedRect(44, y, spWidth, spHeight, spCorner);
    ctx.stroke();

    // Right Rail Sprocket Perforation
    ctx.fillStyle = '#0f0f12';
    drawRoundedRect(1024 - 44 - spWidth, y, spWidth, spHeight, spCorner);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 1.5;
    drawRoundedRect(1024 - 44 - spWidth, y, spWidth, spHeight, spCorner);
    ctx.stroke();

    // Vintage Margin Edge Markings between sprockets
    if (s % 2 === 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(255, 245, 230, 0.45)';
      ctx.font = '10px "DM Mono", monospace';
      ctx.translate(22, y + 30);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('SAFETY FILM', 0, 0);
      ctx.restore();

      ctx.save();
      ctx.fillStyle = 'rgba(255, 245, 230, 0.45)';
      ctx.font = '10px "DM Mono", monospace';
      ctx.translate(1024 - 18, y + 25);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(`• ${s + 1}A •`, 0, 0);
      ctx.restore();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 2);
  texture.anisotropy = 8;
  return texture;
}

/**
 * Initialize 3D Celluloid Film Ribbon Flight Scene
 */
export function initContactRibbon(container) {
  if (!container) return;
  destroyContactRibbon();

  const width = container.clientWidth || window.innerWidth;
  const height = container.clientHeight || window.innerHeight;

  // 1. Renderer setup with high-contrast ACES tone mapping
  renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.domElement.id = 'contactRibbonCanvas';
  renderer.domElement.style.position = 'absolute';
  renderer.domElement.style.top = '0';
  renderer.domElement.style.left = '0';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.pointerEvents = 'none';
  renderer.domElement.style.zIndex = '0';
  renderer.domElement.style.opacity = '1.0';
  container.appendChild(renderer.domElement);

  // 2. Scene with gentle atmospheric depth fog (preserves foreground clarity)
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xf4f0e6, 0.009);

  // 3. Camera with cinematic focal length
  camera = new THREE.PerspectiveCamera(54, width / height, 0.1, 160);
  camera.matrixAutoUpdate = false;

  // 4. Cinematic 3-Point Studio Lighting
  // Hemisphere ambient daylight
  const hemiLight = new THREE.HemisphereLight(0xfffdf8, 0xd8d0c2, 1.2);
  scene.add(hemiLight);

  // Key Spotlight (crisp directional highlight on celluloid face)
  const keyLight = new THREE.DirectionalLight(0xfffaea, 2.6);
  keyLight.position.set(24, 32, 28);
  scene.add(keyLight);

  // Backlight / Rim Light (warm amber rim on film edges & sprockets)
  const rimLight = new THREE.DirectionalLight(0xffb870, 2.2);
  rimLight.position.set(-20, -18, -22);
  scene.add(rimLight);

  // Soft Cool Fill Light (subtle studio contrast in shadow crevices)
  const fillLight = new THREE.DirectionalLight(0xadc4de, 1.1);
  fillLight.position.set(-18, 20, 15);
  scene.add(fillLight);

  // 5. Generate Texture & Materials
  const filmTexture = createCelluloidFilmTexture();

  // MeshPhysicalMaterial gives authentic clearcoat celluloid specular shine
  heroMat = new THREE.MeshPhysicalMaterial({
    map: filmTexture,
    roughness: 0.18,
    metalness: 0.12,
    clearcoat: 0.95,
    clearcoatRoughness: 0.12,
    reflectivity: 0.85,
    side: THREE.DoubleSide
  });

  // Secondary ambient material with softer presence
  ambientMat = new THREE.MeshPhysicalMaterial({
    map: filmTexture,
    roughness: 0.32,
    metalness: 0.08,
    clearcoat: 0.6,
    clearcoatRoughness: 0.2,
    opacity: 0.55,
    transparent: true,
    side: THREE.DoubleSide
  });

  // 6. Build Geometry & Meshes
  const heroSegments = 1200;
  const heroFrames = computeCurveFrames(heroSegments, (t, out) => getHeroKnotPoint(t, 2, 3, 14, 5.2, out));
  heroGeom = createRibbonGeometry(heroFrames, heroSegments, 4.2, 4.0);
  heroMesh = new THREE.Mesh(heroGeom, heroMat);
  scene.add(heroMesh);

  const ambientSegments = 800;
  const ambientFrames = computeCurveFrames(ambientSegments, (t, out) => getAmbientCurvePoint(t, out));
  ambientGeom = createRibbonGeometry(ambientFrames, ambientSegments, 3.2, 2.0);
  ambientMesh = new THREE.Mesh(ambientGeom, ambientMat);
  scene.add(ambientMesh);

  // 7. Interactive Mouse Parallax
  mouseMoveHandler = (e) => {
    mouse.targetX = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.targetY = -(e.clientY / window.innerHeight) * 2 + 1;
  };
  window.addEventListener('mousemove', mouseMoveHandler, { passive: true });

  // 8. Viewport Resize Handler
  resizeHandler = () => {
    if (!renderer || !camera || !container) return;
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', resizeHandler);

  // 9. 60fps Animation Loop with Fluid Camera Path
  const heroSpeed = 0.000032;
  const camPos = new THREE.Vector3();
  const lookAtPt = new THREE.Vector3();
  const basisB = new THREE.Vector3();
  const basisN = new THREE.Vector3();
  const basisT = new THREE.Vector3();

  function animate(t) {
    animFrameId = requestAnimationFrame(animate);

    // Smooth inertia mouse lerp
    mouse.x += (mouse.targetX - mouse.x) * 0.045;
    mouse.y += (mouse.targetY - mouse.y) * 0.045;

    // Slowly rotate secondary ambient ribbon for depth
    if (ambientMesh) {
      ambientMesh.rotation.y = t * 0.00012;
      ambientMesh.rotation.x = Math.sin(t * 0.00008) * 0.15;
    }

    // Camera travels smoothly along the primary knot curve
    const ratio = (t * heroSpeed) % 1.0;
    const idx = Math.floor(ratio * heroSegments);
    const nextIdx = (idx + 1) % heroSegments;
    const alpha = (ratio * heroSegments) - idx;

    const frameCurrent = heroFrames[idx];
    const frameNext = heroFrames[nextIdx];

    basisB.lerpVectors(frameCurrent.binormal, frameNext.binormal, alpha);
    basisN.lerpVectors(frameCurrent.normal, frameNext.normal, alpha);
    basisT.lerpVectors(frameCurrent.tangent, frameNext.tangent, alpha);

    camPos.lerpVectors(frameCurrent.point, frameNext.point, alpha);
    // Offset camera above the ribbon and respond to mouse
    camPos.addScaledVector(basisN, 3.4 + mouse.y * 1.2);
    camPos.addScaledVector(basisB, 1.8 + mouse.x * 1.6);

    // Look slightly ahead along the curve for dramatic cinematic perspective
    const lookAheadIdx = (idx + 42) % heroSegments;
    lookAtPt.copy(heroFrames[lookAheadIdx].point);

    camera.matrix.makeBasis(basisB, basisN, basisT).setPosition(camPos);
    camera.lookAt(lookAtPt);
    camera.matrixWorldNeedsUpdate = true;

    renderer.render(scene, camera);
  }

  animFrameId = requestAnimationFrame(animate);
}

/**
 * Teardown and clean up all WebGL resources
 */
export function destroyContactRibbon() {
  if (animFrameId) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }

  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler);
    resizeHandler = null;
  }

  if (mouseMoveHandler) {
    window.removeEventListener('mousemove', mouseMoveHandler);
    mouseMoveHandler = null;
  }

  if (heroGeom) {
    heroGeom.dispose();
    heroGeom = null;
  }

  if (heroMat) {
    if (heroMat.map) heroMat.map.dispose();
    heroMat.dispose();
    heroMat = null;
  }

  if (ambientGeom) {
    ambientGeom.dispose();
    ambientGeom = null;
  }

  if (ambientMat) {
    if (ambientMat.map) ambientMat.map.dispose();
    ambientMat.dispose();
    ambientMat = null;
  }

  if (scene) {
    while (scene.children.length > 0) {
      const obj = scene.children[0];
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
      scene.remove(obj);
    }
    scene = null;
  }

  if (renderer) {
    if (renderer.domElement && renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
    renderer.dispose();
    renderer = null;
  }

  heroMesh = null;
  ambientMesh = null;
  camera = null;
}
