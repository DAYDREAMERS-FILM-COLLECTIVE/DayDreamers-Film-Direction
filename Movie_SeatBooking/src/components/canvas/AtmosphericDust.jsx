import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Atmospheric Dust Motes
 * 1,200 interactive particles floating inside the volumetric projector beam
 * Reacts subtly to mouse velocity and projector flicker
 */
export function AtmosphericDust({ count = 1200 }) {
  const pointsRef = useRef();
  const prevPointer = useRef({ x: 0, y: 0 });

  // Generate 1,200 particles bounded inside the conical projector frustum
  // Projection booth: [0, 4.2, 15.2], Screen: [0, 3.2, 0]
  const [positions, velocities, baseOffsets] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    const offsets = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Progress along beam (Z from 0.5m near screen to 15.0m near booth)
      const t = Math.random(); // 0 = at screen, 1 = at booth
      const z = 0.5 + t * 14.5;
      
      // Radius expands as we approach screen (t -> 0)
      // At booth (t=1): radius ~0.2m, at screen (t=0): radius ~4.2m
      const maxRadius = 0.2 + (1.0 - t) * 3.8;
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * maxRadius;

      // Centerline Y slopes from 4.2m (booth) to 3.2m (screen)
      const centerY = 3.2 + t * 1.0;

      pos[i * 3 + 0] = Math.cos(angle) * r;
      pos[i * 3 + 1] = centerY + Math.sin(angle) * r * 0.7; // slightly squashed ellipse
      pos[i * 3 + 2] = z;

      vel[i * 3 + 0] = (Math.random() - 0.5) * 0.003;
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.003;
      vel[i * 3 + 2] = -0.004 - Math.random() * 0.006; // drifts forward toward screen

      offsets[i] = Math.random() * Math.PI * 2;
    }

    return [pos, vel, offsets];
  }, [count]);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;

    const time = state.clock.getElapsedTime();
    const currentPointer = state.pointer;
    // Calculate mouse velocity for interactive motes response
    const mouseVx = (currentPointer.x - prevPointer.current.x) * 0.25;
    const mouseVy = (currentPointer.y - prevPointer.current.y) * 0.25;
    prevPointer.current = { x: currentPointer.x, y: currentPointer.y };

    const posArray = pointsRef.current.geometry.attributes.position.array;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;

      // Apply subtle forward drift + mouse wind
      posArray[idx + 0] += velocities[idx + 0] + mouseVx * 0.08 + Math.sin(time * 1.5 + baseOffsets[i]) * 0.002;
      posArray[idx + 1] += velocities[idx + 1] + mouseVy * 0.08 + Math.cos(time * 1.8 + baseOffsets[i]) * 0.002;
      posArray[idx + 2] += velocities[idx + 2];

      // If particle travels past the screen (Z < 0.5), loop it back to near the booth (Z: 14.8m)
      if (posArray[idx + 2] < 0.5) {
        posArray[idx + 2] = 14.8;
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * 0.35;
        posArray[idx + 0] = Math.cos(angle) * r;
        posArray[idx + 1] = 4.2 + Math.sin(angle) * r;
      }
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        color="#fffbf0"
        transparent
        opacity={0.55}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}
