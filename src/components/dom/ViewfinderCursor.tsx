'use client';

import React, { useEffect, useState } from 'react';

export const ViewfinderCursor: React.FC = () => {
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [isClient, setIsClient] = useState(false);

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
        transform: `translate3d(${pos.x - 14}px, ${pos.y - 14}px, 0)`,
      }}
    >
      <div className="w-7 h-7 border border-[#E8E3D9]/30 rounded-full flex items-center justify-center">
        <div className="w-1.5 h-1.5 rounded-full bg-[#C92A42]" />
      </div>
    </div>
  );
};
