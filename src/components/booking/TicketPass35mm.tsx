'use client';

import React from 'react';
import { TicketPassPayload } from '@/types';
import { Printer, CheckCircle, Film, QrCode, ArrowLeft } from 'lucide-react';
import Image from 'next/image';

export const TicketPass35mm: React.FC<{
  tickets: TicketPassPayload[];
  onDone: () => void;
}> = ({ tickets, onDone }) => {
  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 py-4">
      {/* Header Notification */}
      <div className="bg-emerald-950/60 border border-emerald-500/50 p-4 rounded-xl flex items-center justify-between text-xs font-mono text-emerald-300">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <div className="font-bold uppercase tracking-wider">RESERVATION CONFIRMED // ADMISSION GRANTED</div>
            <div className="text-[11px] text-emerald-400/80">
              Present this 35mm pass with QR code at the door scanner.
            </div>
          </div>
        </div>

        <button
          onClick={() => window.print()}
          className="px-3.5 py-2 rounded-lg bg-emerald-500 text-black font-bold flex items-center gap-2 hover:bg-emerald-400 transition"
        >
          <Printer className="w-4 h-4" />
          <span className="hidden sm:inline">PRINT PASS</span>
        </button>
      </div>

      {/* Ticket Passes Container */}
      <div className="space-y-6">
        {tickets.map((ticket, idx) => (
          <div
            key={ticket.ticketId}
            className="relative bg-[#0d0f14] border border-white/15 rounded-xl shadow-2xl overflow-hidden text-zinc-200 print:border-black print:text-black print:bg-white"
          >
            {/* Top 35mm Sprocket Perforations */}
            <div className="h-6 bg-black flex items-center justify-between px-3 border-b border-white/10 print:bg-zinc-200">
              {Array.from({ length: 18 }).map((_, i) => (
                <div
                  key={i}
                  className="w-2.5 h-3.5 rounded-sm bg-[#1a1d26] border border-white/10 print:bg-white"
                />
              ))}
            </div>

            {/* Ticket Body */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* Left 2 Cols: Screening Info */}
              <div className="md:col-span-2 space-y-4">
                <div className="flex items-center gap-2 text-xs font-mono text-neon-cyan">
                  <Film className="w-3.5 h-3.5" />
                  <span>35MM ANAMORPHIC ADMISSION PASS #{idx + 1}</span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-white print:text-black">
                  {ticket.movieTitle}
                </h3>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-2.5 rounded bg-black/40 border border-white/5 print:bg-zinc-100">
                    <span className="text-[10px] text-zinc-500 block">SEAT ASSIGNMENT</span>
                    <span className="text-lg font-bold text-white print:text-black">{ticket.seatId}</span>
                  </div>
                  <div className="p-2.5 rounded bg-black/40 border border-white/5 print:bg-zinc-100">
                    <span className="text-[10px] text-zinc-500 block">ADMISSION TIER</span>
                    <span className="text-emerald-400 font-bold">100% FREE</span>
                  </div>
                </div>

                <div className="space-y-1 text-xs font-mono text-zinc-400">
                  <div><span className="text-zinc-500">VENUE:</span> {ticket.venue}</div>
                  <div><span className="text-zinc-500">SHOWTIME:</span> {ticket.startTime}</div>
                  <div><span className="text-zinc-500">GUEST USN:</span> {ticket.attendeeUsn}</div>
                  <div><span className="text-zinc-500">EMAIL:</span> {ticket.attendeeEmail}</div>
                </div>
              </div>

              {/* Right Col: Cryptographic QR Code */}
              <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-white text-black text-center shadow-md">
                <img
                  src={ticket.qrDataUrl}
                  alt={`QR Code for seat ${ticket.seatId}`}
                  className="w-36 h-36 object-contain"
                />
                <div className="text-[9px] font-mono font-bold mt-1 tracking-wider text-zinc-700">
                  CRYPTOGRAPHIC SCAN
                </div>
                <div className="text-[8px] font-mono text-zinc-500 truncate max-w-[140px]">
                  {ticket.qrHash.substring(0, 16)}...
                </div>
              </div>
            </div>

            {/* Bottom 35mm Sprocket Perforations */}
            <div className="h-6 bg-black flex items-center justify-between px-3 border-t border-white/10 print:bg-zinc-200">
              {Array.from({ length: 18 }).map((_, i) => (
                <div
                  key={i}
                  className="w-2.5 h-3.5 rounded-sm bg-[#1a1d26] border border-white/10 print:bg-white"
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Done / Return Action */}
      <div className="flex justify-center pt-4 print:hidden">
        <button
          onClick={onDone}
          className="px-6 py-3 rounded-xl font-mono text-xs border border-white/20 hover:border-white text-white transition flex items-center gap-2 bg-surface"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>RETURN TO FILM SHOWCASE</span>
        </button>
      </div>
    </div>
  );
};
