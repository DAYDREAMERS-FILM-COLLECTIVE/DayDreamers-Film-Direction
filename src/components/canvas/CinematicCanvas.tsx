'use client';

import React, { Suspense, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import { BlendkitModel } from './BlendkitModel';
import { AtmosphericEmbers } from './AtmosphericEmbers';
import { useShowcaseStore } from '@/store/useShowcaseStore';

const StudioThreePointLighting: React.FC = () => {
  const rimLightRef = useRef<THREE.DirectionalLight>(null);

  useFrame((_, delta) => {
    const { activeMovie } = useShowcaseStore.getState();
    const damping = 1 - Math.exp(-4 * delta);

    if (rimLightRef.current) {
      rimLightRef.current.color.lerp(new THREE.Color(activeMovie.sceneConfig.keyLightColor), damping);
    }
  });

  return (
    <>
      {/* 1. Low-intensity ambient base to prevent pitch-black voids */}
      <ambientLight intensity={0.8} color="#0c101d" />

      {/* 2. Key Light: Soft warm white directional illumination onto lens face & aperture */}
      <directionalLight
        position={[3.0, 4.0, 4.5]}
        intensity={2.2}
        color="#FDF8F0"
        castShadow
      />

      {/* 3. Fill Light: Deep atmospheric navy/indigo to lift crushed shadows with soft depth */}
      <directionalLight
        position={[-4.0, -1.5, 2.0]}
        intensity={1.0}
        color="#1B2238"
      />

      {/* 4. Rim Light: Softened cinematic crimson/gold rim highlighting metallic chamfers */}
      <directionalLight
        ref={rimLightRef}
        position={[-1.5, -3.5, -4.0]}
        intensity={1.6}
        color="#C92A42"
      />

      {/* 5. Additional top soft overhead bank */}
      <pointLight position={[0.5, 5.0, 1.0]} intensity={1.2} color="#E8E3D9" />
    </>
  );
};

export default function CinematicCanvas() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#060814]">
      <Canvas
        camera={{ position: [0, 0, 4.6], fov: 40, near: 0.1, far: 50 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
        }}
      >
        {/* Studio 3-Point Light Rig */}
        <StudioThreePointLighting />

        {/* Low-intensity Night Environment Map for metallic & glass reflections */}
        <Environment preset="night" environmentIntensity={0.65} />

        <Suspense fallback={null}>
          <BlendkitModel />
        </Suspense>

        <AtmosphericEmbers />
      </Canvas>
    </div>
  );
}
