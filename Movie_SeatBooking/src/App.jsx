import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.jsx';
import { PremiereHero } from './components/PremiereHero.jsx';
import { SeatGrid } from './components/SeatGrid.jsx';
import { StudentCheckout } from './components/StudentCheckout.jsx';
import { TicketPass } from './components/TicketPass.jsx';
import { DoorVerification } from './components/DoorVerification.jsx';
import { AdminPortal } from './components/AdminPortal.jsx';
import { AdminAuthModal } from './components/AdminAuthModal.jsx';
import { fetchMovies, fetchShowtimes } from './lib/supabase.js';
import { getSessionId, resetSessionId } from './lib/session.js';
import { initLenis, destroyLenis } from './lib/lenis.js';
import { ViewfinderCursor } from './components/ui/ViewfinderCursor.jsx';
import { RotateCcw, AlertTriangle } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState('premiere'); // 'premiere' | 'seats' | 'checkout' | 'ticket' | 'verify' | 'admin'
  const [movies, setMovies] = useState([]);
  const [showtimes, setShowtimes] = useState([]);
  const [premiereMovie, setPremiereMovie] = useState(null);
  const [premiereShowtime, setPremiereShowtime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [sessionId, setSessionId] = useState('');

  // Booking Flow States
  const [bookingMode, setBookingMode] = useState('individual'); // 'individual' | 'group'
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [confirmedBookingData, setConfirmedBookingData] = useState(null);

  // Admin Access State
  const [isAdminAuthModalOpen, setIsAdminAuthModalOpen] = useState(false);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);

  useEffect(() => {
    initLenis();
    setSessionId(getSessionId());
    setIsAdminUnlocked(sessionStorage.getItem('fps_admin_auth') === 'true');

    async function loadPremiereData() {
      setLoading(true);
      setErrorMessage('');
      try {
        const [moviesRes, showtimesRes] = await Promise.all([
          fetchMovies(),
          fetchShowtimes(),
        ]);

        const loadedMovies = moviesRes.data || [];
        const loadedShowtimes = showtimesRes.data || [];

        setMovies(loadedMovies);
        setShowtimes(loadedShowtimes);

        if (loadedMovies.length > 0 && loadedShowtimes.length > 0) {
          // Dedicated monthly premiere screening (Primary featured screening)
          setPremiereMovie(loadedMovies[0]);
          const showtime = loadedShowtimes.find((s) => s.movie_id === loadedMovies[0].id) || loadedShowtimes[0];
          setPremiereShowtime(showtime);
        }
      } catch (err) {
        console.error('[App] Supabase connection error:', err);
        setErrorMessage('Unable to connect to live Supabase database. Please check connectivity.');
      } finally {
        setLoading(false);
      }
    }

    loadPremiereData();
  }, []);

  const handleResetSession = () => {
    const newId = resetSessionId();
    setSessionId(newId);
    setSelectedSeats([]);
  };

  const handleEnterScreeningRoom = () => {
    setSelectedSeats([]);
    setCurrentView('seats');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleProceedToCheckout = () => {
    if (selectedSeats.length === 0) return;
    setCurrentView('checkout');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBookingConfirmed = (data) => {
    setConfirmedBookingData(data);
    setCurrentView('ticket');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBookAnother = () => {
    setSelectedSeats([]);
    setConfirmedBookingData(null);
    setCurrentView('premiere');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Admin Access
  const handleOpenAdmin = () => {
    if (isAdminUnlocked) {
      setCurrentView('admin');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setIsAdminAuthModalOpen(true);
    }
  };

  const handleAdminAuthSuccess = () => {
    setIsAdminUnlocked(true);
    setIsAdminAuthModalOpen(false);
    setCurrentView('admin');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#11100f] text-[#eee9df] selection:bg-[#d83128] selection:text-white font-sans relative">
      {/* 35mm Grain Overlay matching root index.html */}
      <div className="cinema-noise" aria-hidden="true" />

      {/* Dogstudio-Inspired 35mm Magnetic Viewfinder Cursor */}
      <ViewfinderCursor />

      {/* Top Navbar */}
      <Navbar
        currentView={currentView}
        onSelectView={(view) => {
          if (view === 'screenings') setCurrentView('premiere');
          else setCurrentView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenAdminModal={handleOpenAdmin}
        isAdminUnlocked={isAdminUnlocked}
      />

      {/* Admin Passcode Gate Modal (fps2026) */}
      <AdminAuthModal
        isOpen={isAdminAuthModalOpen}
        onClose={() => setIsAdminAuthModalOpen(false)}
        onSuccess={handleAdminAuthSuccess}
      />

      {/* Main Viewport */}
      <main className="flex-1 w-full">
        {/* VIEW: Admin CMS Portal */}
        {currentView === 'admin' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <AdminPortal
              onBackToScreenings={() => setCurrentView('premiere')}
              onOpenDoorScanner={() => setCurrentView('verify')}
            />
          </div>
        )}

        {/* VIEW: Door Admission Scanner */}
        {currentView === 'verify' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <DoorVerification onBackToBrowse={() => setCurrentView('premiere')} />
          </div>
        )}

        {/* VIEW: Interactive 3D Perspective Seat Map (DEFERRED WEBSOCKET) */}
        {currentView === 'seats' && premiereMovie && premiereShowtime && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <SeatGrid
              movie={premiereMovie}
              showtime={premiereShowtime}
              sessionId={sessionId}
              bookingMode={bookingMode}
              setBookingMode={setBookingMode}
              selectedSeats={selectedSeats}
              setSelectedSeats={setSelectedSeats}
              onProceedToCheckout={handleProceedToCheckout}
              onBack={() => setCurrentView('premiere')}
            />
          </div>
        )}

        {/* VIEW: Student Checkout & Credential Verification */}
        {currentView === 'checkout' && premiereMovie && premiereShowtime && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <StudentCheckout
              movie={premiereMovie}
              showtime={premiereShowtime}
              selectedSeats={selectedSeats}
              bookingMode={bookingMode}
              sessionId={sessionId}
              onBack={() => setCurrentView('seats')}
              onBookingConfirmed={handleBookingConfirmed}
            />
          </div>
        )}

        {/* VIEW: Confirmed Digital Ticket Pass */}
        {currentView === 'ticket' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {confirmedBookingData ? (
              <TicketPass
                bookingData={confirmedBookingData}
                onBookAnother={handleBookAnother}
              />
            ) : (
              <div className="p-12 text-center bg-[#171513] border border-[#2a2622] space-y-4 max-w-lg mx-auto">
                <span className="text-xs font-mono uppercase text-[#9f9b94] block">
                  NO ACTIVE PASS ISSUED
                </span>
                <p className="text-sm text-[#eee9df] font-sans">
                  Enter the premiere screening room to secure your admission pass.
                </p>
                <button
                  onClick={() => setCurrentView('premiere')}
                  className="px-5 py-2.5 bg-[#d83128] hover:bg-[#b8241c] text-white text-xs font-sans font-bold uppercase tracking-wider cursor-pointer"
                >
                  PREMIERE EVENT DROP
                </button>
              </div>
            )}
          </div>
        )}

        {/* VIEW: Single Premiere Event Drop Hero (NO 3-CARD GRID) */}
        {currentView === 'premiere' && (
          <>
            {loading ? (
              <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 border-2 border-[#d83128] border-t-transparent animate-spin" />
                <span className="text-xs font-mono text-[#9f9b94] uppercase tracking-wider">
                  PREPARING 35MM PREMIERE DROP...
                </span>
              </div>
            ) : premiereMovie && premiereShowtime ? (
              <PremiereHero
                movie={premiereMovie}
                showtime={premiereShowtime}
                onEnterScreeningRoom={handleEnterScreeningRoom}
              />
            ) : (
              <div className="p-12 text-center max-w-md mx-auto my-16 bg-[#171513] border border-[#2a2622] space-y-2">
                <p className="text-sm font-serif text-[#eee9df]">No screening currently active in the database.</p>
                <button
                  onClick={handleOpenAdmin}
                  className="px-4 py-2 bg-[#d83128] text-white text-xs font-mono uppercase font-bold mt-2"
                >
                  OPEN CMS TO SCHEDULE
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* 35mm Minimalist Archival Footer */}
      <footer className="mt-20 border-t border-[#2a2622] bg-[#11100f] py-10 text-xs font-sans text-[#9f9b94]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <p className="font-serif font-bold text-sm text-[#eee9df] uppercase tracking-wider">
              RV UNIVERSITY FILM PRODUCTION SOCIETY
            </p>
            <p className="text-[11px] text-[#9f9b94]">
              Monthly 35mm campus premiere drop • 50 seats per screening • Official student admission only
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={handleOpenAdmin}
              className="text-[11px] font-mono uppercase text-[#9f9b94] hover:text-[#d83128] transition-colors cursor-pointer"
            >
              CMS ADMIN PORTAL
            </button>

            {/* Session Diagnostics in DM Mono */}
            <div className="flex items-center space-x-2 text-[11px] font-mono bg-[#171513] px-3 py-1.5 border border-[#2a2622]">
              <span className="text-[#9f9b94]">SESSION:</span>
              <span className="text-[#eee9df] truncate max-w-[120px]" title={sessionId}>
                {sessionId}
              </span>
              <button
                onClick={handleResetSession}
                className="p-0.5 text-[#9f9b94] hover:text-[#d83128] transition-colors cursor-pointer"
                title="Reset Session UUID"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
