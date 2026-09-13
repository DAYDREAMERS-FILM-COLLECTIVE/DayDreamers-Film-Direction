'use client';

import React, { useRef, useEffect, useState } from 'react';
import { MovieItem, MovieShowtimeConfig } from '@/config/movies.schema';
import { useShowcaseStore } from '@/store/useShowcaseStore';
import { Ticket, Clock, Film, Sparkles, ChevronRight } from 'lucide-react';
import { sound } from '@/lib/audio';

export const MovieSlide: React.FC<{ movie: MovieItem; index: number }> = ({ movie, index }) => {
  const slideRef = useRef<HTMLDivElement>(null);
  const [selectedShowtime, setSelectedShowtime] = useState<MovieShowtimeConfig>(movie.showtimes[0]);
  const activeMovie = useShowcaseStore((s) => s.activeMovie);
  const openBooking = useShowcaseStore((s) => s.openBooking);
  const setActiveMovie = useShowcaseStore((s) => s.setActiveMovie);

  const isActive = activeMovie.id === movie.id;

  useEffect(() => {
    const el = slideRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.45) {
            setActiveMovie(movie);
          }
        });
      },
      {
        threshold: [0.2, 0.5, 0.8],
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [movie, setActiveMovie]);

  const handleBookClick = () => {
    sound.playShutterClick();
    openBooking(movie, selectedShowtime);
  };

  return (
    <div
      ref={slideRef}
      className={`min-h-screen flex items-center justify-start px-6 md:px-16 py-24 transition-opacity duration-700 ${
        isActive ? 'opacity-100' : 'opacity-40'
      }`}
    >
      <div className="max-w-2xl w-full pointer-events-auto bg-surface/70 backdrop-blur-xl border border-white/[0.08] p-8 md:p-10 rounded-2xl shadow-2xl relative overflow-hidden group">
        {/* Ambient Top Glow Line */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px] transition-all duration-700"
          style={{
            backgroundColor: movie.domConfig.accentColor,
            boxShadow: `0 0 20px ${movie.domConfig.accentColor}`,
          }}
        />

        {/* Header Badges */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span
              className="px-2.5 py-1 rounded text-black font-bold"
              style={{ backgroundColor: movie.domConfig.accentColor }}
            >
              PROJECTION 0{index + 1}
            </span>
            <span className="text-zinc-400">// {movie.year}</span>
          </div>

          <div className="flex items-center gap-4 text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5" />
              {movie.aspectRatio}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {movie.runtime}
            </span>
          </div>
        </div>

        {/* Movie Title */}
        <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-2 uppercase">
          {movie.title}
        </h2>

        {/* Tagline */}
        <p
          className="text-sm sm:text-base italic font-serif mb-4"
          style={{ color: movie.domConfig.accentColor }}
        >
          &ldquo;{movie.tagline}&rdquo;
        </p>

        {/* Logline */}
        <p className="text-zinc-300 text-sm sm:text-base leading-relaxed mb-6 font-light">
          {movie.logline}
        </p>

        {/* Optical Characteristics Card */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-black/40 border border-white/5 mb-6 text-xs font-mono text-zinc-400">
          <div>
            <span className="text-[10px] text-zinc-500 block">DIRECTOR</span>
            <span className="text-zinc-200">{movie.director}</span>
          </div>
          <div>
            <span className="text-[10px] text-zinc-500 block">LENS CALIBRATION</span>
            <span className="text-zinc-200">{movie.sceneConfig.lensFocalLength}</span>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <span className="text-[10px] text-zinc-500 block">ADMISSION</span>
            <span className="text-emerald-400 font-semibold">100% FREE</span>
          </div>
        </div>

        {/* Showtime Selector */}
        <div className="space-y-2 mb-8">
          <label className="text-[11px] font-mono text-zinc-400 tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-zinc-500" />
            SELECT SCREENING SESSION
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {movie.showtimes.map((st) => (
              <button
                key={st.id}
                onClick={() => {
                  setSelectedShowtime(st);
                  sound.playShutterClick();
                }}
                className={`p-3 rounded-lg border text-left font-mono text-xs transition-all flex flex-col justify-between ${
                  selectedShowtime.id === st.id
                    ? 'border-white/80 bg-white/10 text-white shadow-lg'
                    : 'border-white/10 bg-black/20 text-zinc-400 hover:border-white/30'
                }`}
              >
                <div className="font-bold flex items-center justify-between">
                  <span>{st.timeLabel}</span>
                  {selectedShowtime.id === st.id && (
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: movie.domConfig.accentColor }} />
                  )}
                </div>
                <div className="text-[10px] text-zinc-400 truncate mt-1">{st.venue}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Book Tickets CTA with Lens Dive Transition */}
        <button
          onClick={handleBookClick}
          className="w-full py-4 px-6 rounded-xl font-mono text-xs tracking-widest uppercase font-bold text-black flex items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-xl"
          style={{
            backgroundColor: movie.domConfig.accentColor,
            boxShadow: `0 0 30px ${movie.domConfig.secondaryColor}`,
          }}
        >
          <Ticket className="w-4 h-4" />
          <span>RESERVE SEATS // DIVE INTO LENS</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
