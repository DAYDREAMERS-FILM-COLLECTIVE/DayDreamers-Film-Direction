'use client';

import React from 'react';
import { HeroSection } from '@/components/dom/HeroSection';
import { MovieShowcaseList } from '@/components/dom/MovieShowcaseList';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

export default function HomePage() {
  // Bind Lenis scroll to Anime.js timeline scrubbing
  useScrollAnimation();

  return (
    <main className="relative w-full min-h-screen">
      {/* Note: Persistent 3D WebGL Canvas is hosted in RootLayout */}
      <div className="relative z-10 w-full">
        <HeroSection />
        <MovieShowcaseList />

        {/* Editorial Minimal Footer */}
        <footer className="w-full py-16 px-6 md:px-16 border-t border-white/[0.08] bg-[#060814]/85 backdrop-blur-md text-xs font-mono text-zinc-500 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-[#E8E3D9]/60">
            FPS SCREENING ARCHIVE &copy; {new Date().getFullYear()} // DOGSTUDIO ANAMORPHIC DIRECTION
          </div>
          <div className="flex items-center gap-6 text-[#E8E3D9]/40">
            <span>BLENDKIT GLTF CORE</span>
            <span>ANIME.JS + LENIS SCRUB</span>
            <span>100% FREE ADMISSION</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
