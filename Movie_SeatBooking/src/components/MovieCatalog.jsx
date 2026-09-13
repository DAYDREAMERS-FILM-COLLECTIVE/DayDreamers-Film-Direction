import React, { useState } from 'react';
import { Clock, Tag, ChevronRight, Info } from 'lucide-react';
import { SynopsisModal } from './SynopsisModal.jsx';

export function MovieCatalog({ movies, selectedMovie, onSelectMovie }) {
  const [synopsisMovie, setSynopsisMovie] = useState(null);

  return (
    <section className="space-y-6" id="catalog-section">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-[#2a2622] pb-4 gap-2">
        <div>
          <span className="text-[10px] font-mono tracking-widest text-[#d83128] uppercase block">
            CAMPUS PROGRAMME
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#eee9df] uppercase">
            Current Screenings
          </h2>
        </div>
        <div className="text-xs font-mono text-[#9f9b94]">
          {movies.length} FILMS SCHEDULED
        </div>
      </div>

      {/* Film Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {movies.map((movie) => {
          const isSelected = selectedMovie?.id === movie.id;
          const hours = Math.floor(movie.duration_mins / 60);
          const mins = movie.duration_mins % 60;

          return (
            <div
              key={movie.id}
              className={`group flex flex-col bg-[#171513] border transition-all duration-200 ${
                isSelected
                  ? 'border-[#d83128] shadow-[0_4px_20px_rgba(216,49,40,0.15)]'
                  : 'border-[#2a2622] hover:border-[#3a3530] hover:-translate-y-0.5'
              }`}
            >
              {/* Film Poster Thumbnail */}
              <div className="relative aspect-[16/9] sm:aspect-[3/2] overflow-hidden bg-[#131211]">
                <img
                  src={movie.backdrop_url || movie.poster_url}
                  alt={movie.title}
                  className="w-full h-full object-cover object-center filter grayscale group-hover:grayscale-0 transition-all duration-300 contrast-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#171513] via-transparent to-transparent" />

                {/* Rating Badge */}
                <div className="absolute top-3 left-3 bg-[#0e0d0c]/90 border border-[#2a2622] px-2 py-0.5 text-[10px] font-mono font-bold text-[#eee9df]">
                  {movie.age_rating}
                </div>

                {/* Duration Badge */}
                <div className="absolute bottom-3 left-3 bg-[#0e0d0c]/90 border border-[#2a2622] px-2 py-0.5 text-[10px] font-mono text-[#9f9b94] flex items-center space-x-1">
                  <Clock className="w-3 h-3 text-[#d83128]" />
                  <span>{hours}h {mins}m</span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <span className="text-[10px] font-mono text-[#9f9b94] tracking-wider uppercase block">
                    {movie.genre}
                  </span>
                  <h3 className="text-xl font-serif font-bold text-[#eee9df] uppercase tracking-wide group-hover:text-white transition-colors">
                    {movie.title}
                  </h3>
                  {movie.tagline && (
                    <p className="text-xs font-serif italic text-[#9f9b94] line-clamp-1">
                      "{movie.tagline}"
                    </p>
                  )}
                  <p className="text-xs text-[#9f9b94] font-sans line-clamp-2 leading-relaxed">
                    {movie.description}
                  </p>
                </div>

                {/* Card Actions */}
                <div className="pt-2 border-t border-[#2a2622] flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSynopsisMovie(movie)}
                    className="px-3 py-2 bg-[#0e0d0c] hover:bg-[#1e1b18] text-[#9f9b94] hover:text-[#eee9df] text-xs font-sans border border-[#2a2622] transition-colors flex items-center space-x-1"
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span>Synopsis</span>
                  </button>

                  <button
                    onClick={() => onSelectMovie(movie)}
                    className={`px-4 py-2 text-xs font-sans font-bold uppercase tracking-wider border transition-colors flex items-center space-x-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-[#d83128] text-white border-[#d83128]'
                        : 'bg-[#171513] text-[#eee9df] border-[#3a3530] hover:border-[#d83128] hover:text-white'
                    }`}
                  >
                    <span>{isSelected ? 'SELECTED' : 'VIEW SHOWTIMES'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal for Synopsis & Technical Spec */}
      {synopsisMovie && (
        <SynopsisModal
          movie={synopsisMovie}
          onClose={() => setSynopsisMovie(null)}
          onSelectMovie={(movie) => {
            onSelectMovie(movie);
            setSynopsisMovie(null);
          }}
        />
      )}
    </section>
  );
}
