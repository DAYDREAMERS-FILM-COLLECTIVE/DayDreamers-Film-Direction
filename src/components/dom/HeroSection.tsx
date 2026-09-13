'use client';

import React from 'react';
import { ArrowDown } from 'lucide-react';

export const HeroSection: React.FC = () => {
  return (
    <section className="relative min-h-screen w-full flex flex-col justify-between px-8 md:px-16 pt-40 pb-16 pointer-events-none">
      {/* Massive Editorial Headline with Vast Negative Space */}
      <div className="max-w-4xl pointer-events-auto space-y-8">
        <div className="text-xs font-sans tracking-[0.3em] uppercase text-[#D4AF37]/80">
          Cinematic Direction & Archival Screenings
        </div>

        <h1 className="hero-heading text-6xl sm:text-8xl md:text-9xl font-serif text-[#E8E3D9] leading-[0.92] tracking-tight">
          Anamorphic <br />
          <span className="italic font-serif text-[#C92A42]">Visions.</span>
        </h1>

        <p className="text-base sm:text-lg md:text-xl text-[#E8E3D9]/70 font-light leading-relaxed max-w-xl">
          A synchronized film archive and theater reservation engine. Traverse the collection to shift the optical refraction and atmosphere.
        </p>
      </div>

      {/* Elegant Editorial Scroll Prompt */}
      <div className="flex items-center justify-between pointer-events-auto border-t border-white/[0.08] pt-8 text-xs font-sans tracking-widest text-[#E8E3D9]/50">
        <div>SCROLL TO EXPLORE</div>
        <div className="flex items-center gap-2 text-[#E8E3D9] hover:text-[#C92A42] transition-colors">
          <span>FEATURED FILMS</span>
          <ArrowDown className="w-3.5 h-3.5" />
        </div>
      </div>
    </section>
  );
};
