'use client';

import React from 'react';
import { ArrowDown, Aperture, Eye } from 'lucide-react';
import { useShowcaseStore } from '@/store/useShowcaseStore';

export const HeroSection: React.FC = () => {
  const activeMovie = useShowcaseStore((s) => s.activeMovie);

  return (
    <section className="relative min-h-screen w-full flex flex-col justify-between px-6 md:px-16 pt-32 pb-16 pointer-events-none">
      {/* Top Statement */}
      <div className="max-w-3xl pointer-events-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-surface/60 backdrop-blur-sm text-xs font-mono text-zinc-300">
          <Aperture className="w-3.5 h-3.5 text-neon-cyan animate-spin" style={{ animationDuration: '10s' }} />
          <span>SYNCHRONIZED WEBGL & PARAMETRIC ARCHITECTURE</span>
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white leading-[1.05]">
          OPTICAL <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan via-white to-prism-magenta">ANAMORPHICS</span> & CINEMATIC SPACE
        </h1>

        <p className="text-sm sm:text-base md:text-lg text-zinc-400 font-light leading-relaxed max-w-2xl">
          A synchronized film direction portfolio and real-time seat reservation engine. 
          Scroll down to traverse the optical assembly—each featured film shifts the mechanical aperture, refraction indices, and ambient chromatic field.
        </p>
      </div>

      {/* Center Reticle Info */}
      <div className="hidden lg:flex items-center justify-between border-t border-b border-white/[0.08] py-4 pointer-events-auto text-xs font-mono text-zinc-400">
        <div className="flex items-center gap-3">
          <Eye className="w-4 h-4 text-neon-cyan" />
          <span>FOCUS TARGET // {activeMovie.title}</span>
        </div>
        <div>OPTICS // {activeMovie.sceneConfig.lensFocalLength}</div>
        <div>APERTURE IRIS // {(activeMovie.sceneConfig.apertureBladeOpen * 100).toFixed(0)}% OPEN</div>
        <div>TICKETING // 100% FREE ADMISSION RESERVATION</div>
      </div>

      {/* Bottom Scroll Prompt */}
      <div className="flex items-center justify-between pointer-events-auto pt-6">
        <div className="text-xs font-mono text-zinc-400 flex items-center gap-2">
          <span>SCROLL TO ENTER SHOWCASE</span>
          <span className="w-8 h-[1px] bg-zinc-600" />
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-neon-cyan animate-bounce">
          <span>TRAVERSE PRISM</span>
          <ArrowDown className="w-4 h-4" />
        </div>
      </div>
    </section>
  );
};
