import React, { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import gsap from 'gsap';
import * as THREE from 'three';

/**
 * GSAP 4-Act Camera Choreography Controller
 * Coordinates seamless Bézier camera swoop transitions:
 *  - Act I: The Projection Booth (Elevated cinematic angle, Z: 19.5, looking over auditorium onto glowing curved screen)
 *  - Act II: The Descent (Sweeping downward dive to eye-level row perspective)
 *  - Act III: Seat Claim & Micro-Focus (Smooth pan & tight framing on selected seat row)
 *  - Act IV: Tear-Off Pass Outro (Subtle pull-back with atmospheric drift)
 */
export function CameraRig({ viewMode = 'auditorium', focusedSeat = null, controlsRef }) {
  const { camera } = useThree();
  const targetLookAt = useRef(new THREE.Vector3(0, 2.2, 3.0));
  const currentLookAt = useRef(new THREE.Vector3(0, 2.2, 3.0));

  useEffect(() => {
    const ctx = gsap.context(() => {
      let destPos = { x: 0, y: 4.2, z: 14.5 };
      let destTarget = { x: 0, y: 1.9, z: 4.2 };
      let duration = 2.0;

      if (viewMode === 'hero' || viewMode === 'booth') {
        // Act I: The Projection Booth (Elevated Z: 19.5m, peering down beam into 16:9 screen)
        destPos = { x: 0, y: 6.5, z: 19.8 };
        destTarget = { x: 0, y: 3.4, z: -0.5 };
        duration = 2.4;
      } else if (viewMode === 'checkout' || viewMode === 'outro') {
        // Act IV: Pass Checkout Outro (Slight high-angle pull-back framing)
        destPos = { x: 0, y: 5.0, z: 16.0 };
        destTarget = { x: 0, y: 2.0, z: 3.0 };
        duration = 1.6;
      } else if (focusedSeat) {
        // Act III: Seat Claim & Focus (Smooth micro-pan towards the exact row and column)
        const rowChar = focusedSeat.row_label || 'C';
        const colNum = focusedSeat.col_number || 5;
        const rowIdx = ['A', 'B', 'C', 'D', 'E'].indexOf(rowChar);
        const colX = -3.96 + (colNum - 1) * 0.88;
        const rowZ = 4.8 + (rowIdx >= 0 ? rowIdx : 2) * 1.9;
        const riserY = (rowIdx + 1) * 0.45;

        destPos = {
          x: colX * 0.4,
          y: riserY + 1.9,
          z: rowZ + 3.6,
        };
        destTarget = {
          x: colX * 0.55,
          y: riserY + 0.6,
          z: rowZ,
        };
        duration = 1.4;
      } else {
        // Act II: The Descent (Entering Auditorium Eye-Level)
        destPos = { x: 0, y: 4.2, z: 14.5 };
        destTarget = { x: 0, y: 1.9, z: 4.2 };
        duration = 2.0;
      }

      // Smooth GSAP swoop transition
      gsap.to(camera.position, {
        x: destPos.x,
        y: destPos.y,
        z: destPos.z,
        duration: duration,
        ease: 'power3.out',
      });

      gsap.to(targetLookAt.current, {
        x: destTarget.x,
        y: destTarget.y,
        z: destTarget.z,
        duration: duration,
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
