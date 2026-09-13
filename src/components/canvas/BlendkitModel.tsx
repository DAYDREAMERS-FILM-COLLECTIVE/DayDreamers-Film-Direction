'use client';

import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { useShowcaseStore } from '@/store/useShowcaseStore';

export const BlendkitModel: React.FC = () => {
  const { scene } = useGLTF('/models/cinema_lens.glb');
  const groupRef = useRef<THREE.Group>(null);

  // Clone and traverse scene to dynamically apply ethereal MeshPhysicalMaterial properties
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const name = mesh.name.toLowerCase();

        if (name.includes('lens') || name.includes('glass') || name.includes('prism')) {
          // Ethereal floating optical glass with transmission
          mesh.material = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color('#E8E3D9'),
            transmission: 0.95,
            roughness: 0.08,
            ior: 1.58,
            thickness: 1.4,
            transparent: true,
            opacity: 1,
            reflectivity: 0.8,
            clearcoat: 0.5,
            clearcoatRoughness: 0.1,
          });
        } else if (name.includes('flange') || name.includes('mount')) {
          // Muted gold brass mount
          mesh.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color('#D4AF37'),
            roughness: 0.28,
            metalness: 0.9,
          });
        } else if (name.includes('ring') || name.includes('iris')) {
          // Crimson accent ring
          mesh.material = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color('#C92A42'),
            roughness: 0.2,
            metalness: 0.85,
            clearcoat: 0.4,
          });
        } else {
          // Deep midnight chassis
          mesh.material = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color('#0e1322'),
            roughness: 0.35,
            metalness: 0.75,
            clearcoat: 0.2,
          });
        }
      }
    });
    return clone;
  }, [scene]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // Transient store read outside React loop
    const { activeMovie, normalizedScroll, isPageTransitioning, isBookingRoute } = useShowcaseStore.getState();
    const damping = 1 - Math.exp(-4.5 * delta);

    // Dynamic rotation targets based on active film
    const [targetRotX, targetRotY, targetRotZ] = activeMovie.sceneConfig.modelRotation;

    // Floating idle oscillation
    const elapsed = state.clock.getElapsedTime();
    const floatY = Math.sin(elapsed * 0.8) * 0.12;
    const floatRotZ = Math.cos(elapsed * 0.5) * 0.04;

    // Mouse parallax offset
    const mouseX = state.pointer.x * 0.35;
    const mouseY = state.pointer.y * 0.25;

    if (isBookingRoute || isPageTransitioning) {
      // Dogstudio transition: rotate 90 degrees and push deep into the background
      const targetPos = new THREE.Vector3(1.8, -0.4, -3.2);
      groupRef.current.position.lerp(targetPos, damping);
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0.2, damping);
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, Math.PI * 0.5 + mouseX * 0.2, damping);
      groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, -0.1, damping);
    } else {
      // Showcase position mapped to scroll
      const scrollRotY = normalizedScroll * Math.PI * 1.5;
      const targetPos = new THREE.Vector3(0, floatY, 0);

      groupRef.current.position.lerp(targetPos, damping);
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetRotX + mouseY, damping);
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotY + scrollRotY + mouseX, damping);
      groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, targetRotZ + floatRotZ, damping);
    }
  });

  return (
    <group ref={groupRef} scale={[1.2, 1.2, 1.2]}>
      <primitive object={clonedScene} />
    </group>
  );
};

useGLTF.preload('/models/cinema_lens.glb');
