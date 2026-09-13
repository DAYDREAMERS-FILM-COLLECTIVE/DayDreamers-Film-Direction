import React, { useState } from 'react';
import { verifyTicketAtomic } from '../lib/supabase.js';
import {
  QrCode,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MapPin,
  Calendar,
  Ticket,
  User,
  ShieldCheck,
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
      {/* Header */}
      <div className="bg-[#171513] border border-[#2a2622] p-6 space-y-2 text-center">
        <div className="w-10 h-10 mx-auto bg-[#11100f] border border-[#2a2622] flex items-center justify-center text-white">
          <QrCode className="w-5 h-5 text-[#d83128]" />
        </div>
        <span className="text-[10px] font-mono tracking-widest text-[#d83128] uppercase block">
          RV UNIVERSITY FILM PRODUCTION SOCIETY
        </span>
        <h1 className="text-xl sm:text-2xl font-serif font-bold uppercase text-[#eee9df]">
          Auditorium Admission Scanner
        </h1>
        <p className="text-xs font-sans text-[#9f9b94] max-w-md mx-auto leading-relaxed">
          Door admission verification. Real-time validation of pass hashes and student USNs with atomic entry records.
        </p>
      </div>

      {/* Query Form */}
      <div className="bg-[#171513] border border-[#2a2622] p-6 space-y-4">
        <h2 className="text-xs font-serif font-bold uppercase text-[#eee9df] border-b border-[#2a2622] pb-2">
          Verify Admission Pass
        </h2>

        <form onSubmit={handleVerify} className="space-y-4 text-xs font-sans">
          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase text-[#9f9b94]">Pass Hash</label>
            <input
              type="text"
              value={ticketHashInput}
              onChange={(e) => setTicketHashInput(e.target.value)}
              placeholder="e.g. FPS-RVU23BSE042-..."
              className="w-full bg-[#11100f] border border-[#2a2622] p-2 font-mono text-[#eee9df] placeholder-[#64748b] focus:border-[#d83128] focus:outline-none"
            />
          </div>

          <div className="flex items-center space-x-3 text-center">
            <div className="flex-1 border-t border-[#2a2622]" />
            <span className="text-[10px] font-mono text-[#9f9b94] uppercase">OR SEARCH BY USN</span>
            <div className="flex-1 border-t border-[#2a2622]" />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase text-[#9f9b94]">Student USN</label>
            <input
              type="text"
              value={usnInput}
              onChange={(e) => setUsnInput(e.target.value)}
              placeholder="e.g. RVU23BSE042"
              className="w-full bg-[#11100f] border border-[#2a2622] p-2 font-mono uppercase text-[#eee9df] placeholder-[#64748b] focus:border-[#d83128] focus:outline-none"
            />
          </div>

          <div className="pt-2 flex items-center space-x-3">
            <button
              type="submit"
              disabled={verifying || (!ticketHashInput.trim() && !usnInput.trim())}
              className={`flex-1 py-3 px-4 font-sans text-xs font-bold uppercase tracking-wider border transition-colors ${
                verifying || (!ticketHashInput.trim() && !usnInput.trim())
                  ? 'bg-[#11100f] text-[#64748b] border-[#2a2622] cursor-not-allowed'
                  : 'bg-[#d83128] hover:bg-[#b8241c] text-white border-[#d83128] cursor-pointer'
              }`}
            >
              {verifying ? 'VERIFYING WITH SUPABASE...' : 'VALIDATE & ADMIT STUDENT'}
            </button>

            {(ticketHashInput || usnInput || verificationResult) && (
              <button
                type="button"
                onClick={handleClear}
                className="px-4 py-3 bg-[#11100f] hover:bg-[#1e1b18] text-[#9f9b94] hover:text-white border border-[#2a2622] text-xs font-mono uppercase transition-colors"
              >
                RESET
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Verification Results */}
      {verificationResult && (
        <div className="space-y-4">
          {verificationResult.valid && (
            <div className="bg-[#171513] border-2 border-[#10b981] p-6 space-y-4">
              <div className="flex items-center space-x-3">
                <CheckCircle2 className="w-6 h-6 text-[#10b981] shrink-0" />
                <div>
                  <h3 className="text-base font-serif font-bold text-white uppercase">
                    Admission Approved • Welcome to Screening
                  </h3>
                  <p className="text-xs text-[#9f9b94] font-mono">
                    Admitted at {new Date(verificationResult.checked_in_at).toLocaleTimeString('en-IN')}
                  </p>
                </div>
              </div>

              {verificationResult.ticket && (
                <div className="bg-[#11100f] border border-[#2a2622] p-4 text-xs font-mono space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] text-[#9f9b94] uppercase block">STUDENT</span>
                      <span className="font-bold text-[#eee9df]">
                        {verificationResult.ticket.user_name} ({verificationResult.ticket.usn})
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#9f9b94] uppercase block">FILM</span>
                      <span className="font-bold text-[#eee9df]">{verificationResult.ticket.movie_title}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#9f9b94] uppercase block">HALL</span>
                      <span className="font-bold text-[#eee9df]">{verificationResult.ticket.auditorium}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#9f9b94] uppercase block">SEATS</span>
                      <span className="font-bold text-[#d83128]">{verificationResult.ticket.seats}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {verificationResult.already_checked_in && (
            <div className="bg-[#171513] border-2 border-[#d83128] p-6 space-y-3">
              <div className="flex items-center space-x-3">
                <XCircle className="w-6 h-6 text-[#d83128] shrink-0" />
                <div>
                  <h3 className="text-base font-serif font-bold text-white uppercase">
                    Pass Already Admitted • Duplicate Entry Denied
                  </h3>
                  <p className="text-xs text-[#d83128] font-mono">
                    Admitted at {new Date(verificationResult.checked_in_at).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {!verificationResult.valid && !verificationResult.already_checked_in && (
            <div className="bg-[#171513] border border-[#f59e0b] p-5 space-y-2">
              <div className="flex items-center space-x-2 text-[#f59e0b]">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h3 className="text-xs font-mono font-bold uppercase">Pass Not Found</h3>
              </div>
              <p className="text-xs text-[#9f9b94] font-sans">
                {verificationResult.error || 'No matching reservation found in Supabase database.'}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="text-center pt-2">
        <button
          onClick={onBackToBrowse}
          className="text-xs font-mono uppercase text-[#9f9b94] hover:text-[#eee9df] transition-colors"
        >
          ← RETURN TO PUBLIC SCREENINGS
        </button>
      </div>
    </div>
  );
}
