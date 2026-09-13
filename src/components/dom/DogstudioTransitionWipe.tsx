'use client';

import React, { useEffect, useRef } from 'react';
import anime from 'animejs';
import { usePathname } from 'next/navigation';
import { useShowcaseStore } from '@/store/useShowcaseStore';

export const DogstudioTransitionWipe: React.FC = () => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const isPageTransitioning = useShowcaseStore((s) => s.isPageTransitioning);
  const setIsPageTransitioning = useShowcaseStore((s) => s.setIsPageTransitioning);
  const setIsBookingRoute = useShowcaseStore((s) => s.setIsBookingRoute);

  // Detect route changes and trigger reverse wipe reveal
  useEffect(() => {
    setIsBookingRoute(pathname.includes('/book') || pathname.includes('/film/'));

    if (overlayRef.current) {
      // Reverse wipe: scale down towards the top
      anime({
        targets: overlayRef.current,
        scaleY: [1, 0],
        transformOrigin: ['50% 0%', '50% 0%'],
        easing: 'easeInOutCubic',
        duration: 800,
        complete: () => {
          setIsPageTransitioning(false);
        },
      });
    }
  }, [pathname, setIsBookingRoute, setIsPageTransitioning]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 pointer-events-none bg-[#060814] flex flex-col justify-end"
      style={{ transform: 'scaleY(0)', transformOrigin: 'bottom' }}
    >
      {/* Editorial Crimson Accent Wipe Edge */}
      <div className="w-full h-1 bg-[#C92A42] shadow-[0_0_30px_#C92A42]" />
    </div>
  );
};
