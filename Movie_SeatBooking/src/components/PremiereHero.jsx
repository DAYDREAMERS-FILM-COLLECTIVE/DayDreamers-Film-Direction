import React, { useState, useEffect } from 'react';
import { Play, Clock, MapPin, Calendar, Film, X, AlertCircle } from 'lucide-react';
import { fetchShowtimeAvailability } from '../lib/supabase.js';

export function PremiereHero({ movie, showtime, onEnterScreeningRoom }) {
  const [availability, setAvailability] = useState(null);
  const [showTrailer, setShowTrailer] = useState(false);

  useEffect(() => {
    if (!showtime?.id) return;

    let isMounted = true;
    async function loadAvail() {
      try {
        const data = await fetchShowtimeAvailability(showtime.id);
        if (isMounted) setAvailability(data);
      } catch (err) {
        console.warn('[PremiereHero] Fast availability check notice:', err.message);
      }
    }

    loadAvail();
    // Poll fast availability counter every 12 seconds on the homepage (Zero websocket overhead!)
    const interval = setInterval(loadAvail, 12000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [showtime?.id]);

  if (!movie || !showtime) return null;

  const hours = Math.floor(movie.duration_mins / 60);
  const mins = movie.duration_mins % 60;
  const isSoldOut = availability?.is_sold_out || availability?.available_seats === 0;

  // Format trailer embed URL
  const getEmbedUrl = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11
      ? `https://www.youtube.com/embed/${match[2]}?autoplay=1`
      : null;
  };
  const embedUrl = getEmbedUrl(movie.trailer_url);

  return (
    <div className="relative w-full min-h-[85vh] flex flex-col justify-center border-b border-[#2a2622] bg-[#11100f] overflow-hidden">
      {/* 1. Immersive 35mm Background with Film Grain and Vignette */}
      <div className="absolute inset-0">
        <img
          src={movie.backdrop_url || movie.poster_url}
          alt={movie.title}
          className="w-full h-full object-cover object-center opacity-30 filter grayscale contrast-125 scale-105 transition-transform duration-1000 ease-out"
        />
        {/* Film Grain & Dark Archival Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#11100f] via-[#11100f]/75 to-[#11100f]/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#11100f] via-[#11100f]/85 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(17,16,15,0.85)_100%)]" />
      </div>

      {/* 2. Hero Content Container */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-8 z-10">
        {/* Society Premiere Badge & Live Availability Pill */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-[#171513] border border-[#2a2622] text-[10px] font-mono tracking-widest text-[#d83128] uppercase">
            <span className="inline-block w-[18px] border-t border-current align-middle" />
            <span>MONTHLY CAMPUS PREMIERE DROP</span>
          </div>

          {/* Dynamic Live Availability Counter (Fast bail-out defender) */}
          <div
            className={`inline-flex items-center space-x-2 px-3 py-1 border text-[11px] font-mono font-bold tracking-wider uppercase transition-colors ${
              isSoldOut
                ? 'bg-[#1e1411] border-[#d83128] text-[#d83128]'
                : 'bg-[#171513] border-[#3a3530] text-[#eee9df]'
            }`}
          >
            <span
              className={`w-2 h-2 ${isSoldOut ? 'bg-[#d83128]' : 'bg-[#10b981] animate-pulse'}`}
            />
            <span>
              {availability
                ? isSoldOut
                  ? '[ SOLD OUT // ALL 50 SEATS CLAIMED ]'
                  : `[ ${availability.available_seats} / 50 SEATS REMAINING ]`
                : '[ 50 SEATS TOTAL // VERIFYING... ]'}
            </span>
          </div>
        </div>

        {/* Premiere Film Title & Curatorial Subtitle */}
        <div className="space-y-4 max-w-3xl">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-serif font-black text-[#eee9df] tracking-tight leading-none uppercase">
            {movie.title}
          </h1>

          {movie.tagline && (
            <p className="text-base sm:text-lg font-serif italic text-[#9f9b94]">
              "{movie.tagline}"
            </p>
          )}

          <p className="text-xs sm:text-sm text-[#9f9b94] font-sans leading-relaxed max-w-2xl">
            {movie.description}
          </p>
        </div>

        {/* Screening Meta Specs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl text-xs font-mono">
          <div className="p-3 bg-[#171513] border border-[#2a2622]">
            <span className="text-[10px] text-[#9f9b94] uppercase flex items-center space-x-1">
              <Calendar className="w-3 h-3 text-[#d83128]" />
              <span>DATE & TIME</span>
            </span>
            <span className="font-bold text-[#eee9df] block mt-1">
              {new Date(showtime.start_time).toLocaleDateString('en-IN', {
                month: 'short',
                day: 'numeric',
                weekday: 'short',
              })}{' '}
              at{' '}
              {new Date(showtime.start_time).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              })}
            </span>
          </div>

          <div className="p-3 bg-[#171513] border border-[#2a2622]">
            <span className="text-[10px] text-[#9f9b94] uppercase flex items-center space-x-1">
              <MapPin className="w-3 h-3 text-[#d83128]" />
              <span>VENUE</span>
            </span>
            <span className="font-bold text-[#eee9df] block mt-1 truncate">
              {showtime.auditorium_name}
            </span>
          </div>

          <div className="p-3 bg-[#171513] border border-[#2a2622]">
            <span className="text-[10px] text-[#9f9b94] uppercase flex items-center space-x-1">
              <Clock className="w-3 h-3 text-[#d83128]" />
              <span>RUNTIME</span>
            </span>
            <span className="font-bold text-[#eee9df] block mt-1">
              {hours}h {mins}m • RATING {movie.age_rating}
            </span>
          </div>

          <div className="p-3 bg-[#171513] border border-[#2a2622]">
            <span className="text-[10px] text-[#9f9b94] uppercase flex items-center space-x-1">
              <Film className="w-3 h-3 text-[#d83128]" />
              <span>PRINT FORMAT</span>
            </span>
            <span className="font-bold text-[#d83128] block mt-1">
              35MM REEL ARCHIVE
            </span>
          </div>
        </div>

        {/* Primary & Secondary CTAs */}
        <div className="flex flex-wrap items-center gap-4 pt-2">
          <button
            onClick={onEnterScreeningRoom}
            disabled={isSoldOut}
            className={`px-8 py-4 text-xs sm:text-sm font-sans font-bold uppercase tracking-widest border transition-all flex items-center space-x-2 shadow-2xl cursor-pointer ${
              isSoldOut
                ? 'bg-[#171513] text-[#64748b] border-[#2a2622] cursor-not-allowed'
                : 'bg-[#d83128] hover:bg-[#b8241c] text-white border-[#d83128] hover:shadow-[0_0_25px_rgba(216,49,40,0.4)]'
            }`}
          >
            <span>{isSoldOut ? 'PREMIERE AT CAPACITY' : 'ENTER SCREENING ROOM'}</span>
            <span className="font-mono">→</span>
          </button>

          {embedUrl && (
            <button
              onClick={() => setShowTrailer(true)}
              className="px-6 py-4 bg-[#171513] hover:bg-[#22201d] text-[#eee9df] text-xs font-sans font-medium uppercase tracking-wider transition-colors border border-[#2a2622] flex items-center space-x-2 cursor-pointer"
            >
              <Play className="w-4 h-4 text-[#d83128]" />
              <span>WATCH ARCHIVAL TRAILER</span>
            </button>
          )}
        </div>
      </div>

      {/* Trailer Modal */}
      {showTrailer && embedUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl bg-[#171513] border border-[#2a2622]">
            <div className="flex items-center justify-between p-3 border-b border-[#2a2622]">
              <span className="text-xs font-serif font-bold uppercase text-[#eee9df]">
                {movie.title} — Official Trailer
              </span>
              <button
                onClick={() => setShowTrailer(false)}
                className="p-1 text-[#9f9b94] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="aspect-video w-full bg-black">
              <iframe
                src={embedUrl}
                title={`${movie.title} Trailer`}
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
