import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { verifyTicketAtomic } from '../lib/supabase.js';
import { cinemaAudio } from '../lib/audio.js';
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
  Camera,
  CameraOff,
  RefreshCw,
} from 'lucide-react';

export function DoorVerification({ onBackToBrowse }) {
  const [activeScanMode, setActiveScanMode] = useState('camera'); // 'camera' | 'manual'
  const [ticketHashInput, setTicketHashInput] = useState('');
  const [usnInput, setUsnInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);

  // Camera state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const html5QrCodeRef = useRef(null);
  const scannerContainerId = 'reader-qr-viewfinder';

  // Process verification
  const executeVerification = async (ticketHash = null, usn = null) => {
    setVerifying(true);
    setVerificationResult(null);

    try {
      const res = await verifyTicketAtomic(ticketHash, usn);
      setVerificationResult(res);

      if (res && res.valid) {
        cinemaAudio.playStampSound();
      }
    } catch (err) {
      console.error('[DoorVerification] Error verifying ticket:', err);
      setVerificationResult({
        valid: false,
        error: 'System error contacting Supabase database verification gateway.',
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleManualSubmit = (e) => {
    if (e) e.preventDefault();
    if (!ticketHashInput.trim() && !usnInput.trim()) return;
    executeVerification(ticketHashInput.trim() || null, usnInput.trim() || null);
  };

  const handleClear = () => {
    setTicketHashInput('');
    setUsnInput('');
    setVerificationResult(null);
  };

  // Start HTML5 QR Scanner
  const startCamera = async () => {
    setCameraError('');
    try {
      const html5QrCode = new Html5Qrcode(scannerContainerId);
      html5QrCodeRef.current = html5QrCode;

      const qrCodeSuccessCallback = (decodedText) => {
        try {
          // Parse JSON payload or accept raw hash
          let hashToVerify = decodedText;
          let usnToVerify = null;

          if (decodedText.startsWith('{')) {
            const parsed = JSON.parse(decodedText);
            hashToVerify = parsed.hash || parsed.bid || decodedText;
            usnToVerify = parsed.usn || null;
          }

          setTicketHashInput(hashToVerify);
          if (usnToVerify) setUsnInput(usnToVerify);

          executeVerification(hashToVerify, usnToVerify);
        } catch (e) {
          executeVerification(decodedText, null);
        }
      };

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        qrCodeSuccessCallback,
        undefined
      );

      setIsCameraActive(true);
    } catch (err) {
      console.warn('[DoorVerification] Camera start failed:', err);
      setCameraError('Camera access denied or unavailable. Please switch to manual USN input.');
      setIsCameraActive(false);
      setActiveScanMode('manual');
    }
  };

  // Stop HTML5 QR Scanner
  const stopCamera = async () => {
    if (html5QrCodeRef.current && isCameraActive) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('[DoorVerification] Camera stop notice:', err);
      } finally {
        setIsCameraActive(false);
      }
    }
  };

  useEffect(() => {
    if (activeScanMode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [activeScanMode]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-[#131110] border border-[#26221f] p-6 space-y-2 text-center shadow-xl">
        <div className="w-10 h-10 mx-auto bg-[#080706] border border-[#26221f] flex items-center justify-center text-white">
          <QrCode className="w-5 h-5 text-[#d83128]" />
        </div>
        <span className="text-[10px] font-mono tracking-widest text-[#d83128] uppercase block font-bold">
          RV UNIVERSITY FILM PRODUCTION SOCIETY
        </span>
        <h1 className="text-xl sm:text-2xl font-serif font-black uppercase text-[#eee9df]">
          Auditorium Door Scanner
        </h1>
        <p className="text-xs font-sans text-[#8c867e] max-w-md mx-auto leading-relaxed">
          Door admission verification. Real-time validation of 35mm pass hashes and student USNs with atomic entry timestamping.
        </p>

        {/* Mode Switcher */}
        <div className="pt-4 flex items-center justify-center space-x-2">
          <button
            onClick={() => setActiveScanMode('camera')}
            className={`px-4 py-2 text-xs font-mono uppercase tracking-wider flex items-center space-x-2 border transition-colors cursor-pointer ${
              activeScanMode === 'camera'
                ? 'bg-[#d83128] text-white border-[#d83128]'
                : 'bg-[#080706] text-[#8c867e] border-[#26221f] hover:text-[#eee9df]'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>LIVE CAMERA SCANNER</span>
          </button>

          <button
            onClick={() => setActiveScanMode('manual')}
            className={`px-4 py-2 text-xs font-mono uppercase tracking-wider flex items-center space-x-2 border transition-colors cursor-pointer ${
              activeScanMode === 'manual'
                ? 'bg-[#d83128] text-white border-[#d83128]'
                : 'bg-[#080706] text-[#8c867e] border-[#26221f] hover:text-[#eee9df]'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>MANUAL USN SEARCH</span>
          </button>
        </div>
      </div>

      {/* Mode A: Live Camera QR Scanner */}
      {activeScanMode === 'camera' && (
        <div className="bg-[#131110] border border-[#26221f] p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#26221f] pb-3">
            <span className="text-xs font-serif font-bold uppercase text-[#eee9df]">
              Optical QR Viewfinder Target
            </span>
            <span className="text-[10px] font-mono text-[#8c867e] uppercase">
              15 FPS LIVE FEED
            </span>
          </div>

          {cameraError ? (
            <div className="p-4 bg-[#1e1411] border border-[#d83128] text-[#eee9df] text-xs font-sans space-y-2">
              <div className="flex items-center space-x-2 text-[#d83128] font-bold font-mono uppercase">
                <CameraOff className="w-4 h-4" />
                <span>CAMERA HARDWARE RESTRICTED</span>
              </div>
              <p>{cameraError}</p>
              <button
                onClick={() => setActiveScanMode('manual')}
                className="px-3 py-1.5 bg-[#d83128] text-white text-[11px] font-mono uppercase cursor-pointer"
              >
                USE MANUAL USN INPUT INSTEAD
              </button>
            </div>
          ) : (
            <div className="relative border border-[#26221f] bg-[#080706] overflow-hidden">
              <div
                id={scannerContainerId}
                className="w-full min-h-[300px] overflow-hidden"
              />

              {/* 35mm Camera Viewfinder Overlay with Reticle Crop Marks */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="relative w-56 h-56 border border-[#d83128]/50 flex items-center justify-center">
                  <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-[#d83128]" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-[#d83128]" />
                  <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-[#d83128]" />
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-[#d83128]" />
                  <div className="w-2 h-2 bg-[#d83128] animate-ping" />
                  <span className="absolute -bottom-6 text-[9px] font-mono tracking-widest uppercase text-[#d83128] bg-[#080706] px-2 border border-[#26221f]">
                    ALIGN 35MM QR PASS
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mode B: Manual Search */}
      {activeScanMode === 'manual' && (
        <div className="bg-[#131110] border border-[#26221f] p-6 space-y-4 shadow-xl">
          <h2 className="text-xs font-serif font-bold uppercase text-[#eee9df] border-b border-[#26221f] pb-2">
            Manual Credential Query
          </h2>

          <form onSubmit={handleManualSubmit} className="space-y-4 text-xs font-sans">
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase text-[#8c867e]">Pass Hash / Ref</label>
              <input
                type="text"
                value={ticketHashInput}
                onChange={(e) => setTicketHashInput(e.target.value)}
                placeholder="e.g. FPS-RVU23BSE042-..."
                className="w-full bg-[#080706] border border-[#26221f] p-2 font-mono text-[#eee9df] placeholder-[#64748b] focus:border-[#d83128] focus:outline-none"
              />
            </div>

            <div className="flex items-center space-x-3 text-center">
              <div className="flex-1 border-t border-[#26221f]" />
              <span className="text-[10px] font-mono text-[#8c867e] uppercase">OR SEARCH BY USN</span>
              <div className="flex-1 border-t border-[#26221f]" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase text-[#8c867e]">Student USN</label>
              <input
                type="text"
                value={usnInput}
                onChange={(e) => setUsnInput(e.target.value.toUpperCase())}
                placeholder="e.g. RVU23BSE042"
                className="w-full bg-[#080706] border border-[#26221f] p-2 font-mono uppercase text-[#eee9df] placeholder-[#64748b] focus:border-[#d83128] focus:outline-none"
              />
            </div>

            <div className="pt-2 flex items-center space-x-3">
              <button
                type="submit"
                disabled={verifying || (!ticketHashInput.trim() && !usnInput.trim())}
                className={`flex-1 py-3 px-4 font-sans text-xs font-bold uppercase tracking-wider border transition-colors ${
                  verifying || (!ticketHashInput.trim() && !usnInput.trim())
                    ? 'bg-[#080706] text-[#64748b] border-[#26221f] cursor-not-allowed'
                    : 'bg-[#d83128] hover:bg-[#b8241c] text-white border-[#d83128] cursor-pointer'
                }`}
              >
                {verifying ? 'VERIFYING WITH SUPABASE...' : 'VALIDATE & ADMIT STUDENT'}
              </button>

              {(ticketHashInput || usnInput || verificationResult) && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-4 py-3 bg-[#080706] hover:bg-[#1e1b18] text-[#8c867e] hover:text-white border border-[#26221f] text-xs font-mono uppercase transition-colors cursor-pointer"
                >
                  RESET
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Verification Result Display */}
      {verificationResult && (
        <div className="space-y-4">
          {/* 1. Valid First-Time Entry (Green HUD) */}
          {verificationResult.valid && (
            <div className="bg-[#131110] border-2 border-[#10b981] p-6 space-y-4 shadow-2xl">
              <div className="flex items-center space-x-3">
                <CheckCircle2 className="w-7 h-7 text-[#10b981] shrink-0" />
                <div>
                  <h3 className="text-lg font-serif font-black text-[#10b981] uppercase">
                    Admission Approved • Welcome to Screening
                  </h3>
                  <p className="text-xs text-[#8c867e] font-mono">
                    Admitted at {new Date(verificationResult.checked_in_at).toLocaleTimeString('en-IN')}
                  </p>
                </div>
              </div>

              {verificationResult.ticket && (
                <div className="bg-[#080706] border border-[#26221f] p-4 text-xs font-mono space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] text-[#8c867e] uppercase block">STUDENT NAME</span>
                      <span className="font-bold text-[#eee9df] block truncate">
                        {verificationResult.ticket.user_name}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#8c867e] uppercase block">STUDENT USN</span>
                      <span className="font-bold text-[#d83128]">
                        {verificationResult.ticket.usn}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#8c867e] uppercase block">FILM & AUDITORIUM</span>
                      <span className="font-bold text-[#eee9df] block truncate">
                        {verificationResult.ticket.movie_title} • {verificationResult.ticket.auditorium}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#8c867e] uppercase block">ALLOCATED SEATS</span>
                      <span className="font-bold text-[#10b981]">
                        {verificationResult.ticket.seats}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. Duplicate Scan Warning (Crimson Alert) */}
          {verificationResult.already_checked_in && (
            <div className="bg-[#1e1411] border-2 border-[#d83128] p-6 space-y-3 shadow-2xl animate-bounce">
              <div className="flex items-center space-x-3">
                <XCircle className="w-7 h-7 text-[#d83128] shrink-0" />
                <div>
                  <h3 className="text-base font-serif font-bold text-[#d83128] uppercase">
                    ALREADY CHECKED IN • DUPLICATE ENTRY DENIED
                  </h3>
                  <p className="text-xs text-[#eee9df] font-mono mt-1">
                    First admitted at: {new Date(verificationResult.checked_in_at).toLocaleString('en-IN')}
                  </p>
                  <p className="text-[11px] text-[#8c867e] font-sans mt-0.5">
                    This single-use 35mm pass has already been admitted through the door scanner.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 3. Invalid Ticket (Amber Alert) */}
          {!verificationResult.valid && !verificationResult.already_checked_in && (
            <div className="bg-[#171513] border-2 border-[#f59e0b] p-5 space-y-2 shadow-2xl">
              <div className="flex items-center space-x-2 text-[#f59e0b]">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h3 className="text-xs font-mono font-bold uppercase">INVALID TICKET / TAMPERED HASH</h3>
              </div>
              <p className="text-xs text-[#8c867e] font-sans">
                {verificationResult.error || 'No matching reservation found in Supabase database.'}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="text-center pt-2">
        <button
          onClick={onBackToBrowse}
          className="text-xs font-mono uppercase text-[#8c867e] hover:text-[#eee9df] transition-colors cursor-pointer"
        >
          ← RETURN TO PUBLIC SCREENINGS
        </button>
      </div>
    </div>
  );
}
