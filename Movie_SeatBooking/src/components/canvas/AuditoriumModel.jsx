import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useGLTF, useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * 3D Auditorium Model with 50 Raycast-Interactive Seats
 * Maps Seat_A1 .. Seat_E10 to Supabase records and updates materials dynamically.
 */
export function AuditoriumModel({
  seats = [],
  selectedSeats = [],
  onSeatClick,
  locking = false,
  sessionId = '',
  moviePosterUrl = '',
}) {
  const { scene } = useGLTF('/models/auditorium.glb');
  const [hoveredSeatId, setHoveredSeatId] = useState(null);
  const amberPulseRef = useRef(0);

  // Map of seat node names (e.g. "Seat_A1") to Supabase seat records
  const seatMap = useMemo(() => {
    const map = new Map();
    seats.forEach((seat) => {
      const nodeName = `Seat_${seat.row_label}${seat.col_number}`;
      map.set(nodeName, seat);
    });
    return map;
  }, [seats]);

  // Selected seats Set for O(1) lookup
  const selectedSeatIds = useMemo(() => {
    return new Set(selectedSeats.map((s) => s.id));
  }, [selectedSeats]);

  // Base materials for performance
  const materials = useMemo(() => {
    return {
      regular: new THREE.MeshStandardMaterial({
        color: 0x22201d,
        roughness: 0.75,
        metalness: 0.1,
      }),
      vip: new THREE.MeshStandardMaterial({
        color: 0x3a2c20,
        roughness: 0.55,
        metalness: 0.35,
      }),
      selected: new THREE.MeshStandardMaterial({
        color: 0xd83128,
        emissive: 0xd83128,
        emissiveIntensity: 0.85,
        roughness: 0.4,
      }),
      held: new THREE.MeshStandardMaterial({
        color: 0x78350f,
        emissive: 0xb45309,
        emissiveIntensity: 0.6,
        roughness: 0.6,
      }),
      booked: new THREE.MeshStandardMaterial({
        color: 0x11100f,
        roughness: 0.95,
        metalness: 0.05,
        transparent: true,
        opacity: 0.35,
      }),
      hover: new THREE.MeshStandardMaterial({
        color: 0xe84a3f,
        emissive: 0xd83128,
        emissiveIntensity: 0.4,
        roughness: 0.5,
      }),
    };
  }, []);

  // Update curved cinema screen with movie backdrop texture if available
  useEffect(() => {
    const screenMesh = scene.getObjectByName('CinemaScreen');
    if (!screenMesh) return;

    if (moviePosterUrl) {
      const textureLoader = new THREE.TextureLoader();
      textureLoader.load(
        moviePosterUrl,
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.wrapS = THREE.ClampToEdgeWrapping;
          tex.wrapT = THREE.ClampToEdgeWrapping;
          screenMesh.material = new THREE.MeshStandardMaterial({
            map: tex,
            roughness: 0.8,
            metalness: 0.05,
            emissive: 0xffffff,
            emissiveMap: tex,
            emissiveIntensity: 0.35,
          });
        },
        undefined,
        () => {
          // Fallback screen
          screenMesh.material = new THREE.MeshStandardMaterial({
            color: 0xeee9df,
            roughness: 0.85,
          });
        }
      );
    }
  }, [scene, moviePosterUrl]);

  // Amber pulse animation for held seats
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    amberPulseRef.current = (Math.sin(time * 6) + 1) / 2; // 0 to 1
    if (materials.held) {
      materials.held.emissiveIntensity = 0.3 + amberPulseRef.current * 0.6;
    }
  });

  // Apply material states to seat meshes whenever seats, selections, or hovers change
  useEffect(() => {
    scene.traverse((node) => {
      if (!node.name || !node.name.startsWith('Seat_')) return;

      // Extract base seat node name (e.g. "Seat_A1" from "Seat_A1_Cushion")
      const match = node.name.match(/^(Seat_[A-E](?:[1-9]|10))/);
      if (!match) return;

      const baseSeatName = match[1];
      const seatData = seatMap.get(baseSeatName);
      if (!seatData) return;

      const isSelected = selectedSeatIds.has(seatData.id);
      const isBooked = seatData.status === 'booked';
      const isLockedByOther =
        seatData.status === 'locked' &&
        seatData.locked_by &&
        seatData.locked_by !== sessionId &&
        seatData.locked_until &&
        new Date(seatData.locked_until) > new Date();
      const isHovered = hoveredSeatId === baseSeatName;

      // Determine material for cushion & backrest
      if (node.isMesh && (node.name.includes('Cushion') || node.name.includes('Backrest'))) {
        if (isSelected) {
          node.material = materials.selected;
        } else if (isBooked) {
          node.material = materials.booked;
        } else if (isLockedByOther) {
          node.material = materials.held;
        } else if (isHovered) {
          node.material = materials.hover;
        } else if (seatData.seat_tier === 'vip') {
          node.material = materials.vip;
        } else {
          node.material = materials.regular;
        }
      }
    });
  }, [scene, seatMap, selectedSeatIds, hoveredSeatId, sessionId, materials]);

  // Raycasting Handlers on Seat Groups
  const handlePointerOver = (e, baseSeatName, seatData) => {
    e.stopPropagation();
    if (!seatData) return;

    const isBooked = seatData.status === 'booked';
    const isLockedByOther =
      seatData.status === 'locked' &&
      seatData.locked_by &&
      seatData.locked_by !== sessionId &&
      seatData.locked_until &&
      new Date(seatData.locked_until) > new Date();

    if (isBooked || isLockedByOther || locking) {
      document.body.style.cursor = 'not-allowed';
      return;
    }

    document.body.style.cursor = 'pointer';
    setHoveredSeatId(baseSeatName);

    // Tactile 2mm upward bounce on hover
    const seatObj = scene.getObjectByName(baseSeatName);
    if (seatObj && !seatObj.userData.originalY) {
      seatObj.userData.originalY = seatObj.position.y;
      seatObj.position.y += 0.04;
    }
  };

  const handlePointerOut = (e, baseSeatName) => {
    e.stopPropagation();
    document.body.style.cursor = 'auto';
    setHoveredSeatId(null);

    // Reset tactile bounce
    const seatObj = scene.getObjectByName(baseSeatName);
    if (seatObj && seatObj.userData.originalY !== undefined) {
      seatObj.position.y = seatObj.userData.originalY;
      delete seatObj.userData.originalY;
    }
  };

  const handlePointerDown = (e, seatData) => {
    e.stopPropagation();
    if (!seatData || locking) return;

    const isBooked = seatData.status === 'booked';
    const isLockedByOther =
      seatData.status === 'locked' &&
      seatData.locked_by &&
      seatData.locked_by !== sessionId &&
      seatData.locked_until &&
      new Date(seatData.locked_until) > new Date();

    if (isBooked || isLockedByOther) return;

    onSeatClick(seatData);
  };

  // Attach Raycasting listeners dynamically to seat groups
  return (
    <primitive object={scene}>
      {/* Dynamic invisible raycast proxies for each of the 50 seats */}
      {seats.map((seat) => {
        const nodeName = `Seat_${seat.row_label}${seat.col_number}`;
        const rowIdx = ['A', 'B', 'C', 'D', 'E'].indexOf(seat.row_label);
        const colX = -3.96 + (seat.col_number - 1) * 0.88;
        const rowZ = 4.8 + (rowIdx >= 0 ? rowIdx : 0) * 1.9;
        const riserY = ((rowIdx >= 0 ? rowIdx : 0) + 1) * 0.45;

        return (
          <mesh
            key={seat.id}
            name={`RaycastProxy_${nodeName}`}
            position={[colX, riserY + 0.45, rowZ - 0.05]}
            onPointerOver={(e) => handlePointerOver(e, nodeName, seat)}
            onPointerOut={(e) => handlePointerOut(e, nodeName)}
            onPointerDown={(e) => handlePointerDown(e, seat)}
            visible={false}
          >
            <boxGeometry args={[0.7, 0.9, 0.7]} />
            <meshBasicMaterial transparent opacity={0} />
          </mesh>
        );
      })}
    </primitive>
  );
}

useGLTF.preload('/models/auditorium.glb');
