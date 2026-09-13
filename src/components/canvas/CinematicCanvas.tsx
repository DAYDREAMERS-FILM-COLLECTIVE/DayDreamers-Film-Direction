'use client';

import React, { Suspense, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { BlendkitModel } from './BlendkitModel';
import { AtmosphericEmbers } from './AtmosphericEmbers';
import { useShowcaseStore } from '@/store/useShowcaseStore';

const DogstudioLighting: React.FC = () => {
  const keyLightRef = useRef<THREE.SpotLight>(null);
  const ambientLightRef = useRef<THREE.AmbientLight>(null);
  const rimLightRef = useRef<THREE.DirectionalLight>(null);


  useFrame((_, delta) => {
    const { activeMovie } = useShowcaseStore.getState();
    const damping = 1 - Math.exp(-4 * delta);

    // Muted editorial palette transitions
    if (keyLightRef.current) {
      keyLightRef.current.color.lerp(new THREE.Color(activeMovie.sceneConfig.keyLightColor), damping);
    }
    if (ambientLightRef.current) {
      ambientLightRef.current.color.lerp(new THREE.Color(activeMovie.sceneConfig.ambientColor), damping);
    }
  });

  return (
    <>
      {/* Soft abyssal ambient tone */}
      <ambientLight ref={ambientLightRef} intensity={1.5} color="#060814" />

      {/* Warm editorial key spotlight (illuminating Blendkit geometry) */}
      <spotLight
        ref={keyLightRef}
        position={[3.5, 4.5, 5.0]}
        angle={0.55}
        penumbra={0.9}
        intensity={2.8}
        color="#C92A42"
      />

      {/* Soft Blue fill light */}
      <pointLight position={[-4, -2, -3]} intensity={1.4} color="#1c2b4d" />

      {/* Muted Gold rim light */}
      <directionalLight ref={rimLightRef} position={[0, -4, 3]} intensity={0.8} color="#D4AF37" />
    </>
  );
};

export default function CinematicCanvas() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#060814]">
      <Canvas
        camera={{ position: [0, 0, 4.8], fov: 42, near: 0.1, far: 50 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          alpha: true,
        }}
      >
        <DogstudioLighting />
        <Suspense fallback={null}>
          <BlendkitModel />
        </Suspense>
        <AtmosphericEmbers />
      </Canvas>
    </div>
  );
}
