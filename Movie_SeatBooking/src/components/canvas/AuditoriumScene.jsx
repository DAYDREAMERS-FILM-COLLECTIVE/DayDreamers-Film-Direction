import React, { Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { ProceduralAuditorium } from './ProceduralAuditorium.jsx';
import { VolumetricSpotlight } from './VolumetricSpotlight.jsx';
import { AtmosphericDust } from './AtmosphericDust.jsx';
import { CameraRig } from './CameraRig.jsx';

function CanvasLoader() {
  return (
    <mesh position={[0, 3, 5]}>
      <boxGeometry args={[0.8, 0.8, 0.8]} />
      <meshBasicMaterial color="#d83128" wireframe />
    </mesh>
  );
}

/**
 * Dogstudio-Inspired 3D Experiential WebGL Auditorium Scene
 * Features:
 *  - 100% Procedural 3D Screening Room (Curved 16:9 Screen + 5 Risers + 50 Continuous Chairs)
 *  - Volumetric Projector Spotlight radiating from rear booth
 *  - 1,200 Interactive Atmospheric Dust Motes reacting to mouse velocity
 *  - Postprocessing: Cinematic Bloom + Subtle Vignette
 *  - GSAP Camera Rig with Bézier swoops
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
    <div className="relative w-full h-[620px] sm:h-[740px] lg:h-[820px] bg-[#080706] overflow-hidden border border-[#26221f]">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 5.8, 18.2], fov: 44, near: 0.1, far: 100 }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          alpha: false,
        }}
        onCreated={({ gl }) => {
          gl.setClearColor('#080706', 1);
        }}
      >
        <Suspense fallback={<CanvasLoader />}>
          {/* Ambient Warm Cinema Illumination */}
          <ambientLight intensity={0.65} color="#eee9df" />

          {/* Stage Directional Key Light */}
          <directionalLight
            position={[8, 12, 10]}
            intensity={0.35}
            color="#fffbf0"
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />

          {/* 35mm Volumetric Projector Cone */}
          <VolumetricSpotlight
            movieBackdropUrl={movie?.backdrop_url || movie?.poster_url}
          />

          {/* 1,200 Atmospheric Dust Motes reacting to mouse velocity */}
          <AtmosphericDust count={1200} />

          {/* 100% Procedural 50-Seat Auditorium (No Blender Required) */}
          <ProceduralAuditorium
            movie={movie}
            seats={seats}
            selectedSeats={selectedSeats}
            onSeatClick={onSeatClick}
            locking={locking}
            sessionId={sessionId}
          />

          {/* GSAP Camera Choreography */}
          <CameraRig
            viewMode={viewMode}
            focusedSeat={focusedSeat}
            controlsRef={controlsRef}
          />

          {/* Cinematic Post-Processing: Bloom + Vignette */}
          <EffectComposer disableNormalPass multisampling={4}>
            <Bloom
              luminanceThreshold={0.72}
              luminanceSmoothing={0.25}
              intensity={0.55}
            />
            <Vignette
              eskil={false}
              offset={0.25}
              darkness={0.85}
            />
          </EffectComposer>

          {/* Damped Orbit Controls */}
          <OrbitControls
            ref={controlsRef}
            enablePan={false}
            enableZoom={true}
            minDistance={6.5}
            maxDistance={25}
            maxPolarAngle={Math.PI / 2 - 0.05}
            minPolarAngle={0.2}
            enableDamping
            dampingFactor={0.06}
          />
        </Suspense>
      </Canvas>

      {/* Dogstudio-Inspired Minimalist Viewfinder HUD Tooltip */}
      <div className="absolute top-4 right-4 pointer-events-none z-10 flex items-center space-x-2.5 bg-[#131110]/80 backdrop-blur-md border border-[#26221f] px-3.5 py-1.5 text-[10px] font-mono text-[#8c867e] tracking-widest uppercase">
        <span className="w-1.5 h-1.5 bg-[#d83128] animate-ping" />
        <span>INTERACTIVE 3D PROJECTION • CLICK SEAT TO HOLD</span>
      </div>
    </div>
  );
}
