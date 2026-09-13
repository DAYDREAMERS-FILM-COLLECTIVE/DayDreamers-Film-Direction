'use client';

import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { ApertureBlades } from './ApertureBlades';
import { useShowcaseStore } from '@/store/useShowcaseStore';

export const LensCore: React.FC = () => {
  const rootGroupRef = useRef<THREE.Group>(null);
  const frontGlassRef = useRef<THREE.MeshPhysicalMaterial>(null);
  const rearGlassRef = useRef<THREE.MeshPhysicalMaterial>(null);
  const accentRingRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame((state, delta) => {
    // Transient store read
    const { activeMovie, normalizedScroll } = useShowcaseStore.getState();
    const damping = 1 - Math.exp(-4 * delta);

    if (rootGroupRef.current) {
      // Subtle idle breathing and parallax tilt
      const pointer = state.pointer;
      const targetRotX = pointer.y * 0.2 + (normalizedScroll * Math.PI * 0.25);
      const targetRotY = pointer.x * 0.35 + (state.clock.getElapsedTime() * 0.05);

      rootGroupRef.current.rotation.x = THREE.MathUtils.lerp(rootGroupRef.current.rotation.x, targetRotX, damping);
      rootGroupRef.current.rotation.y = THREE.MathUtils.lerp(rootGroupRef.current.rotation.y, targetRotY, damping);
    }

    // Material uniform updates
    const targetColor = new THREE.Color(activeMovie.sceneConfig.keyLightColor);

    if (frontGlassRef.current) {
      frontGlassRef.current.transmission = THREE.MathUtils.lerp(
        frontGlassRef.current.transmission,
        activeMovie.sceneConfig.glassTransmission,
        damping
      );
      frontGlassRef.current.roughness = THREE.MathUtils.lerp(
        frontGlassRef.current.roughness,
        activeMovie.sceneConfig.roughness,
        damping
      );
      frontGlassRef.current.ior = THREE.MathUtils.lerp(
        frontGlassRef.current.ior,
        activeMovie.sceneConfig.ior,
        damping
      );
      frontGlassRef.current.color.lerp(targetColor, damping * 0.5);
    }

    if (accentRingRef.current) {
      accentRingRef.current.color.lerp(targetColor, damping);
    }
  });

  return (
    <group ref={rootGroupRef} position={[0, 0, 0]}>
      {/* 1. Main Outer Anamorphic Barrel Ring */}
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.5, 1.55, 1.6, 64, 1, true]} />
        <meshStandardMaterial
          color="#080a0f"
          roughness={0.25}
          metalness={0.92}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 2. Stepped Bevel Rings */}
      <mesh position={[0, 0, 0.7]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.58, 1.5, 0.2, 64]} />
        <meshStandardMaterial color="#12151c" roughness={0.3} metalness={0.88} />
      </mesh>

      <mesh position={[0, 0, -0.7]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.45, 1.55, 0.2, 64]} />
        <meshStandardMaterial color="#12151c" roughness={0.3} metalness={0.88} />
      </mesh>

      {/* 3. Cine Accent Collar (Tinted dynamically by movie theme) */}
      <mesh position={[0, 0, 0.4]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.56, 0.025, 16, 64]} />
        <meshStandardMaterial
          ref={accentRingRef}
          color="#00f0ff"
          roughness={0.2}
          metalness={0.9}
        />
      </mesh>

      {/* 4. Internal Iris Aperture Assembly */}
      <group position={[0, 0, 0]}>
        <ApertureBlades />
      </group>

      {/* 5. Front Anamorphic Cylindrical Element (Refraction & Glass) */}
      <mesh position={[0, 0, 0.75]}>
        <sphereGeometry args={[1.4, 48, 32, 0, Math.PI * 2, 0, 0.75]} />
        <meshPhysicalMaterial
          ref={frontGlassRef}
          color="#ffffff"
          transmission={0.96}
          opacity={1}
          transparent
          roughness={0.06}
          ior={1.54}
          thickness={1.2}
          specularIntensity={1.0}
          specularColor="#ffffff"
        />
      </mesh>

      {/* 6. Rear Optical Element */}
      <mesh position={[0, 0, -0.75]} rotation={[Math.PI, 0, 0]}>
        <sphereGeometry args={[1.3, 48, 32, 0, Math.PI * 2, 0, 0.65]} />
        <meshPhysicalMaterial
          ref={rearGlassRef}
          color="#ffffff"
          transmission={0.94}
          opacity={1}
          transparent
          roughness={0.08}
          ior={1.52}
          thickness={0.8}
        />
      </mesh>
    </group>
  );
};
