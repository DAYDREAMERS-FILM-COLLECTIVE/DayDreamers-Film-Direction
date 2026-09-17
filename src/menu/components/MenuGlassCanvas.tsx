/**
 * src/menu/components/MenuGlassCanvas.tsx
 * Three.js WebGL canvas for the 3D Liquid Glass Hamburger Drawer background.
 * Implements strict cleanup to prevent WebGL memory leaks and context loss.
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import * as THREE from 'three';

interface MenuGlassCanvasProps {
  isOpen: boolean;
}

export const MenuGlassCanvas: React.FC<MenuGlassCanvasProps> = ({ isOpen }) => {
  const containerRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen || Platform.OS !== 'web' || typeof window === 'undefined') return;

    let animId: number;
    let renderer: THREE.WebGLRenderer | null = null;
    let scene: THREE.Scene | null = null;
    let camera: THREE.PerspectiveCamera | null = null;
    let mesh: THREE.Mesh | null = null;

    try {
      const width = window.innerWidth;
      const height = window.innerHeight;

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 100);
      camera.position.z = 2.5;

      renderer = new THREE.WebGLRenderer({
        alpha: true,
        powerPreference: 'low-power',
        antialias: true
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

      const domElement = renderer.domElement;
      domElement.style.position = 'absolute';
      domElement.style.top = '0';
      domElement.style.left = '0';
      domElement.style.width = '100%';
      domElement.style.height = '100%';
      domElement.style.pointerEvents = 'none';
      domElement.style.opacity = '0.35';

      if (containerRef.current) {
        containerRef.current.appendChild(domElement);
      }

      // 3D Glass Geometry: TorusKnot simulation of liquid refractive hand form
      const geometry = new THREE.TorusKnotGeometry(0.8, 0.25, 100, 16);
      const material = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#C89BB2'),
        roughness: 0.1,
        metalness: 0.1,
        transmission: 0.9,
        ior: 1.45,
        transparent: true,
        opacity: 0.75
      });

      mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      // Studio Lighting
      const light1 = new THREE.DirectionalLight(0xffffff, 1.5);
      light1.position.set(2, 4, 3);
      scene.add(light1);

      const light2 = new THREE.PointLight(0x6d3b56, 3, 10);
      light2.position.set(-2, -2, 2);
      scene.add(light2);

      let theta = 0;
      const renderLoop = () => {
        animId = requestAnimationFrame(renderLoop);
        theta += 0.008;
        if (mesh) {
          mesh.rotation.x = Math.sin(theta * 0.5) * 0.4;
          mesh.rotation.y = theta;
        }
        if (renderer && scene && camera) {
          renderer.render(scene, camera);
        }
      };
      renderLoop();

      const handleResize = () => {
        if (!camera || !renderer) return;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener('resize', handleResize);

      return () => {
        cancelAnimationFrame(animId);
        window.removeEventListener('resize', handleResize);

        if (containerRef.current && domElement.parentNode === containerRef.current) {
          containerRef.current.removeChild(domElement);
        }

        if (geometry) geometry.dispose();
        if (material) material.dispose();
        if (renderer) {
          renderer.dispose();
          renderer.forceContextLoss();
        }
        if (scene) scene.clear();
      };
    } catch (e) {
      console.warn('WebGL Menu Glass fallback:', e);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <View
      ref={containerRef}
      pointerEvents="none"
      style={StyleSheet.absoluteFillObject}
    />
  );
};
