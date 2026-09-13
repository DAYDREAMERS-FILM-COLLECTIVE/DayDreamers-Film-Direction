'use client';

import React from 'react';
import { useProgress } from '@react-three/drei';

export const ModelLoadingScreen: React.FC = () => {
  const { progress, active } = useProgress();

  if (!active && progress === 100) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#060814] flex flex-col items-center justify-center pointer-events-none transition-opacity duration-700 select-none">
      <div className="max-w-md w-full px-8 text-center space-y-6">
        <div className="space-y-2">
          <div className="text-[10px] font-mono tracking-[0.3em] uppercase text-zinc-400">
            DOGSTUDIO ARCHITECTURAL ENGINE // BLENDKIT ASSETS
          </div>
          <h2 className="text-3xl sm:text-4xl font-serif text-[#E8E3D9] tracking-wide">
            Calibrating Optics
          </h2>
          <p className="text-xs font-mono text-zinc-400">
            Loading high-fidelity anamorphic 3D lens models...
          </p>
        </div>

        {/* Minimal Editorial Progress Bar */}
        <div className="w-full h-[2px] bg-white/10 relative overflow-hidden rounded-full">
          <div
            className="h-full bg-[#C92A42] transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="text-xs font-mono text-[#D4AF37] tracking-widest">
          {Math.round(progress)}% LOADED
        </div>
      </div>
    </div>
  );
};
