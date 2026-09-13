'use client';

import dynamic from 'next/dynamic';
import React from 'react';

const CinematicCanvas = dynamic(() => import('./CinematicCanvas'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 bg-void flex items-center justify-center z-0">
      <div className="w-8 h-8 rounded-full border border-white/20 border-t-neon-cyan animate-spin" />
    </div>
  ),
});

export const CanvasWrapper: React.FC = () => {
  return <CinematicCanvas />;
};
