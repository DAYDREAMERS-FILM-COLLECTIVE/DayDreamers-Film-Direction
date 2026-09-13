'use client';

import React from 'react';
import { ArrowDown, Aperture, Eye } from 'lucide-react';
import { useShowcaseStore } from '@/store/useShowcaseStore';

export const HeroSection: React.FC = () => {
  const activeMovie = useShowcaseStore((s) => s.activeMovie);

  return (
    <section className="relative min-h-screen w-full flex flex-col justify-between px-6 md:px-16 pt-36 pb-16 pointer-events-none">
      {/* Top Statement in Editorial Serif */}
      <div className="max-w-4xl pointer-events-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-white/10 bg-[#0c0f1d]/70 backdrop-blur-md text-[11px] font-mono text-[#D4AF37] tracking-widest uppercase">
          <Aperture className="w-3.5 h-3.5 text-[#C92A42] animate-spin" style={{ animationDuration: '16s' }} />
          <span>SYNCHRONIZED WEBGL & EDITORIAL CINEMA ARCHITECTURE</span>
        </div>

        <h1 className="hero-heading text-5xl sm:text-7xl md:text-8xl font-serif text-[#E8E3D9] leading-[1.0] tracking-tight">
          Anamorphic <span className="italic font-serif text-[#C92A42]">Visions</span> & Space.
        </h1>

        <p className="text-base sm:text-lg md:text-xl text-zinc-400 font-light leading-relaxed max-w-2xl">
          An atmospheric direction archive and synchronized cinema seat reservation platform. 
          As you traverse the virtual scroll, the persistent 3D lens shifts its optical refraction, materials, and ambient illumination.
        </p>
      </div>

      {/* Center Reticle Metadata HUD */}
      <div className="hidden lg:flex items-center justify-between border-t border-b border-white/[0.08] py-4 pointer-events-auto text-xs font-mono text-zinc-400">
        <div className="flex items-center gap-3">
          <Eye className="w-4 h-4 text-[#C92A42]" />
          <span className="text-[#E8E3D9]">FOCAL SUBJECT // {activeMovie.title}</span>
        </div>
        <div>MODEL OPTICS // {activeMovie.sceneConfig.lensFocalLength}</div>
        <div>PALETTE // MIDNIGHT & CRIMSON</div>
        <div>ADMISSION // 100% FREE TICKETING</div>
      </div>

      {/* Bottom Scroll Indicator */}
      <div className="flex items-center justify-between pointer-events-auto pt-6">
        <div className="text-xs font-mono text-zinc-400 flex items-center gap-3">
          <span>SCROLL TO SCRUB TIMELINE</span>
          <span className="w-12 h-[1px] bg-white/20" />
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-[#E8E3D9] animate-bounce">
          <span>TRAVERSE ARCHIVE</span>
          <ArrowDown className="w-4 h-4 text-[#C92A42]" />
        </div>
      </div>
    </section>
  );
};
