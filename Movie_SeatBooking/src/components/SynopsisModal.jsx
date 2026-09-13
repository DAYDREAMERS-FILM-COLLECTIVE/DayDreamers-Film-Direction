import React from 'react';
import { X, Play, Clock, Shield, Tag } from 'lucide-react';

export function SynopsisModal({ movie, onClose, onSelectMovie }) {
  if (!movie) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
      <div 
        className="relative w-full max-w-2xl bg-slate-950 border border-slate-700 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Backdrop Header (Sharp) */}
        <div className="relative h-60 w-full overflow-hidden bg-black">
          <img 
            src={movie.backdrop_url || movie.poster_url} 
            alt={movie.title}
            className="w-full h-full object-cover object-center grayscale-[15%]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />

          {/* Close Button (Sharp) */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 bg-black/80 text-slate-300 hover:text-white border border-slate-700 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Trailer Preview Link */}
          {movie.trailer_url && (
            <a
              href={movie.trailer_url}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-4 right-4 flex items-center space-x-2 px-3.5 py-1.5 bg-rvu-accent hover:bg-orange-600 text-white text-xs font-mono font-bold uppercase transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>TRAILER</span>
            </a>
          )}

          {/* Title & Tagline in Overlay */}
          <div className="absolute bottom-4 left-4 right-32">
            <span className="px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider bg-rvu-ruby text-rose-100 mb-1.5 inline-block">
              RATING {movie.age_rating} • CAMPUS ARCHIVE
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white uppercase tracking-tight leading-tight">
              {movie.title}
            </h2>
            {movie.tagline && (
              <p className="text-xs text-slate-300 italic font-serif mt-0.5">
                "{movie.tagline}"
              </p>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {/* Metadata Badges (Sharp) */}
          <div className="flex flex-wrap gap-2 items-center text-xs font-mono">
            <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-slate-900 border border-slate-800 text-slate-300">
              <Clock className="w-3.5 h-3.5 text-rvu-accent" />
              <span>{movie.duration_mins} MIN ({Math.floor(movie.duration_mins / 60)}H {movie.duration_mins % 60}M)</span>
            </div>

            <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-slate-900 border border-slate-800 text-slate-300">
              <Tag className="w-3.5 h-3.5 text-amber-400" />
              <span>{movie.genre}</span>
            </div>

            <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-slate-900 border border-slate-800 text-slate-300">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>RVU STUDENT PASS ELIGIBLE</span>
            </div>
          </div>

          {/* Synopsis */}
          <div>
            <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 mb-1">
              ARCHIVE SYNOPSIS
            </h3>
            <p className="text-xs text-slate-200 leading-relaxed font-sans">
              {movie.description}
            </p>
          </div>

          {/* Action Buttons (Sharp) */}
          <div className="pt-3 border-t border-slate-900 flex items-center justify-end space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono font-bold uppercase text-slate-400 hover:text-white bg-slate-900 border border-slate-800"
            >
              CLOSE
            </button>
            <button
              onClick={() => {
                onSelectMovie(movie);
                onClose();
              }}
              className="px-5 py-2 text-xs font-mono font-bold uppercase text-white bg-rvu-accent hover:bg-orange-600 border border-rvu-accent transition-colors"
            >
              SELECT SHOWTIMES
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
