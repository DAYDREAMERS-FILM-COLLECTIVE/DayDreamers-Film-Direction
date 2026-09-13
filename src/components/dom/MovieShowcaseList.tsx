'use client';

import React from 'react';
import { MOVIE_CATALOG } from '@/config/movies.schema';
import { MovieSlide } from './MovieSlide';

export const MovieShowcaseList: React.FC = () => {
  return (
    <div className="relative w-full space-y-24 py-12">
      <div className="px-6 md:px-16 mb-8 text-xs font-mono text-zinc-500 tracking-widest uppercase">
        // FEATURED ARCHIVAL SELECTIONS // 2026 CYCLE
      </div>
      {MOVIE_CATALOG.map((movie, index) => (
        <MovieSlide key={movie.id} movie={movie} index={index} />
      ))}
    </div>
  );
};
