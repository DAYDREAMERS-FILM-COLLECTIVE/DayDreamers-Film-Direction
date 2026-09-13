'use client';

import React, { useRef, useEffect } from 'react';
import { MovieItem } from '@/config/movies.schema';
import { useShowcaseStore } from '@/store/useShowcaseStore';
import { useDogstudioNavigate } from '@/hooks/useDogstudioNavigate';
import { ArrowRight } from 'lucide-react';

export const MovieSlide: React.FC<{ movie: MovieItem; index: number }> = ({ movie, index }) => {
  const slideRef = useRef<HTMLDivElement>(null);
  const activeMovie = useShowcaseStore((s) => s.activeMovie);
  const setActiveMovie = useShowcaseStore((s) => s.setActiveMovie);
  const setSelectedShowtimeStore = useShowcaseStore((s) => s.setSelectedShowtime);
  const { navigateTo } = useDogstudioNavigate();

  const isActive = activeMovie.id === movie.id;

  useEffect(() => {
    const el = slideRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.4) {
            setActiveMovie(movie);
          }
        });
      },
      { threshold: [0.2, 0.5, 0.8] }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [movie, setActiveMovie]);

  const handleBookNavigation = () => {
    setSelectedShowtimeStore(movie.showtimes[0]);
    navigateTo(`/film/${movie.id}/book`);
  };

  return (
    <div
      ref={slideRef}
      className={`min-h-screen flex items-center justify-start px-8 md:px-16 py-32 transition-opacity duration-700 ${
        isActive ? 'opacity-100' : 'opacity-25'
      }`}
    >
      {/* Floating Editorial Headline with Zero Box Borders */}
      <div className="movie-slide-card max-w-2xl w-full pointer-events-auto space-y-6">
        {/* Film Index and Aspect Ratio */}
        <div className="flex items-center gap-4 text-xs font-sans tracking-[0.25em] text-[#E8E3D9]/50 uppercase">
          <span>0{index + 1} &mdash; 03</span>
          <span>&bull;</span>
          <span>{movie.year}</span>
          <span>&bull;</span>
          <span>{movie.aspectRatio}</span>
        </div>

        {/* Film Title Floating Directly on Canvas */}
        <h2 className="text-5xl sm:text-7xl md:text-8xl font-serif text-[#E8E3D9] tracking-tight leading-[0.95] select-none">
          {movie.title}
        </h2>

        {/* Tagline */}
        <p className="text-base sm:text-lg italic font-serif text-[#C92A42] leading-relaxed">
          &ldquo;{movie.tagline}&rdquo;
        </p>

        {/* Logline */}
        <p className="text-[#E8E3D9]/75 text-sm sm:text-base font-light leading-relaxed max-w-lg">
          {movie.logline}
        </p>

        {/* Discreet Metadata */}
        <div className="flex items-center gap-8 pt-2 text-xs font-sans tracking-wider text-[#E8E3D9]/60">
          <div>
            <span className="text-zinc-500 block text-[10px] uppercase">DIRECTOR</span>
            <span className="text-[#E8E3D9]">{movie.director}</span>
          </div>
          <div>
            <span className="text-zinc-500 block text-[10px] uppercase">LENS CALIBRATION</span>
            <span className="text-[#E8E3D9]">{movie.sceneConfig.lensFocalLength}</span>
          </div>
          <div>
            <span className="text-zinc-500 block text-[10px] uppercase">ADMISSION</span>
            <span className="text-[#D4AF37]">100% FREE</span>
          </div>
        </div>

        {/* Action Button: Reserve Seats */}
        <div className="pt-6">
          <button
            onClick={handleBookNavigation}
            className="group inline-flex items-center gap-3 px-8 py-4 rounded-full bg-[#E8E3D9] text-[#060814] font-sans text-xs tracking-widest uppercase font-semibold hover:bg-[#C92A42] hover:text-[#E8E3D9] transition-all duration-300 shadow-xl"
          >
            <span>Reserve Seats</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};
