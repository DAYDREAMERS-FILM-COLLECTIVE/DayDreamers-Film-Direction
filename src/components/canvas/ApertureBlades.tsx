'use client';

import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useShowcaseStore } from '@/store/useShowcaseStore';

const BLADE_COUNT = 9;
const BLADE_RADIUS = 0.95;

export const ApertureBlades: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const currentOpenRef = useRef(0.85);

  useFrame((_, delta) => {
    // Read transient state outside React render cycle
    const targetAperture = useShowcaseStore.getState().activeMovie.sceneConfig.apertureBladeOpen;
    // Framerate-independent exponential damping
    const damping = 1 - Math.exp(-4.5 * delta);
    currentOpenRef.current = THREE.MathUtils.lerp(currentOpenRef.current, targetAperture, damping);

    if (groupRef.current) {
      groupRef.current.children.forEach((child, index) => {
        const baseAngle = (index / BLADE_COUNT) * Math.PI * 2;
        // Rotation offset to close/open iris
        const rotationOffset = (1.0 - currentOpenRef.current) * 0.52;
        child.rotation.z = baseAngle + rotationOffset;
      });
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {Array.from({ length: BLADE_COUNT }).map((_, i) => {
        const angle = (i / BLADE_COUNT) * Math.PI * 2;
        const x = Math.cos(angle) * (BLADE_RADIUS * 0.55);
        const y = Math.sin(angle) * (BLADE_RADIUS * 0.55);

        return (
          <mesh key={i} position={[x, y, 0]} rotation={[0, 0, angle]}>
            <planeGeometry args={[0.95, 0.42]} />
            <meshStandardMaterial
              color="#12151c"
              roughness={0.4}
              metalness={0.85}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}
    </group>
  );
};
