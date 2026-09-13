'use client';

import React, { useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { LensCore } from './LensCore';
import { AtmosphericEmbers } from './AtmosphericEmbers';
import { SplineCameraRig } from './SplineCameraRig';
import { useShowcaseStore } from '@/store/useShowcaseStore';

const DynamicLighting: React.FC = () => {
  const spotLightRef = useRef<THREE.SpotLight>(null);
  const ambientLightRef = useRef<THREE.AmbientLight>(null);

  useFrame((_, delta) => {
    const { activeMovie } = useShowcaseStore.getState();
    const damping = 1 - Math.exp(-4 * delta);

    if (spotLightRef.current) {
      spotLightRef.current.color.lerp(new THREE.Color(activeMovie.sceneConfig.keyLightColor), damping);
    }
    if (ambientLightRef.current) {
      ambientLightRef.current.color.lerp(new THREE.Color(activeMovie.sceneConfig.ambientColor), damping);
    }
  });

  return (
    <>
      <ambientLight ref={ambientLightRef} intensity={1.2} />
      <spotLight
        ref={spotLightRef}
        position={[4, 5, 6]}
        angle={0.6}
        penumbra={0.8}
        intensity={2.5}
        castShadow
      />
      <pointLight position={[-4, -3, -2]} intensity={1.0} color="#ffffff" />
      <directionalLight position={[0, -5, 2]} intensity={0.5} color="#404040" />
    </>
  );
};

export default function CinematicCanvas() {
  const isBookingOpen = useShowcaseStore((s) => s.isBookingOpen);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-void">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45, near: 0.1, far: 50 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          alpha: true,
        }}
        frameloop={isBookingOpen ? 'demand' : 'always'}
      >
        <DynamicLighting />
        <SplineCameraRig />
        <LensCore />
        <AtmosphericEmbers />
      </Canvas>
    </div>
  );
}
