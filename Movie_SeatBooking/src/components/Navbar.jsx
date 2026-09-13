import React, { useState, useEffect } from 'react';
import { Film, QrCode, Clock, Database, Menu, X } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase.js';

export function Navbar({ currentView, onSelectView }) {
  const [currentTime, setCurrentTime] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const updateTicker = () => {
      const now = new Date();
      const options = {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      };
      setCurrentTime(now.toLocaleString('en-IN', options));
    };

    updateTicker();
    const interval = setInterval(updateTicker, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-[#080C14]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name (Strictly Sharp Rectilinear) */}
          <div 
            className="flex items-center space-x-3 cursor-pointer group"
            onClick={() => onSelectView('browse')}
          >
            <div className="w-9 h-9 bg-rvu-ruby border border-red-800 flex items-center justify-center">
              <Film className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-sm sm:text-base tracking-wider uppercase text-white group-hover:text-rvu-accent transition-colors">
                  RVU CAMPUS CINEMA
                </span>
                <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold uppercase tracking-wider bg-slate-900 text-slate-300 border border-slate-700">
                  STUDENT PORTAL
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono tracking-tight">RV University • Bengaluru</p>
            </div>
          </div>

          {/* Center: Campus Date & Time Ticker (Sharp) */}
          <div className="hidden md:flex items-center space-x-2 px-3 py-1 bg-slate-900 border border-slate-800 text-xs text-slate-300 font-mono">
            <Clock className="w-3.5 h-3.5 text-rvu-accent" />
            <span>{currentTime || 'IST Live'}</span>
          </div>

          {/* Right Navigation & Status Indicators (Sharp) */}
          <div className="hidden sm:flex items-center space-x-3">
            {/* Backend Status Box */}
            <div 
              className={`flex items-center space-x-1.5 px-2.5 py-1 text-[11px] font-mono border ${
                isSupabaseConfigured
                  ? 'bg-emerald-950/50 border-emerald-700 text-emerald-300'
                  : 'bg-amber-950/50 border-amber-700 text-amber-300'
              }`}
            >
              <Database className="w-3 h-3" />
              <span>{isSupabaseConfigured ? 'Supabase Live' : 'Preview Mode'}</span>
            </div>

            {/* Navigation Tabs */}
            <button
              onClick={() => onSelectView('browse')}
              className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors border ${
                currentView === 'browse'
                  ? 'bg-slate-800 text-white border-slate-700'
                  : 'bg-transparent text-slate-400 border-transparent hover:text-white hover:border-slate-800'
              }`}
            >
              Now Showing
            </button>

            {/* Door Verification Scanner Button */}
            <button
              onClick={() => onSelectView('verify')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors border ${
                currentView === 'verify'
                  ? 'bg-rvu-accent text-white border-rvu-accent'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
              }`}
            >
              <QrCode className="w-3.5 h-3.5 text-amber-400" />
              <span>Door Scanner</span>
              <span className="text-[10px] px-1 py-0.2 bg-black border border-slate-700 font-mono text-slate-400">/verify</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex sm:hidden items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 border border-slate-800 bg-slate-900 text-slate-300 hover:text-white"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="sm:hidden px-4 pt-3 pb-4 space-y-2 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center justify-between py-1 text-xs text-slate-400 font-mono">
            <span>Campus Time:</span>
            <span>{currentTime}</span>
          </div>
          <div className="flex items-center justify-between py-1 text-xs font-mono">
            <span className="text-slate-400">Database:</span>
            <span className={isSupabaseConfigured ? 'text-emerald-400' : 'text-amber-400'}>
              {isSupabaseConfigured ? 'Supabase Live' : 'Preview Mode'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={() => {
                onSelectView('browse');
                setMobileMenuOpen(false);
              }}
              className={`w-full py-2 text-xs font-semibold uppercase tracking-wider text-center border ${
                currentView === 'browse' ? 'bg-slate-800 text-white border-slate-700' : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
            >
              Now Showing
            </button>
            <button
              onClick={() => {
                onSelectView('verify');
                setMobileMenuOpen(false);
              }}
              className={`w-full py-2 text-xs font-semibold uppercase tracking-wider text-center flex items-center justify-center space-x-1.5 border ${
                currentView === 'verify' ? 'bg-rvu-accent text-white border-rvu-accent' : 'bg-slate-900 text-slate-300 border-slate-800'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Door Scanner</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
