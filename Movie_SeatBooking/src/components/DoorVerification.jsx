import React, { useState } from 'react';
import { verifyTicketAtomic } from '../lib/supabase.js';
import {
  QrCode,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  MapPin,
  Calendar,
  Ticket,
  User,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';

export function DoorVerification({ onBackToBrowse }) {
  const [ticketHashInput, setTicketHashInput] = useState('');
  const [usnInput, setUsnInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    if (!ticketHashInput.trim() && !usnInput.trim()) return;

    setVerifying(true);
    setVerificationResult(null);

    try {
      const res = await verifyTicketAtomic(
        ticketHashInput.trim() || null,
        usnInput.trim() || null
      );
      setVerificationResult(res);
    } catch (err) {
      console.error('[DoorVerification] Error verifying ticket:', err);
      setVerificationResult({
        valid: false,
        error: 'System error contacting database verification gateway.',
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleClear = () => {
    setTicketHashInput('');
    setUsnInput('');
    setVerificationResult(null);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="bg-slate-950 border border-slate-800 p-6 space-y-2 text-center">
        <div className="w-12 h-12 mx-auto bg-slate-900 border border-slate-700 flex items-center justify-center text-white">
          <QrCode className="w-6 h-6 text-rvu-accent" />
        </div>
        <div className="text-[10px] font-mono font-bold tracking-widest text-rvu-accent uppercase">
          RV UNIVERSITY VENUE CONTROL
        </div>
        <h1 className="text-xl sm:text-2xl font-black font-mono uppercase text-white tracking-wide">
          AUDITORIUM ADMISSION SCANNER
        </h1>
        <p className="text-xs font-mono text-slate-400 max-w-md mx-auto leading-relaxed">
          Authorized door portal. Instant verification of QR hashes and student USNs with atomic check-in locks.
        </p>
      </div>

      {/* Verification Query Form */}
      <div className="bg-slate-950 border border-slate-800 p-6 space-y-4">
        <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white border-b border-slate-800 pb-2">
          LOOKUP ADMISSION PASS
        </h2>

        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              Ticket QR Hash
            </label>
            <input
              type="text"
              value={ticketHashInput}
              onChange={(e) => setTicketHashInput(e.target.value)}
              placeholder="e.g. RVU-RVU23BSE042-M4K... or paste raw QR content"
              className="w-full bg-slate-900 border border-slate-700 px-3 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-rvu-accent"
            />
          </div>

          <div className="flex items-center space-x-3 text-center">
            <div className="flex-1 border-t border-slate-800" />
            <span className="text-[10px] font-mono text-slate-500 uppercase">OR SEARCH BY</span>
            <div className="flex-1 border-t border-slate-800" />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              Student USN
            </label>
            <input
              type="text"
              value={usnInput}
              onChange={(e) => setUsnInput(e.target.value)}
              placeholder="e.g. RVU23BSE042"
              className="w-full bg-slate-900 border border-slate-700 px-3 py-2 text-xs font-mono uppercase text-white placeholder-slate-600 focus:outline-none focus:border-rvu-accent"
            />
          </div>

          <div className="pt-2 flex items-center space-x-3">
            <button
              type="submit"
              disabled={verifying || (!ticketHashInput.trim() && !usnInput.trim())}
              className={`flex-1 py-3 px-4 font-mono text-xs font-bold uppercase tracking-wider border flex items-center justify-center space-x-2 transition-colors ${
                verifying || (!ticketHashInput.trim() && !usnInput.trim())
                  ? 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
                  : 'bg-rvu-accent hover:bg-orange-600 text-white border-rvu-accent cursor-pointer'
              }`}
            >
              {verifying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin mr-2" />
                  <span>VERIFYING DATABASE RECORD...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>VALIDATE & CHECK-IN TICKET</span>
                </>
              )}
            </button>

            {(ticketHashInput || usnInput || verificationResult) && (
              <button
                type="button"
                onClick={handleClear}
                className="px-4 py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-mono font-bold uppercase transition-colors"
                title="Reset search"
              >
                RESET
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Verification Result Display */}
      {verificationResult && (
        <div className="space-y-4">
          {/* Outcome A: APPROVED ADMISSION */}
          {verificationResult.valid && (
            <div className="bg-emerald-950/80 border-2 border-emerald-500 p-6 space-y-4 font-mono">
              <div className="flex items-center space-x-3">
                <CheckCircle2 className="w-7 h-7 text-emerald-400 shrink-0" />
                <div>
                  <h3 className="text-lg font-bold text-white uppercase tracking-wider">
                    ENTRY APPROVED • WELCOME TO RVU CINEMA
                  </h3>
                  <p className="text-xs text-emerald-300">
                    One-time admission recorded at{' '}
                    {new Date(verificationResult.checked_in_at).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: true,
                    })}
                  </p>
                </div>
              </div>

              {verificationResult.ticket && (
                <div className="bg-slate-950 border border-emerald-800/80 p-4 space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">STUDENT</span>
                      <span className="font-bold text-white">
                        {verificationResult.ticket.user_name} ({verificationResult.ticket.usn})
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">MOVIE</span>
                      <span className="font-bold text-white">{verificationResult.ticket.movie_title}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">AUDITORIUM</span>
                      <span className="font-bold text-white">{verificationResult.ticket.auditorium}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">ALLOCATED SEATS</span>
                      <span className="font-bold text-emerald-400">{verificationResult.ticket.seats}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Outcome B: ALREADY CHECKED IN (DUPLICATE PASS FRAUD GUARD) */}
          {verificationResult.already_checked_in && (
            <div className="bg-red-950/80 border-2 border-red-500 p-6 space-y-4 font-mono">
              <div className="flex items-center space-x-3">
                <XCircle className="w-7 h-7 text-red-400 shrink-0" />
                <div>
                  <h3 className="text-lg font-bold text-white uppercase tracking-wider">
                    ADMISSION DENIED • TICKET ALREADY USED
                  </h3>
                  <p className="text-xs text-red-300">
                    This ticket was already admitted at{' '}
                    {new Date(verificationResult.checked_in_at).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              {verificationResult.ticket && (
                <div className="bg-slate-950 border border-red-800/80 p-4 space-y-2 text-xs">
                  <p className="text-slate-300">
                    Originally issued to{' '}
                    <span className="font-bold text-white">
                      {verificationResult.ticket.user_name} ({verificationResult.ticket.usn})
                    </span>{' '}
                    for {verificationResult.ticket.movie_title} (Seats: {verificationResult.ticket.seats}).
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Outcome C: NOT FOUND / INVALID */}
          {!verificationResult.valid && !verificationResult.already_checked_in && (
            <div className="bg-slate-950 border-2 border-amber-500 p-6 space-y-2 font-mono">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    INVALID TICKET HASH / USN NOT FOUND
                  </h3>
                  <p className="text-xs text-slate-400">
                    {verificationResult.error || 'No matching reservation found in RVU database.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Return to Browse */}
      <div className="text-center pt-4">
        <button
          onClick={onBackToBrowse}
          className="text-xs font-mono font-bold uppercase text-slate-400 hover:text-white transition-colors"
        >
          ← RETURN TO PUBLIC CINEMA CATALOG
        </button>
      </div>
    </div>
  );
}
