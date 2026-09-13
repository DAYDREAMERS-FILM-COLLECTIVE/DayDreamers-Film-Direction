import React, { useState } from 'react';
import { confirmBookingAtomic } from '../lib/supabase.js';
import { cinemaAudio } from '../lib/audio.js';
import {
  User,
  Mail,
  AlertTriangle,
  ArrowLeft,
  Lock,
  IdCard,
  Users,
  ShieldCheck,
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
  const [primaryFirstName, setPrimaryFirstName] = useState('');
  const [primaryLastName, setPrimaryLastName] = useState('');
  const [primaryUsn, setPrimaryUsn] = useState('');
  const [primaryEmail, setPrimaryEmail] = useState('');

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

  const handleAttendeeChange = (index, field, value) => {
    setAttendees((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    if (!primaryFirstName.trim() || !primaryLastName.trim()) {
      setValidationError('Please enter both First Name and Last Name for the primary pass holder.');
      return;
    }

    const cleanPrimaryUsn = primaryUsn.trim().toUpperCase();
    if (cleanPrimaryUsn.length < 5) {
      setValidationError('Please enter a valid RV University student USN (e.g. RVU23BSE042).');
      return;
    }

    const rvuEmailRegex = /^[a-zA-Z0-9._%+-]+@rvu\.edu\.in$/i;
    const cleanPrimaryEmail = primaryEmail.trim().toLowerCase();
    if (!rvuEmailRegex.test(cleanPrimaryEmail)) {
      setValidationError('Primary email must be an official RV University address ending in @rvu.edu.in');
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
        if (cleanAttUsn.length < 5) {
          setValidationError(`Please provide a valid RVU USN for Attendee ${i + 2} (${att.seatNumber}).`);
          return;
        }
        const cleanAttEmail = att.email.trim().toLowerCase();
        if (!rvuEmailRegex.test(cleanAttEmail)) {
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
        cinemaAudio.playStampSound();
        onBookingConfirmed({
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
        });
      } else {
        setValidationError(
          res?.error || 'Your 5-minute seat reservation has expired. Please reselect your seats.'
        );
      }
    } catch (err) {
      console.error('[StudentCheckout] Confirmation error:', err);
      setValidationError('Error processing reservation against live Supabase database.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between p-4 bg-[#171513] border border-[#2a2622]">
        <button
          onClick={onBack}
          disabled={submitting}
          className="flex items-center space-x-2 text-xs font-sans text-[#9f9b94] hover:text-[#eee9df] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>RETURN TO SEATING BLOCK</span>
        </button>
        <div className="text-[10px] font-mono text-[#d83128] tracking-widest uppercase">
          CREDENTIAL VERIFICATION // PASS ISSUANCE
        </div>
      </div>

      {validationError && (
        <div className="p-4 bg-[#1e1411] border border-[#d83128] text-[#eee9df] flex items-start space-x-3 text-xs font-sans">
          <AlertTriangle className="w-5 h-5 text-[#d83128] shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-[#d83128] uppercase font-mono">VERIFICATION ERROR</p>
            <p className="mt-1 text-[#eee9df]">{validationError}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Container */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Primary Pass Holder Card */}
            <div className="bg-[#171513] border border-[#2a2622] p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#2a2622] pb-3">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-[#d83128]" />
                  <h3 className="text-sm font-serif font-bold uppercase text-[#eee9df]">
                    Primary Pass Holder ({selectedSeats[0]?.row_label}{selectedSeats[0]?.col_number})
                  </h3>
                </div>
                <span className="text-[10px] font-mono bg-[#11100f] border border-[#2a2622] px-2 py-0.5 text-[#9f9b94] uppercase">
                  LEAD BOOKER
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-[#9f9b94]">First Name *</label>
                  <input
                    type="text"
                    required
                    value={primaryFirstName}
                    onChange={(e) => setPrimaryFirstName(e.target.value)}
                    placeholder="e.g. Arjun"
                    className="w-full bg-[#11100f] border border-[#2a2622] px-3 py-2 text-xs font-sans text-[#eee9df] placeholder-[#64748b] focus:outline-none focus:border-[#d83128]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-[#9f9b94]">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={primaryLastName}
                    onChange={(e) => setPrimaryLastName(e.target.value)}
                    placeholder="e.g. Sharma"
                    className="w-full bg-[#11100f] border border-[#2a2622] px-3 py-2 text-xs font-sans text-[#eee9df] placeholder-[#64748b] focus:outline-none focus:border-[#d83128]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-[#9f9b94] flex items-center space-x-1">
                    <IdCard className="w-3 h-3 text-[#d83128]" />
                    <span>RVU Student USN *</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={primaryUsn}
                    onChange={(e) => setPrimaryUsn(e.target.value)}
                    placeholder="e.g. RVU23BSE042"
                    className="w-full bg-[#11100f] border border-[#2a2622] px-3 py-2 text-xs font-mono uppercase text-[#eee9df] placeholder-[#64748b] focus:outline-none focus:border-[#d83128]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-[#9f9b94] flex items-center space-x-1">
                    <Mail className="w-3 h-3 text-[#d83128]" />
                    <span>RVU Student Email *</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={primaryEmail}
                    onChange={(e) => setPrimaryEmail(e.target.value)}
                    placeholder="arjun@rvu.edu.in"
                    className="w-full bg-[#11100f] border border-[#2a2622] px-3 py-2 text-xs font-sans text-[#eee9df] placeholder-[#64748b] focus:outline-none focus:border-[#d83128]"
                  />
                </div>
              </div>
            </div>

            {/* Additional Attendees for Group Mode */}
            {bookingMode === 'group' && selectedSeats.length > 1 && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-xs font-serif font-bold uppercase text-[#eee9df]">
                  <Users className="w-4 h-4 text-[#d83128]" />
                  <span>Additional Attendees ({attendees.length} Students)</span>
                </div>

                {attendees.map((att, idx) => (
                  <div key={att.seatId} className="bg-[#171513] border border-[#2a2622] p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-[#2a2622] pb-3">
                      <h4 className="text-xs font-serif font-bold uppercase text-[#eee9df]">
                        Attendee {idx + 2} • Seat {att.seatNumber} ({att.seatTier.toUpperCase()})
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono uppercase text-[#9f9b94]">First Name *</label>
                        <input
                          type="text"
                          required
                          value={att.firstName}
                          onChange={(e) => handleAttendeeChange(idx, 'firstName', e.target.value)}
                          placeholder="e.g. Diya"
                          className="w-full bg-[#11100f] border border-[#2a2622] px-3 py-2 text-xs font-sans text-[#eee9df] placeholder-[#64748b] focus:outline-none focus:border-[#d83128]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-mono uppercase text-[#9f9b94]">Last Name *</label>
                        <input
                          type="text"
                          required
                          value={att.lastName}
                          onChange={(e) => handleAttendeeChange(idx, 'lastName', e.target.value)}
                          placeholder="e.g. Verma"
                          className="w-full bg-[#11100f] border border-[#2a2622] px-3 py-2 text-xs font-sans text-[#eee9df] placeholder-[#64748b] focus:outline-none focus:border-[#d83128]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono uppercase text-[#9f9b94]">RVU Student USN *</label>
                        <input
                          type="text"
                          required
                          value={att.usn}
                          onChange={(e) => handleAttendeeChange(idx, 'usn', e.target.value)}
                          placeholder="e.g. RVU23BSE088"
                          className="w-full bg-[#11100f] border border-[#2a2622] px-3 py-2 text-xs font-mono uppercase text-[#eee9df] placeholder-[#64748b] focus:outline-none focus:border-[#d83128]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-mono uppercase text-[#9f9b94]">RVU Student Email *</label>
                        <input
                          type="email"
                          required
                          value={att.email}
                          onChange={(e) => handleAttendeeChange(idx, 'email', e.target.value)}
                          placeholder="diya@rvu.edu.in"
                          className="w-full bg-[#11100f] border border-[#2a2622] px-3 py-2 text-xs font-sans text-[#eee9df] placeholder-[#64748b] focus:outline-none focus:border-[#d83128]"
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
              className={`w-full py-3.5 px-6 font-sans text-xs font-bold uppercase tracking-wider border transition-colors flex items-center justify-center space-x-2 ${
                submitting
                  ? 'bg-[#171513] border-[#2a2622] text-[#64748b] cursor-not-allowed'
                  : 'bg-[#d83128] hover:bg-[#b8241c] text-white border-[#d83128] cursor-pointer'
              }`}
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin mr-2" />
                  <span>RECORDING RESERVATION & GENERATING PASS...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>CONFIRM RESERVATION & GENERATE PASS</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Order Summary */}
        <div className="space-y-4">
          <div className="bg-[#171513] border border-[#2a2622] p-5 space-y-4">
            <h3 className="text-sm font-serif font-bold uppercase text-[#eee9df] border-b border-[#2a2622] pb-2">
              Reservation Summary
            </h3>

            <div className="space-y-1">
              <span className="text-[10px] font-mono text-[#d83128] uppercase block">SCREENING</span>
              <div className="text-base font-serif font-bold text-[#eee9df] uppercase">{movie.title}</div>
              <div className="text-xs text-[#9f9b94] font-sans">{movie.genre} • {movie.duration_mins} MINS</div>
            </div>

            <div className="space-y-1 border-t border-[#2a2622] pt-3">
              <span className="text-[10px] font-mono text-[#d83128] uppercase block">HALL & TIMING</span>
              <div className="text-xs font-sans font-medium text-[#eee9df] uppercase">{showtime.auditorium_name}</div>
              <div className="text-xs text-[#9f9b94] font-mono">
                {new Date(showtime.start_time).toLocaleString('en-IN')}
              </div>
            </div>

            <div className="space-y-2 border-t border-[#2a2622] pt-3">
              <span className="text-[10px] font-mono text-[#d83128] uppercase block">ALLOCATED SEATS</span>
              <div className="space-y-1">
                {selectedSeats.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#9f9b94]">Seat {s.row_label}{s.col_number}</span>
                    <span className="text-[#eee9df] font-medium uppercase tracking-wider">{s.seat_tier} TIER</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-[#2a2622] pt-3 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-[#9f9b94]">
                <span>Allocated Capacity</span>
                <span className="text-[#eee9df]">{selectedSeats.length} {selectedSeats.length === 1 ? 'Seat' : 'Seats'}</span>
              </div>
              <div className="flex justify-between text-[#d83128]">
                <span>Society Privilege</span>
                <span>Free Campus Admission</span>
              </div>
              <div className="border-t border-[#2a2622] pt-2 flex justify-between text-sm font-bold text-[#eee9df]">
                <span className="font-serif">ADMISSION STATUS</span>
                <span className="text-[#d83128] uppercase">COMPLIMENTARY</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-[#171513] border border-[#2a2622] space-y-2 text-xs font-sans text-[#9f9b94]">
            <div className="flex items-center space-x-1.5 text-[#eee9df] font-serif font-bold uppercase">
              <ShieldCheck className="w-4 h-4 text-[#d83128]" />
              <span>ADMISSION REGULATION</span>
            </div>
            <p className="leading-relaxed">
              Admission is restricted to RV University students and faculty. Student ID matching the registered USN must be presented at the auditorium door.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
