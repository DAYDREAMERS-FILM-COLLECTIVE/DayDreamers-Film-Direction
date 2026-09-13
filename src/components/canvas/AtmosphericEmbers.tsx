'use client';

import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useShowcaseStore } from '@/store/useShowcaseStore';

const PARTICLE_COUNT = 700;

export const AtmosphericEmbers: React.FC = () => {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const [positions, randomOffsets, scales] = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const rand = new Float32Array(PARTICLE_COUNT * 3);
    const scl = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      pos[i3] = (Math.random() - 0.5) * 16;
      pos[i3 + 1] = (Math.random() - 0.5) * 12;
      pos[i3 + 2] = (Math.random() - 0.5) * 14;

      rand[i3] = Math.random();
      rand[i3 + 1] = Math.random();
      rand[i3 + 2] = Math.random();

      scl[i] = Math.random() * 0.7 + 0.3;
    }
    return [pos, rand, scl];
  }, []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uScrollVelocity: { value: 0 },
      uColor: { value: new THREE.Color('#E8E3D9') },
      uMouse: { value: new THREE.Vector2(0, 0) },
    }),
    []
  );

  const vertexShader = `
    uniform float uTime;
    uniform float uScrollVelocity;
    uniform vec2 uMouse;
    attribute vec3 aRandomOffset;
    attribute float aScale;

    varying vec2 vUv;
    varying float vAlpha;

    void main() {
      vUv = uv;
      vec3 pos = position;

      // Soft vertical dust drift
      float speed = 0.15 + aRandomOffset.x * 0.35;
      pos.y += sin(uTime * 0.5 + aRandomOffset.y * 6.28) * 0.25;
      pos.y -= uScrollVelocity * 0.04 * (0.4 + aRandomOffset.z);

      // Mouse sway
      pos.x += cos(uTime * 0.3 + aRandomOffset.z * 6.28) * 0.15 + (uMouse.x * 0.25);

      // Cycle Z boundary
      pos.z = mod(pos.z + uTime * speed + 6.0, 14.0) - 7.0;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_PointSize = aScale * (110.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;

      vAlpha = smoothstep(7.0, 2.0, abs(pos.z));
    }
  `;

  const fragmentShader = `
    uniform vec3 uColor;
    varying float vAlpha;

    void main() {
      vec2 center = gl_PointCoord - vec2(0.5);
      float dist = length(center);
      if (dist > 0.5) discard;

      float glow = smoothstep(0.5, 0.08, dist);
      gl_FragColor = vec4(uColor, glow * vAlpha * 0.7);
    }
  `;

  useFrame((state, delta) => {
    const { scrollVelocity, activeMovie } = useShowcaseStore.getState();
    const damping = 1 - Math.exp(-4 * delta);

    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
      materialRef.current.uniforms.uScrollVelocity.value = THREE.MathUtils.lerp(
        materialRef.current.uniforms.uScrollVelocity.value,
        scrollVelocity,
        damping
      );

      const targetColor = new THREE.Color(activeMovie.sceneConfig.particleColor);
      materialRef.current.uniforms.uColor.value.lerp(targetColor, damping);

      materialRef.current.uniforms.uMouse.value.lerp(
        new THREE.Vector2(state.pointer.x, state.pointer.y),
        damping
      );
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aRandomOffset" args={[randomOffsets, 3]} />
        <bufferAttribute attach="attributes-aScale" args={[scales, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};
