import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  fetchSeats,
  acquireSeatLocks,
  releaseSeatLocks,
  subscribeToSeats,
} from '../lib/supabase.js';
import {
  Clock,
  AlertTriangle,
  Users,
  User,
  ChevronLeft,
  ArrowRight,
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
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const timerRef = useRef(null);
  const selectedSeatsRef = useRef(selectedSeats);
  selectedSeatsRef.current = selectedSeats;

  // Max quota per mode
  const maxSeats = bookingMode === 'individual' ? 1 : 4;

  // Load seats directly from Supabase RPC
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
      console.error('[SeatGrid] Supabase error fetching seats:', err);
      setErrorMessage('Unable to connect to live Supabase seating service.');
    } finally {
      if (!quiet) setLoading(false);
      else setIsSyncing(false);
    }
  }, [showtime?.id, sessionId]);

  // Initial load + Realtime Channel subscription
  useEffect(() => {
    loadSeatMap();

    const unsubscribe = subscribeToSeats(showtime.id, () => {
      loadSeatMap(true);
    });

    const pollInterval = setInterval(() => {
      loadSeatMap(true);
    }, 8000);

    return () => {
      unsubscribe();
      clearInterval(pollInterval);
    };
  }, [showtime.id, loadSeatMap]);

  // Manage 5-minute countdown hold timer
  useEffect(() => {
    if (selectedSeats.length > 0) {
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

  const handleHoldExpired = async () => {
    const seatIds = selectedSeatsRef.current.map((s) => s.id);
    if (seatIds.length > 0) {
      await releaseSeatLocks(seatIds, sessionId);
      setSelectedSeats([]);
      setErrorMessage('Your 5-minute seat reservation has expired. Please reselect your seats.');
      loadSeatMap(true);
    }
  };

  // Seat click handler
  const handleSeatClick = async (seat) => {
    setErrorMessage('');

    if (seat.effective_status === 'booked') return;

    if (seat.effective_status === 'locked_by_other') {
      setErrorMessage(`Seat ${seat.row_label}${seat.col_number} is held by another attendee.`);
      return;
    }

    const isAlreadySelected = selectedSeats.some((s) => s.id === seat.id);

    if (isAlreadySelected) {
      setLocking(true);
      try {
        await releaseSeatLocks([seat.id], sessionId);
        const updated = selectedSeats.filter((s) => s.id !== seat.id);
        setSelectedSeats(updated);
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

    if (selectedSeats.length >= maxSeats) {
      if (bookingMode === 'individual') {
        const currentSeatId = selectedSeats[0].id;
        setLocking(true);
        try {
          await releaseSeatLocks([currentSeatId], sessionId);
          const lockRes = await acquireSeatLocks(
            showtime.id,
            [seat.id],
            sessionId,
            HOLD_DURATION_SECONDS
          );

          if (lockRes && lockRes.success) {
            setSelectedSeats([seat]);
            setTimeLeft(HOLD_DURATION_SECONDS);
            loadSeatMap(true);
          } else {
            setErrorMessage(lockRes?.error || 'Could not acquire lock on seat.');
            loadSeatMap(true);
          }
        } catch (err) {
          console.error('[SeatGrid] Swap error:', err);
        } finally {
          setLocking(false);
        }
        return;
      } else {
        setErrorMessage('Group quota limit reached (Maximum 4 seats per reservation).');
        return;
      }
    }

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
        setSeats((prev) =>
          prev.map((s) =>
            s.id === seat.id
              ? { ...s, effective_status: 'selected_by_me', is_my_lock: true }
              : s
          )
        );
      } else {
        setErrorMessage(lockRes?.error || 'Could not reserve seat. It may have just been claimed.');
        loadSeatMap(true);
      }
    } catch (err) {
      console.error('[SeatGrid] Lock error:', err);
      setErrorMessage('Network error communicating with live Supabase database.');
    } finally {
      setLocking(false);
    }
  };

  const handleModeSwitch = async (newMode) => {
    if (newMode === bookingMode) return;

    if (newMode === 'individual' && selectedSeats.length > 1) {
      const keep = selectedSeats.slice(0, 1);
      const toRelease = selectedSeats.slice(1).map((s) => s.id);
      await releaseSeatLocks(toRelease, sessionId);
      setSelectedSeats(keep);
      loadSeatMap(true);
    }

    setBookingMode(newMode);
    setErrorMessage('');
  };

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

  // 5 Rows: A, B, C, D, E
  const rows = ['A', 'B', 'C', 'D', 'E'];
  const seatsByRow = rows.reduce((acc, row) => {
    acc[row] = seats.filter((s) => s.row_label === row).sort((a, b) => a.col_number - b.col_number);
    return acc;
  }, {});

  const totalPrice = selectedSeats.reduce((sum, s) => {
    const price = s.seat_tier === 'vip' ? showtime.price_vip : showtime.price_regular;
    return sum + Number(price);
  }, 0);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Bar with Mode Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-[#171513] border border-[#2a2622]">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 bg-[#0e0d0c] hover:bg-[#1e1b18] border border-[#2a2622] text-[#9f9b94] hover:text-[#eee9df] transition-colors"
            title="Return to Schedule"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div>
            <span className="text-[10px] font-mono tracking-widest text-[#d83128] uppercase block">
              SEATING ALLOCATION
            </span>
            <h2 className="text-lg font-serif font-bold text-[#eee9df] uppercase">
              {movie.title} • {showtime.auditorium_name}
            </h2>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center space-x-1 bg-[#0e0d0c] p-1 border border-[#2a2622]">
          <button
            onClick={() => handleModeSwitch('individual')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-sans font-medium uppercase tracking-wider transition-colors ${
              bookingMode === 'individual'
                ? 'bg-[#d83128] text-white'
                : 'text-[#9f9b94] hover:text-[#eee9df]'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Individual (1 Seat)</span>
          </button>

          <button
            onClick={() => handleModeSwitch('group')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-sans font-medium uppercase tracking-wider transition-colors ${
              bookingMode === 'group'
                ? 'bg-[#d83128] text-white'
                : 'text-[#9f9b94] hover:text-[#eee9df]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Group (2–4 Seats)</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3 bg-[#1e1411] border border-[#d83128]/70 text-[#eee9df] flex items-start space-x-2.5 text-xs font-sans">
          <AlertTriangle className="w-4 h-4 text-[#d83128] shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold text-[#d83128] uppercase font-mono mr-1">NOTICE:</span>
            {errorMessage}
          </div>
          <button
            onClick={() => setErrorMessage('')}
            className="text-[#9f9b94] hover:text-white uppercase font-mono text-[10px]"
          >
            DISMISS
          </button>
        </div>
      )}

      {/* Seating Container */}
      <div className="bg-[#171513] border border-[#2a2622] p-6 sm:p-10 space-y-10">
        {/* Soft Curved Acoustic Screen Banner with Top-Down Lighting */}
        <div className="relative max-w-xl mx-auto text-center space-y-3">
          <div className="relative">
            {/* Top-down subtle white radial glow */}
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-3/4 h-12 bg-white/10 blur-xl pointer-events-none" />
            {/* Curved acoustic bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-transparent via-[#eee9df] to-transparent shadow-[0_4px_16px_rgba(238,233,223,0.2)]" />
          </div>
          <span className="text-[10px] font-mono tracking-widest text-[#9f9b94] uppercase block">
            CURVED ACOUSTIC CINEMA SCREEN
          </span>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-2 text-[11px] font-sans">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-[#22201d] border border-[#3a3530]" />
            <span className="text-[#9f9b94]">Regular (₹{showtime.price_regular})</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-[#2d241e] border border-[#5c4738]" />
            <span className="text-[#d4af37]">VIP Bronze (₹{showtime.price_vip})</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-[#d83128]" />
            <span className="text-[#eee9df] font-bold">Selected by You</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-[#523009] border border-[#854d0e]" />
            <span className="text-[#f59e0b]">Held</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-[#131211] opacity-30 border border-[#2a2622]" />
            <span className="text-[#64748b]">Booked</span>
          </div>
        </div>

        {/* 5 Rows x 10 Columns Center-Aligned Continuous Block */}
        {loading ? (
          <div className="py-20 text-center space-y-2">
            <div className="w-6 h-6 border-2 border-[#d83128] border-t-transparent animate-spin mx-auto" />
            <p className="text-xs text-[#9f9b94] font-mono uppercase">Connecting to live Supabase seating grid...</p>
          </div>
        ) : (
          <div className="overflow-x-auto pb-4">
            <div className="min-w-[540px] max-w-xl mx-auto space-y-3">
              {/* Column numbers header */}
              <div className="flex items-center space-x-2 px-8">
                <div className="w-6 text-center text-[10px] font-mono text-[#9f9b94] font-bold"></div>
                <div className="flex-1 grid grid-cols-10 gap-2 text-center text-[10px] font-mono text-[#9f9b94]">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((col) => (
                    <span key={col}>{col}</span>
                  ))}
                </div>
              </div>

              {/* Rows A through E */}
              {rows.map((rowLabel) => {
                const rowSeats = seatsByRow[rowLabel] || [];
                const isVipRow = rowLabel === 'D' || rowLabel === 'E';

                return (
                  <div key={rowLabel} className="flex items-center space-x-2 px-8">
                    {/* Row Label */}
                    <div
                      className={`w-6 text-center text-xs font-mono font-bold ${
                        isVipRow ? 'text-[#d4af37]' : 'text-[#9f9b94]'
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
                          seatStyles = 'bg-[#131211] opacity-25 border-[#2a2622] text-[#64748b] cursor-not-allowed line-through';
                        } else if (isLockedByOther) {
                          seatStyles = 'bg-[#523009] border-[#854d0e] text-[#f59e0b] cursor-not-allowed';
                        } else if (isSelectedByMe) {
                          seatStyles = 'bg-[#d83128] border-[#d83128] text-white font-bold shadow-[0_2px_10px_rgba(216,49,40,0.4)]';
                        } else if (isVip) {
                          seatStyles = 'bg-[#2d241e] border-[#5c4738] text-[#eee9df] hover:border-[#d4af37] cursor-pointer';
                        } else {
                          seatStyles = 'bg-[#22201d] border-[#3a3530] text-[#9f9b94] hover:border-[#eee9df] hover:text-[#eee9df] cursor-pointer';
                        }

                        return (
                          <button
                            key={seat.id}
                            disabled={isBooked || isLockedByOther || locking}
                            onClick={() => handleSeatClick(seat)}
                            title={`${seat.row_label}${seat.col_number} • ${
                              isVip ? 'VIP ₹' + showtime.price_vip : 'REGULAR ₹' + showtime.price_regular
                            }`}
                            className={`h-9 w-full border font-mono text-xs flex items-center justify-center transition-all ${seatStyles}`}
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
        <div className="pt-3 border-t border-[#2a2622] flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-[#9f9b94] gap-2">
          <div>ROWS A–C: REGULAR TIER (₹{showtime.price_regular})</div>
          <div className="flex items-center space-x-2">
            {isSyncing && (
              <span className="flex items-center space-x-1 text-[#d83128]">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>LIVE SYNC</span>
              </span>
            )}
            <span className="text-[#d4af37]">ROWS D–E: VIP BRONZE TIER (₹{showtime.price_vip})</span>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Dock (35mm Archival Noir with Film Leader Crimson) */}
      <div className="sticky bottom-4 z-40 bg-[#0e0d0c] border border-[#d83128] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-mono tracking-wider text-[#9f9b94] uppercase">
              SELECTED SEATS ({selectedSeats.length}/{maxSeats}):
            </span>
            {selectedSeats.length > 0 ? (
              <div className="flex items-center space-x-1.5 flex-wrap">
                {selectedSeats.map((s) => (
                  <span
                    key={s.id}
                    className={`px-2 py-0.5 text-xs font-mono font-bold border ${
                      s.seat_tier === 'vip'
                        ? 'bg-[#2d241e] border-[#5c4738] text-[#d4af37]'
                        : 'bg-[#22201d] border-[#3a3530] text-[#eee9df]'
                    }`}
                  >
                    {s.row_label}{s.col_number}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-xs font-mono text-[#9f9b94] italic">Select available seats above</span>
            )}
          </div>

          {selectedSeats.length > 0 && (
            <div className="flex items-center space-x-2 text-xs font-mono">
              <Clock className="w-3.5 h-3.5 text-[#d83128]" />
              <span className="text-[#9f9b94] uppercase">HOLD TIMER:</span>
              <span className="font-bold text-[#d83128] tracking-widest">
                {formatTimer(timeLeft)}
              </span>
              <span className="text-[10px] text-[#9f9b94]">(Auto-releases at 00:00)</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4 w-full sm:w-auto justify-between sm:justify-end">
          {selectedSeats.length > 0 && (
            <div className="text-right">
              <div className="text-[10px] font-mono text-[#9f9b94] uppercase">TOTAL AMOUNT</div>
              <div className="text-lg font-mono font-bold text-[#eee9df]">₹{totalPrice}</div>
            </div>
          )}

          <div className="flex items-center space-x-2">
            {selectedSeats.length > 0 && (
              <button
                onClick={handleReleaseAll}
                disabled={locking}
                className="px-3 py-2 bg-[#171513] hover:bg-[#22201d] text-[#9f9b94] hover:text-[#eee9df] text-xs font-mono uppercase border border-[#2a2622] transition-colors"
              >
                RELEASE
              </button>
            )}

            <button
              disabled={selectedSeats.length === 0 || locking}
              onClick={onProceedToCheckout}
              className={`px-5 py-2.5 text-xs font-sans font-bold uppercase tracking-wider border flex items-center space-x-2 transition-colors ${
                selectedSeats.length > 0
                  ? 'bg-[#d83128] hover:bg-[#b8241c] text-white border-[#d83128] cursor-pointer'
                  : 'bg-[#171513] text-[#64748b] border-[#2a2622] cursor-not-allowed'
              }`}
            >
              <span>CONTINUE TO BOOKING</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
