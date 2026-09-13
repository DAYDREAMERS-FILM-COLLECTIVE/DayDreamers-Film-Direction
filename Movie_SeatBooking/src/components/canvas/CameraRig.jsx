import React, { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import gsap from 'gsap';
import * as THREE from 'three';

/**
 * GSAP Camera Choreography Controller
 * Coordinates smooth camera swoop transitions between:
 *  1. Hero State (high-angle dramatic look from projection booth)
 *  2. Auditorium State (eye-level seating overview)
 *  3. Micro-Pan towards selected seat row
 */
export function CameraRig({ viewMode = 'auditorium', focusedSeat = null, controlsRef }) {
  const { camera } = useThree();
  const targetLookAt = useRef(new THREE.Vector3(0, 2.5, 3.0));
  const currentLookAt = useRef(new THREE.Vector3(0, 2.5, 3.0));

  useEffect(() => {
    const ctx = gsap.context(() => {
      let destPos = { x: 0, y: 3.8, z: 13.5 };
      let destTarget = { x: 0, y: 1.8, z: 4.5 };

      if (viewMode === 'hero') {
        // Position 1: High-angle dramatic perspective focusing on the glowing curved screen
        destPos = { x: 0, y: 5.8, z: 18.2 };
        destTarget = { x: 0, y: 3.2, z: 0 };
      } else if (focusedSeat) {
        // Seat Selection Zoom: subtle micro-pan toward that row
        const rowChar = focusedSeat.row_label || 'C';
        const colNum = focusedSeat.col_number || 5;
        const rowIdx = ['A', 'B', 'C', 'D', 'E'].indexOf(rowChar);
        const colX = -3.96 + (colNum - 1) * 0.88;
        const rowZ = 4.8 + (rowIdx >= 0 ? rowIdx : 2) * 1.9;
        const riserY = (rowIdx + 1) * 0.45;

        destPos = {
          x: colX * 0.35,
          y: riserY + 1.8,
          z: rowZ + 3.8,
        };
        destTarget = {
          x: colX * 0.5,
          y: riserY + 0.5,
          z: rowZ,
        };
      }

      // Smooth GSAP swoop transition
      gsap.to(camera.position, {
        x: destPos.x,
        y: destPos.y,
        z: destPos.z,
        duration: 1.8,
        ease: 'power3.out',
      });

      gsap.to(targetLookAt.current, {
        x: destTarget.x,
        y: destTarget.y,
        z: destTarget.z,
        duration: 1.8,
        ease: 'power3.out',
        onUpdate: () => {
          if (controlsRef?.current) {
            controlsRef.current.target.copy(targetLookAt.current);
            controlsRef.current.update();
          }
        },
      });
    });

    return () => ctx.revert();
  }, [viewMode, focusedSeat, camera, controlsRef]);

  useFrame(() => {
    currentLookAt.current.lerp(targetLookAt.current, 0.08);
    if (!controlsRef?.current) {
      camera.lookAt(currentLookAt.current);
    }
  });

  return null;
}
