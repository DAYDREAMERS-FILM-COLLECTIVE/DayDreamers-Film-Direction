import React, { useState, useEffect, useRef } from 'react';
import { confirmBookingAtomic } from '../lib/supabase.js';
import { cinemaAudio } from '../lib/audio.js';
import { sendTicketEmail } from '../lib/email.js';
import {
  User,
  Mail,
  AlertTriangle,
  ArrowLeft,
  Lock,
  IdCard,
  Users,
  ShieldCheck,
  Ticket,
  Clock,
  Send,
} from 'lucide-react';

const USN_REGEX = /^RVU\d{2}[A-Z]{2,4}\d{3,4}$/i;
const RVU_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@rvu\.edu\.in$/i;

export function StudentCheckout({
  movie,
  showtime,
  selectedSeats,
  bookingMode,
  sessionId,
  onBack,
  onBookingConfirmed,
}) {
  const [primaryFirstName, setPrimaryFirstName] = useState('');
  const [primaryLastName, setPrimaryLastName] = useState('');
  const [primaryUsn, setPrimaryUsn] = useState('');
  const [primaryEmail, setPrimaryEmail] = useState('');

  // 5-minute ticking hold countdown in checkout view
  const [holdSecondsLeft, setHoldSecondsLeft] = useState(300);

  const [attendees, setAttendees] = useState(
    selectedSeats.slice(1).map((seat) => ({
      seatNumber: `${seat.row_label}${seat.col_number}`,
      seatId: seat.id,
      seatTier: seat.seat_tier,
      firstName: '',
      lastName: '',
      usn: '',
      email: '',
    }))
  );

  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Countdown timer for checkout
  useEffect(() => {
    const timer = setInterval(() => {
      setHoldSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setValidationError('Your 5-minute seat reservation has expired while filling details.');
          setTimeout(() => {
            onBack();
          }, 2500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onBack]);

  const handleAttendeeChange = (index, field, value) => {
    setAttendees((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const formatTimecode = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `[ ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')} ]`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    if (!primaryFirstName.trim() || !primaryLastName.trim()) {
      setValidationError('Please enter both First Name and Last Name for the primary pass holder.');
      return;
    }

    // Real-time sanitized USN (uppercase)
    const cleanPrimaryUsn = primaryUsn.trim().toUpperCase();
    if (!USN_REGEX.test(cleanPrimaryUsn)) {
      setValidationError('Primary student USN format invalid. Expected format: RVU##XXX### (e.g. RVU23BSE042).');
      return;
    }

    // Strict @rvu.edu.in validation
    const cleanPrimaryEmail = primaryEmail.trim().toLowerCase();
    if (!RVU_EMAIL_REGEX.test(cleanPrimaryEmail)) {
      setValidationError('Primary email must be an official RV University address ending with @rvu.edu.in (public domains like @gmail.com are prohibited).');
      return;
    }

    const formattedAttendees = [];
    if (bookingMode === 'group' && selectedSeats.length > 1) {
      for (let i = 0; i < attendees.length; i++) {
        const att = attendees[i];
        if (!att.firstName.trim() || !att.lastName.trim()) {
          setValidationError(`Please provide full name for Attendee ${i + 2} (${att.seatNumber}).`);
          return;
        }
        const cleanAttUsn = att.usn.trim().toUpperCase();
        if (!USN_REGEX.test(cleanAttUsn)) {
          setValidationError(`Attendee ${i + 2} (${att.seatNumber}) USN is invalid. Expected format: RVU##XXX### (e.g. RVU23BSE088).`);
          return;
        }
        const cleanAttEmail = att.email.trim().toLowerCase();
        if (!RVU_EMAIL_REGEX.test(cleanAttEmail)) {
          setValidationError(
            `Attendee ${i + 2} (${att.seatNumber}) must possess an official @rvu.edu.in student email.`
          );
          return;
        }

        formattedAttendees.push({
          seat_id: att.seatId,
          seat_label: att.seatNumber,
          seat_tier: att.seatTier,
          name: `${att.firstName.trim()} ${att.lastName.trim()}`,
          usn: cleanAttUsn,
          email: cleanAttEmail,
        });
      }
    }

    setSubmitting(true);

    try {
      const fullName = `${primaryFirstName.trim()} ${primaryLastName.trim()}`;
      const ticketHash = `FPS-${cleanPrimaryUsn}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const res = await confirmBookingAtomic({
        showtimeId: showtime.id,
        seatIds: selectedSeats.map((s) => s.id),
        sessionId,
        userName: fullName,
        usn: cleanPrimaryUsn,
        email: cleanPrimaryEmail,
        ticketHash,
        attendees: formattedAttendees,
      });

      if (res && res.success) {
        // Play deep sub-acoustic stamp sound
        cinemaAudio.playStampSound();

        const bookingPayload = {
          bookingId: res.booking_id,
          ticketHash: res.ticket_hash,
          totalAmount: 0,
          primaryBooker: {
            name: fullName,
            usn: cleanPrimaryUsn,
            email: cleanPrimaryEmail,
          },
          attendees: formattedAttendees,
          seats: selectedSeats,
          movie,
          showtime,
          bookingMode,
          confirmedAt: new Date().toISOString(),
        };

        // Dispatch EmailJS asynchronously without blocking pass reveal
        sendTicketEmail(bookingPayload).catch((err) => {
          console.warn('[StudentCheckout] Email delivery notice:', err);
        });

        onBookingConfirmed(bookingPayload);
      } else {
        setValidationError(
          res?.error || 'Your 5-minute seat reservation has expired. Please reselect your seats.'
        );
        setTimeout(() => {
          onBack();
        }, 2500);
      }
    } catch (err) {
      console.error('[StudentCheckout] Confirmation error:', err);
      setValidationError('Error processing reservation against live Supabase database.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[#131110] border border-[#26221f] gap-3">
        <button
          onClick={onBack}
          disabled={submitting}
          className="flex items-center space-x-2 text-xs font-sans text-[#8c867e] hover:text-[#eee9df] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>RETURN TO SEATING BLOCK</span>
        </button>

        {/* Real-time Ticking Hold Timer */}
        <div className="flex items-center space-x-3 text-xs font-mono">
          <Clock className="w-3.5 h-3.5 text-[#d83128] animate-pulse" />
          <span className="text-[#8c867e] uppercase text-[10px]">REEL HOLD:</span>
          <span className="font-bold text-[#d83128] tracking-widest text-sm">
            {formatTimecode(holdSecondsLeft)}
          </span>
        </div>

        <div className="text-[10px] font-mono text-[#d83128] tracking-widest uppercase">
          CREDENTIAL VERIFICATION // PASS ISSUANCE
        </div>
      </div>

      {validationError && (
        <div className="p-4 bg-[#1e1411] border-2 border-[#d83128] text-[#eee9df] flex items-start space-x-3 text-xs font-sans animate-bounce">
          <AlertTriangle className="w-5 h-5 text-[#d83128] shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-[#d83128] uppercase font-mono">[ CREDENTIAL NOTICE ]</p>
            <p className="mt-1 text-[#eee9df]">{validationError}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form Panel */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Primary Pass Holder Card */}
            <div className="bg-[#131110] border border-[#26221f] p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#26221f] pb-3">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-[#d83128]" />
                  <h3 className="text-sm font-serif font-bold uppercase text-[#eee9df]">
                    Primary Pass Holder ({selectedSeats[0]?.row_label}{selectedSeats[0]?.col_number})
                  </h3>
                </div>
                <span className="text-[10px] font-mono bg-[#080706] border border-[#26221f] px-2 py-0.5 text-[#8c867e] uppercase">
                  LEAD BOOKER
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-[#8c867e]">First Name *</label>
                  <input
                    type="text"
                    required
                    value={primaryFirstName}
                    onChange={(e) => setPrimaryFirstName(e.target.value)}
                    placeholder="e.g. Arjun"
                    className="w-full bg-[#080706] border border-[#26221f] px-3 py-2 text-xs font-sans text-[#eee9df] placeholder-[#64748b] focus:outline-none focus:border-[#d83128]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-[#8c867e]">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={primaryLastName}
                    onChange={(e) => setPrimaryLastName(e.target.value)}
                    placeholder="e.g. Sharma"
                    className="w-full bg-[#080706] border border-[#26221f] px-3 py-2 text-xs font-sans text-[#eee9df] placeholder-[#64748b] focus:outline-none focus:border-[#d83128]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-[#8c867e] flex items-center space-x-1">
                    <IdCard className="w-3 h-3 text-[#d83128]" />
                    <span>RVU Student USN *</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={primaryUsn}
                    onChange={(e) => setPrimaryUsn(e.target.value.toUpperCase())}
                    placeholder="e.g. RVU23BSE042"
                    className="w-full bg-[#080706] border border-[#26221f] px-3 py-2 text-xs font-mono uppercase text-[#eee9df] placeholder-[#64748b] focus:outline-none focus:border-[#d83128]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-[#8c867e] flex items-center space-x-1">
                    <Mail className="w-3 h-3 text-[#d83128]" />
                    <span>RVU Email (@rvu.edu.in) *</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={primaryEmail}
                    onChange={(e) => setPrimaryEmail(e.target.value.toLowerCase())}
                    placeholder="arjun@rvu.edu.in"
                    className="w-full bg-[#080706] border border-[#26221f] px-3 py-2 text-xs font-sans text-[#eee9df] placeholder-[#64748b] focus:outline-none focus:border-[#d83128]"
                  />
                </div>
              </div>
            </div>

            {/* Additional Attendees for Group Mode (2-4 seats) */}
            {bookingMode === 'group' && selectedSeats.length > 1 && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-xs font-serif font-bold uppercase text-[#eee9df]">
                  <Users className="w-4 h-4 text-[#d83128]" />
                  <span>Additional Attendees ({attendees.length} Students)</span>
                </div>

                {attendees.map((att, idx) => (
                  <div key={att.seatId} className="bg-[#131110] border border-[#26221f] p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-[#26221f] pb-3">
                      <h4 className="text-xs font-serif font-bold uppercase text-[#eee9df]">
                        Attendee {idx + 2} • Seat {att.seatNumber} ({att.seatTier.toUpperCase()})
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono uppercase text-[#8c867e]">First Name *</label>
                        <input
                          type="text"
                          required
                          value={att.firstName}
                          onChange={(e) => handleAttendeeChange(idx, 'firstName', e.target.value)}
                          placeholder="e.g. Diya"
                          className="w-full bg-[#080706] border border-[#26221f] px-3 py-2 text-xs font-sans text-[#eee9df] placeholder-[#64748b] focus:outline-none focus:border-[#d83128]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-mono uppercase text-[#8c867e]">Last Name *</label>
                        <input
                          type="text"
                          required
                          value={att.lastName}
                          onChange={(e) => handleAttendeeChange(idx, 'lastName', e.target.value)}
                          placeholder="e.g. Verma"
                          className="w-full bg-[#080706] border border-[#26221f] px-3 py-2 text-xs font-sans text-[#eee9df] placeholder-[#64748b] focus:outline-none focus:border-[#d83128]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono uppercase text-[#8c867e]">RVU USN *</label>
                        <input
                          type="text"
                          required
                          value={att.usn}
                          onChange={(e) => handleAttendeeChange(idx, 'usn', e.target.value.toUpperCase())}
                          placeholder="e.g. RVU23BSE088"
                          className="w-full bg-[#080706] border border-[#26221f] px-3 py-2 text-xs font-mono uppercase text-[#eee9df] placeholder-[#64748b] focus:outline-none focus:border-[#d83128]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-mono uppercase text-[#8c867e]">RVU Email (@rvu.edu.in) *</label>
                        <input
                          type="email"
                          required
                          value={att.email}
                          onChange={(e) => handleAttendeeChange(idx, 'email', e.target.value.toLowerCase())}
                          placeholder="diya@rvu.edu.in"
                          className="w-full bg-[#080706] border border-[#26221f] px-3 py-2 text-xs font-sans text-[#eee9df] placeholder-[#64748b] focus:outline-none focus:border-[#d83128]"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-4 px-6 font-sans text-xs font-bold uppercase tracking-wider border transition-colors flex items-center justify-center space-x-2 shadow-2xl ${
                submitting
                  ? 'bg-[#131110] border-[#26221f] text-[#64748b] cursor-not-allowed'
                  : 'bg-[#d83128] hover:bg-[#b8241c] text-white border-[#d83128] cursor-pointer shadow-[0_0_20px_rgba(216,49,40,0.4)]'
              }`}
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin mr-2" />
                  <span>RECORDING ATOMIC RESERVATION & GENERATING PASS...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>CONFIRM RESERVATION & ISSUE 35MM PASS</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Perforated Ticket Slide-Over Panel (ReactBits / 35mm Physical Aesthetic) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="relative bg-[#131110] border border-[#26221f] p-6 space-y-5 shadow-2xl overflow-hidden">
            {/* Perforated Jagged Cutouts on Left Edge */}
            <div className="absolute -left-2 top-12 w-4 h-4 bg-[#080706] border-r border-[#26221f]" />
            <div className="absolute -left-2 top-28 w-4 h-4 bg-[#080706] border-r border-[#26221f]" />
            <div className="absolute -left-2 bottom-20 w-4 h-4 bg-[#080706] border-r border-[#26221f]" />

            {/* Perforated Jagged Cutouts on Right Edge */}
            <div className="absolute -right-2 top-12 w-4 h-4 bg-[#080706] border-l border-[#26221f]" />
            <div className="absolute -right-2 top-28 w-4 h-4 bg-[#080706] border-l border-[#26221f]" />
            <div className="absolute -right-2 bottom-20 w-4 h-4 bg-[#080706] border-l border-[#26221f]" />

            <div className="flex items-center justify-between border-b border-[#26221f] pb-3">
              <span className="text-[10px] font-mono tracking-widest text-[#d83128] uppercase font-bold">
                PHYSICAL TICKET SLIDE-OVER
              </span>
              <span className="text-[9px] font-mono text-[#8c867e] uppercase">
                35MM ARCHIVAL DROP
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-mono text-[#d83128] uppercase block">SCREENING</span>
              <div className="text-xl font-serif font-black text-[#eee9df] uppercase leading-tight">
                {movie.title}
              </div>
              <div className="text-xs text-[#8c867e] font-sans">
                {movie.genre} • {movie.duration_mins} MINS • RATING {movie.age_rating}
              </div>
            </div>

            <div className="space-y-1 border-t border-[#26221f] pt-3 text-xs">
              <span className="text-[10px] font-mono text-[#d83128] uppercase block">HALL & TIMING</span>
              <div className="font-sans font-medium text-[#eee9df] uppercase">{showtime.auditorium_name}</div>
              <div className="text-[#8c867e] font-mono">
                {new Date(showtime.start_time).toLocaleString('en-IN', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                })}
              </div>
            </div>

            {/* Allocated Seat Badges */}
            <div className="space-y-2 border-t border-[#26221f] pt-3">
              <span className="text-[10px] font-mono text-[#d83128] uppercase block">
                ALLOCATED SEATS ({selectedSeats.length})
              </span>
              <div className="flex flex-wrap gap-2">
                {selectedSeats.map((s) => (
                  <span
                    key={s.id}
                    className={`px-3 py-1 text-xs font-mono font-bold border ${
                      s.seat_tier === 'vip'
                        ? 'bg-[#2d241e] border-[#5c4738] text-[#d4af37]'
                        : 'bg-[#22201d] border-[#3a3530] text-[#eee9df]'
                    }`}
                  >
                    {s.row_label}{s.col_number} ({s.seat_tier.toUpperCase()})
                  </span>
                ))}
              </div>
            </div>

            {/* Dashed Tearing Perforation Line */}
            <div className="border-t-2 border-dashed border-[#d83128]/40 my-4" />

            {/* Price Breakdown (Complimentary) */}
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between text-[#8c867e]">
                <span>Allocated Capacity</span>
                <span className="text-[#eee9df]">{selectedSeats.length} {selectedSeats.length === 1 ? 'Seat' : 'Seats'}</span>
              </div>
              <div className="flex justify-between text-[#8c867e]">
                <span>Campus Society Fee</span>
                <span className="text-[#eee9df]">₹0.00</span>
              </div>
              <div className="flex justify-between text-[#d83128]">
                <span>Society Privilege</span>
                <span>Complimentary Admission</span>
              </div>
              <div className="border-t border-[#26221f] pt-3 flex justify-between text-sm font-bold text-[#eee9df]">
                <span className="font-serif">TOTAL ADMISSION</span>
                <span className="text-[#d83128] uppercase tracking-wider">FREE PASS</span>
              </div>
            </div>
          </div>

          {/* Verification Badge */}
          <div className="p-4 bg-[#131110] border border-[#26221f] space-y-2 text-xs font-sans text-[#8c867e]">
            <div className="flex items-center space-x-1.5 text-[#eee9df] font-serif font-bold uppercase">
              <ShieldCheck className="w-4 h-4 text-[#d83128]" />
              <span>ENTRY REQUIREMENT</span>
            </div>
            <p className="leading-relaxed text-[11px]">
              Pass issuance is restricted to active RV University students and faculty. Student ID matching the registered USN will be verified at the door scanner.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
