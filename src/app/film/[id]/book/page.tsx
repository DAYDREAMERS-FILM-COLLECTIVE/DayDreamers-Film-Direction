'use client';

import React, { useEffect } from 'react';
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
import { ArrowLeft, Loader2 } from 'lucide-react';
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
    <main className="relative min-h-screen pt-24 pb-24 px-6 md:px-12 flex flex-col justify-between">
      {/* Editorial Top Bar */}
      <div className="max-w-6xl mx-auto w-full flex items-center justify-between pb-6 border-b border-white/[0.06]">
        <button
          onClick={handleReturn}
          className="group flex items-center gap-2 text-xs font-sans tracking-widest uppercase text-[#E8E3D9]/70 hover:text-[#E8E3D9] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform text-[#C92A42]" />
          <span>Back to Archive</span>
        </button>

        <div className="text-right">
          <h2 className="font-serif text-xl tracking-tight text-[#E8E3D9]">
            {movie.title}
          </h2>
          <span className="text-[11px] font-sans tracking-wider text-[#D4AF37] block">
            {selectedShowtime.timeLabel} &bull; {selectedShowtime.venue}
          </span>
        </div>
      </div>

      {/* Main Seating Chamber */}
      <div className="flex-1 max-w-6xl mx-auto w-full py-8 flex flex-col items-center justify-center">
        {confirmedTickets ? (
          <TicketPass35mm tickets={confirmedTickets} onDone={handleReturn} />
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-28 space-y-4 font-sans text-xs text-[#E8E3D9]/50">
            <Loader2 className="w-6 h-6 text-[#C92A42] animate-spin" />
            <span className="tracking-widest uppercase">Loading Seating Matrix...</span>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center space-y-8">
            {/* Massive Curved Seating Grid (65-75% Viewport Width) */}
            <div className="w-full flex justify-center">
              <ParametricSeatMap seats={seats} clientSessionId={clientSessionId} />
            </div>

            {/* Docked Floating Glassmorphism Checkout Card */}
            <div className="w-full flex justify-center">
              <CheckoutDrawer
                showtimeId={showtimeId}
                clientSessionId={clientSessionId}
                onLockSeats={handleLockSeats}
                onBookingSuccess={() => {}}
              />
            </div>
          </div>
        )}
      </div>

      {/* Ephemeral 5-minute atomic hold dock */}
      <HoldTimerDock onExpire={() => clearSelection()} />
    </main>
  );
}
