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
  Ticket,
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
  const [contestedSeatToast, setContestedSeatToast] = useState('');

  const timerRef = useRef(null);
  const selectedSeatsRef = useRef(selectedSeats);
  selectedSeatsRef.current = selectedSeats;

  // Strict quota limit
  const maxSeats = bookingMode === 'individual' ? 1 : 4;

  // Deferred WebSocket & Initial Seats Fetch: Only active when user is in the auditorium
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
      console.error('[SeatGrid] Error connecting to live Supabase seats:', err);
    } finally {
      if (!quiet) setLoading(false);
      else setIsSyncing(false);
    }
  }, [showtime?.id, sessionId]);

  useEffect(() => {
    loadSeatMap();

    // 1. DEFERRED WEBSOCKET: Subscribed only while viewing auditorium seat map
    const unsubscribe = subscribeToSeats(showtime.id, () => {
      loadSeatMap(true);
    });

    // 2. Periodic background poll to refresh lazy locks
    const pollInterval = setInterval(() => {
      loadSeatMap(true);
    }, 7000);

    return () => {
      unsubscribe();
      clearInterval(pollInterval);
    };
  }, [showtime.id, loadSeatMap]);

  // Analog Timecode Countdown Timer
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

  // Auto-release on page close
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
      setErrorMessage('Your 5-minute atomic reservation has expired. Please reselect your seats.');
      loadSeatMap(true);
    }
  };

  // Seat Click with NOWAIT and 55P03 Contestation Handling
  const handleSeatClick = async (seat) => {
    setErrorMessage('');
    setContestedSeatToast('');

    if (seat.effective_status === 'booked') return;

    if (seat.effective_status === 'locked_by_other') {
      setContestedSeatToast(`Seat ${seat.row_label}${seat.col_number} is currently held by another attendee.`);
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

    // Checking max quota
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
          } else if (lockRes?.error === 'SEAT_CONTESTED') {
            // Rapid Contestation Toast & 50ms deselection
            setContestedSeatToast(`Another student is simultaneously grabbing Seat ${seat.row_label}${seat.col_number}!`);
            setTimeout(() => {
              loadSeatMap(true);
            }, 50);
          } else if (lockRes?.error === 'SOLD_OUT') {
            setErrorMessage('Premiere is sold out! All seats have been reserved.');
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

    // Acquire lock with NOWAIT
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
      } else if (lockRes?.error === 'SEAT_CONTESTED') {
        // Fast Contestation Bailout without freezing UI
        setContestedSeatToast(`Another student is grabbing Seat ${seat.row_label}${seat.col_number}! Pick another seat.`);
        setTimeout(() => {
          loadSeatMap(true);
        }, 50);
      } else if (lockRes?.error === 'SOLD_OUT') {
        setErrorMessage('Premiere is sold out! All seats have been reserved.');
        loadSeatMap(true);
      } else {
        setErrorMessage(lockRes?.error || 'Could not reserve seat.');
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
    setContestedSeatToast('');
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

  // 5 Rows: A, B, C, D, E (50 Seats Total)
  const rows = ['A', 'B', 'C', 'D', 'E'];
  const seatsByRow = rows.reduce((acc, row) => {
    acc[row] = seats.filter((s) => s.row_label === row).sort((a, b) => a.col_number - b.col_number);
    return acc;
  }, {});

  // Analog Timecode Format [ 04:59 ]
  const formatTimecode = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `[ ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')} ]`;
  };

  return (
    <div className="space-y-6">
      {/* Top Bar with Mode Switcher & Back Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-[#171513] border border-[#2a2622]">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 bg-[#11100f] hover:bg-[#1e1b18] border border-[#2a2622] text-[#9f9b94] hover:text-[#eee9df] transition-colors"
            title="Return to Premiere Drop"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div>
            <span className="text-[10px] font-mono tracking-widest text-[#d83128] uppercase block">
              CAMPUS PREMIERE SCREENING
            </span>
            <h2 className="text-base font-serif font-bold text-[#eee9df] uppercase">
              {movie.title} • {showtime.auditorium_name}
            </h2>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center space-x-1 bg-[#11100f] p-1 border border-[#2a2622]">
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

      {/* Contested Seat Toast Alert (55P03 Fast Response) */}
      {contestedSeatToast && (
        <div className="p-3 bg-[#1e1411] border-2 border-[#d83128] text-[#eee9df] flex items-center justify-between text-xs font-mono animate-pulse">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-[#d83128]" />
            <span className="font-bold text-[#d83128] uppercase">SEAT CONTESTED:</span>
            <span>{contestedSeatToast}</span>
          </div>
          <button onClick={() => setContestedSeatToast('')} className="text-[#9f9b94] hover:text-white uppercase text-[10px]">
            DISMISS
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-[#1e1411] border border-[#d83128]/70 text-[#eee9df] flex items-start space-x-2 text-xs font-sans">
          <AlertTriangle className="w-4 h-4 text-[#d83128] shrink-0 mt-0.5" />
          <div className="flex-1">{errorMessage}</div>
          <button onClick={() => setErrorMessage('')} className="text-[#9f9b94] hover:text-white uppercase font-mono text-[10px]">
            DISMISS
          </button>
        </div>
      )}

      {/* Interactive 3D Perspective Amphitheater Container */}
      <div className="bg-[#171513] border border-[#2a2622] p-6 sm:p-12 space-y-12 overflow-hidden relative">
        {/* Projector Light Cone Effect */}
        <div className="relative max-w-2xl mx-auto text-center">
          {/* Subtle Projector Beam shining down from ceiling */}
          <div
            className="w-full h-24 mx-auto pointer-events-none opacity-20"
            style={{
              background: 'linear-gradient(to bottom, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.05) 70%, transparent 100%)',
              clipPath: 'polygon(35% 0%, 65% 0%, 100% 100%, 0% 100%)',
            }}
          />

          {/* Soft Curved Acoustic Screen Banner */}
          <div className="relative mt-2">
            <div className="h-1.5 w-full bg-gradient-to-r from-transparent via-[#eee9df] to-transparent shadow-[0_6px_24px_rgba(238,233,223,0.35)]" />
            <span className="text-[10px] font-mono tracking-widest text-[#9f9b94] uppercase block mt-2">
              ACOUSTIC 35MM PROJECTION SCREEN
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-[11px] font-sans">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-[#22201d] border border-[#37342f]" />
            <span className="text-[#9f9b94]">Regular Tier</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-[#2d241e] border border-[#5c4738]" />
            <span className="text-[#d4af37]">VIP Bronze Tier</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-[#d83128]" />
            <span className="text-[#eee9df] font-bold">Selected</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-[#523009] border border-[#854d0e]" />
            <span className="text-[#f59e0b]">Held</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-[#13110f] opacity-30 border border-[#2a2622]" />
            <span className="text-[#64748b]">Booked</span>
          </div>
        </div>

        {/* 3D Physical Amphitheater Perspective Box (perspective: 900px, rotateX(10deg)) */}
        {loading ? (
          <div className="py-20 text-center space-y-2">
            <div className="w-6 h-6 border-2 border-[#d83128] border-t-transparent animate-spin mx-auto" />
            <p className="text-xs font-mono text-[#9f9b94] uppercase">Synchronizing 50-seat acoustic grid...</p>
          </div>
        ) : (
          <div
            className="overflow-x-auto pb-8 pt-2"
            style={{
              perspective: '900px',
            }}
          >
            <div
              className="min-w-[560px] max-w-xl mx-auto space-y-3.5 transition-transform duration-500 ease-out"
              style={{
                transform: 'rotateX(10deg)',
                transformOrigin: 'top center',
              }}
            >
              {/* Columns Header */}
              <div className="flex items-center space-x-2 px-8">
                <div className="w-6 text-center text-[10px] font-mono text-[#9f9b94] font-bold"></div>
                <div className="flex-1 grid grid-cols-10 gap-2.5 text-center text-[10px] font-mono text-[#9f9b94]">
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

                    {/* 10 Seats */}
                    <div className="flex-1 grid grid-cols-10 gap-2.5">
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
                          seatStyles =
                            'bg-[#d83128] border-[#d83128] text-white font-bold shadow-[0_4px_16px_rgba(216,49,40,0.5)] -translate-y-1';
                        } else if (isVip) {
                          seatStyles =
                            'bg-[#2d241e] border-[#5c4738] text-[#eee9df] hover:border-[#d4af37] hover:-translate-y-1 hover:shadow-[0_4px_12px_rgba(212,175,55,0.2)] cursor-pointer';
                        } else {
                          seatStyles =
                            'bg-[#22201d] border-[#3a3530] text-[#9f9b94] hover:border-[#eee9df] hover:text-[#eee9df] hover:-translate-y-1 hover:shadow-[0_4px_12px_rgba(238,233,223,0.15)] cursor-pointer';
                        }

                        return (
                          <button
                            key={seat.id}
                            disabled={isBooked || isLockedByOther || locking}
                            onClick={() => handleSeatClick(seat)}
                            title={`${seat.row_label}${seat.col_number} • ${
                              isVip ? 'VIP TIER' : 'REGULAR ARCHIVE'
                            }`}
                            className={`h-9 w-full border font-mono text-xs flex items-center justify-center transition-all duration-150 ${seatStyles}`}
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

        {/* Tier Annotations */}
        <div className="pt-3 border-t border-[#2a2622] flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-[#9f9b94] gap-2">
          <div>ROWS A–C: REGULAR ARCHIVE TIER</div>
          <div className="flex items-center space-x-2">
            {isSyncing && (
              <span className="flex items-center space-x-1 text-[#d83128]">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>SYNCING LIVE</span>
              </span>
            )}
            <span className="text-[#d4af37]">ROWS D–E: VIP BRONZE TIER</span>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Dock: Physical Ticket Preview & Analog Timecode */}
      <div className="sticky bottom-4 z-40 bg-[#11100f] border border-[#d83128] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xl">
        {/* Left: Physical Ticket Preview with Tearing Perforation Line */}
        <div className="flex items-center space-x-4">
          <div className="relative bg-[#171513] border border-[#2a2622] px-4 py-2 flex items-center space-x-3">
            {/* Ticket Notches */}
            <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-[#11100f] border-r border-[#2a2622]" />
            <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-[#11100f] border-l border-[#2a2622]" />

            <div className="space-y-0.5">
              <span className="text-[9px] font-mono uppercase text-[#9f9b94] block">
                TICKET PREVIEW ({selectedSeats.length}/{maxSeats})
              </span>
              <div className="flex items-center space-x-1">
                {selectedSeats.length > 0 ? (
                  selectedSeats.map((s) => (
                    <span
                      key={s.id}
                      className="px-2 py-0.5 text-xs font-mono font-bold bg-[#d83128] text-white"
                    >
                      {s.row_label}{s.col_number}
                    </span>
                  ))
                ) : (
                  <span className="text-xs font-mono text-[#9f9b94] italic">No seats selected</span>
                )}
              </div>
            </div>

            {/* Tearing Perforation Line */}
            <div className="h-7 border-r-2 border-dashed border-[#d83128]/50 mx-2" />

            {/* Admission Status */}
            <div>
              <span className="text-[9px] font-mono uppercase text-[#9f9b94] block">ADMISSION</span>
              <span className="text-xs font-mono font-bold text-[#eee9df] uppercase">FREE CAMPUS PASS</span>
            </div>
          </div>

          {/* Analog Timecode Hold Timer */}
          {selectedSeats.length > 0 && (
            <div className="flex items-center space-x-2 text-xs font-mono">
              <span className="text-[#9f9b94] uppercase text-[10px]">TIME REMAINING:</span>
              <span className="font-bold text-[#d83128] tracking-widest text-sm sm:text-base">
                {formatTimecode(timeLeft)}
              </span>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-2 w-full sm:w-auto justify-between sm:justify-end">
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
            className={`px-6 py-3 text-xs font-sans font-bold uppercase tracking-wider border flex items-center space-x-2 transition-colors ${
              selectedSeats.length > 0
                ? 'bg-[#d83128] hover:bg-[#b8241c] text-white border-[#d83128] cursor-pointer shadow-[0_0_15px_rgba(216,49,40,0.4)]'
                : 'bg-[#171513] text-[#64748b] border-[#2a2622] cursor-not-allowed'
            }`}
          >
            <span>CONFIRM ATTENDEE DETAILS</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
