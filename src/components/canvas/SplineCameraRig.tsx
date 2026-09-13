'use client';

import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useShowcaseStore } from '@/store/useShowcaseStore';

export const SplineCameraRig: React.FC = () => {
  // Cinematic spline trajectory through scroll space
  const spline = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 5.0),     // 0.0 - Hero position
      new THREE.Vector3(0.8, 0.4, 4.3),  // 0.25 - Film 1 Neon angle
      new THREE.Vector3(-0.9, -0.2, 3.8), // 0.60 - Film 2 Monolith low perspective
      new THREE.Vector3(0.2, 0.3, 3.2),  // 0.85 - Film 3 Prism angle
      new THREE.Vector3(0, 0, 3.0)      // 1.0 - Finale
    ]);
  }, []);

  const currentPos = useRef(new THREE.Vector3(0, 0, 5));
  const lookTarget = useRef(new THREE.Vector3(0, 0, 0));

  useFrame((state, delta) => {
    // Transient store read outside React render cycle
    const { normalizedScroll, isTransitioningToBooking } = useShowcaseStore.getState();
    const damping = 1 - Math.exp(-4.5 * delta);

    if (isTransitioningToBooking) {
      // Direct high-speed dive into the lens pupil
      currentPos.current.lerp(new THREE.Vector3(0, 0, 0.05), damping * 2);
      state.camera.position.copy(currentPos.current);
      state.camera.lookAt(0, 0, 0);
      return;
    }

    // Spline curve sampling
    const t = THREE.MathUtils.clamp(normalizedScroll, 0, 1);
    const targetPoint = spline.getPointAt(t);

    // Inertial mouse parallax
    const mouseX = state.pointer.x * 0.4;
    const mouseY = state.pointer.y * 0.3;

    currentPos.current.x = THREE.MathUtils.lerp(currentPos.current.x, targetPoint.x + mouseX, damping);
    currentPos.current.y = THREE.MathUtils.lerp(currentPos.current.y, targetPoint.y + mouseY, damping);
    currentPos.current.z = THREE.MathUtils.lerp(currentPos.current.z, targetPoint.z, damping);

    state.camera.position.copy(currentPos.current);
    state.camera.lookAt(lookTarget.current);
  });

  return null;
};
