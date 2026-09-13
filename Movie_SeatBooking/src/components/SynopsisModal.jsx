import React from 'react';
import { X, Clock, Calendar, Film, ShieldCheck } from 'lucide-react';

export function SynopsisModal({ movie, onClose, onSelectMovie }) {
  if (!movie) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-[#171513] border border-[#2a2622] p-6 sm:p-8 space-y-6 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-[#2a2622] pb-4">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-[#d83128] tracking-widest uppercase">
              RVU FILM PRODUCTION SOCIETY // DOSSIER
            </span>
            <h3 className="text-2xl font-serif font-bold text-[#eee9df] uppercase">
              {movie.title}
            </h3>
            {movie.tagline && (
              <p className="text-xs font-serif italic text-[#9f9b94]">
                "{movie.tagline}"
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#9f9b94] hover:text-white border border-transparent hover:border-[#2a2622] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Technical Attributes Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 bg-[#0e0d0c] border border-[#2a2622]">
            <span className="text-[10px] text-[#9f9b94] uppercase block">DURATION</span>
            <span className="font-bold text-[#eee9df]">
              {Math.floor(movie.duration_mins / 60)}h {movie.duration_mins % 60}m
            </span>
          </div>
          <div className="p-3 bg-[#0e0d0c] border border-[#2a2622]">
            <span className="text-[10px] text-[#9f9b94] uppercase block">RATING</span>
            <span className="font-bold text-[#eee9df]">{movie.age_rating}</span>
          </div>
          <div className="p-3 bg-[#0e0d0c] border border-[#2a2622]">
            <span className="text-[10px] text-[#9f9b94] uppercase block">GENRE</span>
            <span className="font-bold text-[#eee9df] truncate block">{movie.genre}</span>
          </div>
          <div className="p-3 bg-[#0e0d0c] border border-[#2a2622]">
            <span className="text-[10px] text-[#9f9b94] uppercase block">FORMAT</span>
            <span className="font-bold text-[#d83128]">35MM / 70MM</span>
          </div>
        </div>

        {/* Synopsis Narrative */}
        <div className="space-y-2">
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#9f9b94]">
            SYNOPSIS & CURATORIAL NOTE
          </h4>
          <p className="text-xs sm:text-sm text-[#eee9df] font-sans leading-relaxed">
            {movie.description}
          </p>
        </div>

        {/* Curatorial Compliance */}
        <div className="p-3 bg-[#0e0d0c] border border-[#2a2622] flex items-center space-x-2 text-[11px] font-sans text-[#9f9b94]">
          <ShieldCheck className="w-4 h-4 text-[#d83128] shrink-0" />
          <span>Authorized screening licensed for RV University students and faculty members.</span>
        </div>

        {/* Modal Actions */}
        <div className="pt-2 border-t border-[#2a2622] flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#0e0d0c] hover:bg-[#1e1b18] text-[#9f9b94] hover:text-[#eee9df] text-xs font-sans uppercase border border-[#2a2622] transition-colors"
          >
            CLOSE
          </button>
          <button
            onClick={() => onSelectMovie(movie)}
            className="px-5 py-2 bg-[#d83128] hover:bg-[#b8241c] text-white text-xs font-sans font-bold uppercase tracking-wider transition-colors border border-[#d83128]"
          >
            PROCEED TO SHOWTIMES
          </button>
        </div>
      </div>
    </div>
  );
}
