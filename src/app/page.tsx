import React from 'react';
import { CanvasWrapper } from '@/components/canvas/CanvasWrapper';
import { HeroSection } from '@/components/dom/HeroSection';
import { MovieShowcaseList } from '@/components/dom/MovieShowcaseList';
import { BookingModal } from '@/components/booking/BookingModal';

export default function HomePage() {
  return (
    <main className="relative w-full min-h-screen">
      {/* Fixed Fullscreen R3F Canvas */}
      <CanvasWrapper />

      {/* Scrolling DOM Overlay */}
      <div className="relative z-10 w-full">
        <HeroSection />
        <MovieShowcaseList />
        
        {/* Footer */}
        <footer className="w-full py-16 px-6 md:px-16 border-t border-white/[0.08] bg-void/80 backdrop-blur-md text-xs font-mono text-zinc-500 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            FPS SCREENING ARCHIVE &copy; {new Date().getFullYear()} // ZERO-HARDCODED PARAMETRIC CINEMA
          </div>
          <div className="flex items-center gap-6">
            <span>DIRECTOR PORTFOLIO</span>
            <span>RVU ANAMORPHIC UNIT</span>
            <span>100% FREE ADMISSION</span>
          </div>
        </footer>
      </div>

      {/* Dynamic Lens-Dive Booking Modal */}
      <BookingModal />
    </main>
  );
}
