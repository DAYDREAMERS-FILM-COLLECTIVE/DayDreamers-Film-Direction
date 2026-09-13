import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.jsx';
import { MovieCatalog } from './components/MovieCatalog.jsx';
import { ShowtimePicker } from './components/ShowtimePicker.jsx';
import { fetchMovies, fetchShowtimes, isSupabaseConfigured } from './lib/supabase.js';
import { getSessionId, resetSessionId } from './lib/session.js';
import { Armchair, ChevronRight, RotateCcw, QrCode } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState('browse'); // 'browse' | 'verify'
  const [movies, setMovies] = useState([]);
  const [showtimes, setShowtimes] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [selectedShowtime, setSelectedShowtime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState('');

  useEffect(() => {
    setSessionId(getSessionId());

    async function loadData() {
      setLoading(true);
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
      setLoading(false);
    }

    loadData();
  }, []);

  const handleMovieSelect = (movie) => {
    setSelectedMovie(movie);
    const firstShowtime = showtimes.find((s) => s.movie_id === movie.id);
    setSelectedShowtime(firstShowtime || null);

    // Smooth scroll to showtimes section
    setTimeout(() => {
      document.getElementById('showtimes-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleResetSession = () => {
    const newId = resetSessionId();
    setSessionId(newId);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#080C14] text-slate-100 selection:bg-rvu-accent selection:text-white">
      {/* Top Navigation */}
      <Navbar currentView={currentView} onSelectView={setCurrentView} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {currentView === 'verify' ? (
          /* Door Scanner Preview (Sharp) */
          <div className="max-w-xl mx-auto py-10 px-6 bg-slate-950 border border-slate-800 text-center space-y-4">
            <div className="w-12 h-12 mx-auto bg-slate-900 border border-slate-700 flex items-center justify-center text-white">
              <QrCode className="w-6 h-6 text-rvu-accent" />
            </div>
            <h2 className="text-lg font-bold font-mono uppercase tracking-wider text-white">Auditorium Entry Verification</h2>
            <p className="text-xs text-slate-400 font-mono max-w-md mx-auto leading-relaxed">
              Ticket scanning portal for venue staff. Barcode camera decoding and one-time admission records will be integrated in Phase 6.
            </p>
            <div className="pt-2">
              <button
                onClick={() => setCurrentView('browse')}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-xs font-mono font-bold uppercase text-white border border-slate-700 transition-colors"
              >
                RETURN TO SCREENINGS
              </button>
            </div>
          </div>
        ) : (
          /* Complete Website Web Skeleton */
          <>
            {/* Campus Screening Schedule Banner (Sharp, Rectilinear) */}
            <div className="border border-slate-800 bg-slate-950 p-6 sm:p-8 space-y-3">
              <div className="flex items-center space-x-2 text-[10px] font-mono font-bold uppercase tracking-widest text-rvu-accent">
                <span>RV UNIVERSITY FILM SOCIETY • CAMPUS SCREENINGS 2026</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold uppercase tracking-tight text-white leading-tight">
                Campus Cinema Booking Engine
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 font-mono max-w-3xl leading-relaxed">
                Live screening schedule for Campus Auditorium 1 (Main Stage) and Auditorium 2 (Film Lab). All seat reservations require strict RV University USN verification and @rvu.edu.in student credentials.
              </p>
            </div>

            {/* Movie Catalog */}
            {loading ? (
              <div className="py-20 text-center space-y-2 border border-slate-800 bg-slate-950">
                <div className="w-6 h-6 border-2 border-rvu-accent border-t-transparent animate-spin mx-auto" />
                <p className="text-xs text-slate-400 font-mono uppercase">Retrieving screening schedule...</p>
              </div>
            ) : (
              <>
                <MovieCatalog
                  movies={movies}
                  selectedMovie={selectedMovie}
                  onSelectMovie={handleMovieSelect}
                />

                {/* Showtime Selector */}
                {selectedMovie && (
                  <ShowtimePicker
                    movie={selectedMovie}
                    showtimes={showtimes}
                    selectedShowtime={selectedShowtime}
                    onSelectShowtime={setSelectedShowtime}
                  />
                )}

                {/* Phase 3 Seat Selection CTA Dock (Sharp) */}
                {selectedMovie && selectedShowtime && (
                  <div className="sticky bottom-4 z-40 p-4 bg-slate-950 border-2 border-rvu-accent shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 bg-slate-900 border border-slate-800 text-rvu-accent">
                        <Armchair className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-wider">
                          READY FOR SEAT SELECTION
                        </div>
                        <h4 className="text-sm font-bold font-mono text-white uppercase">
                          {selectedMovie.title} • {selectedShowtime.auditorium_name}
                        </h4>
                        <p className="text-[11px] font-mono text-slate-400">
                          {new Date(selectedShowtime.start_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })} • REGULAR ₹{selectedShowtime.price_regular} / VIP ₹{selectedShowtime.price_vip}
                        </p>
                      </div>
                    </div>

                    <div>
                      <button
                        className="w-full sm:w-auto px-5 py-2.5 bg-rvu-accent hover:bg-orange-600 text-white text-xs font-mono font-bold uppercase tracking-wider border border-rvu-accent flex items-center justify-center space-x-2 transition-colors"
                        onClick={() => {
                          alert(`Selected: ${selectedMovie.title} at ${selectedShowtime.auditorium_name}.\nPhase 2 Complete! Awaiting confirmation to unlock Phase 3: Interactive Seat Grid & 5-minute Hold Engine.`);
                        }}
                      >
                        <span>OPEN SEAT MAP</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* Footer & Session Diagnostics (Sharp) */}
      <footer className="mt-16 border-t border-slate-900 bg-[#05080E] py-8 text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-bold text-slate-300 uppercase tracking-wider">RV UNIVERSITY CAMPUS CINEMA PLATFORM</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Authorized screenings only • Official university credentials required</p>
          </div>

          {/* Session Diagnostics */}
          <div className="flex items-center space-x-3 text-[11px] bg-slate-950 px-3 py-1.5 border border-slate-800">
            <span className="text-slate-400">SESSION:</span>
            <span className="text-amber-400 truncate max-w-[140px]" title={sessionId}>{sessionId}</span>
            <button
              onClick={handleResetSession}
              className="p-1 text-slate-400 hover:text-white transition-colors"
              title="Generate fresh Session UUID"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
