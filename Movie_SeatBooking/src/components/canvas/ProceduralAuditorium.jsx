import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Procedural 50-Seat Cinema Chair Mesh
 * Continuous seating block with shared armrests, 3mm tactile hover lift,
 * raycast pointer handlers, and overhead micro-pinlight on selection.
 */
function ProceduralSeat({
  seat,
  row,
  col,
  isVip,
  isSelected,
  isBooked,
  isLockedByOther,
  onSeatClick,
  locking,
  colX,
  rowZ,
  riserY,
}) {
  const [hovered, setHovered] = useState(false);
  const meshGroupRef = useRef();
  const currentY = useRef(riserY);
  const targetY = useRef(riserY);

  // 3mm upward lift on hover: 0.03m
  useEffect(() => {
    if (hovered && !isBooked && !isLockedByOther) {
      targetY.current = riserY + 0.03;
    } else {
      targetY.current = riserY;
    }
  }, [hovered, isBooked, isLockedByOther, riserY]);

  // Smooth lerp for tactile 3mm lift
  useFrame(() => {
    if (meshGroupRef.current) {
      currentY.current = THREE.MathUtils.lerp(currentY.current, targetY.current, 0.2);
      meshGroupRef.current.position.y = currentY.current;
    }
  });

  // Dynamic materials matching Dogstudio cinema art direction
  const seatMaterial = useMemo(() => {
    if (isSelected) {
      return new THREE.MeshStandardMaterial({
        color: 0xd83128,
        emissive: 0xd83128,
        emissiveIntensity: 0.95,
        roughness: 0.35,
        metalness: 0.1,
      });
    }
    if (isBooked) {
      return new THREE.MeshStandardMaterial({
        color: 0x100e0d,
        roughness: 0.95,
        metalness: 0.05,
        transparent: true,
        opacity: 0.22,
      });
    }
    if (isLockedByOther) {
      return new THREE.MeshStandardMaterial({
        color: 0x78350f,
        emissive: 0xb45309,
        emissiveIntensity: 0.65,
        roughness: 0.6,
      });
    }
    if (hovered) {
      return new THREE.MeshStandardMaterial({
        color: isVip ? 0x54402e : 0x332f2b,
        emissive: 0xd83128,
        emissiveIntensity: 0.35,
        roughness: 0.5,
      });
    }
    // Base available
    if (isVip) {
      return new THREE.MeshStandardMaterial({
        color: 0x3a2c20,
        roughness: 0.55,
        metalness: 0.35,
      });
    }
    // Regular matte charcoal leather
    return new THREE.MeshStandardMaterial({
      color: 0x221f1d,
      roughness: 0.75,
      metalness: 0.1,
    });
  }, [isSelected, isBooked, isLockedByOther, hovered, isVip]);

  // Frame / Hardware Material
  const frameMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: 0x0d0c0b,
      roughness: 0.7,
      metalness: 0.4,
      transparent: isBooked,
      opacity: isBooked ? 0.25 : 1.0,
    });
  }, [isBooked]);

  const handlePointerOver = (e) => {
    e.stopPropagation();
    if (isBooked || isLockedByOther || locking) {
      document.body.style.cursor = 'not-allowed';
      return;
    }
    document.body.style.cursor = 'pointer';
    setHovered(true);
  };

  const handlePointerOut = (e) => {
    e.stopPropagation();
    document.body.style.cursor = 'auto';
    setHovered(false);
  };

  const handlePointerDown = (e) => {
    e.stopPropagation();
    if (isBooked || isLockedByOther || locking) return;
    onSeatClick(seat);
  };

  // Curve chair slightly toward screen center
  const curveAngle = -colX * 0.025;

  return (
    <group
      ref={meshGroupRef}
      position={[colX, riserY, rowZ]}
      rotation={[0, curveAngle, 0]}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onPointerDown={handlePointerDown}
    >
      {/* 1. Seat Cushion */}
      <mesh position={[0, 0.35, 0]} castShadow receiveShadow material={seatMaterial}>
        <boxGeometry args={[0.62, 0.12, 0.54]} />
      </mesh>

      {/* 2. Seat Backrest with subtle cinema recline */}
      <mesh
        position={[0, 0.68, -0.22]}
        rotation={[-0.14, 0, 0]}
        castShadow
        receiveShadow
        material={seatMaterial}
      >
        <boxGeometry args={[0.62, 0.64, 0.12]} />
      </mesh>

      {/* 3. Seat Pedestal / Leg */}
      <mesh position={[0, 0.17, 0]} material={frameMaterial}>
        <cylinderGeometry args={[0.03, 0.03, 0.34, 8]} />
      </mesh>

      {/* 4. Continuous Shared Armrests */}
      {/* Right Armrest (shared with adjacent chair) */}
      <mesh position={[0.34, 0.46, -0.04]} material={frameMaterial}>
        <boxGeometry args={[0.06, 0.32, 0.48]} />
      </mesh>
      {/* Left Outer Armrest (only on leftmost seat col 1) */}
      {col === 1 && (
        <mesh position={[-0.34, 0.46, -0.04]} material={frameMaterial}>
          <boxGeometry args={[0.06, 0.32, 0.48]} />
        </mesh>
      )}

      {/* 5. Overhead Micro-Pinlight when Selected */}
      {isSelected && (
        <pointLight
          position={[0, 1.1, 0]}
          color="#d83128"
          intensity={2.2}
          distance={1.6}
          decay={2}
        />
      )}
    </group>
  );
}

/**
 * Procedural 3D Screening Room
 * Generates:
 *  - Open cylindrical arc 16:9 screen with dynamic film texture mapping
 *  - 5 Stepped risers with dark concrete/wood materials
 *  - 50 Continuous cinema chairs in a 5x10 grid with raycast pointer handling
 */
export function ProceduralAuditorium({
  movie,
  seats = [],
  selectedSeats = [],
  onSeatClick,
  locking = false,
  sessionId = '',
}) {
  const [screenTexture, setScreenTexture] = useState(null);

  // 1. Load Movie Backdrop / Poster Texture dynamically onto Curved Screen
  useEffect(() => {
    const imgUrl = movie?.backdrop_url || movie?.poster_url;
    if (!imgUrl) return;

    const loader = new THREE.TextureLoader();
    loader.load(
      imgUrl,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        setScreenTexture(tex);
      },
      undefined,
      () => setScreenTexture(null)
    );
  }, [movie]);

  // Screen Geometry: Curved 16:9 Cylinder Arc
  // Radius: 18m, arc: 0.52 rad (~30 deg curve), width ~9.3m, height: 5.2m
  const screenRadius = 18;
  const screenArc = 0.52;
  const screenHeight = 5.2;

  const selectedSeatIds = useMemo(() => {
    return new Set(selectedSeats.map((s) => s.id));
  }, [selectedSeats]);

  const rows = ['A', 'B', 'C', 'D', 'E'];
  const riserDepths = 1.9;
  const riserWidth = 14.8;
  const riserStepHeight = 0.45;
  const colSpacing = 0.88;
  const startColX = -((10 - 1) * colSpacing) / 2; // centered

  return (
    <group name="ProceduralScreeningRoom">
      {/* ============================================================ */}
      {/* 1. CURVED 16:9 ACOUSTIC CINEMA SCREEN                        */}
      {/* ============================================================ */}
      <group position={[0, 3.2, 0]}>
        {/* Curved Screen Mesh (Inverted normals so curve faces audience) */}
        <mesh scale={[-1, 1, 1]}>
          <cylinderGeometry
            args={[
              screenRadius,
              screenRadius,
              screenHeight,
              48,
              1,
              true,
              -screenArc / 2 + Math.PI / 2,
              screenArc,
            ]}
          />
          <meshStandardMaterial
            color={screenTexture ? '#ffffff' : '#fffbf0'}
            map={screenTexture}
            emissive={screenTexture ? '#ffffff' : '#fffbf0'}
            emissiveMap={screenTexture}
            emissiveIntensity={screenTexture ? 0.4 : 0.15}
            roughness={0.8}
            metalness={0.05}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Screen Masking Bezel / Archival Frame */}
        <mesh scale={[-1, 1, 1]}>
          <cylinderGeometry
            args={[
              screenRadius - 0.04,
              screenRadius - 0.04,
              screenHeight + 0.35,
              48,
              1,
              true,
              -(screenArc + 0.04) / 2 + Math.PI / 2,
              screenArc + 0.04,
            ]}
          />
          <meshStandardMaterial
            color="#0d0c0b"
            roughness={0.95}
            metalness={0.1}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* ============================================================ */}
      {/* 2. STAGE FLOOR & AUDITORIUM BASE                             */}
      {/* ============================================================ */}
      {/* Front Stage */}
      <mesh position={[0, 0.2, 1.8]} receiveShadow>
        <boxGeometry args={[16, 0.4, 4]} />
        <meshStandardMaterial color="#131110" roughness={0.92} metalness={0.08} />
      </mesh>

      {/* Auditorium Main Base Floor */}
      <mesh position={[0, -0.05, 10]} receiveShadow>
        <boxGeometry args={[18, 0.1, 22]} />
        <meshStandardMaterial color="#080706" roughness={0.96} metalness={0.04} />
      </mesh>

      {/* ============================================================ */}
      {/* 3. STEPPED SEATING RISERS (5 TIERS: ROWS A to E)            */}
      {/* ============================================================ */}
      {rows.map((row, rowIndex) => {
        const riserHeight = (rowIndex + 1) * riserStepHeight;
        const riserZ = 4.8 + rowIndex * riserDepths;

        return (
          <mesh
            key={`Riser_${row}`}
            position={[0, riserHeight / 2, riserZ]}
            receiveShadow
          >
            <boxGeometry args={[riserWidth, riserHeight, riserDepths - 0.05]} />
            <meshStandardMaterial
              color="#131110"
              roughness={0.88}
              metalness={0.08}
            />
          </mesh>
        );
      })}

      {/* ============================================================ */}
      {/* 4. 50 CONTINUOUS SEATS (5 ROWS x 10 COLS)                    */}
      {/* ============================================================ */}
      {rows.map((row, rowIndex) => {
        const isVip = rowIndex >= 3; // Rows D & E are VIP
        const riserTopY = (rowIndex + 1) * riserStepHeight;
        const rowZ = 4.8 + rowIndex * riserDepths;

        return Array.from({ length: 10 }).map((_, colIndex) => {
          const col = colIndex + 1;
          const colX = startColX + colIndex * colSpacing;

          // Find corresponding seat in Supabase data
          const seatData =
            seats.find((s) => s.row_label === row && s.col_number === col) || {
              id: `fallback-${row}-${col}`,
              row_label: row,
              col_number: col,
              seat_tier: isVip ? 'vip' : 'regular',
              status: 'available',
            };

          const isSelected = selectedSeatIds.has(seatData.id);
          const isBooked = seatData.status === 'booked';
          const isLockedByOther =
            seatData.status === 'locked' &&
            seatData.locked_by &&
            seatData.locked_by !== sessionId &&
            seatData.locked_until &&
            new Date(seatData.locked_until) > new Date();

          return (
            <ProceduralSeat
              key={seatData.id}
              seat={seatData}
              row={row}
              col={col}
              isVip={isVip}
              isSelected={isSelected}
              isBooked={isBooked}
              isLockedByOther={isLockedByOther}
              onSeatClick={onSeatClick}
              locking={locking}
              colX={colX}
              rowZ={rowZ}
              riserY={riserTopY}
            />
          );
        });
      })}

      {/* ============================================================ */}
      {/* 5. REAR PROJECTION BOOTH WALL & APERTURE                    */}
      {/* ============================================================ */}
      <mesh position={[0, 4.5, 15.6]}>
        <boxGeometry args={[18, 9, 0.4]} />
        <meshStandardMaterial color="#080706" roughness={0.96} metalness={0.04} />
      </mesh>

      {/* Projection Glass Port */}
      <mesh position={[0, 4.2, 15.5]}>
        <boxGeometry args={[1.6, 0.9, 0.42]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#0284c7"
          emissiveIntensity={0.6}
          roughness={0.1}
          metalness={0.9}
        />
      </mesh>
    </group>
  );
}
