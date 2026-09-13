import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  fetchSeats,
  acquireSeatLocks,
  releaseSeatLocks,
  subscribeToSeats,
} from '../lib/supabase.js';
import {
  Armchair,
  Clock,
  AlertTriangle,
  Users,
  User,
  ShieldCheck,
  ChevronLeft,
  ArrowRight,
  Info,
  RefreshCw,
} from 'lucide-react';

const HOLD_DURATION_SECONDS = 300; // 5 minutes

export function SeatGrid({
  movie,
  showtime,
  sessionId,
  bookingMode,
  setBookingMode,
  selectedSeats,
  setSelectedSeats,
  onProceedToCheckout,
  onBack,
}) {
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locking, setLocking] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState(0); // Countdown seconds
  const [isSyncing, setIsSyncing] = useState(false);

  const timerRef = useRef(null);
  const selectedSeatsRef = useRef(selectedSeats);
  selectedSeatsRef.current = selectedSeats;

  // Max seats allowed based on mode
  const maxSeats = bookingMode === 'individual' ? 1 : 4;

  // Load seats from Supabase RPC
  const loadSeatMap = useCallback(async (quiet = false) => {
    if (!showtime?.id) return;
    if (!quiet) setLoading(true);
    else setIsSyncing(true);

    try {
      const res = await fetchSeats(showtime.id, sessionId);
      if (res.data) {
        setSeats(res.data);
      }
    } catch (err) {
      console.error('[SeatGrid] Error fetching seats:', err);
    } finally {
      if (!quiet) setLoading(false);
      else setIsSyncing(false);
    }
  }, [showtime?.id, sessionId]);

  // Initial load + Realtime Channel subscription
  useEffect(() => {
    loadSeatMap();

    // Subscribe to Postgres Realtime changes on seats table
    const unsubscribe = subscribeToSeats(showtime.id, (payload) => {
      // Re-fetch or patch local state on real-time event
      loadSeatMap(true);
    });

    // Lazy expiration poll every 10 seconds to catch expired holds from others
    const pollInterval = setInterval(() => {
      loadSeatMap(true);
    }, 10000);

    return () => {
      unsubscribe();
      clearInterval(pollInterval);
    };
  }, [showtime.id, loadSeatMap]);

  // Manage 5-minute countdown hold timer
  useEffect(() => {
    if (selectedSeats.length > 0) {
      // If timer is not already ticking, initialize to 5 minutes
      if (timeLeft <= 0) {
        setTimeLeft(HOLD_DURATION_SECONDS);
      }

      if (timerRef.current) clearInterval(timerRef.current);

      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleHoldExpired();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      // No seats selected, reset timer
      if (timerRef.current) clearInterval(timerRef.current);
      setTimeLeft(0);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [selectedSeats.length]);

  // Auto-release seats on window beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (selectedSeatsRef.current.length > 0) {
        const seatIds = selectedSeatsRef.current.map((s) => s.id);
        releaseSeatLocks(seatIds, sessionId);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [sessionId]);

  // Hold expired handler
  const handleHoldExpired = async () => {
    const seatIds = selectedSeatsRef.current.map((s) => s.id);
    if (seatIds.length > 0) {
      await releaseSeatLocks(seatIds, sessionId);
      setSelectedSeats([]);
      setErrorMessage('Your 5-minute seat reservation has expired. Please select your seats again.');
      loadSeatMap(true);
    }
  };

  // Seat click handler
  const handleSeatClick = async (seat) => {
    setErrorMessage('');

    // If booked, do nothing
    if (seat.effective_status === 'booked') return;

    // If locked by another student, do nothing
    if (seat.effective_status === 'locked_by_other') {
      setErrorMessage(`Seat ${seat.row_label}${seat.col_number} is currently held by another student.`);
      return;
    }

    const isAlreadySelected = selectedSeats.some((s) => s.id === seat.id);

    if (isAlreadySelected) {
      // User is deselecting this seat
      setLocking(true);
      try {
        await releaseSeatLocks([seat.id], sessionId);
        const updated = selectedSeats.filter((s) => s.id !== seat.id);
        setSelectedSeats(updated);
        // Optimistic local update
        setSeats((prev) =>
          prev.map((s) =>
            s.id === seat.id
              ? { ...s, effective_status: 'available', is_my_lock: false }
              : s
          )
        );
      } catch (err) {
        console.error('[SeatGrid] Release error:', err);
      } finally {
        setLocking(false);
      }
      return;
    }

    // Checking max quota
    if (selectedSeats.length >= maxSeats) {
      if (bookingMode === 'individual') {
        // In individual mode, replace current seat
        const currentSeatId = selectedSeats[0].id;
        setLocking(true);
        try {
          await releaseSeatLocks([currentSeatId], sessionId);
          const lockRes = await acquireSeatLocks(showtime.id, [seat.id], sessionId, HOLD_DURATION_SECONDS);

          if (lockRes && lockRes.success) {
            setSelectedSeats([seat]);
            setTimeLeft(HOLD_DURATION_SECONDS);
            loadSeatMap(true);
          } else {
            setErrorMessage(lockRes?.error || 'Could not lock seat. It may have just been claimed.');
            loadSeatMap(true);
          }
        } catch (err) {
          console.error('[SeatGrid] Swap error:', err);
        } finally {
          setLocking(false);
        }
        return;
      } else {
        setErrorMessage(`Group booking limit reached (Maximum 4 seats per student).`);
        return;
      }
    }

    // Attempting to lock new seat
    setLocking(true);
    try {
      const candidateIds = [...selectedSeats.map((s) => s.id), seat.id];
      const lockRes = await acquireSeatLocks(
        showtime.id,
        candidateIds,
        sessionId,
        HOLD_DURATION_SECONDS
      );

      if (lockRes && lockRes.success) {
        setSelectedSeats([...selectedSeats, seat]);
        setTimeLeft(HOLD_DURATION_SECONDS);
        // Optimistic local update
        setSeats((prev) =>
          prev.map((s) =>
            s.id === seat.id
              ? { ...s, effective_status: 'selected_by_me', is_my_lock: true }
              : s
          )
        );
      } else {
        setErrorMessage(lockRes?.error || 'Could not reserve seat. Please try another seat.');
        loadSeatMap(true);
      }
    } catch (err) {
      console.error('[SeatGrid] Lock error:', err);
      setErrorMessage('Network error while securing seat lock.');
    } finally {
      setLocking(false);
    }
  };

  // Change booking mode
  const handleModeSwitch = async (newMode) => {
    if (newMode === bookingMode) return;

    if (newMode === 'individual' && selectedSeats.length > 1) {
      // Keep only first seat and release the rest
      const keep = selectedSeats.slice(0, 1);
      const toRelease = selectedSeats.slice(1).map((s) => s.id);
      await releaseSeatLocks(toRelease, sessionId);
      setSelectedSeats(keep);
      loadSeatMap(true);
    }

    setBookingMode(newMode);
    setErrorMessage('');
  };

  // Manual release all
  const handleReleaseAll = async () => {
    if (selectedSeats.length === 0) return;
    setLocking(true);
    try {
      const seatIds = selectedSeats.map((s) => s.id);
      await releaseSeatLocks(seatIds, sessionId);
      setSelectedSeats([]);
      setTimeLeft(0);
      loadSeatMap(true);
    } finally {
      setLocking(false);
    }
  };

  // Group seats by row (Rows A through G)
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const seatsByRow = rows.reduce((acc, row) => {
    acc[row] = seats.filter((s) => s.row_label === row).sort((a, b) => a.col_number - b.col_number);
    return acc;
  }, {});

  // Pricing calculations
  const totalPrice = selectedSeats.reduce((sum, s) => {
    const price = s.seat_tier === 'vip' ? showtime.price_vip : showtime.price_regular;
    return sum + Number(price);
  }, 0);

  // Format timer MM:SS
  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Header Bar with Back Navigation and Mode Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-950 border border-slate-800">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Return to Showtimes"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="text-[10px] font-mono text-rvu-accent font-bold uppercase tracking-widest">
              STEP 2: SEAT RESERVATION
            </div>
            <h2 className="text-base font-bold font-mono uppercase text-white tracking-wide">
              {movie.title} • {showtime.auditorium_name}
            </h2>
          </div>
        </div>

        {/* Individual vs Group Mode Switcher (Sharp, Rectilinear) */}
        <div className="flex items-center space-x-2 bg-slate-900 p-1 border border-slate-800">
          <button
            onClick={() => handleModeSwitch('individual')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider transition-colors ${
              bookingMode === 'individual'
                ? 'bg-rvu-accent text-white border border-rvu-accent'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Individual (1 Seat)</span>
          </button>

          <button
            onClick={() => handleModeSwitch('group')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider transition-colors ${
              bookingMode === 'group'
                ? 'bg-rvu-accent text-white border border-rvu-accent'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Group (2–4 Seats)</span>
          </button>
        </div>
      </div>

      {/* Error / Conflict Alert */}
      {errorMessage && (
        <div className="p-3 bg-amber-950/80 border border-amber-500/80 text-amber-200 flex items-start space-x-2.5 text-xs font-mono">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold uppercase">RESERVATION ALERT: </span>
            {errorMessage}
          </div>
          <button
            onClick={() => setErrorMessage('')}
            className="text-amber-400 hover:text-amber-100 uppercase font-bold text-[10px]"
          >
            DISMISS
          </button>
        </div>
      )}

      {/* Cinema Seating Map Container */}
      <div className="bg-slate-950 border border-slate-800 p-6 sm:p-8 space-y-8">
        {/* Projection Screen Banner (Sharp perspective arch, subtle glow) */}
        <div className="relative max-w-2xl mx-auto text-center space-y-2">
          <div className="h-2 w-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_20px_rgba(34,211,238,0.4)]" />
          <div className="py-1 px-4 bg-slate-900/90 border border-slate-800 inline-block text-[10px] font-mono uppercase tracking-widest text-slate-400">
            CAMPUS AUDITORIUM PROJECTION SCREEN • ALL EYES THIS WAY
          </div>
        </div>

        {/* Legend (Sharp, Minimalist) */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-2 text-[11px] font-mono uppercase">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 bg-slate-900 border border-slate-700" />
            <span className="text-slate-400">Available Regular (₹{showtime.price_regular})</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 bg-purple-950/40 border border-purple-600/80" />
            <span className="text-purple-300">Available VIP (₹{showtime.price_vip})</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 bg-emerald-600 border border-emerald-400" />
            <span className="text-emerald-400 font-bold">Selected By You</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 bg-amber-950/60 border border-amber-500 animate-pulse" />
            <span className="text-amber-400">Locked By Other Student</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 bg-slate-900/60 border border-slate-800 text-slate-600 flex items-center justify-center font-bold text-[9px] line-through">
              X
            </div>
            <span className="text-slate-600">Booked</span>
          </div>
        </div>

        {/* Interactive Grid (7 Rows x 10 Columns Continuous Tiered Block) */}
        {loading ? (
          <div className="py-20 text-center space-y-2">
            <div className="w-6 h-6 border-2 border-rvu-accent border-t-transparent animate-spin mx-auto" />
            <p className="text-xs text-slate-400 font-mono uppercase">Syncing auditorium seat layout...</p>
          </div>
        ) : (
          <div className="overflow-x-auto pb-4">
            <div className="min-w-[580px] max-w-2xl mx-auto space-y-2.5">
              {/* Column numbers header */}
              <div className="flex items-center space-x-2 px-8">
                <div className="w-6 text-center text-[10px] font-mono text-slate-600 font-bold"></div>
                <div className="flex-1 grid grid-cols-10 gap-2 text-center text-[10px] font-mono text-slate-500 font-bold">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((col) => (
                    <span key={col}>{col}</span>
                  ))}
                </div>
              </div>

              {/* Rows A through G */}
              {rows.map((rowLabel) => {
                const rowSeats = seatsByRow[rowLabel] || [];
                const isVipRow = rowLabel === 'F' || rowLabel === 'G';

                return (
                  <div key={rowLabel} className="flex items-center space-x-2 px-8">
                    {/* Row Label */}
                    <div
                      className={`w-6 text-center text-xs font-mono font-bold ${
                        isVipRow ? 'text-purple-400' : 'text-slate-400'
                      }`}
                    >
                      {rowLabel}
                    </div>

                    {/* 10 Seats Continuous Block */}
                    <div className="flex-1 grid grid-cols-10 gap-2">
                      {rowSeats.map((seat) => {
                        const isSelectedByMe = seat.effective_status === 'selected_by_me';
                        const isLockedByOther = seat.effective_status === 'locked_by_other';
                        const isBooked = seat.effective_status === 'booked';
                        const isVip = seat.seat_tier === 'vip';

                        let seatStyles = '';
                        if (isBooked) {
                          seatStyles = 'bg-slate-900/60 border-slate-800 text-slate-600 cursor-not-allowed';
                        } else if (isLockedByOther) {
                          seatStyles =
                            'bg-amber-950/60 border-amber-500 text-amber-300 animate-pulse cursor-not-allowed';
                        } else if (isSelectedByMe) {
                          seatStyles =
                            'bg-emerald-600 border-emerald-400 text-white font-bold shadow-[0_0_12px_rgba(16,185,129,0.5)]';
                        } else if (isVip) {
                          seatStyles =
                            'bg-purple-950/40 border-purple-700/80 text-purple-200 hover:bg-purple-900/60 hover:border-purple-400 cursor-pointer';
                        } else {
                          seatStyles =
                            'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-400 cursor-pointer';
                        }

                        return (
                          <button
                            key={seat.id}
                            disabled={isBooked || isLockedByOther || locking}
                            onClick={() => handleSeatClick(seat)}
                            title={`${seat.row_label}${seat.col_number} • ${
                              isVip ? 'VIP ₹' + showtime.price_vip : 'REGULAR ₹' + showtime.price_regular
                            } • ${seat.effective_status.toUpperCase()}`}
                            className={`h-9 w-full border font-mono text-[11px] font-bold flex flex-col items-center justify-center transition-all ${seatStyles}`}
                          >
                            <span>{seat.col_number}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tier Division Annotation */}
        <div className="pt-2 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-slate-500 gap-2">
          <div>ROWS A–E: REGULAR TIER (₹{showtime.price_regular})</div>
          <div className="flex items-center space-x-2">
            {isSyncing && (
              <span className="flex items-center space-x-1 text-rvu-accent">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>SYNCING LIVE</span>
              </span>
            )}
            <span className="text-purple-400 font-bold">ROWS F–G: VIP TIER (₹{showtime.price_vip})</span>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Dock (5-minute atomic hold lock timer & checkout trigger) */}
      <div className="sticky bottom-4 z-40 bg-slate-950 border-2 border-rvu-accent shadow-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Left: Selected seats summary & countdown */}
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
              SEATS SELECTED ({selectedSeats.length}/{maxSeats}):
            </span>
            {selectedSeats.length > 0 ? (
              <div className="flex items-center space-x-1.5 flex-wrap">
                {selectedSeats.map((s) => (
                  <span
                    key={s.id}
                    className={`px-2 py-0.5 text-xs font-mono font-bold border ${
                      s.seat_tier === 'vip'
                        ? 'bg-purple-950 border-purple-600 text-purple-300'
                        : 'bg-emerald-950 border-emerald-600 text-emerald-300'
                    }`}
                  >
                    {s.row_label}{s.col_number}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-xs font-mono text-slate-500 italic">Click on available seats above</span>
            )}
          </div>

          {/* Hold Countdown Timer */}
          {selectedSeats.length > 0 && (
            <div className="flex items-center space-x-2 text-xs font-mono">
              <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span className="text-slate-400 uppercase">HOLD TIMER:</span>
              <span
                className={`font-bold tracking-widest ${
                  timeLeft <= 60 ? 'text-red-400 animate-pulse' : 'text-amber-400'
                }`}
              >
                {formatTimer(timeLeft)}
              </span>
              <span className="text-[10px] text-slate-500">(Auto-releases at 00:00)</span>
            </div>
          )}
        </div>

        {/* Right: Total amount and Checkout Action */}
        <div className="flex items-center space-x-4 w-full sm:w-auto justify-between sm:justify-end">
          {selectedSeats.length > 0 && (
            <div className="text-right">
              <div className="text-[10px] font-mono text-slate-400 uppercase">TOTAL AMOUNT</div>
              <div className="text-lg font-mono font-extrabold text-white">₹{totalPrice}</div>
            </div>
          )}

          <div className="flex items-center space-x-2">
            {selectedSeats.length > 0 && (
              <button
                onClick={handleReleaseAll}
                disabled={locking}
                className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-mono font-bold uppercase border border-slate-700 transition-colors"
                title="Release current seat reservations"
              >
                RELEASE
              </button>
            )}

            <button
              disabled={selectedSeats.length === 0 || locking}
              onClick={onProceedToCheckout}
              className={`px-5 py-2.5 text-xs font-mono font-bold uppercase tracking-wider border flex items-center space-x-2 transition-all ${
                selectedSeats.length > 0
                  ? 'bg-rvu-accent hover:bg-orange-600 text-white border-rvu-accent shadow-[0_0_15px_rgba(255,107,0,0.4)] cursor-pointer'
                  : 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
              }`}
            >
              <span>PROCEED TO STUDENT DETAILS</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
