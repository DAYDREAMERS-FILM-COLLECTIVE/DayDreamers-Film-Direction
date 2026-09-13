'use client';

import React, { useEffect, useState } from 'react';
import { useShowcaseStore } from '@/store/useShowcaseStore';
import { useBookingStore } from '@/store/useBookingStore';
import { useRealtimeSeats } from '@/hooks/useRealtimeSeats';
import { ParametricSeatMap } from './ParametricSeatMap';
import { CheckoutDrawer } from './CheckoutDrawer';
import { HoldTimerDock } from './HoldTimerDock';
import { TicketPass35mm } from './TicketPass35mm';
import { X, Film, Sparkles, Loader2 } from 'lucide-react';
import { sound } from '@/lib/audio';

export const BookingModal: React.FC = () => {
  const activeMovie = useShowcaseStore((s) => s.activeMovie);
  const selectedShowtime = useShowcaseStore((s) => s.selectedShowtime);
  const isTransitioningToBooking = useShowcaseStore((s) => s.isTransitioningToBooking);
  const isBookingOpen = useShowcaseStore((s) => s.isBookingOpen);
  const closeBooking = useShowcaseStore((s) => s.closeBooking);

  const selectedSeats = useBookingStore((s) => s.selectedSeats);
  const confirmedTickets = useBookingStore((s) => s.confirmedTickets);
  const setConfirmedTickets = useBookingStore((s) => s.setConfirmedTickets);
  const clearSelection = useBookingStore((s) => s.clearSelection);

  const [mounted, setMounted] = useState(false);

  const showtimeId = selectedShowtime?.id || activeMovie.showtimes[0]?.id || 'st-01';
  const { seats, loading, lockSeats, releaseSeats, clientSessionId } = useRealtimeSeats(showtimeId);

  // Trigger smooth reveal after lens zoom-in animation
  useEffect(() => {
    if (isTransitioningToBooking) {
      const timer = setTimeout(() => {
        useShowcaseStore.setState({ isBookingOpen: true, isTransitioningToBooking: false });
        setMounted(true);
      }, 700); // 700ms cinematic lens dive duration
      return () => clearTimeout(timer);
    }
  }, [isTransitioningToBooking]);

  const handleClose = () => {
    sound.playShutterClick();
    if (selectedSeats.length) {
      releaseSeats(selectedSeats);
    }
    clearSelection();
    setConfirmedTickets(null);
    setMounted(false);
    closeBooking();
  };

  const handleLockSeats = async (): Promise<boolean> => {
    const res = await lockSeats(selectedSeats);
    return res.success;
  };

  const handleHoldExpire = () => {
    clearSelection();
  };

  if (!isBookingOpen && !isTransitioningToBooking) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col justify-between overflow-y-auto transition-all duration-700 ${
        mounted
          ? 'bg-void/90 backdrop-blur-2xl opacity-100'
          : 'bg-black opacity-0'
      }`}
    >
      {/* Top Bar */}
      <div className="sticky top-0 z-20 px-6 py-4 flex items-center justify-between border-b border-white/10 bg-void/60 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded border border-white/20 flex items-center justify-center bg-surface">
            <Film className="w-4 h-4 text-neon-cyan" />
          </div>
          <div>
            <div className="text-xs font-mono text-white font-bold flex items-center gap-2">
              <span>{activeMovie.title}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-zinc-300">
                {selectedShowtime?.timeLabel || '19:00 IST'}
              </span>
            </div>
            <div className="text-[10px] font-mono text-zinc-400">
              {selectedShowtime?.venue || 'FPS Screening Auditorium'}
            </div>
          </div>
        </div>

        <button
          onClick={handleClose}
          className="p-2 rounded-full border border-white/20 hover:border-white text-zinc-400 hover:text-white transition bg-surface/80"
          title="Exit reservation"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Center Body */}
      <div className="flex-1 w-full max-w-5xl mx-auto px-6 py-8 flex flex-col justify-center items-center">
        {confirmedTickets ? (
          <TicketPass35mm tickets={confirmedTickets} onDone={handleClose} />
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4 font-mono text-xs text-zinc-400">
            <Loader2 className="w-8 h-8 text-neon-cyan animate-spin" />
            <span>CALIBRATING REALTIME SEAT MATRIX...</span>
          </div>
        ) : (
          <div className="w-full space-y-8">
            <div className="text-center space-y-1">
              <div className="inline-flex items-center gap-1.5 text-xs font-mono text-neon-cyan">
                <Sparkles className="w-3.5 h-3.5" />
                PARAMETRIC VENUE ALLOCATION
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white uppercase">
                RESERVE YOUR SCREENING PASS
              </h2>
            </div>

            {/* The Parametric SVG Seat Map */}
            <ParametricSeatMap seats={seats} clientSessionId={clientSessionId} />

            {/* The Checkout Drawer */}
            <CheckoutDrawer
              showtimeId={showtimeId}
              clientSessionId={clientSessionId}
              onLockSeats={handleLockSeats}
              onBookingSuccess={() => {}}
            />
          </div>
        )}
      </div>

      {/* Ephemeral Hold Countdown Dock */}
      <HoldTimerDock onExpire={handleHoldExpire} />
    </div>
  );
};
