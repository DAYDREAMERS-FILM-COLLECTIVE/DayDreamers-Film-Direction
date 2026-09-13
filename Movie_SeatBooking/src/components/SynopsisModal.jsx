import React from 'react';
import { X, Play, Clock, Sparkles, Shield, Tag, Calendar } from 'lucide-react';

export function SynopsisModal({ movie, onClose, onSelectMovie }) {
  if (!movie) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-3xl overflow-hidden rounded-2xl bg-rvu-surface border border-slate-700/80 shadow-2xl shadow-black/80"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Backdrop Image Header */}
        <div className="relative h-64 sm:h-80 w-full overflow-hidden">
          <img 
            src={movie.backdrop_url || movie.poster_url} 
            alt={movie.title}
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-rvu-surface via-rvu-surface/60 to-transparent" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-slate-300 hover:text-white hover:bg-black/90 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Trailer Preview Badge */}
          {movie.trailer_url && (
            <a
              href={movie.trailer_url}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-6 right-6 flex items-center space-x-2 px-4 py-2 rounded-full bg-rvu-accent hover:bg-orange-600 text-white text-xs font-bold transition-all shadow-lg hover:scale-105"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Watch Trailer</span>
            </a>
          )}

          {/* Title & Tagline in Overlay */}
          <div className="absolute bottom-6 left-6 right-36">
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-rvu-ruby text-rose-100 mb-2 inline-block">
              {movie.age_rating} • CAMPUS SCREENING
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight drop-shadow">
              {movie.title}
            </h2>
            {movie.tagline && (
              <p className="text-xs sm:text-sm text-slate-300 italic font-serif mt-1">
                "{movie.tagline}"
              </p>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Metadata Badges */}
          <div className="flex flex-wrap gap-2.5 items-center text-xs">
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800/90 border border-slate-700 text-slate-300">
              <Clock className="w-3.5 h-3.5 text-rvu-accent" />
              <span>{movie.duration_mins} Minutes ({Math.floor(movie.duration_mins / 60)}h {movie.duration_mins % 60}m)</span>
            </div>

            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800/90 border border-slate-700 text-slate-300">
              <Tag className="w-3.5 h-3.5 text-amber-400" />
              <span>{movie.genre}</span>
            </div>

            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800/90 border border-slate-700 text-slate-300">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>RVU Student Entry Allowed</span>
            </div>
          </div>

          {/* Synopsis */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Synopsis
            </h3>
            <p className="text-sm text-slate-200 leading-relaxed">
              {movie.description}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold rounded-xl text-slate-400 hover:text-white bg-slate-900 border border-slate-800"
            >
              Close
            </button>
            <button
              onClick={() => {
                onSelectMovie(movie);
                onClose();
              }}
              className="px-6 py-2.5 text-xs font-bold rounded-xl text-white bg-gradient-to-r from-rvu-ruby to-rvu-accent hover:from-rose-700 hover:to-orange-600 shadow-lg shadow-rvu-accent/20 transition-all hover:scale-[1.02]"
            >
              Select Showtimes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
