import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import emailjs from '@emailjs/browser';
import {
  CheckCircle2,
  Printer,
  Calendar,
  Clock,
  MapPin,
  Ticket,
  User,
  Mail,
  ShieldCheck,
  Send,
  AlertCircle,
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
    bookingMode,
    confirmedAt,
  } = bookingData;

  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [emailStatus, setEmailStatus] = useState('idle'); // 'idle' | 'sending' | 'sent' | 'skipped' | 'error'
  const canvasRef = useRef(null);

  // Trigger celebration confetti and generate QR code on mount
  useEffect(() => {
    // 1. Confetti burst
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FF6B00', '#10B981', '#38BDF8', '#F59E0B'],
      });
    } catch (e) {
      // Ignore if canvas confetti fails in non-browser environment
    }

    // 2. Generate QR Code
    const verifyPayload = JSON.stringify({
      hash: ticketHash,
      usn: primaryBooker.usn,
      bookingId,
      showtimeId: showtime.id,
    });

    QRCode.toDataURL(
      verifyPayload,
      {
        width: 256,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      },
      (err, url) => {
        if (!err && url) {
          setQrCodeDataUrl(url);
        }
      }
    );

    // 3. Attempt EmailJS delivery if configured
    sendConfirmationEmail();
  }, [ticketHash]);

  const sendConfirmationEmail = async () => {
    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

    if (!serviceId || !templateId || !publicKey) {
      setEmailStatus('skipped');
      return;
    }

    setEmailStatus('sending');
    try {
      const seatsText = seats.map((s) => `${s.row_label}${s.col_number}`).join(', ');
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(ticketHash)}`;

      await emailjs.send(
        serviceId,
        templateId,
        {
          to_name: primaryBooker.name,
          to_email: primaryBooker.email,
          movie_title: movie.title,
          auditorium: showtime.auditorium_name,
          screening_time: new Date(showtime.start_time).toLocaleString('en-IN'),
          seats: seatsText,
          total_amount: `₹${totalAmount}`,
          ticket_hash: ticketHash,
          qr_code_url: qrImageUrl,
        },
        publicKey
      );

      setEmailStatus('sent');
    } catch (err) {
      console.warn('[EmailJS] Notification delivery notice:', err);
      setEmailStatus('error');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const seatsFormatted = seats.map((s) => `${s.row_label}${s.col_number}`).join(', ');

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Status Header */}
      <div className="bg-emerald-950/80 border border-emerald-500 p-4 text-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center space-x-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <span className="font-bold uppercase tracking-wider">BOOKING CONFIRMED & SEATS LOCKED</span>
            <p className="text-[11px] text-emerald-300">
              Admission pass generated for {primaryBooker.name} ({primaryBooker.usn}).
            </p>
          </div>
        </div>

        {/* Email status tag */}
        <div className="text-[10px] uppercase font-mono px-2 py-1 bg-slate-900 border border-emerald-600 text-slate-300">
          {emailStatus === 'sent' && 'EMAIL RECEIPT DISPATCHED'}
          {emailStatus === 'sending' && 'DISPATCHING EMAIL...'}
          {emailStatus === 'skipped' && 'PASS READY FOR ADMISSION'}
          {emailStatus === 'error' && 'PASS SAVED IN RVU DATABASE'}
        </div>
      </div>

      {/* Official Cinema Pass Container (Printable, Sharp Rectilinear Design) */}
      <div className="bg-slate-950 border-2 border-slate-700 p-6 sm:p-8 space-y-6 print:border-black print:bg-white print:text-black">
        {/* Pass Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b-2 border-dashed border-slate-800 pb-6 gap-4">
          <div className="space-y-1">
            <div className="text-[10px] font-mono font-bold tracking-widest text-rvu-accent uppercase">
              RV UNIVERSITY CAMPUS CINEMA
            </div>
            <h1 className="text-xl sm:text-2xl font-black font-mono uppercase text-white tracking-wide print:text-black">
              OFFICIAL ADMISSION PASS
            </h1>
            <p className="text-[11px] font-mono text-slate-400 print:text-slate-600">
              TICKET HASH: <span className="text-amber-400 font-bold print:text-black">{ticketHash}</span>
            </p>
          </div>

          <div className="text-left sm:text-right font-mono text-xs text-slate-400 print:text-slate-600">
            <div className="text-[10px] uppercase text-slate-500">BOOKING REF</div>
            <div className="font-bold text-white uppercase print:text-black">{bookingId.substring(0, 16)}</div>
            <div className="text-[10px] text-slate-500 mt-1">
              {new Date(confirmedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
            </div>
          </div>
        </div>

        {/* Pass Main Body */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left 2 Cols: Movie & Screening Details */}
          <div className="md:col-span-2 space-y-4">
            <div>
              <div className="text-[10px] font-mono uppercase text-rvu-accent font-bold">SCREENING</div>
              <h2 className="text-lg font-bold font-mono uppercase text-white tracking-tight print:text-black">
                {movie.title}
              </h2>
              <p className="text-xs font-mono text-slate-400 print:text-slate-600">
                {movie.genre} • {movie.duration_mins} MINS • RATING {movie.age_rating}
              </p>
            </div>

            {/* Grid of Key Info */}
            <div className="grid grid-cols-2 gap-4 pt-2 font-mono text-xs">
              <div className="p-3 bg-slate-900 border border-slate-800 space-y-1 print:bg-slate-100 print:border-slate-300">
                <div className="text-[10px] text-slate-500 uppercase flex items-center space-x-1">
                  <MapPin className="w-3 h-3 text-rvu-accent" />
                  <span>AUDITORIUM</span>
                </div>
                <div className="font-bold text-white print:text-black">{showtime.auditorium_name}</div>
              </div>

              <div className="p-3 bg-slate-900 border border-slate-800 space-y-1 print:bg-slate-100 print:border-slate-300">
                <div className="text-[10px] text-slate-500 uppercase flex items-center space-x-1">
                  <Calendar className="w-3 h-3 text-rvu-accent" />
                  <span>DATE & TIME</span>
                </div>
                <div className="font-bold text-white print:text-black">
                  {new Date(showtime.start_time).toLocaleDateString('en-IN', {
                    month: 'short',
                    day: 'numeric',
                  })}{' '}
                  •{' '}
                  {new Date(showtime.start_time).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </div>
              </div>
            </div>

            {/* Reserved Seats Badge List */}
            <div className="p-3 bg-slate-900 border border-slate-800 space-y-2 print:bg-slate-100 print:border-slate-300 font-mono text-xs">
              <div className="text-[10px] text-slate-500 uppercase flex items-center space-x-1">
                <Ticket className="w-3 h-3 text-rvu-accent" />
                <span>CONFIRMED SEATS ({seats.length})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {seats.map((s) => (
                  <span
                    key={s.id}
                    className={`px-2.5 py-1 text-xs font-bold border ${
                      s.seat_tier === 'vip'
                        ? 'bg-purple-950 border-purple-600 text-purple-300 print:bg-purple-100 print:text-purple-900'
                        : 'bg-emerald-950 border-emerald-600 text-emerald-300 print:bg-emerald-100 print:text-emerald-900'
                    }`}
                  >
                    {s.row_label}{s.col_number} ({s.seat_tier.toUpperCase()})
                  </span>
                ))}
              </div>
            </div>

            {/* Attendees details */}
            <div className="p-3 bg-slate-900/60 border border-slate-800 space-y-1 text-xs font-mono print:border-slate-300">
              <div className="text-[10px] text-slate-500 uppercase">STUDENT CREDENTIALS</div>
              <div className="text-white font-bold print:text-black">
                {primaryBooker.name} • USN: {primaryBooker.usn}
              </div>
              <div className="text-[11px] text-slate-400 print:text-slate-600">{primaryBooker.email}</div>

              {attendees && attendees.length > 0 && (
                <div className="pt-2 border-t border-slate-800 mt-2 space-y-1">
                  <div className="text-[10px] text-slate-500 uppercase">ADDITIONAL ATTENDEES</div>
                  {attendees.map((att, i) => (
                    <div key={i} className="text-[11px] text-slate-300 print:text-black">
                      {att.seat_label}: {att.name} ({att.usn})
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right 1 Col: Scannable Door QR Code */}
          <div className="flex flex-col items-center justify-center p-4 bg-white border border-slate-300 text-black text-center space-y-3">
            <div className="text-[9px] font-mono font-bold tracking-widest text-slate-500 uppercase">
              SCAN AT AUDITORIUM DOOR
            </div>
            {qrCodeDataUrl ? (
              <img
                src={qrCodeDataUrl}
                alt="Ticket QR Code"
                className="w-44 h-44 border border-slate-200"
              />
            ) : (
              <div className="w-44 h-44 border border-slate-300 flex items-center justify-center text-xs font-mono text-slate-400">
                GENERATING QR...
              </div>
            )}
            <div className="text-[9px] font-mono font-bold tracking-tight text-slate-700 uppercase">
              ONE-TIME ENTRY ONLY
            </div>
          </div>
        </div>

        {/* Pass Footer */}
        <div className="border-t-2 border-dashed border-slate-800 pt-4 flex flex-col sm:flex-row items-center justify-between text-[10px] font-mono text-slate-500 gap-2 print:text-slate-600">
          <div>RV UNIVERSITY • CAMPUS CINEMA SOCIETY • BANGALORE</div>
          <div className="font-bold text-slate-400 print:text-black">TOTAL AMOUNT PAID: ₹{totalAmount}</div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-950 border border-slate-800 print:hidden">
        <button
          onClick={handlePrint}
          className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-mono font-bold uppercase tracking-wider border border-slate-700 flex items-center justify-center space-x-2 transition-colors"
        >
          <Printer className="w-4 h-4" />
          <span>PRINT / SAVE TICKET PASS (PDF)</span>
        </button>

        <button
          onClick={onBookAnother}
          className="w-full sm:w-auto px-5 py-2.5 bg-rvu-accent hover:bg-orange-600 text-white text-xs font-mono font-bold uppercase tracking-wider border border-rvu-accent flex items-center justify-center space-x-2 transition-colors"
        >
          <span>BOOK ANOTHER SCREENING</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
