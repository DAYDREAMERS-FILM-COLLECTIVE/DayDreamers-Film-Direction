if (typeof FileReader === 'undefined') {
  globalThis.FileReader = class {
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then((buf) => {
        this.result = buf;
        if (this.onloadend) this.onloadend();
        if (this.onload) this.onload();
      });
    }
  };
}

import fs from 'fs';
import path from 'path';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

function createCinemaLensModel() {
  const root = new THREE.Group();
  root.name = 'CinemaLensAssembly';

  // 1. Camera Body Core (Chamber)
  const bodyGeo = new THREE.BoxGeometry(2.4, 2.0, 2.8);
  const bodyMat = new THREE.MeshStandardMaterial({
    name: 'Mat_CameraBody',
    color: 0x0c0e15,
    roughness: 0.4,
    metalness: 0.85,
  });
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.name = 'Camera_Body';
  bodyMesh.position.set(0, 0, -2.0);
  root.add(bodyMesh);

  // 2. Lens Mount Flange (PL-mount brass ring)
  const mountGeo = new THREE.CylinderGeometry(1.25, 1.35, 0.35, 48);
  mountGeo.rotateX(Math.PI / 2);
  const mountMat = new THREE.MeshStandardMaterial({
    name: 'Mat_MountFlange',
    color: 0xd4af37, // Muted gold
    roughness: 0.25,
    metalness: 0.95,
  });
  const mountMesh = new THREE.Mesh(mountGeo, mountMat);
  mountMesh.name = 'Mount_Flange';
  mountMesh.position.set(0, 0, -0.45);
  root.add(mountMesh);

  // 3. Main Anamorphic Cylindrical Barrel
  const barrelGeo = new THREE.CylinderGeometry(1.4, 1.45, 1.8, 64);
  barrelGeo.rotateX(Math.PI / 2);
  const barrelMat = new THREE.MeshStandardMaterial({
    name: 'Mat_AnamorphicBarrel',
    color: 0x141824,
    roughness: 0.3,
    metalness: 0.88,
  });
  const barrelMesh = new THREE.Mesh(barrelGeo, barrelMat);
  barrelMesh.name = 'Anamorphic_Housing';
  barrelMesh.position.set(0, 0, 0.5);
  root.add(barrelMesh);

  // 4. Knurled Focal Ring with Stepped Grooves
  const ringGeo = new THREE.TorusGeometry(1.47, 0.08, 24, 64);
  const ringMat = new THREE.MeshStandardMaterial({
    name: 'Mat_FocalRing',
    color: 0xc92a42, // Crimson accent
    roughness: 0.2,
    metalness: 0.9,
  });
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  ringMesh.name = 'Focal_Ring_Milled';
  ringMesh.position.set(0, 0, 0.2);
  root.add(ringMesh);

  // 5. Aperture Iris Ring
  const irisRingGeo = new THREE.CylinderGeometry(1.3, 1.3, 0.15, 48);
  irisRingGeo.rotateX(Math.PI / 2);
  const irisMat = new THREE.MeshStandardMaterial({
    name: 'Mat_IrisRing',
    color: 0x1c2130,
    roughness: 0.35,
    metalness: 0.9,
  });
  const irisMesh = new THREE.Mesh(irisRingGeo, irisMat);
  irisMesh.name = 'Aperture_Iris_Ring';
  irisMesh.position.set(0, 0, 0.8);
  root.add(irisMesh);

  // 6. Central Optical Prism Core (Internal glass block)
  const prismGeo = new THREE.BoxGeometry(0.85, 0.85, 0.85);
  const prismMat = new THREE.MeshPhysicalMaterial({
    name: 'Mat_PrismGlass',
    color: 0xe8e3d9,
    transmission: 0.95,
    roughness: 0.05,
    ior: 1.62,
    thickness: 0.8,
  });
  const prismMesh = new THREE.Mesh(prismGeo, prismMat);
  prismMesh.name = 'Prism_Glass_Core';
  prismMesh.position.set(0, 0, 0.5);
  root.add(prismMesh);

  // 7. Front Anamorphic Curved Lens Element
  const frontLensGeo = new THREE.SphereGeometry(1.36, 48, 32, 0, Math.PI * 2, 0, 0.72);
  const frontLensMat = new THREE.MeshPhysicalMaterial({
    name: 'Mat_FrontGlass',
    color: 0xffffff,
    transmission: 0.96,
    roughness: 0.04,
    ior: 1.54,
    thickness: 1.2,
  });
  const frontLensMesh = new THREE.Mesh(frontLensGeo, frontLensMat);
  frontLensMesh.name = 'Lens_Front_Curved';
  frontLensMesh.position.set(0, 0, 1.25);
  root.add(frontLensMesh);

  // 8. Matte Box Flange (Front cinema hood)
  const hoodGeo = new THREE.CylinderGeometry(1.65, 1.45, 0.4, 4); // 4-sided flared hood
  hoodGeo.rotateX(Math.PI / 2);
  hoodGeo.rotateZ(Math.PI / 4);
  const hoodMat = new THREE.MeshStandardMaterial({
    name: 'Mat_MatteBox',
    color: 0x080910,
    roughness: 0.5,
    metalness: 0.8,
  });
  const hoodMesh = new THREE.Mesh(hoodGeo, hoodMat);
  hoodMesh.name = 'Matte_Box_Flange';
  hoodMesh.position.set(0, 0, 1.55);
  root.add(hoodMesh);

  return root;
}

const scene = createCinemaLensModel();
const exporter = new GLTFExporter();

exporter.parse(
  scene,
  (gltf) => {
    const outPath = path.join(process.cwd(), 'public', 'models', 'cinema_lens.glb');
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, Buffer.from(gltf));
    console.log(`✓ Generated high-fidelity Blendkit cinema lens model at: ${outPath} (${(gltf.byteLength / 1024).toFixed(1)} KB)`);
  },
  (err) => {
    console.error('Error exporting GLTF:', err);
    process.exit(1);
  },
  { binary: true }
);
