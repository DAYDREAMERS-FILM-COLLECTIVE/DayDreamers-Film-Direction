'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { verifyTicketAction } from '@/app/actions/booking';
import { sound } from '@/lib/audio';
import { ShieldCheck, ShieldAlert, AlertTriangle, Camera, RefreshCw, Key, CheckCircle } from 'lucide-react';

interface ScanResult {
  status: 'GRANTED' | 'ALREADY_ADMITTED' | 'FORGED' | 'ERROR';
  message: string;
  ticket?: {
    id: string;
    seat_id: string;
    movie_title: string;
    venue: string;
    attendee_email: string;
    attendee_usn: string;
    admitted_at?: string;
  };
  timestamp: string;
}

export const DoorScanner: React.FC = () => {
  const [adminKey, setAdminKey] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [scanning, setScanning] = useState(false);
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  const [currentResult, setCurrentResult] = useState<ScanResult | null>(null);
  const [processing, setProcessing] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Check saved admin key in session
  useEffect(() => {
    const savedKey = sessionStorage.getItem('fps_admin_key');
    if (savedKey) {
      setAdminKey(savedKey);
      setIsAuthenticated(true);
    }
  }, []);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminKey.trim()) {
      setAuthError('Please enter administrative passkey.');
      return;
    }
    // Set authenticated and save
    sessionStorage.setItem('fps_admin_key', adminKey.trim());
    setIsAuthenticated(true);
    setAuthError(null);
  };

  const startScanner = async () => {
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode('qr-reader-target');
      }

      setScanning(true);
      await scannerRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          if (processing) return;
          handleQrDecoded(decodedText);
        },
        () => {
          // ignore frame scan errors
        }
      );
    } catch (err) {
      console.error('Failed to start camera scanner:', err);
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && scanning) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        console.error('Failed to stop scanner:', err);
      }
      setScanning(false);
    }
  };

  const handleQrDecoded = async (qrData: string) => {
    setProcessing(true);
    try {
      const parsed = JSON.parse(qrData);
      if (!parsed.ticketId || !parsed.hash || !parsed.showtimeId || !parsed.seatId) {
        throw new Error('Malformed QR code payload');
      }

      const res = await verifyTicketAction({
        ticketId: parsed.ticketId,
        showtimeId: parsed.showtimeId,
        seatId: parsed.seatId,
        qrHash: parsed.hash,
        adminKey,
      });

      let scanResult: ScanResult;

      if (res.success && res.code === 'ADMISSION_GRANTED') {
        sound.playDoorAdmitted();
        scanResult = {
          status: 'GRANTED',
          message: 'PASS VERIFIED // ADMIT ATTENDEE',
          ticket: res.ticket,
          timestamp: new Date().toLocaleTimeString(),
        };
      } else if (res.code === 'ALREADY_ADMITTED') {
        sound.playDoorRejected();
        scanResult = {
          status: 'ALREADY_ADMITTED',
          message: 'WARNING: PASS ALREADY REDEEMED PREVIOUSLY',
          ticket: res.ticket,
          timestamp: new Date().toLocaleTimeString(),
        };
      } else {
        sound.playDoorRejected();
        scanResult = {
          status: 'FORGED',
          message: res.message || 'FORGED OR INVALID PASS DETECTED',
          timestamp: new Date().toLocaleTimeString(),
        };
      }

      setCurrentResult(scanResult);
      setScanHistory((prev) => [scanResult, ...prev]);
    } catch (err) {
      sound.playDoorRejected();
      const scanResult: ScanResult = {
        status: 'ERROR',
        message: 'Invalid QR payload format',
        timestamp: new Date().toLocaleTimeString(),
      };
      setCurrentResult(scanResult);
      setScanHistory((prev) => [scanResult, ...prev]);
    } finally {
      // 2-second debounce before scanning next ticket
      setTimeout(() => {
        setProcessing(false);
      }, 2000);
    }
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-20 bg-void">
        <div className="w-full max-w-md p-8 rounded-2xl bg-surface border border-white/10 shadow-2xl space-y-6">
          <div className="flex items-center gap-3 text-amber-400">
            <Key className="w-6 h-6" />
            <h2 className="text-lg font-bold font-mono tracking-wide text-white">
              ADMIN DOOR CHECK-IN AUTH
            </h2>
          </div>
          <p className="text-xs font-mono text-zinc-400">
            Enter administrative passcode to unlock camera feed for single-use cryptographic ticket verification.
          </p>

          {authError && (
            <div className="p-3 rounded-lg bg-red-950/70 border border-red-500/50 text-red-300 text-xs font-mono">
              {authError}
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <input
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="Enter admin passcode"
              className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              className="w-full py-3.5 px-6 rounded-xl font-mono text-xs uppercase font-bold text-black bg-amber-400 hover:bg-amber-300 transition"
            >
              ACCESS SCANNER HUD
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-6 max-w-4xl mx-auto space-y-8 text-zinc-200">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-amber-400">
            <ShieldCheck className="w-4 h-4" />
            <span>DOOR INSPECTION HUD // RESTRICTED ACCESS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-mono text-white mt-1">
            CRYPTOGRAPHIC QR SCANNER
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              sessionStorage.removeItem('fps_admin_key');
              setIsAuthenticated(false);
            }}
            className="px-3.5 py-1.5 rounded-lg border border-white/10 hover:border-white/30 text-xs font-mono text-zinc-400"
          >
            LOCK HUD
          </button>
        </div>
      </div>

      {/* Main Scanner Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left: Video Feed */}
        <div className="p-6 rounded-2xl bg-surface border border-white/10 flex flex-col items-center justify-center space-y-4">
          <div
            id="qr-reader-target"
            className="w-full max-w-[320px] aspect-square bg-black/80 rounded-xl overflow-hidden border border-white/20 flex items-center justify-center relative"
          >
            {!scanning && (
              <div className="flex flex-col items-center gap-2 text-zinc-500 font-mono text-xs text-center p-4">
                <Camera className="w-8 h-8 opacity-40" />
                <span>CAMERA FEED SUSPENDED</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 w-full max-w-[320px]">
            {!scanning ? (
              <button
                onClick={startScanner}
                className="flex-1 py-3 rounded-xl font-mono text-xs font-bold uppercase text-black bg-neon-cyan hover:bg-neon-cyan/90 transition flex items-center justify-center gap-2"
              >
                <Camera className="w-4 h-4" />
                <span>START SCANNER</span>
              </button>
            ) : (
              <button
                onClick={stopScanner}
                className="flex-1 py-3 rounded-xl font-mono text-xs font-bold uppercase text-white bg-red-600/80 hover:bg-red-600 transition"
              >
                STOP SCANNER
              </button>
            )}
          </div>
        </div>

        {/* Right: Live Result Feedback */}
        <div className="p-6 rounded-2xl bg-surface border border-white/10 flex flex-col justify-between space-y-4">
          <div>
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block mb-3">
              LIVE ADMISSION VERIFICATION RESULT
            </span>

            {currentResult ? (
              <div
                className={`p-5 rounded-xl border space-y-3 font-mono text-xs transition-all ${
                  currentResult.status === 'GRANTED'
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
                    : currentResult.status === 'ALREADY_ADMITTED'
                    ? 'bg-amber-950/80 border-amber-500 text-amber-200'
                    : 'bg-red-950/80 border-red-500 text-red-200'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-sm tracking-wide">
                  {currentResult.status === 'GRANTED' && <CheckCircle className="w-5 h-5 text-emerald-400" />}
                  {currentResult.status === 'ALREADY_ADMITTED' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                  {currentResult.status === 'FORGED' && <ShieldAlert className="w-5 h-5 text-red-400" />}
                  <span>{currentResult.message}</span>
                </div>

                {currentResult.ticket && (
                  <div className="pt-2 border-t border-white/10 space-y-1 text-zinc-300 text-[11px]">
                    <div><span className="text-zinc-500">SEAT:</span> {currentResult.ticket.seat_id}</div>
                    <div><span className="text-zinc-500">ATTENDEE:</span> {currentResult.ticket.attendee_usn} ({currentResult.ticket.attendee_email})</div>
                    <div><span className="text-zinc-500">FILM:</span> {currentResult.ticket.movie_title}</div>
                    {currentResult.ticket.admitted_at && (
                      <div><span className="text-zinc-500">REDEEMED AT:</span> {new Date(currentResult.ticket.admitted_at).toLocaleTimeString()}</div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 rounded-xl bg-black/40 border border-white/5 text-center text-xs font-mono text-zinc-500">
                AWAITING QR PASS INGESTION...
              </div>
            )}
          </div>

          <div className="text-[10px] font-mono text-zinc-400 border-t border-white/5 pt-3">
            VERIFICATION CIPHER: HMAC-SHA256 WITH NOWAIT STATE INTEGRITY
          </div>
        </div>
      </div>

      {/* Session Scan Log */}
      <div className="space-y-3 pt-4">
        <h3 className="text-xs font-mono text-zinc-400 uppercase tracking-widest">
          SESSION SCAN AUDIT TRAIL ({scanHistory.length})
        </h3>
        <div className="space-y-2">
          {scanHistory.map((item, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg bg-surface/60 border border-white/5 flex items-center justify-between text-xs font-mono"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-2 h-2 rounded-full ${
                    item.status === 'GRANTED'
                      ? 'bg-emerald-400'
                      : item.status === 'ALREADY_ADMITTED'
                      ? 'bg-amber-400'
                      : 'bg-red-400'
                  }`}
                />
                <span className="text-white font-bold">{item.ticket?.seat_id || 'UNKNOWN'}</span>
                <span className="text-zinc-400">{item.ticket?.attendee_usn}</span>
                <span className="text-zinc-500 text-[10px]">{item.message}</span>
              </div>
              <span className="text-zinc-500 text-[10px]">{item.timestamp}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
