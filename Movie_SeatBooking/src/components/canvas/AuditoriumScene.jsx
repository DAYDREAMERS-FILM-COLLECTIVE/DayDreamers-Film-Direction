import React, { Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { AuditoriumModel } from './AuditoriumModel.jsx';
import { VolumetricSpotlight } from './VolumetricSpotlight.jsx';
import { CameraRig } from './CameraRig.jsx';

function CanvasLoader() {
  return (
    <mesh position={[0, 3, 5]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#d83128" wireframe />
    </mesh>
  );
}

/**
 * High-End 3D WebGL Cinema Canvas
 * Renders the 50-seat stepped auditorium with realistic volumetric projector lighting,
 * GSAP camera transitions, and raycasting seat selections.
 */
export function AuditoriumScene({
  movie,
  showtime,
  seats = [],
  selectedSeats = [],
  onSeatClick,
  locking = false,
  sessionId = '',
  viewMode = 'auditorium', // 'hero' | 'auditorium'
  focusedSeat = null,
}) {
  const controlsRef = useRef();

  return (
    <div className="relative w-full h-[600px] sm:h-[720px] lg:h-[800px] bg-[#11100f] overflow-hidden border border-[#2a2622]">
      <Canvas
        shadows
        camera={{ position: [0, 5.8, 18.2], fov: 44, near: 0.1, far: 100 }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          alpha: false,
        }}
        onCreated={({ gl, scene }) => {
          gl.setClearColor('#11100f', 1);
        }}
      >
        <Suspense fallback={<CanvasLoader />}>
          {/* Ambient & Directional Warm Illumination */}
          <ambientLight intensity={0.7} color="#f4ede2" />
          <directionalLight
            position={[8, 12, 10]}
            intensity={0.4}
            color="#fff8f0"
          />

          {/* 35mm Carbon-Arc Volumetric Projector Spotlight */}
          <VolumetricSpotlight
            movieBackdropUrl={movie?.backdrop_url || movie?.poster_url}
          />

          {/* 50-Seat Physical Mesh Grid & Curved 16:9 Screen */}
          <AuditoriumModel
            seats={seats}
            selectedSeats={selectedSeats}
            onSeatClick={onSeatClick}
            locking={locking}
            sessionId={sessionId}
            moviePosterUrl={movie?.backdrop_url || movie?.poster_url}
          />

          {/* GSAP Camera Choreography */}
          <CameraRig
            viewMode={viewMode}
            focusedSeat={focusedSeat}
            controlsRef={controlsRef}
          />

          {/* Smooth Damped Orbit Controls for Free Look */}
          <OrbitControls
            ref={controlsRef}
            enablePan={false}
            enableZoom={true}
            minDistance={7}
            maxDistance={25}
            maxPolarAngle={Math.PI / 2 - 0.05}
            minPolarAngle={0.2}
            enableDamping
            dampingFactor={0.06}
          />
        </Suspense>
      </Canvas>

      {/* 3D Navigation HUD Tooltip */}
      <div className="absolute top-4 right-4 pointer-events-none z-10 flex items-center space-x-2 bg-[#171513]/85 backdrop-blur-sm border border-[#2a2622] px-3 py-1.5 text-[10px] font-mono text-[#9f9b94] uppercase tracking-wider">
        <span className="w-1.5 h-1.5 bg-[#d83128] animate-ping" />
        <span>DRAG TO ORBIT • CLICK SEAT TO HOLD</span>
      </div>
    </div>
  );
}
