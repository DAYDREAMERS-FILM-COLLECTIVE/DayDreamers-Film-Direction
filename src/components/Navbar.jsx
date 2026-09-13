import React, { useState, useEffect } from 'react';
import { Film, QrCode, Sparkles, Clock, ShieldCheck, Database, Menu, X } from 'lucide-react';
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
    <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-rvu-dark/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div 
            className="flex items-center space-x-3 cursor-pointer group"
            onClick={() => onSelectView('browse')}
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-rvu-ruby to-rvu-accent flex items-center justify-center shadow-lg shadow-rvu-ruby/20 group-hover:scale-105 transition-transform duration-200">
              <Film className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-white group-hover:text-rvu-accent transition-colors">
                  RVU CAMPUS CINEMA
                </span>
                <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-rvu-ruby/30 text-rose-300 border border-rvu-ruby/50">
                  STUDENT PASS
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">RV University • Bengaluru</p>
            </div>
          </div>

          {/* Center: Live Campus Date & Time Ticker */}
          <div className="hidden md:flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs text-slate-300 font-mono">
            <Clock className="w-3.5 h-3.5 text-rvu-accent animate-pulse" />
            <span>{currentTime || 'Campus Screenings Live'}</span>
          </div>

          {/* Right Navigation & Mode Indicators */}
          <div className="hidden sm:flex items-center space-x-4">
            {/* Supabase Status Pill */}
            <div 
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                isSupabaseConfigured
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-400'
                  : 'bg-amber-950/40 border-amber-800/60 text-amber-300'
              }`}
              title={isSupabaseConfigured ? 'Connected to live Supabase PostgreSQL' : 'Running in resilient Local Preview mode'}
            >
              <Database className="w-3 h-3" />
              <span>{isSupabaseConfigured ? 'Supabase Live' : 'Preview Mode'}</span>
            </div>

            {/* Navigation Tabs */}
            <button
              onClick={() => onSelectView('browse')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                currentView === 'browse'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              Now Showing
            </button>

            {/* Door Verification Scanner Button */}
            <button
              onClick={() => onSelectView('verify')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all border ${
                currentView === 'verify'
                  ? 'bg-rvu-accent text-white border-rvu-accent shadow-md shadow-rvu-accent/20'
                  : 'bg-slate-900 text-slate-300 border-slate-700/80 hover:border-slate-600 hover:text-white'
              }`}
            >
              <QrCode className="w-3.5 h-3.5 text-amber-300" />
              <span>Door Scanner</span>
              <span className="text-[10px] px-1 py-0.2 bg-slate-800 rounded font-mono text-slate-400">/verify</span>
            </button>
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex sm:hidden items-center space-x-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-slate-800/80 text-slate-300 hover:text-white"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="sm:hidden px-4 pt-2 pb-4 space-y-2 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center justify-between py-1 text-xs text-slate-400 font-mono">
            <span>Campus Time:</span>
            <span>{currentTime}</span>
          </div>
          <div className="flex items-center justify-between py-1 text-xs">
            <span className="text-slate-400">Backend:</span>
            <span className={isSupabaseConfigured ? 'text-emerald-400' : 'text-amber-400'}>
              {isSupabaseConfigured ? 'Supabase Connected' : 'Local Preview'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={() => {
                onSelectView('browse');
                setMobileMenuOpen(false);
              }}
              className={`w-full py-2 text-xs font-semibold rounded-lg text-center ${
                currentView === 'browse' ? 'bg-slate-800 text-white' : 'bg-slate-900 text-slate-400'
              }`}
            >
              Now Showing
            </button>
            <button
              onClick={() => {
                onSelectView('verify');
                setMobileMenuOpen(false);
              }}
              className={`w-full py-2 text-xs font-semibold rounded-lg text-center flex items-center justify-center space-x-1.5 ${
                currentView === 'verify' ? 'bg-rvu-accent text-white' : 'bg-slate-900 text-slate-300'
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
