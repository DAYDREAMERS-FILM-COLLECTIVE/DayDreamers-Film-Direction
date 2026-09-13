import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * 35mm Volumetric Projector Spotlight
 * Projects from the rear booth window (Z: 15.5m) onto the curved 16:9 screen (Z: 0m)
 * Includes a semi-transparent light cone with subtle 35mm projector carbon-arc flicker.
 */
export function VolumetricSpotlight({ movieBackdropUrl }) {
  const spotLightRef = useRef();
  const coneRef = useRef();
  const targetRef = useRef();

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    // Subtle 35mm film projector flicker
    const flicker = 1.0 + Math.sin(time * 24) * 0.04 + Math.sin(time * 48) * 0.02;

    if (spotLightRef.current) {
      spotLightRef.current.intensity = 85 * flicker;
    }
    if (coneRef.current) {
      coneRef.current.material.opacity = 0.12 * flicker;
    }
  });

  return (
    <group>
      {/* Target on the Curved Screen */}
      <object3D ref={targetRef} position={[0, 3.2, 0]} />

      {/* Main Projector SpotLight */}
      <spotLight
        ref={spotLightRef}
        position={[0, 4.2, 15.2]}
        target={targetRef.current}
        angle={Math.PI / 10}
        penumbra={0.5}
        intensity={85}
        distance={24}
        color="#fffbf0"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0001}
      />

      {/* Volumetric Beam Cone Geometry */}
      {/* Positioned midway between projection booth (15.2) and screen (0) => Z: 7.6 */}
      <mesh
        ref={coneRef}
        position={[0, 3.7, 7.6]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        {/* RadiusTop: 0.18m (at booth), RadiusBottom: 4.8m (at screen), Height: 15.2m */}
        <cylinderGeometry args={[0.18, 4.8, 15.2, 32, 1, true]} />
        <meshBasicMaterial
          color="#fff6e5"
          transparent
          opacity={0.12}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Lens Flare Glow Disk at Projection Aperture */}
      <mesh position={[0, 4.2, 15.3]}>
        <circleGeometry args={[0.32, 16]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.85}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
