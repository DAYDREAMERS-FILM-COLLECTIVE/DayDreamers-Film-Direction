import React, { useState } from 'react';
import { Play, Calendar, Clock, MapPin, X } from 'lucide-react';

export function HeroBanner({ featuredMovie, onReserveClick }) {
  const [showTrailerModal, setShowTrailerModal] = useState(false);

  if (!featuredMovie) return null;

  // Format trailer URL for embedded YouTube iframe
  const getEmbedUrl = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11
      ? `https://www.youtube.com/embed/${match[2]}?autoplay=1`
      : null;
  };

  const embedUrl = getEmbedUrl(featuredMovie.trailer_url);

  return (
    <div className="relative w-full border-b border-[#2a2622] overflow-hidden bg-[#0e0d0c]">
      {/* Film Backdrop with 35mm Vignette Overlay */}
      <div className="absolute inset-0">
        <img
          src={featuredMovie.backdrop_url || featuredMovie.poster_url}
          alt={featuredMovie.title}
          className="w-full h-full object-cover object-center opacity-30 filter grayscale contrast-125"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0e0d0c] via-[#0e0d0c]/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0e0d0c] via-[#0e0d0c]/80 to-transparent" />
      </div>

      {/* Hero Content (Playfair Display & DM Sans) */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-6">
        <div className="inline-flex items-center space-x-2 px-2.5 py-1 bg-[#171513] border border-[#2a2622] text-[10px] font-mono tracking-widest text-[#d83128] uppercase">
          <span>FEATURED CAMPUS 35MM SCREENING</span>
        </div>

        <div className="space-y-3 max-w-3xl">
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-serif font-bold text-[#eee9df] tracking-tight leading-none uppercase">
            {featuredMovie.title}
          </h1>
          {featuredMovie.tagline && (
            <p className="text-sm sm:text-base font-serif italic text-[#9f9b94]">
              "{featuredMovie.tagline}"
            </p>
          )}
          <p className="text-xs sm:text-sm text-[#9f9b94] font-sans leading-relaxed line-clamp-3 max-w-2xl">
            {featuredMovie.description}
          </p>
        </div>

        {/* Technical Film Metadata Badges (DM Mono) */}
        <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-[#9f9b94]">
          <span className="px-2 py-1 bg-[#171513] border border-[#2a2622] text-[#eee9df]">
            {featuredMovie.genre}
          </span>
          <span className="px-2 py-1 bg-[#171513] border border-[#2a2622] text-[#eee9df] flex items-center space-x-1">
            <Clock className="w-3 h-3 text-[#d83128]" />
            <span>
              {Math.floor(featuredMovie.duration_mins / 60)}h {featuredMovie.duration_mins % 60}m
            </span>
          </span>
          <span className="px-2 py-1 bg-[#171513] border border-[#2a2622] text-[#eee9df]">
            RATING {featuredMovie.age_rating}
          </span>
          <span className="px-2 py-1 bg-[#171513] border border-[#2a2622] text-[#eee9df] flex items-center space-x-1">
            <MapPin className="w-3 h-3 text-[#d83128]" />
            <span>CAMPUS AUDITORIUM 1 (MAIN STAGE)</span>
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={onReserveClick}
            className="px-6 py-3 bg-[#d83128] hover:bg-[#b8241c] text-white text-xs font-sans font-bold uppercase tracking-wider transition-colors border border-[#d83128] cursor-pointer"
          >
            RESERVE SEATS
          </button>

          {embedUrl && (
            <button
              onClick={() => setShowTrailerModal(true)}
              className="px-5 py-3 bg-[#171513] hover:bg-[#22201d] text-[#eee9df] text-xs font-sans font-medium uppercase tracking-wider transition-colors border border-[#2a2622] flex items-center space-x-2 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 text-[#d83128]" />
              <span>WATCH TRAILER</span>
            </button>
          )}
        </div>
      </div>

      {/* Embedded YouTube Trailer Modal */}
      {showTrailerModal && embedUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl bg-[#171513] border border-[#2a2622]">
            <div className="flex items-center justify-between p-3 border-b border-[#2a2622]">
              <span className="text-xs font-serif font-bold uppercase text-[#eee9df]">
                {featuredMovie.title} — Official Trailer
              </span>
              <button
                onClick={() => setShowTrailerModal(false)}
                className="p-1 text-[#9f9b94] hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="aspect-video w-full bg-black">
              <iframe
                src={embedUrl}
                title={`${featuredMovie.title} Trailer`}
                className="w-full h-full border-none"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
