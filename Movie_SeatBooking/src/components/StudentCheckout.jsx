import React, { useState } from 'react';
import { confirmBookingAtomic } from '../lib/supabase.js';
import {
  ShieldCheck,
  User,
  Mail,
  CreditCard,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Lock,
  IdCard,
  Users,
} from 'lucide-react';

export function StudentCheckout({
  movie,
  showtime,
  selectedSeats,
  bookingMode,
  sessionId,
  onBack,
  onBookingConfirmed,
}) {
  // Primary booker form state
  const [primaryFirstName, setPrimaryFirstName] = useState('');
  const [primaryLastName, setPrimaryLastName] = useState('');
  const [primaryUsn, setPrimaryUsn] = useState('');
  const [primaryEmail, setPrimaryEmail] = useState('');

  // Group attendees form state (for seats index 1 to N-1)
  const [attendees, setAttendees] = useState(
    selectedSeats.slice(1).map((seat, index) => ({
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

  // Total price calculation
  const totalPrice = selectedSeats.reduce((sum, s) => {
    const price = s.seat_tier === 'vip' ? showtime.price_vip : showtime.price_regular;
    return sum + Number(price);
  }, 0);

  // Attendees change handler
  const handleAttendeeChange = (index, field, value) => {
    setAttendees((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Form submission & atomic booking confirmation
  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    // 1. Validate primary booker
    if (!primaryFirstName.trim() || !primaryLastName.trim()) {
      setValidationError('Please enter both First Name and Last Name for the primary ticket holder.');
      return;
    }

    const cleanPrimaryUsn = primaryUsn.trim().toUpperCase();
    if (cleanPrimaryUsn.length < 5) {
      setValidationError('Please enter a valid RV University USN (e.g. RVU23BSE042).');
      return;
    }

    const rvuEmailRegex = /^[a-zA-Z0-9._%+-]+@rvu\.edu\.in$/i;
    const cleanPrimaryEmail = primaryEmail.trim().toLowerCase();
    if (!rvuEmailRegex.test(cleanPrimaryEmail)) {
      setValidationError('Primary email must be an official RV University student email ending in @rvu.edu.in');
      return;
    }

    // 2. Validate group attendees if mode is group
    const formattedAttendees = [];
    if (bookingMode === 'group' && selectedSeats.length > 1) {
      for (let i = 0; i < attendees.length; i++) {
        const att = attendees[i];
        if (!att.firstName.trim() || !att.lastName.trim()) {
          setValidationError(`Please provide full name for Attendee ${i + 2} (${att.seatNumber}).`);
          return;
        }
        const cleanAttUsn = att.usn.trim().toUpperCase();
        if (cleanAttUsn.length < 5) {
          setValidationError(`Please provide a valid RVU USN for Attendee ${i + 2} (${att.seatNumber}).`);
          return;
        }
        const cleanAttEmail = att.email.trim().toLowerCase();
        if (!rvuEmailRegex.test(cleanAttEmail)) {
          setValidationError(
            `Attendee ${i + 2} (${att.seatNumber}) must have an official @rvu.edu.in student email.`
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
      const ticketHash = `RVU-${cleanPrimaryUsn}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

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
        onBookingConfirmed({
          bookingId: res.booking_id,
          ticketHash: res.ticket_hash,
          totalAmount: res.total_amount || totalPrice,
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
        });
      } else {
        setValidationError(
          res?.error || 'Your 5-minute reservation hold has expired. Please reselect your seats.'
        );
      }
    } catch (err) {
      console.error('[StudentCheckout] Confirmation error:', err);
      setValidationError('Network error while processing booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back to Seat Map button */}
      <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800">
        <button
          onClick={onBack}
          disabled={submitting}
          className="flex items-center space-x-2 text-xs font-mono font-bold uppercase text-slate-300 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>RETURN TO SEAT GRID</span>
        </button>
        <div className="text-[10px] font-mono text-rvu-accent font-bold uppercase tracking-widest">
          STEP 3: STUDENT DETAILS & PASS ISSUANCE
        </div>
      </div>

      {/* Validation Error Banner */}
      {validationError && (
        <div className="p-4 bg-red-950/80 border border-red-500 text-red-200 flex items-start space-x-3 text-xs font-mono">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold uppercase tracking-wide">CONFIRMATION FAILED</p>
            <p className="mt-1 text-red-300">{validationError}</p>
          </div>
        </div>
      )}

      {/* Main Grid: Form + Order Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Student Credentials Form */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Primary Booker Card */}
            <div className="bg-slate-950 border border-slate-800 p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-rvu-accent" />
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                    PRIMARY TICKET HOLDER ({selectedSeats[0]?.row_label}{selectedSeats[0]?.col_number})
                  </h3>
                </div>
                <span className="text-[10px] font-mono bg-slate-900 border border-slate-700 px-2 py-0.5 text-slate-300 uppercase">
                  LEAD BOOKER
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={primaryFirstName}
                    onChange={(e) => setPrimaryFirstName(e.target.value)}
                    placeholder="e.g. Arjun"
                    className="w-full bg-slate-900 border border-slate-700 px-3 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-rvu-accent"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={primaryLastName}
                    onChange={(e) => setPrimaryLastName(e.target.value)}
                    placeholder="e.g. Sharma"
                    className="w-full bg-slate-900 border border-slate-700 px-3 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-rvu-accent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1">
                    <IdCard className="w-3 h-3 text-rvu-accent" />
                    <span>RVU Student USN *</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={primaryUsn}
                    onChange={(e) => setPrimaryUsn(e.target.value)}
                    placeholder="e.g. RVU23BSE042"
                    className="w-full bg-slate-900 border border-slate-700 px-3 py-2 text-xs font-mono uppercase text-white placeholder-slate-600 focus:outline-none focus:border-rvu-accent"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1">
                    <Mail className="w-3 h-3 text-rvu-accent" />
                    <span>RVU Student Email *</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={primaryEmail}
                    onChange={(e) => setPrimaryEmail(e.target.value)}
                    placeholder="name@rvu.edu.in"
                    className="w-full bg-slate-900 border border-slate-700 px-3 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-rvu-accent"
                  />
                </div>
              </div>
            </div>

            {/* Additional Attendees Cards (For Group Booking: Seats 2 to 4) */}
            {bookingMode === 'group' && selectedSeats.length > 1 && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                  <Users className="w-4 h-4 text-rvu-accent" />
                  <span>GROUP ATTENDEE CREDENTIALS ({attendees.length} ADDITIONAL STUDENTS)</span>
                </div>

                {attendees.map((att, idx) => (
                  <div key={att.seatId} className="bg-slate-950 border border-slate-800 p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                        ATTENDEE {idx + 2} • SEAT {att.seatNumber} ({att.seatTier.toUpperCase()})
                      </h4>
                      <span className="text-[10px] font-mono bg-purple-950/40 border border-purple-800 px-2 py-0.5 text-purple-300 uppercase">
                        VERIFIED ADMISSION REQUIRED
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                          First Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={att.firstName}
                          onChange={(e) => handleAttendeeChange(idx, 'firstName', e.target.value)}
                          placeholder="e.g. Diya"
                          className="w-full bg-slate-900 border border-slate-700 px-3 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-rvu-accent"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                          Last Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={att.lastName}
                          onChange={(e) => handleAttendeeChange(idx, 'lastName', e.target.value)}
                          placeholder="e.g. Verma"
                          className="w-full bg-slate-900 border border-slate-700 px-3 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-rvu-accent"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                          RVU Student USN *
                        </label>
                        <input
                          type="text"
                          required
                          value={att.usn}
                          onChange={(e) => handleAttendeeChange(idx, 'usn', e.target.value)}
                          placeholder="e.g. RVU23BSE088"
                          className="w-full bg-slate-900 border border-slate-700 px-3 py-2 text-xs font-mono uppercase text-white placeholder-slate-600 focus:outline-none focus:border-rvu-accent"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                          RVU Student Email *
                        </label>
                        <input
                          type="email"
                          required
                          value={att.email}
                          onChange={(e) => handleAttendeeChange(idx, 'email', e.target.value)}
                          placeholder="diya@rvu.edu.in"
                          className="w-full bg-slate-900 border border-slate-700 px-3 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-rvu-accent"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className={`w-full py-3.5 px-6 font-mono text-xs font-bold uppercase tracking-widest border transition-all flex items-center justify-center space-x-2 ${
                  submitting
                    ? 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-rvu-accent hover:bg-orange-600 text-white border-rvu-accent shadow-[0_0_15px_rgba(255,107,0,0.4)] cursor-pointer'
                }`}
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin mr-2" />
                    <span>VERIFYING RVU CREDENTIALS & ISSUING PASS...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>CONFIRM RESERVATION & GENERATE QR PASS</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right 1 Col: Screening & Pricing Breakdown */}
        <div className="space-y-4">
          <div className="bg-slate-950 border border-slate-800 p-5 space-y-4">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white border-b border-slate-800 pb-2">
              RESERVATION SUMMARY
            </h3>

            {/* Movie details */}
            <div className="space-y-1">
              <div className="text-[10px] font-mono text-rvu-accent font-bold uppercase">MOVIE</div>
              <div className="text-sm font-bold font-mono text-white uppercase">{movie.title}</div>
              <div className="text-[11px] font-mono text-slate-400">{movie.genre} • {movie.duration_mins} MINS</div>
            </div>

            {/* Showtime details */}
            <div className="space-y-1 border-t border-slate-900 pt-3">
              <div className="text-[10px] font-mono text-rvu-accent font-bold uppercase">VENUE & TIME</div>
              <div className="text-xs font-bold font-mono text-slate-200 uppercase">{showtime.auditorium_name}</div>
              <div className="text-[11px] font-mono text-slate-400">
                {new Date(showtime.start_time).toLocaleDateString('en-IN', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}{' '}
                at{' '}
                {new Date(showtime.start_time).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                })}
              </div>
            </div>

            {/* Selected Seats */}
            <div className="space-y-2 border-t border-slate-900 pt-3">
              <div className="text-[10px] font-mono text-rvu-accent font-bold uppercase">RESERVED SEATS</div>
              <div className="space-y-1">
                {selectedSeats.map((s) => {
                  const price = s.seat_tier === 'vip' ? showtime.price_vip : showtime.price_regular;
                  return (
                    <div key={s.id} className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-300">
                        Seat {s.row_label}{s.col_number} ({s.seat_tier.toUpperCase()})
                      </span>
                      <span className="text-white font-bold">₹{price}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Price breakdown */}
            <div className="border-t border-slate-800 pt-3 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal ({selectedSeats.length} seats)</span>
                <span>₹{totalPrice}</span>
              </div>
              <div className="flex justify-between text-emerald-400">
                <span>RVU Student Subsidy</span>
                <span>₹0.00 (Zero booking fee)</span>
              </div>
              <div className="border-t border-slate-800 pt-2 flex justify-between text-sm font-bold text-white">
                <span className="uppercase">TOTAL PAYABLE</span>
                <span className="text-rvu-accent">₹{totalPrice}</span>
              </div>
            </div>
          </div>

          {/* Security & Policy Note */}
          <div className="p-4 bg-slate-950 border border-slate-800 space-y-2 text-[11px] font-mono text-slate-400">
            <div className="flex items-center space-x-1.5 text-white font-bold uppercase">
              <ShieldCheck className="w-3.5 h-3.5 text-rvu-accent" />
              <span>RVU ADMISSION POLICY</span>
            </div>
            <p className="leading-relaxed">
              Admission is restricted to RV University students and staff. Physical or digital RVU student ID cards must match the registered USN upon entry.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
