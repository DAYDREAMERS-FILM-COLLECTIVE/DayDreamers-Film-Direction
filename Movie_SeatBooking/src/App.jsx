import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.jsx';
import { HeroBanner } from './components/HeroBanner.jsx';
import { MovieCatalog } from './components/MovieCatalog.jsx';
import { ShowtimePicker } from './components/ShowtimePicker.jsx';
import { SeatGrid } from './components/SeatGrid.jsx';
import { StudentCheckout } from './components/StudentCheckout.jsx';
import { TicketPass } from './components/TicketPass.jsx';
import { DoorVerification } from './components/DoorVerification.jsx';
import { AdminPortal } from './components/AdminPortal.jsx';
import { AdminAuthModal } from './components/AdminAuthModal.jsx';
import { fetchMovies, fetchShowtimes } from './lib/supabase.js';
import { getSessionId, resetSessionId } from './lib/session.js';
import { Armchair, ChevronRight, RotateCcw, AlertTriangle } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState('screenings'); // 'screenings' | 'seats' | 'checkout' | 'ticket' | 'verify' | 'admin'
  const [movies, setMovies] = useState([]);
  const [showtimes, setShowtimes] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [selectedShowtime, setSelectedShowtime] = useState(null);
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
    setSessionId(getSessionId());
    setIsAdminUnlocked(sessionStorage.getItem('fps_admin_auth') === 'true');

    async function loadData() {
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

        if (loadedMovies.length > 0) {
          setSelectedMovie(loadedMovies[0]);
          const initialShowtime = loadedShowtimes.find((s) => s.movie_id === loadedMovies[0].id);
          if (initialShowtime) {
            setSelectedShowtime(initialShowtime);
          }
        }
      } catch (err) {
        console.error('[App] Supabase connection error:', err);
        setErrorMessage('Unable to connect to live Supabase database. Please check connectivity.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleMovieSelect = (movie) => {
    setSelectedMovie(movie);
    const firstShowtime = showtimes.find((s) => s.movie_id === movie.id);
    setSelectedShowtime(firstShowtime || null);
    setSelectedSeats([]);

    setTimeout(() => {
      document.getElementById('showtimes-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleResetSession = () => {
    const newId = resetSessionId();
    setSessionId(newId);
    setSelectedSeats([]);
  };

  const handleOpenSeatMap = () => {
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
    setCurrentView('screenings');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Admin Portal Trigger
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
    <div className="min-h-screen flex flex-col bg-[#0e0d0c] text-[#eee9df] selection:bg-[#d83128] selection:text-white font-sans">
      {/* Top Navbar */}
      <Navbar
        currentView={currentView}
        onSelectView={(view) => {
          setCurrentView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenAdminModal={handleOpenAdmin}
        isAdminUnlocked={isAdminUnlocked}
      />

      {/* Admin Passcode Gate Modal */}
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
              onBackToScreenings={() => setCurrentView('screenings')}
              onOpenDoorScanner={() => setCurrentView('verify')}
            />
          </div>
        )}

        {/* VIEW: Door Admission Scanner */}
        {currentView === 'verify' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <DoorVerification onBackToBrowse={() => setCurrentView('screenings')} />
          </div>
        )}

        {/* VIEW: 50-Seat Acoustic Grid (Phase 3) */}
        {currentView === 'seats' && selectedMovie && selectedShowtime && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <SeatGrid
              movie={selectedMovie}
              showtime={selectedShowtime}
              sessionId={sessionId}
              bookingMode={bookingMode}
              setBookingMode={setBookingMode}
              selectedSeats={selectedSeats}
              setSelectedSeats={setSelectedSeats}
              onProceedToCheckout={handleProceedToCheckout}
              onBack={() => setCurrentView('screenings')}
            />
          </div>
        )}

        {/* VIEW: Student Checkout & RVU Credentials */}
        {currentView === 'checkout' && selectedMovie && selectedShowtime && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <StudentCheckout
              movie={selectedMovie}
              showtime={selectedShowtime}
              selectedSeats={selectedSeats}
              bookingMode={bookingMode}
              sessionId={sessionId}
              onBack={() => setCurrentView('seats')}
              onBookingConfirmed={handleBookingConfirmed}
            />
          </div>
        )}

        {/* VIEW: Confirmed Digital Pass */}
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
                  NO ACTIVE ADMISSION PASS FOUND
                </span>
                <p className="text-sm text-[#eee9df] font-sans">
                  Select a screening from the catalog to book your seats.
                </p>
                <button
                  onClick={() => setCurrentView('screenings')}
                  className="px-5 py-2.5 bg-[#d83128] hover:bg-[#b8241c] text-white text-xs font-sans font-bold uppercase tracking-wider"
                >
                  BROWSE SCREENINGS
                </button>
              </div>
            )}
          </div>
        )}

        {/* VIEW: Main Programme Screenings Catalog */}
        {currentView === 'screenings' && (
          <>
            {/* Full-Bleed 35mm Hero Banner */}
            {selectedMovie && (
              <HeroBanner
                featuredMovie={selectedMovie}
                onReserveClick={() => {
                  document.getElementById('showtimes-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
              />
            )}

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
              {errorMessage && (
                <div className="p-4 bg-[#1e1411] border border-[#d83128] text-[#eee9df] flex items-center space-x-3 text-xs font-sans">
                  <AlertTriangle className="w-5 h-5 text-[#d83128] shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {loading ? (
                <div className="py-24 text-center space-y-2 border border-[#2a2622] bg-[#171513]">
                  <div className="w-6 h-6 border-2 border-[#d83128] border-t-transparent animate-spin mx-auto" />
                  <p className="text-xs font-mono text-[#9f9b94] uppercase">Loading screening schedule from Supabase...</p>
                </div>
              ) : (
                <>
                  {/* Catalog Grid */}
                  <MovieCatalog
                    movies={movies}
                    selectedMovie={selectedMovie}
                    onSelectMovie={handleMovieSelect}
                  />

                  {/* Showtime Picker */}
                  {selectedMovie && (
                    <ShowtimePicker
                      movie={selectedMovie}
                      showtimes={showtimes}
                      selectedShowtime={selectedShowtime}
                      onSelectShowtime={(st) => {
                        setSelectedShowtime(st);
                        setSelectedSeats([]);
                      }}
                    />
                  )}

                  {/* Seat Selection CTA Dock */}
                  {selectedMovie && selectedShowtime && (
                    <div className="sticky bottom-4 z-40 p-4 bg-[#0e0d0c] border border-[#d83128] shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2.5 bg-[#171513] border border-[#2a2622] text-[#d83128]">
                          <Armchair className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-[10px] font-mono text-[#d83128] uppercase font-bold tracking-wider block">
                            ACTIVE SCREENING SELECTED
                          </span>
                          <h4 className="text-base font-serif font-bold text-[#eee9df] uppercase">
                            {selectedMovie.title} • {selectedShowtime.auditorium_name}
                          </h4>
                          <p className="text-xs font-mono text-[#9f9b94]">
                            {new Date(selectedShowtime.start_time).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true,
                            })}{' '}
                            • REGULAR ₹{selectedShowtime.price_regular} / VIP ₹{selectedShowtime.price_vip}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={handleOpenSeatMap}
                        className="px-6 py-3 bg-[#d83128] hover:bg-[#b8241c] text-white text-xs font-sans font-bold uppercase tracking-wider border border-[#d83128] flex items-center justify-center space-x-2 transition-colors cursor-pointer"
                      >
                        <span>SELECT SEATS</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </main>

      {/* 35mm Minimalist Footer */}
      <footer className="mt-20 border-t border-[#2a2622] bg-[#0e0d0c] py-10 text-xs font-sans text-[#9f9b94]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <p className="font-serif font-bold text-sm text-[#eee9df] uppercase tracking-wider">
              RV UNIVERSITY FILM PRODUCTION SOCIETY
            </p>
            <p className="text-[11px] text-[#9f9b94]">
              Archival 35mm and contemporary campus screenings • Dedicated university student access
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={handleOpenAdmin}
              className="text-[11px] font-mono uppercase text-[#9f9b94] hover:text-[#d83128] transition-colors"
            >
              CMS ADMIN PORTAL
            </button>

            {/* Session Diagnostics */}
            <div className="flex items-center space-x-2 text-[11px] font-mono bg-[#171513] px-3 py-1.5 border border-[#2a2622]">
              <span className="text-[#9f9b94]">SESSION:</span>
              <span className="text-[#eee9df] truncate max-w-[120px]" title={sessionId}>
                {sessionId}
              </span>
              <button
                onClick={handleResetSession}
                className="p-0.5 text-[#9f9b94] hover:text-[#d83128] transition-colors"
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
