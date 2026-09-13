import React, { useState } from 'react';
import { Film, Ticket, ShieldAlert, QrCode, Lock, Volume2, VolumeX } from 'lucide-react';
import { cinemaAudio } from '../lib/audio.js';

export function Navbar({ currentView, onSelectView, onOpenAdminModal, isAdminUnlocked }) {
  const [isAudioActive, setIsAudioActive] = useState(!cinemaAudio.getMuted());
  return (
    <header className="sticky top-0 z-50 bg-[#11100f]/95 backdrop-blur-md border-b border-[#2a2622]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Society Branding */}
          <button
            onClick={() => onSelectView('screenings')}
            className="flex items-center space-x-3 group text-left focus:outline-none"
          >
            <div className="w-8 h-8 bg-[#171513] border border-[#2a2622] group-hover:border-[#d83128] flex items-center justify-center transition-colors">
              <Film className="w-4 h-4 text-[#d83128]" />
            </div>
            <div>
              <span className="text-xs font-mono tracking-widest text-[#9f9b94] uppercase block">
                RV UNIVERSITY
              </span>
              <span className="text-base font-serif font-black tracking-wide text-[#eee9df] group-hover:text-white transition-colors uppercase">
                Film Production Society
              </span>
            </div>
          </button>

          {/* Navigation Links (DM Sans) */}
          <nav className="flex items-center space-x-1 sm:space-x-3 text-xs font-medium">
            <button
              onClick={() => onSelectView('screenings')}
              className={`px-3 py-2 border transition-colors ${
                currentView === 'screenings'
                  ? 'bg-[#171513] text-[#eee9df] border-[#2a2622]'
                  : 'text-[#9f9b94] hover:text-[#eee9df] border-transparent hover:border-[#2a2622]'
              }`}
            >
              Screenings
            </button>

            <button
              onClick={() => onSelectView('ticket')}
              className={`px-3 py-2 border flex items-center space-x-1.5 transition-colors ${
                currentView === 'ticket'
                  ? 'bg-[#171513] text-[#eee9df] border-[#2a2622]'
                  : 'text-[#9f9b94] hover:text-[#eee9df] border-transparent hover:border-[#2a2622]'
              }`}
            >
              <Ticket className="w-3.5 h-3.5 text-[#d83128]" />
              <span>My Passes</span>
            </button>

            <button
              onClick={() => onSelectView('verify')}
              className={`px-3 py-2 border flex items-center space-x-1.5 transition-colors ${
                currentView === 'verify'
                  ? 'bg-[#171513] text-[#eee9df] border-[#2a2622]'
                  : 'text-[#9f9b94] hover:text-[#eee9df] border-transparent hover:border-[#2a2622]'
              }`}
            >
              <QrCode className="w-3.5 h-3.5 text-[#9f9b94]" />
              <span className="hidden sm:inline">Door Scanner</span>
            </button>

            {/* Procedural 35mm Audio Engine Toggle */}
            <button
              onClick={() => {
                const playing = cinemaAudio.toggleMute();
                setIsAudioActive(playing);
              }}
              className={`px-3 py-2 border font-mono text-[11px] tracking-wider uppercase flex items-center space-x-1.5 transition-colors ${
                isAudioActive
                  ? 'bg-[#171513] text-[#d83128] border-[#d83128]'
                  : 'bg-[#171513] text-[#8c867e] border-[#26221f] hover:text-[#eee9df]'
              }`}
              title={isAudioActive ? 'Mute 35mm Atmospheric Drone' : 'Unmute 35mm Atmospheric Drone'}
            >
              {isAudioActive ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-[#d83128]" />
                  <span className="flex items-center space-x-0.5">
                    <span className="w-0.5 h-2 bg-[#d83128] animate-pulse" />
                    <span className="w-0.5 h-3 bg-[#d83128] animate-pulse [animation-delay:150ms]" />
                    <span className="w-0.5 h-1.5 bg-[#d83128] animate-pulse [animation-delay:300ms]" />
                  </span>
                  <span className="hidden sm:inline">35MM SFX</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-[#8c867e]" />
                  <span className="hidden sm:inline">SFX OFF</span>
                </>
              )}
            </button>

            {/* Admin Portal Button with Passcode Protection */}
            <button
              onClick={onOpenAdminModal}
              className={`px-3 py-2 border font-mono text-[11px] tracking-wider uppercase flex items-center space-x-1.5 transition-colors ${
                currentView === 'admin'
                  ? 'bg-[#d83128] text-white border-[#d83128]'
                  : isAdminUnlocked
                  ? 'bg-[#171513] text-[#d83128] border-[#2a2622] hover:border-[#d83128]'
                  : 'bg-[#171513] text-[#9f9b94] border-[#2a2622] hover:text-[#eee9df] hover:border-[#3a3530]'
              }`}
            >
              <Lock className="w-3 h-3" />
              <span>Admin CMS</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
