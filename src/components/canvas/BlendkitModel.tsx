'use client';

import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { useShowcaseStore } from '@/store/useShowcaseStore';

export const BlendkitModel: React.FC = () => {
  const { scene } = useGLTF('/models/cinema_lens.glb');
  const groupRef = useRef<THREE.Group>(null);

  // Traverse and apply high-fidelity studio materials with physical glass
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const name = mesh.name.toLowerCase();

        if (name.includes('lens') || name.includes('glass') || name.includes('prism')) {
          // Physical optical glass with transmission, chromatic reflections, and realistic refraction
          mesh.material = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color('#ffffff'),
            transmission: 0.92,
            roughness: 0.12,
            ior: 1.5,
            thickness: 1.2,
            transparent: true,
            opacity: 1,
            reflectivity: 0.85,
            clearcoat: 0.8,
            clearcoatRoughness: 0.08,
            specularIntensity: 1.0,
            specularColor: new THREE.Color('#ffffff'),
          });
        } else if (name.includes('flange') || name.includes('mount')) {
          // Brushed brass/gold cinema mount
          mesh.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color('#D4AF37'),
            roughness: 0.3,
            metalness: 0.92,
          });
        } else if (name.includes('ring') || name.includes('iris') || name.includes('focal')) {
          // Muted crimson anodized knurled focus collar
          mesh.material = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color('#9e2235'),
            roughness: 0.25,
            metalness: 0.8,
            clearcoat: 0.3,
          });
        } else {
          // Satin dark titanium camera/lens chassis with soft specular sheen
          mesh.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color('#1c202a'),
            roughness: 0.38,
            metalness: 0.78,
          });
        }
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    return clone;
  }, [scene]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const { activeMovie, normalizedScroll, isPageTransitioning, isBookingRoute } = useShowcaseStore.getState();
    const damping = 1 - Math.exp(-4.5 * delta);

    const [targetRotX, targetRotY, targetRotZ] = activeMovie.sceneConfig.modelRotation;

    const elapsed = state.clock.getElapsedTime();
    const floatY = Math.sin(elapsed * 0.7) * 0.08;
    const mouseX = state.pointer.x * 0.25;
    const mouseY = state.pointer.y * 0.2;

    if (isBookingRoute || isPageTransitioning) {
      // In booking mode: pushed deep into background with subtle rotation
      const targetPos = new THREE.Vector3(1.2, -0.3, -2.5);
      groupRef.current.position.lerp(targetPos, damping);
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0.15, damping);
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, Math.PI * 0.45 + mouseX * 0.1, damping);
      groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, -0.05, damping);
    } else {
      // Center-right heroic staging with rich visible detail
      // On desktop: position prominently at center-right [0.8, floatY, 0.2]
      const scrollRot = normalizedScroll * Math.PI * 1.2;
      const targetPos = new THREE.Vector3(0.65, floatY, 0.1);

      groupRef.current.position.lerp(targetPos, damping);
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetRotX + mouseY * 0.5, damping);
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotY + scrollRot + mouseX * 0.5, damping);
      groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, targetRotZ, damping);
    }
  });

  return (
    <group ref={groupRef} scale={[1.85, 1.85, 1.85]}>
      <primitive object={clonedScene} />
    </group>
  );
};

useGLTF.preload('/models/cinema_lens.glb');
