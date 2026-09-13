'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Volume2, VolumeX, ShieldCheck, Film } from 'lucide-react';
import { sound } from '@/lib/audio';

export const Navbar: React.FC = () => {
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' UTC'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleAudio = () => {
    setAudioEnabled(!audioEnabled);
    sound.playShutterClick();
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 px-6 py-4 flex items-center justify-between pointer-events-auto backdrop-blur-md bg-[#060814]/60 border-b border-white/[0.06]">
      {/* Brand & Format */}
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded border border-white/20 flex items-center justify-center bg-[#0c0f1d] group-hover:border-[#C92A42] transition-colors">
            <Film className="w-4 h-4 text-[#C92A42]" />
          </div>
          <div>
            <div className="text-xs font-mono tracking-widest text-[#E8E3D9] font-bold flex items-center gap-2">
              <span>FPS ARCHIVE</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#C92A42]/15 text-[#C92A42] border border-[#C92A42]/30">
                DOGSTUDIO AESTHETIC
              </span>
            </div>
            <div className="text-[10px] font-mono text-zinc-400">ANAMORPHIC DIRECTION & TICKETING</div>
          </div>
        </Link>
      </div>

      {/* Center Metadata HUD */}
      <div className="hidden md:flex items-center gap-8 text-[11px] font-mono text-zinc-400">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#C92A42] animate-ping" />
          <span className="text-zinc-300">REALTIME DB SYNCED</span>
        </div>
        <div>OPTICS // BLENDKIT GLTF CORE</div>
        <div>TIME // {timeStr || '00:00:00 UTC'}</div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleAudio}
          className="px-3 py-1.5 rounded text-xs font-mono border border-white/10 hover:border-white/30 text-zinc-300 hover:text-white transition flex items-center gap-2 bg-[#0c0f1d]/60"
          title={audioEnabled ? 'Mute procedural audio' : 'Enable procedural UI audio'}
        >
          {audioEnabled ? <Volume2 className="w-3.5 h-3.5 text-[#D4AF37]" /> : <VolumeX className="w-3.5 h-3.5 text-zinc-500" />}
          <span className="hidden sm:inline">{audioEnabled ? 'SFX ON' : 'SFX OFF'}</span>
        </button>

        <Link
          href="/admin"
          className="px-3.5 py-1.5 rounded text-xs font-mono border border-white/10 hover:border-[#D4AF37]/50 text-zinc-300 hover:text-[#D4AF37] transition flex items-center gap-2 bg-[#0c0f1d]/60"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span>DOOR SCANNER</span>
        </Link>
      </div>
    </header>
  );
};
