'use client';

import React, { useEffect, useRef } from 'react';
import anime from 'animejs';
import { usePathname } from 'next/navigation';
import { useShowcaseStore } from '@/store/useShowcaseStore';

export const DogstudioTransitionWipe: React.FC = () => {
  const curtainRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const setIsPageTransitioning = useShowcaseStore((s) => s.setIsPageTransitioning);
  const setIsBookingRoute = useShowcaseStore((s) => s.setIsBookingRoute);

  // Smooth curtain slide-out when the new page route arrives
  useEffect(() => {
    setIsBookingRoute(pathname.includes('/book') || pathname.includes('/film/'));

    if (curtainRef.current) {
      anime({
        targets: curtainRef.current,
        translateY: ['0%', '-100%'],
        easing: 'cubicBezier(0.77, 0, 0.175, 1)',
        duration: 900,
        complete: () => {
          setIsPageTransitioning(false);
          if (curtainRef.current) {
            curtainRef.current.style.transform = 'translateY(100%)';
          }
        },
      });
    }
  }, [pathname, setIsBookingRoute, setIsPageTransitioning]);

  return (
    <div
      id="dogstudio-curtain"
      ref={curtainRef}
      className="fixed inset-0 z-50 pointer-events-none bg-[#060814] flex flex-col justify-between"
      style={{ transform: 'translateY(100%)' }}
    >
      {/* Top subtle crimson accent line */}
      <div className="w-full h-[3px] bg-[#C92A42] shadow-[0_0_20px_#C92A42]" />
      <div className="flex-1 flex items-center justify-center">
        <span className="font-serif text-2xl tracking-widest text-[#E8E3D9]/20 uppercase">
          FPS ARCHIVE
        </span>
      </div>
      <div className="w-full h-[1px] bg-white/[0.04]" />
    </div>
  );
};
