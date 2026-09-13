'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { MOVIE_CATALOG, MovieItem } from '@/config/movies.schema';
import { useShowcaseStore } from '@/store/useShowcaseStore';
import { useBookingStore } from '@/store/useBookingStore';
import { useRealtimeSeats } from '@/hooks/useRealtimeSeats';
import { ParametricSeatMap } from '@/components/booking/ParametricSeatMap';
import { CheckoutDrawer } from '@/components/booking/CheckoutDrawer';
import { HoldTimerDock } from '@/components/booking/HoldTimerDock';
import { TicketPass35mm } from '@/components/booking/TicketPass35mm';
import { useDogstudioNavigate } from '@/hooks/useDogstudioNavigate';
import { ArrowLeft, Film, Sparkles, Loader2 } from 'lucide-react';
import { sound } from '@/lib/audio';

export default function FilmBookingPage() {
  const params = useParams();
  const filmId = (params?.id as string) || 'film-01';

  const movie: MovieItem =
    MOVIE_CATALOG.find((m) => m.id === filmId || m.slug === filmId) || MOVIE_CATALOG[0];

  const setActiveMovie = useShowcaseStore((s) => s.setActiveMovie);
  const selectedShowtime = useShowcaseStore((s) => s.selectedShowtime) || movie.showtimes[0];
  const setSelectedShowtime = useShowcaseStore((s) => s.setSelectedShowtime);

  const selectedSeats = useBookingStore((s) => s.selectedSeats);
  const confirmedTickets = useBookingStore((s) => s.confirmedTickets);
  const setConfirmedTickets = useBookingStore((s) => s.setConfirmedTickets);
  const clearSelection = useBookingStore((s) => s.clearSelection);

  const { navigateTo } = useDogstudioNavigate();
  const showtimeId = selectedShowtime?.id || movie.showtimes[0]?.id || 'st-01';

  const { seats, loading, lockSeats, releaseSeats, clientSessionId } = useRealtimeSeats(showtimeId);

  useEffect(() => {
    setActiveMovie(movie);
  }, [movie, setActiveMovie]);

  const handleReturn = () => {
    sound.playShutterClick();
    if (selectedSeats.length) {
      releaseSeats(selectedSeats);
    }
    clearSelection();
    setConfirmedTickets(null);
    navigateTo('/');
  };

  const handleLockSeats = async (): Promise<boolean> => {
    const res = await lockSeats(selectedSeats);
    return res.success;
  };

  return (
    <main className="relative min-h-screen pt-28 pb-20 px-6 md:px-16 flex flex-col justify-between">
      {/* Top Breadcrumb & Return Action */}
      <div className="max-w-5xl mx-auto w-full flex items-center justify-between pb-6 border-b border-white/[0.08]">
        <button
          onClick={handleReturn}
          className="px-4 py-2 rounded-lg border border-white/10 hover:border-white/30 text-xs font-mono text-[#E8E3D9] transition flex items-center gap-2 bg-[#0c0f1d]/70 backdrop-blur-md"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#C92A42]" />
          <span>RETURN TO SHOWCASE</span>
        </button>

        <div className="flex items-center gap-3 text-xs font-mono text-zinc-400">
          <span className="w-2 h-2 rounded-full bg-[#C92A42] animate-ping" />
          <span>LIVE RESERVATION CHANNEL</span>
        </div>
      </div>

      {/* Main Reservation Chamber */}
      <div className="flex-1 max-w-5xl mx-auto w-full py-10 flex flex-col items-center justify-center">
        {confirmedTickets ? (
          <TicketPass35mm tickets={confirmedTickets} onDone={handleReturn} />
        ) : (
          <div className="w-full space-y-8">
            {/* Editorial Heading */}
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 text-xs font-mono text-[#D4AF37] uppercase tracking-[0.2em]">
                <Sparkles className="w-3.5 h-3.5" />
                DOGSTUDIO PARAMETRIC SEAT ALLOCATION
              </div>
              <h1 className="text-3xl sm:text-5xl font-serif tracking-wide text-[#E8E3D9]">
                {movie.title}
              </h1>
              <p className="text-xs sm:text-sm font-mono text-zinc-400">
                {selectedShowtime.timeLabel} &bull; {selectedShowtime.venue} &bull; 100% FREE ADMISSION
              </p>

              {/* Showtime Pill Selector */}
              <div className="flex justify-center gap-2 pt-2">
                {movie.showtimes.map((st) => (
                  <button
                    key={st.id}
                    onClick={() => {
                      setSelectedShowtime(st);
                      sound.playShutterClick();
                    }}
                    className={`px-3 py-1.5 rounded text-xs font-mono border transition ${
                      selectedShowtime.id === st.id
                        ? 'border-[#C92A42] bg-[#C92A42]/20 text-[#E8E3D9]'
                        : 'border-white/10 text-zinc-400 hover:border-white/30'
                    }`}
                  >
                    {st.timeLabel}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-3 font-mono text-xs text-zinc-400">
                <Loader2 className="w-6 h-6 text-[#C92A42] animate-spin" />
                <span>RETRIEVING ATOMIC SEAT MATRIX...</span>
              </div>
            ) : (
              <>
                {/* Parametric SVG Curved Seating Chart */}
                <div className="p-6 rounded-2xl bg-[#0c0f1d]/75 border border-white/[0.08] backdrop-blur-xl shadow-2xl">
                  <ParametricSeatMap seats={seats} clientSessionId={clientSessionId} />
                </div>

                {/* Checkout Drawer with USN/Email verification */}
                <CheckoutDrawer
                  showtimeId={showtimeId}
                  clientSessionId={clientSessionId}
                  onLockSeats={handleLockSeats}
                  onBookingSuccess={() => {}}
                />
              </>
            )}
          </div>
        )}
      </div>

      {/* Ephemeral 5-minute atomic hold dock */}
      <HoldTimerDock onExpire={() => clearSelection()} />
    </main>
  );
}
