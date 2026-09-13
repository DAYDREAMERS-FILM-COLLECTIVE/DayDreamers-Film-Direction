'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Volume2, VolumeX } from 'lucide-react';
import { sound } from '@/lib/audio';

export const Navbar: React.FC = () => {
  const [audioEnabled, setAudioEnabled] = useState(false);

  const toggleAudio = () => {
    setAudioEnabled(!audioEnabled);
    sound.playShutterClick();
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 px-8 md:px-16 py-6 flex items-center justify-between pointer-events-auto mix-blend-difference">
      {/* Editorial Minimal Brandmark */}
      <Link href="/" className="group">
        <span className="font-serif text-xl tracking-tight text-[#E8E3D9] group-hover:text-[#C92A42] transition-colors">
          FPS <span className="text-xs font-sans tracking-widest text-[#E8E3D9]/60 ml-2 uppercase">Direction</span>
        </span>
      </Link>

      {/* Discreet Navigation Links */}
      <nav className="flex items-center gap-8 text-xs font-sans tracking-widest uppercase text-[#E8E3D9]/70">
        <Link href="/" className="hover:text-[#E8E3D9] transition-colors">
          Archive
        </Link>

        <Link href="/admin" className="hover:text-[#D4AF37] transition-colors">
          Check-in
        </Link>

        <button
          onClick={toggleAudio}
          className="hover:text-[#E8E3D9] transition-colors flex items-center gap-1.5"
          title={audioEnabled ? 'Mute procedural audio' : 'Enable audio'}
        >
          {audioEnabled ? <Volume2 className="w-3.5 h-3.5 text-[#D4AF37]" /> : <VolumeX className="w-3.5 h-3.5 text-zinc-500" />}
          <span className="text-[10px]">{audioEnabled ? 'Sound' : 'Muted'}</span>
        </button>
      </nav>
    </header>
  );
};
