'use client';

import React, { useState } from 'react';
import { useBookingStore } from '@/store/useBookingStore';
import { confirmBookingAction } from '@/app/actions/booking';
import { Ticket, ShieldAlert, Loader2, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound } from '@/lib/audio';

interface CheckoutDrawerProps {
  showtimeId: string;
  clientSessionId: string;
  onLockSeats: () => Promise<boolean>;
  onBookingSuccess: () => void;
}

export const CheckoutDrawer: React.FC<CheckoutDrawerProps> = ({
  showtimeId,
  clientSessionId,
  onLockSeats,
  onBookingSuccess,
}) => {
  const selectedSeats = useBookingStore((s) => s.selectedSeats);
  const isHolding = useBookingStore((s) => s.isHolding);
  const setConfirmedTickets = useBookingStore((s) => s.setConfirmedTickets);

  const [email, setEmail] = useState('');
  const [usn, setUsn] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [locking, setLocking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLockAndProceed = async () => {
    setErrorMsg(null);
    setLocking(true);
    const success = await onLockSeats();
    setLocking(false);
    if (!success) {
      setErrorMsg('Failed to lock seats. They may have just been claimed.');
    }
  };

  const handleConfirmReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email || !usn) {
      setErrorMsg('Please enter your university email and student USN.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await confirmBookingAction({
        showtimeId,
        seatIds: selectedSeats,
        attendeeEmail: email,
        attendeeUsn: usn,
        sessionId: clientSessionId,
      });

      if (!res.success || !res.tickets) {
        setErrorMsg(res.error || 'Reservation could not be completed.');
        return;
      }

      sound.playShutterClick();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#C92A42', '#D4AF37', '#E8E3D9'],
      });

      setConfirmedTickets(res.tickets);
      onBookingSuccess();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Checkout transaction error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!selectedSeats.length) {
    return (
      <div className="text-center py-6 text-xs font-sans tracking-widest uppercase text-[#E8E3D9]/40">
        Click on up to 4 seats on the map to begin reservation
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto p-6 rounded-2xl bg-[#0c0f1d]/85 border border-white/[0.12] shadow-2xl backdrop-blur-2xl">
      {/* Header & Seat summary */}
      <div className="flex items-baseline justify-between pb-4 border-b border-white/[0.08] mb-5">
        <div>
          <span className="text-[10px] font-sans tracking-widest uppercase text-zinc-400 block mb-1">
            SELECTED SEATS
          </span>
          <span className="text-xl font-serif text-[#E8E3D9] tracking-wide">
            {selectedSeats.join(', ')}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-sans tracking-widest uppercase text-zinc-400 block mb-1">
            ADMISSION
          </span>
          <span className="text-sm font-sans tracking-wider text-[#D4AF37] font-semibold">
            100% FREE
          </span>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg bg-red-950/70 border border-red-500/40 text-red-300 text-xs font-sans mb-4 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0 text-[#C92A42]" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Step 1: Hold Seats */}
      {!isHolding ? (
        <button
          onClick={handleLockAndProceed}
          disabled={locking}
          className="w-full py-4 px-6 rounded-full font-sans text-xs tracking-widest uppercase font-semibold text-white bg-[#C92A42] hover:bg-[#C92A42]/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-xl"
        >
          {locking ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>ACQUIRING HOLD...</span>
            </>
          ) : (
            <>
              <span>Lock Seats & Proceed</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      ) : (
        /* Step 2: Attendee Form */
        <form onSubmit={handleConfirmReservation} className="space-y-4 text-xs font-sans">
          <div>
            <label className="text-[11px] tracking-wider uppercase text-[#E8E3D9]/70 block mb-1.5">
              University Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@university.edu"
              className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-[#E8E3D9] placeholder:text-zinc-600 focus:outline-none focus:border-[#C92A42] transition text-xs"
            />
          </div>

          <div>
            <label className="text-[11px] tracking-wider uppercase text-[#E8E3D9]/70 block mb-1.5">
              Student ID / USN
            </label>
            <input
              type="text"
              required
              value={usn}
              onChange={(e) => setUsn(e.target.value.toUpperCase())}
              placeholder="e.g. 1RV22CS001"
              className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-[#E8E3D9] placeholder:text-zinc-600 uppercase focus:outline-none focus:border-[#C92A42] transition text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 px-6 rounded-full font-sans text-xs tracking-widest uppercase font-semibold text-white bg-[#C92A42] hover:bg-[#C92A42]/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-xl"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>MINTING PASSES...</span>
              </>
            ) : (
              <>
                <Ticket className="w-4 h-4" />
                <span>Confirm Reservation</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
};
