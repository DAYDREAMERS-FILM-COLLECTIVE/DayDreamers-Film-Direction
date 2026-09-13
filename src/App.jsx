import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.jsx';
import { MovieCatalog } from './components/MovieCatalog.jsx';
import { ShowtimePicker } from './components/ShowtimePicker.jsx';
import { fetchMovies, fetchShowtimes, isSupabaseConfigured } from './lib/supabase.js';
import { getSessionId, resetSessionId } from './lib/session.js';
import { Sparkles, Armchair, ChevronRight, ShieldAlert, CheckCircle2, RotateCcw, QrCode } from 'lucide-react';

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
    <div className="min-h-screen flex flex-col bg-rvu-dark text-slate-100 selection:bg-rvu-accent selection:text-white">
      {/* Top Navigation */}
      <Navbar currentView={currentView} onSelectView={setCurrentView} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        {currentView === 'verify' ? (
          /* Door Scanner Preview / Placeholder until Phase 6 */
          <div className="max-w-2xl mx-auto py-12 px-6 rounded-2xl bg-rvu-surface border border-slate-800 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-amber-500 to-rvu-accent flex items-center justify-center text-white shadow-xl shadow-amber-500/20">
              <QrCode className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-extrabold text-white">Auditorium Door Entry Scanner</h2>
            <p className="text-sm text-slate-300 max-w-md mx-auto">
              Staff verification route for scanning student QR passes and verifying USNs. Full camera barcode scanner and check-in engine will be activated in <span className="text-rvu-accent font-semibold">Phase 6</span>.
            </p>
            <div className="pt-4">
              <button
                onClick={() => setCurrentView('browse')}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-colors"
              >
                Back to Movie Screenings
              </button>
            </div>
          </div>
        ) : (
          /* Browse & Discovery Flow */
          <>
            {/* Hero Festival Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-rvu-ruby/40 via-slate-900 to-rvu-accent/20 border border-slate-800 p-6 sm:p-10 shadow-2xl">
              <div className="relative z-10 max-w-2xl space-y-4">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-rvu-ruby/40 border border-rvu-ruby/60 text-rose-200 text-xs font-bold tracking-wide">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>RV UNIVERSITY CAMPUS SCREENINGS 2026</span>
                </div>
                <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                  Cinema on Campus, <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-rvu-accent">
                    Real-Time Seat Booking.
                  </span>
                </h1>
                <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                  Reserve your seat across Campus Auditorium 1 &amp; 2 with live 5-minute atomic holds, verified RVU student identity, and instant digital QR entry passes.
                </p>
              </div>

              {/* Decorative Glow */}
              <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-rvu-accent/10 blur-3xl pointer-events-none" />
            </div>

            {/* Movie Catalog */}
            {loading ? (
              <div className="py-24 text-center space-y-3">
                <div className="w-10 h-10 border-2 border-rvu-accent border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-400 font-mono">Loading campus screenings...</p>
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

                {/* Next Step Stage Indicator (Phase 3 Hook) */}
                {selectedMovie && selectedShowtime && (
                  <div className="sticky bottom-4 z-40 p-4 rounded-2xl bg-rvu-card/95 border border-rvu-accent/40 shadow-2xl backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center space-x-3.5">
                      <div className="p-3 rounded-xl bg-rvu-accent/20 border border-rvu-accent/30 text-rvu-accent">
                        <Armchair className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2 text-xs text-amber-300 font-bold uppercase tracking-wider">
                          <span>READY FOR PHASE 3: SEAT SELECTION</span>
                        </div>
                        <h4 className="text-sm sm:text-base font-bold text-white">
                          {selectedMovie.title} • {selectedShowtime.auditorium_name}
                        </h4>
                        <p className="text-xs text-slate-400">
                          {new Date(selectedShowtime.start_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })} • Regular ₹{selectedShowtime.price_regular} / VIP ₹{selectedShowtime.price_vip}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <button
                        className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-rvu-ruby to-rvu-accent hover:from-rose-700 hover:to-orange-600 text-white text-xs font-extrabold shadow-lg shadow-rvu-accent/25 flex items-center justify-center space-x-2 transition-all hover:scale-105"
                        onClick={() => {
                          alert(`Selected: ${selectedMovie.title} at ${selectedShowtime.auditorium_name}.\nPhase 2 Complete! Awaiting confirmation to unlock Phase 3: Interactive Seat Grid & 5-minute Hold Engine.`);
                        }}
                      >
                        <span>Proceed to Seat Grid</span>
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

      {/* Footer & Session Diagnostics */}
      <footer className="mt-16 border-t border-slate-900 bg-slate-950 py-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-slate-400">RV University Campus Cinema Booking System</p>
            <p className="text-[11px] text-slate-600">Built for student screenings • Strict @rvu.edu.in verification</p>
          </div>

          {/* Session Diagnostics */}
          <div className="flex items-center space-x-3 text-[11px] font-mono bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="text-slate-400">Session ID:</span>
            <span className="text-amber-400 truncate max-w-[140px]" title={sessionId}>{sessionId}</span>
            <button
              onClick={handleResetSession}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Generate fresh Session UUID (tests race conditions)"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
