import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  Printer,
  Calendar,
  Clock,
  MapPin,
  Ticket,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';

export function TicketPass({ bookingData, onBookAnother }) {
  const {
    bookingId,
    ticketHash,
    totalAmount,
    primaryBooker,
    attendees,
    seats,
    movie,
    showtime,
    confirmedAt,
  } = bookingData;

  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');

  useEffect(() => {
    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#d83128', '#eee9df', '#2a2622', '#d4af37'],
      });
    } catch (e) {}

    const verifyPayload = JSON.stringify({
      hash: ticketHash,
      usn: primaryBooker.usn,
      bookingId,
      showtimeId: showtime.id,
    });

    QRCode.toDataURL(
      verifyPayload,
      {
        width: 240,
        margin: 1,
        color: {
          dark: '#11100f',
          light: '#ffffff',
        },
      },
      (err, url) => {
        if (!err && url) {
          setQrCodeDataUrl(url);
        }
      }
    );
  }, [ticketHash]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Status Bar */}
      <div className="bg-[#171513] border border-[#2a2622] p-4 text-[#eee9df] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-sans">
        <div className="flex items-center space-x-2.5">
          <CheckCircle2 className="w-5 h-5 text-[#d83128] shrink-0" />
          <div>
            <span className="font-serif font-bold uppercase tracking-wider text-base">
              Admission Pass Issued & Confirmed
            </span>
            <p className="text-xs text-[#9f9b94] font-mono">
              Registered to {primaryBooker.name} ({primaryBooker.usn})
            </p>
          </div>
        </div>
        <div className="text-[10px] font-mono uppercase px-2.5 py-1 bg-[#11100f] border border-[#2a2622] text-[#d83128]">
          STATUS: VALID FOR ENTRY
        </div>
      </div>

      {/* 35mm Archival Cinema Pass */}
      <div className="bg-[#171513] border border-[#2a2622] p-6 sm:p-8 space-y-6 print:bg-white print:text-black print:border-black shadow-2xl">
        {/* Pass Top Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-[#2a2622] pb-6 gap-4 print:border-black">
          <div className="space-y-1">
            <span className="text-[10px] font-mono tracking-widest text-[#d83128] uppercase block">
              RV UNIVERSITY FILM PRODUCTION SOCIETY
            </span>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#eee9df] uppercase print:text-black">
              Official Cinema Pass
            </h1>
            <p className="text-xs font-mono text-[#9f9b94] print:text-black">
              PASS REF: <span className="text-[#d83128] font-bold">{ticketHash}</span>
            </p>
          </div>

          <div className="text-left sm:text-right font-mono text-xs text-[#9f9b94] print:text-black">
            <div className="text-[10px] uppercase text-[#64748b]">BOOKING ID</div>
            <div className="font-bold text-[#eee9df] uppercase print:text-black">{bookingId.substring(0, 16)}</div>
            <div className="text-[10px] text-[#64748b] mt-0.5">
              {new Date(confirmedAt).toLocaleTimeString('en-IN')}
            </div>
          </div>
        </div>

        {/* Pass Body */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <div>
              <span className="text-[10px] font-mono uppercase text-[#d83128] block">FILM TITLE</span>
              <h2 className="text-xl font-serif font-bold uppercase text-[#eee9df] print:text-black">
                {movie.title}
              </h2>
              <p className="text-xs font-sans text-[#9f9b94] print:text-black">
                {movie.genre} • {movie.duration_mins} MINS • RATING {movie.age_rating}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 bg-[#11100f] border border-[#2a2622] space-y-1 print:bg-slate-100 print:border-black">
                <span className="text-[9px] text-[#9f9b94] uppercase flex items-center space-x-1">
                  <MapPin className="w-3 h-3 text-[#d83128]" />
                  <span>HALL</span>
                </span>
                <span className="font-bold text-[#eee9df] block truncate print:text-black">{showtime.auditorium_name}</span>
              </div>

              <div className="p-3 bg-[#11100f] border border-[#2a2622] space-y-1 print:bg-slate-100 print:border-black">
                <span className="text-[9px] text-[#9f9b94] uppercase flex items-center space-x-1">
                  <Calendar className="w-3 h-3 text-[#d83128]" />
                  <span>SCHEDULE</span>
                </span>
                <span className="font-bold text-[#eee9df] block print:text-black">
                  {new Date(showtime.start_time).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} • {new Date(showtime.start_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                </span>
              </div>
            </div>

            {/* Reserved Seats List */}
            <div className="p-3 bg-[#11100f] border border-[#2a2622] space-y-2 print:bg-slate-100 print:border-black">
              <span className="text-[10px] font-mono text-[#9f9b94] uppercase flex items-center space-x-1">
                <Ticket className="w-3 h-3 text-[#d83128]" />
                <span>ALLOCATED SEATS ({seats.length})</span>
              </span>
              <div className="flex flex-wrap gap-2">
                {seats.map((s) => (
                  <span
                    key={s.id}
                    className={`px-2.5 py-1 text-xs font-mono font-bold border ${
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

            {/* Student Credentials */}
            <div className="p-3 bg-[#11100f] border border-[#2a2622] space-y-1 text-xs font-mono print:bg-slate-100 print:border-black">
              <span className="text-[10px] text-[#9f9b94] uppercase block">PASS HOLDER</span>
              <div className="font-bold text-[#eee9df] print:text-black">
                {primaryBooker.name} • USN: {primaryBooker.usn}
              </div>
              <div className="text-[11px] text-[#9f9b94] print:text-black">{primaryBooker.email}</div>

              {attendees && attendees.length > 0 && (
                <div className="pt-2 border-t border-[#2a2622] mt-2 space-y-1 print:border-black">
                  <span className="text-[10px] text-[#9f9b94] uppercase block">GROUP ATTENDEES</span>
                  {attendees.map((att, i) => (
                    <div key={i} className="text-[11px] text-[#eee9df] print:text-black">
                      {att.seat_label}: {att.name} ({att.usn})
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* QR Code Container */}
          <div className="flex flex-col items-center justify-center p-4 bg-white border border-[#2a2622] text-black text-center space-y-3">
            <span className="text-[9px] font-mono font-bold tracking-widest text-[#64748b] uppercase">
              DOOR ADMISSION QR
            </span>
            {qrCodeDataUrl ? (
              <img
                src={qrCodeDataUrl}
                alt="Ticket QR"
                className="w-44 h-44 border border-slate-200"
              />
            ) : (
              <div className="w-44 h-44 border border-slate-300 flex items-center justify-center text-xs font-mono text-slate-500">
                GENERATING QR...
              </div>
            )}
            <span className="text-[9px] font-mono font-bold text-slate-800 uppercase">
              ONE-TIME ENTRY ONLY
            </span>
          </div>
        </div>

        {/* Pass Footer */}
        <div className="border-t border-[#2a2622] pt-4 flex flex-col sm:flex-row items-center justify-between text-[10px] font-mono text-[#9f9b94] gap-2 print:border-black print:text-black">
          <div>RV UNIVERSITY • CAMPUS CINEMA SOCIETY • BANGALORE</div>
          <div className="font-bold text-[#eee9df] print:text-black uppercase tracking-wider">CAMPUS ACCESS • COMPLIMENTARY</div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-[#171513] border border-[#2a2622] print:hidden">
        <button
          onClick={handlePrint}
          className="w-full sm:w-auto px-5 py-2.5 bg-[#11100f] hover:bg-[#1e1b18] text-[#eee9df] text-xs font-sans font-bold uppercase tracking-wider border border-[#2a2622] flex items-center justify-center space-x-2 transition-colors cursor-pointer"
        >
          <Printer className="w-4 h-4 text-[#d83128]" />
          <span>PRINT / SAVE PASS (PDF)</span>
        </button>

        <button
          onClick={onBookAnother}
          className="w-full sm:w-auto px-5 py-2.5 bg-[#d83128] hover:bg-[#b8241c] text-white text-xs font-sans font-bold uppercase tracking-wider border border-[#d83128] flex items-center justify-center space-x-2 transition-colors cursor-pointer"
        >
          <span>EXPLORE SCREENINGS</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
