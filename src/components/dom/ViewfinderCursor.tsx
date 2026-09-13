'use client';

import React, { useEffect, useState } from 'react';
import { useShowcaseStore } from '@/store/useShowcaseStore';

export const ViewfinderCursor: React.FC = () => {
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [isClient, setIsClient] = useState(false);
  const activeMovie = useShowcaseStore((s) => s.activeMovie);

  useEffect(() => {
    setIsClient(true);
    const onMouseMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', onMouseMove);
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, []);

  if (!isClient) return null;

  return (
    <div
      className="fixed pointer-events-none z-50 transition-transform duration-75 hidden md:block"
      style={{
        transform: `translate3d(${pos.x - 20}px, ${pos.y - 20}px, 0)`,
      }}
    >
      <div className="w-10 h-10 border border-white/25 rounded-full relative flex items-center justify-center">
        {/* Crosshair ticks */}
        <div className="w-2 h-[1px] bg-white/40 absolute -left-1" />
        <div className="w-2 h-[1px] bg-white/40 absolute -right-1" />
        <div className="h-2 w-[1px] bg-white/40 absolute -top-1" />
        <div className="h-2 w-[1px] bg-white/40 absolute -bottom-1" />
        <div className="w-1 h-1 rounded-full bg-neon-cyan/70" />

        {/* Small floating HUD details */}
        <div className="absolute left-11 top-0 text-[8px] font-mono text-zinc-400 whitespace-nowrap bg-black/60 px-1 py-0.5 rounded border border-white/10">
          X: {pos.x} Y: {pos.y} | {activeMovie.sceneConfig.lensFocalLength}
        </div>
      </div>
    </div>
  );
};
