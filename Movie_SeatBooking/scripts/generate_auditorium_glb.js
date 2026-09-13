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

function createAuditoriumScene() {
  const scene = new THREE.Scene();
  scene.name = 'AuditoriumScene';

  // 1. Curved 16:9 Acoustic Cinema Screen
  // Radius: 18m, arc: 0.52 rad (~30 deg curve), width approx 9.3m, height 5.2m (16:9)
  const screenRadius = 18;
  const screenArc = 0.52;
  const screenHeight = 5.2;
  const screenGeo = new THREE.CylinderGeometry(
    screenRadius,
    screenRadius,
    screenHeight,
    32,
    1,
    true,
    -screenArc / 2 + Math.PI / 2,
    screenArc
  );
  screenGeo.scale(-1, 1, 1);

  const screenMat = new THREE.MeshStandardMaterial({
    color: 0xeeece8,
    roughness: 0.85,
    metalness: 0.05,
    name: 'ScreenMaterial',
  });
  const screenMesh = new THREE.Mesh(screenGeo, screenMat);
  screenMesh.name = 'CinemaScreen';
  screenMesh.position.set(0, 3.2, 0);
  scene.add(screenMesh);

  // Screen Bezel / Acoustic Masking Frame
  const frameGeo = new THREE.CylinderGeometry(
    screenRadius - 0.05,
    screenRadius - 0.05,
    screenHeight + 0.35,
    32,
    1,
    true,
    -(screenArc + 0.04) / 2 + Math.PI / 2,
    screenArc + 0.04
  );
  frameGeo.scale(-1, 1, 1);
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x0a0908,
    roughness: 0.95,
    metalness: 0.1,
    name: 'ScreenFrameMaterial',
  });
  const frameMesh = new THREE.Mesh(frameGeo, frameMat);
  frameMesh.name = 'ScreenFrame';
  frameMesh.position.set(0, 3.2, 0);
  scene.add(frameMesh);

  // 2. Stage Floor & Auditorium Base
  const stageGeo = new THREE.BoxGeometry(16, 0.4, 4);
  const stageMat = new THREE.MeshStandardMaterial({
    color: 0x141210,
    roughness: 0.9,
    metalness: 0.1,
    name: 'StageMaterial',
  });
  const stageMesh = new THREE.Mesh(stageGeo, stageMat);
  stageMesh.name = 'StageFloor';
  stageMesh.position.set(0, 0.2, 1.8);
  scene.add(stageMesh);

  // Main Floor
  const floorGeo = new THREE.BoxGeometry(18, 0.1, 22);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x11100f,
    roughness: 0.95,
    metalness: 0.05,
    name: 'AuditoriumFloorMaterial',
  });
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.name = 'AuditoriumFloor';
  floorMesh.position.set(0, -0.05, 10);
  scene.add(floorMesh);

  // 3. Stepped Seating Risers (5 Tiers for Rows A to E)
  const rows = ['A', 'B', 'C', 'D', 'E'];
  const riserDepths = 1.9;
  const riserWidth = 14.5;
  const riserStepHeight = 0.45;

  rows.forEach((row, rowIndex) => {
    const riserHeight = (rowIndex + 1) * riserStepHeight;
    const riserZ = 4.8 + rowIndex * riserDepths;

    const riserGeo = new THREE.BoxGeometry(riserWidth, riserHeight, riserDepths - 0.05);
    const riserMat = new THREE.MeshStandardMaterial({
      color: 0x171513,
      roughness: 0.88,
      metalness: 0.08,
      name: `RiserMaterial_${row}`,
    });
    const riserMesh = new THREE.Mesh(riserGeo, riserMat);
    riserMesh.name = `Riser_Tier_${row}`;
    riserMesh.position.set(0, riserHeight / 2, riserZ);
    scene.add(riserMesh);
  });

  // 4. 50 Physical Cinema Seats (Rows A-E, Cols 1-10)
  const cushionGeo = new THREE.BoxGeometry(0.58, 0.14, 0.54);
  const backrestGeo = new THREE.BoxGeometry(0.58, 0.65, 0.12);
  const armrestGeo = new THREE.BoxGeometry(0.08, 0.35, 0.5);
  const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.35, 8);

  const colSpacing = 0.88;
  const startColX = -((10 - 1) * colSpacing) / 2; // centered

  rows.forEach((row, rowIndex) => {
    const isVip = rowIndex >= 3; // Rows D and E are VIP
    const riserTopY = (rowIndex + 1) * riserStepHeight;
    const rowZ = 4.8 + rowIndex * riserDepths;

    for (let col = 1; col <= 10; col++) {
      const seatNodeName = `Seat_${row}${col}`;
      const seatGroup = new THREE.Group();
      seatGroup.name = seatNodeName;

      const colX = startColX + (col - 1) * colSpacing;
      const curveAngle = -colX * 0.025;

      seatGroup.position.set(colX, riserTopY, rowZ);
      seatGroup.rotation.y = curveAngle;

      // Base materials
      const upholsteryMat = new THREE.MeshStandardMaterial({
        color: isVip ? 0x2d241e : 0x22201d,
        roughness: 0.7,
        metalness: 0.15,
        name: `Mat_${seatNodeName}`,
      });

      const frameMat = new THREE.MeshStandardMaterial({
        color: 0x0d0c0b,
        roughness: 0.6,
        metalness: 0.4,
        name: `FrameMat_${seatNodeName}`,
      });

      // Cushion
      const cushion = new THREE.Mesh(cushionGeo, upholsteryMat);
      cushion.name = `${seatNodeName}_Cushion`;
      cushion.position.set(0, 0.35, 0);
      seatGroup.add(cushion);

      // Backrest
      const backrest = new THREE.Mesh(backrestGeo, upholsteryMat);
      backrest.name = `${seatNodeName}_Backrest`;
      backrest.position.set(0, 0.68, -0.22);
      backrest.rotation.x = -0.12;
      seatGroup.add(backrest);

      // Armrests (Left & Right)
      const armLeft = new THREE.Mesh(armrestGeo, frameMat);
      armLeft.name = `${seatNodeName}_ArmL`;
      armLeft.position.set(-0.33, 0.45, -0.05);
      seatGroup.add(armLeft);

      const armRight = new THREE.Mesh(armrestGeo, frameMat);
      armRight.name = `${seatNodeName}_ArmR`;
      armRight.position.set(0.33, 0.45, -0.05);
      seatGroup.add(armRight);

      // Center Pedestal / Leg
      const leg = new THREE.Mesh(legGeo, frameMat);
      leg.name = `${seatNodeName}_Leg`;
      leg.position.set(0, 0.175, 0);
      seatGroup.add(leg);

      seatGroup.userData = {
        seatId: seatNodeName,
        rowLabel: row,
        colNumber: col,
        tier: isVip ? 'vip' : 'regular',
      };

      scene.add(seatGroup);
    }
  });

  // 5. Rear Projection Booth Wall & Window
  const backWallGeo = new THREE.BoxGeometry(18, 9, 0.4);
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x11100f,
    roughness: 0.95,
    metalness: 0.05,
    name: 'WallMaterial',
  });
  const backWall = new THREE.Mesh(backWallGeo, wallMat);
  backWall.name = 'ProjectionBoothWall';
  backWall.position.set(0, 4.5, 15.5);
  scene.add(backWall);

  // Projection Port Glass
  const glassGeo = new THREE.BoxGeometry(1.6, 0.9, 0.42);
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.6,
    roughness: 0.1,
    metalness: 0.9,
    name: 'ProjectionGlassMaterial',
  });
  const glassMesh = new THREE.Mesh(glassGeo, glassMat);
  glassMesh.name = 'ProjectionPort';
  glassMesh.position.set(0, 4.2, 15.5);
  scene.add(glassMesh);

  return scene;
}

async function exportGlb() {
  const scene = createAuditoriumScene();
  const exporter = new GLTFExporter();

  console.log('Exporting procedural 3D Auditorium to GLB...');

  return new Promise((resolve, reject) => {
    exporter.parse(
      scene,
      (gltf) => {
        const outputPath = path.resolve('public/models/auditorium.glb');
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        fs.writeFileSync(outputPath, Buffer.from(gltf));
        console.log(`Successfully generated: ${outputPath} (${(gltf.byteLength / 1024).toFixed(1)} KB)`);
        resolve(outputPath);
      },
      (error) => {
        console.error('Error during GLTF export:', error);
        reject(error);
      },
      { binary: true }
    );
  });
}

exportGlb().catch((err) => {
  console.error(err);
  process.exit(1);
});
