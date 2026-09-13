'use client';

import React, { useState } from 'react';
import { useBookingStore } from '@/store/useBookingStore';
import { confirmBookingAction } from '@/app/actions/booking';
import { Ticket, User, Mail, ShieldAlert, Sparkles, Loader2 } from 'lucide-react';
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
      setErrorMsg('Failed to lock selected seats. They may have just been claimed by another guest.');
    }
  };

  const handleConfirmReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email || !usn) {
      setErrorMsg('Please provide both attendee email and student USN / ID.');
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
        setErrorMsg(res.error || 'Booking reservation could not be completed.');
        return;
      }

      // Success! Play sound, trigger confetti, update store
      sound.playShutterClick();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00f0ff', '#ff7a00', '#d946ef', '#ffffff'],
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
      <div className="p-4 rounded-xl bg-black/40 border border-white/5 text-center text-xs font-mono text-zinc-400">
        SELECT UP TO 4 SEATS ON THE ARCHITECTURAL MAP TO BEGIN RESERVATION
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto p-6 rounded-2xl bg-[#0b0e14]/90 border border-white/10 shadow-2xl backdrop-blur-xl">
      {/* Selection Summary */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4 text-xs font-mono">
        <div>
          <span className="text-zinc-400 block text-[10px]">SELECTED SEATS ({selectedSeats.length}/4)</span>
          <span className="text-base font-bold text-white tracking-wider">
            {selectedSeats.join(', ')}
          </span>
        </div>
        <div className="text-right">
          <span className="text-zinc-400 block text-[10px]">ADMISSION COST</span>
          <span className="text-emerald-400 text-base font-bold">100% FREE</span>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg bg-red-950/80 border border-red-500/50 text-red-300 text-xs font-mono mb-4 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Step 1: Lock Seats */}
      {!isHolding ? (
        <button
          onClick={handleLockAndProceed}
          disabled={locking}
          className="w-full py-3.5 px-6 rounded-xl font-mono text-xs tracking-wider uppercase font-bold text-black bg-neon-cyan hover:bg-neon-cyan/90 transition flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {locking ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>ACQUIRING ATOMIC SEAT LOCK...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>LOCK SEATS & PROCEED (5 MIN HOLD)</span>
            </>
          )}
        </button>
      ) : (
        /* Step 2: Attendee Details & Confirmation */
        <form onSubmit={handleConfirmReservation} className="space-y-4 text-xs font-mono">
          <div>
            <label className="text-zinc-400 flex items-center gap-1.5 mb-1 text-[11px]">
              <Mail className="w-3.5 h-3.5 text-neon-cyan" />
              ATTENDEE UNIVERSITY EMAIL
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@university.edu"
              className="w-full px-3.5 py-2.5 rounded-lg bg-black/60 border border-white/15 text-white placeholder:text-zinc-600 focus:outline-none focus:border-neon-cyan transition"
            />
          </div>

          <div>
            <label className="text-zinc-400 flex items-center gap-1.5 mb-1 text-[11px]">
              <User className="w-3.5 h-3.5 text-neon-cyan" />
              STUDENT ID / USN
            </label>
            <input
              type="text"
              required
              value={usn}
              onChange={(e) => setUsn(e.target.value.toUpperCase())}
              placeholder="e.g. 1RV22CS001"
              className="w-full px-3.5 py-2.5 rounded-lg bg-black/60 border border-white/15 text-white placeholder:text-zinc-600 uppercase focus:outline-none focus:border-neon-cyan transition"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 px-6 rounded-xl font-mono text-xs tracking-widest uppercase font-bold text-black bg-emerald-400 hover:bg-emerald-300 transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-emerald-500/20"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>MINTING CRYPTOGRAPHIC PASSES...</span>
              </>
            ) : (
              <>
                <Ticket className="w-4 h-4" />
                <span>CONFIRM FREE RESERVATION & ISSUE 35MM PASS</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
};
