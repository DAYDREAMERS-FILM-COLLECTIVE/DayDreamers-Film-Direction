import React, { useState, useEffect } from 'react';
import {
  fetchAdminStats,
  fetchAdminBookings,
  fetchMovies,
  fetchShowtimes,
  adminCreateMovie,
  adminArchiveMovie,
  adminCreateShowtime,
  adminCheckInBooking,
} from '../lib/supabase.js';
import {
  Film,
  Calendar,
  Users,
  TrendingUp,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  MapPin,
  Lock,
  Unlock,
  AlertCircle,
  Archive,
  RefreshCw,
} from 'lucide-react';

export function AdminPortal({ onBackToScreenings, onOpenDoorScanner }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'movies' | 'showtimes' | 'roster'
  const [stats, setStats] = useState(null);
  const [movies, setMovies] = useState([]);
  const [showtimes, setShowtimes] = useState([]);
  const [roster, setRoster] = useState([]);
  const [rosterSearch, setRosterSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Modals state
  const [showAddMovieModal, setShowAddMovieModal] = useState(false);
  const [showAddShowtimeModal, setShowAddShowtimeModal] = useState(false);

  // New Movie Form
  const [newMovie, setNewMovie] = useState({
    title: '',
    tagline: '',
    description: '',
    poster_url: '',
    backdrop_url: '',
    trailer_url: '',
    duration_mins: 120,
    genre: 'Drama',
    age_rating: 'UA',
  });

  // New Showtime Form
  const [newShowtime, setNewShowtime] = useState({
    movie_id: '',
    auditorium_name: 'Campus Audi 1 - Main Stage',
    start_time: '',
    price_regular: 150,
    price_vip: 250,
  });

  // Load Admin Data from live Supabase
  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [statsData, moviesData, showtimesData, rosterData] = await Promise.all([
        fetchAdminStats(),
        fetchMovies(true), // Include inactive
        fetchShowtimes(),
        fetchAdminBookings(''),
      ]);

      setStats(statsData);
      setMovies(moviesData.data || []);
      setShowtimes(showtimesData.data || []);
      setRoster(rosterData || []);

      if (moviesData.data?.length > 0 && !newShowtime.movie_id) {
        setNewShowtime((prev) => ({ ...prev, movie_id: moviesData.data[0].id }));
      }
    } catch (err) {
      console.error('[AdminPortal] Error loading admin data:', err);
      setStatusMessage('Error synchronizing with Supabase database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // Filter roster by search term
  const filteredRoster = roster.filter((b) => {
    if (!rosterSearch.trim()) return true;
    const term = rosterSearch.toLowerCase();
    return (
      b.user_name.toLowerCase().includes(term) ||
      b.usn.toLowerCase().includes(term) ||
      b.rvu_email.toLowerCase().includes(term) ||
      b.ticket_hash.toLowerCase().includes(term) ||
      b.showtimes?.movies?.title?.toLowerCase().includes(term)
    );
  });

  // Handle Add Movie
  const handleAddMovie = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setStatusMessage('');

    try {
      await adminCreateMovie(newMovie);
      setStatusMessage('Film successfully added to campus catalog.');
      setShowAddMovieModal(false);
      setNewMovie({
        title: '',
        tagline: '',
        description: '',
        poster_url: '',
        backdrop_url: '',
        trailer_url: '',
        duration_mins: 120,
        genre: 'Drama',
        age_rating: 'UA',
      });
      await loadAdminData();
    } catch (err) {
      console.error('[AdminPortal] Add movie error:', err);
      setStatusMessage('Failed to add movie to Supabase database.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Archive Movie
  const handleToggleArchiveMovie = async (movie) => {
    setActionLoading(true);
    try {
      await adminArchiveMovie(movie.id, !movie.is_active);
      await loadAdminData();
    } catch (err) {
      console.error('[AdminPortal] Archive movie error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Add Showtime
  const handleAddShowtime = async (e) => {
    e.preventDefault();
    if (!newShowtime.start_time) {
      setStatusMessage('Please select a valid date and time.');
      return;
    }

    setActionLoading(true);
    setStatusMessage('');

    try {
      await adminCreateShowtime(newShowtime);
      setStatusMessage('Screening scheduled and 50-seat acoustic grid generated.');
      setShowAddShowtimeModal(false);
      await loadAdminData();
    } catch (err) {
      console.error('[AdminPortal] Add showtime error:', err);
      setStatusMessage('Failed to schedule showtime in Supabase.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle One-Click Check-in
  const handleCheckIn = async (bookingId) => {
    setActionLoading(true);
    try {
      await adminCheckInBooking(bookingId);
      // Update local state
      setRoster((prev) =>
        prev.map((b) =>
          b.id === bookingId ? { ...b, checked_in_at: new Date().toISOString() } : b
        )
      );
    } catch (err) {
      console.error('[AdminPortal] Check-in error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Admin Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-[#171513] border border-[#2a2622]">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-mono tracking-widest text-[#d83128] uppercase">
              FPS MANAGEMENT DASHBOARD
            </span>
            <span className="px-2 py-0.5 bg-[#0e0d0c] border border-[#2a2622] text-[10px] font-mono text-[#9f9b94]">
              AUTH LEVEL: ADMIN
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#eee9df] uppercase">
            Campus Cinema CMS
          </h1>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onOpenDoorScanner}
            className="px-4 py-2 bg-[#0e0d0c] hover:bg-[#1e1b18] text-[#eee9df] border border-[#2a2622] text-xs font-mono uppercase tracking-wider transition-colors"
          >
            SCANNER GATE
          </button>
          <button
            onClick={onBackToScreenings}
            className="px-4 py-2 bg-[#d83128] hover:bg-[#b8241c] text-white border border-[#d83128] text-xs font-sans font-bold uppercase tracking-wider transition-colors"
          >
            RETURN TO SITE
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 bg-[#1e1b18] border border-[#2a2622] text-xs font-mono text-[#d83128] flex items-center justify-between">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage('')} className="text-[#9f9b94] hover:text-white">
            ×
          </button>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center space-x-2 border-b border-[#2a2622] overflow-x-auto pb-px">
        {[
          { id: 'overview', label: 'Overview', icon: TrendingUp },
          { id: 'movies', label: 'Films CMS', icon: Film },
          { id: 'showtimes', label: 'Showtimes', icon: Calendar },
          { id: 'roster', label: 'Student Roster', icon: Users },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-xs font-sans font-medium uppercase tracking-wider border-b-2 flex items-center space-x-2 transition-colors cursor-pointer ${
                isActive
                  ? 'border-[#d83128] text-[#eee9df] bg-[#171513]'
                  : 'border-transparent text-[#9f9b94] hover:text-[#eee9df] hover:border-[#3a3530]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#d83128]' : 'text-[#9f9b94]'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {loading ? (
            <div className="py-20 text-center space-y-2">
              <div className="w-6 h-6 border-2 border-[#d83128] border-t-transparent animate-spin mx-auto" />
              <p className="text-xs font-mono text-[#9f9b94] uppercase">Loading live metrics...</p>
            </div>
          ) : stats ? (
            <>
              {/* Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 bg-[#171513] border border-[#2a2622] space-y-1">
                  <span className="text-[10px] font-mono uppercase text-[#9f9b94] block">SEAT OCCUPANCY</span>
                  <div className="text-3xl font-mono font-bold text-[#eee9df]">{stats.occupancyRate}%</div>
                  <span className="text-[11px] font-mono text-[#9f9b94]">
                    {stats.bookedSeats} / {stats.totalSeats} seats booked
                  </span>
                </div>

                <div className="p-5 bg-[#171513] border border-[#2a2622] space-y-1">
                  <span className="text-[10px] font-mono uppercase text-[#9f9b94] block">CONFIRMED BOOKINGS</span>
                  <div className="text-3xl font-mono font-bold text-[#eee9df]">{stats.totalBookings}</div>
                  <span className="text-[11px] font-mono text-[#9f9b94]">
                    {stats.admittedCount} students admitted
                  </span>
                </div>

                <div className="p-5 bg-[#171513] border border-[#2a2622] space-y-1">
                  <span className="text-[10px] font-mono uppercase text-[#9f9b94] block">GROSS BOX OFFICE</span>
                  <div className="text-3xl font-mono font-bold text-[#d83128]">₹{stats.totalRevenue}</div>
                  <span className="text-[11px] font-mono text-[#9f9b94]">Zero booking fee model</span>
                </div>

                <div className="p-5 bg-[#171513] border border-[#2a2622] space-y-1">
                  <span className="text-[10px] font-mono uppercase text-[#9f9b94] block">ACTIVE SCHEDULE</span>
                  <div className="text-3xl font-mono font-bold text-[#eee9df]">{stats.activeShowtimes}</div>
                  <span className="text-[11px] font-mono text-[#9f9b94]">Across Audi 1 & Audi 2</span>
                </div>
              </div>

              {/* Showtimes Capacity Snapshot */}
              <div className="bg-[#171513] border border-[#2a2622] p-6 space-y-4">
                <h3 className="text-sm font-serif font-bold uppercase text-[#eee9df] border-b border-[#2a2622] pb-3">
                  Screening Capacity Status
                </h3>
                <div className="space-y-3">
                  {showtimes.map((st) => (
                    <div
                      key={st.id}
                      className="p-4 bg-[#0e0d0c] border border-[#2a2622] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono"
                    >
                      <div>
                        <span className="font-serif font-bold text-sm text-[#eee9df] block">
                          {st.auditorium_name}
                        </span>
                        <span className="text-[#9f9b94]">
                          {new Date(st.start_time).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-[#eee9df]">50 SEATS PER SHOW</span>
                        <span className="px-2 py-0.5 bg-[#171513] border border-[#2a2622] text-[#d83128]">
                          REG: ₹{st.price_regular} / VIP: ₹{st.price_vip}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* TAB 2: FILMS CMS */}
      {activeTab === 'movies' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-serif font-bold uppercase text-[#eee9df]">
              Curated Screening Catalogue ({movies.length})
            </h3>
            <button
              onClick={() => setShowAddMovieModal(true)}
              className="px-4 py-2 bg-[#d83128] hover:bg-[#b8241c] text-white text-xs font-sans font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>ADD FILM</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {movies.map((movie) => (
              <div key={movie.id} className="bg-[#171513] border border-[#2a2622] p-5 space-y-4">
                <div className="aspect-video relative overflow-hidden bg-[#0e0d0c]">
                  <img
                    src={movie.backdrop_url || movie.poster_url}
                    alt={movie.title}
                    className={`w-full h-full object-cover ${movie.is_active ? 'filter contrast-110' : 'filter grayscale opacity-40'}`}
                  />
                  <div className="absolute top-2 right-2 px-2 py-0.5 text-[9px] font-mono font-bold uppercase bg-[#0e0d0c] border border-[#2a2622]">
                    {movie.is_active ? (
                      <span className="text-[#10b981]">ACTIVE</span>
                    ) : (
                      <span className="text-[#9f9b94]">ARCHIVED</span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <h4 className="text-lg font-serif font-bold text-[#eee9df] uppercase">{movie.title}</h4>
                  <p className="text-xs font-mono text-[#9f9b94]">
                    {movie.genre} • {movie.duration_mins} MINS • RATING {movie.age_rating}
                  </p>
                  <p className="text-xs font-sans text-[#9f9b94] line-clamp-2 mt-2">{movie.description}</p>
                </div>

                <div className="pt-3 border-t border-[#2a2622] flex items-center justify-between">
                  <span className="text-[10px] font-mono text-[#9f9b94]">
                    ID: {movie.id.substring(0, 8)}...
                  </span>
                  <button
                    onClick={() => handleToggleArchiveMovie(movie)}
                    className="px-3 py-1 bg-[#0e0d0c] hover:bg-[#1e1b18] text-xs font-mono uppercase text-[#eee9df] border border-[#2a2622] transition-colors"
                  >
                    {movie.is_active ? 'ARCHIVE' : 'RESTORE'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: SHOWTIME MANAGER */}
      {activeTab === 'showtimes' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-serif font-bold uppercase text-[#eee9df]">
              Scheduled Screenings ({showtimes.length})
            </h3>
            <button
              onClick={() => setShowAddShowtimeModal(true)}
              className="px-4 py-2 bg-[#d83128] hover:bg-[#b8241c] text-white text-xs font-sans font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>SCHEDULE SCREENING</span>
            </button>
          </div>

          <div className="bg-[#171513] border border-[#2a2622] overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0e0d0c] border-b border-[#2a2622] text-[#9f9b94]">
                <tr>
                  <th className="p-3 uppercase">Auditorium</th>
                  <th className="p-3 uppercase">Date & Time</th>
                  <th className="p-3 uppercase">Pricing</th>
                  <th className="p-3 uppercase">Capacity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2622]">
                {showtimes.map((st) => (
                  <tr key={st.id} className="hover:bg-[#1e1b18]">
                    <td className="p-3 font-serif font-bold text-sm text-[#eee9df]">
                      {st.auditorium_name}
                    </td>
                    <td className="p-3 text-[#eee9df]">
                      {new Date(st.start_time).toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 text-[#9f9b94]">
                      REG: <span className="text-[#eee9df]">₹{st.price_regular}</span> / VIP:{' '}
                      <span className="text-[#d4af37]">₹{st.price_vip}</span>
                    </td>
                    <td className="p-3 text-[#d83128] font-bold">50 SEATS (PROVISIONED)</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: ATTENDEE ROSTER */}
      {activeTab === 'roster' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-base font-serif font-bold uppercase text-[#eee9df]">
              Student Admission Roster ({filteredRoster.length})
            </h3>

            {/* Search Box */}
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-[#9f9b94] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={rosterSearch}
                onChange={(e) => setRosterSearch(e.target.value)}
                placeholder="Search USN, Name, Pass..."
                className="w-full bg-[#0e0d0c] border border-[#2a2622] pl-9 pr-3 py-2 text-xs font-mono text-[#eee9df] placeholder-[#64748b] focus:outline-none focus:border-[#d83128]"
              />
            </div>
          </div>

          <div className="bg-[#171513] border border-[#2a2622] overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0e0d0c] border-b border-[#2a2622] text-[#9f9b94]">
                <tr>
                  <th className="p-3 uppercase">Student</th>
                  <th className="p-3 uppercase">USN / Email</th>
                  <th className="p-3 uppercase">Film & Hall</th>
                  <th className="p-3 uppercase">Pass Hash</th>
                  <th className="p-3 uppercase">Status</th>
                  <th className="p-3 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2622]">
                {filteredRoster.map((b) => {
                  const isCheckedIn = Boolean(b.checked_in_at);
                  return (
                    <tr key={b.id} className="hover:bg-[#1e1b18]">
                      <td className="p-3 font-bold text-[#eee9df]">{b.user_name}</td>
                      <td className="p-3">
                        <span className="text-[#d83128] block">{b.usn}</span>
                        <span className="text-[#9f9b94] text-[11px]">{b.rvu_email}</span>
                      </td>
                      <td className="p-3">
                        <span className="text-[#eee9df] block font-serif">
                          {b.showtimes?.movies?.title || 'Screening'}
                        </span>
                        <span className="text-[#9f9b94] text-[11px]">
                          {b.showtimes?.auditorium_name}
                        </span>
                      </td>
                      <td className="p-3 text-[11px] text-[#9f9b94] max-w-[140px] truncate" title={b.ticket_hash}>
                        {b.ticket_hash}
                      </td>
                      <td className="p-3">
                        {isCheckedIn ? (
                          <span className="px-2 py-0.5 bg-[#10b981]/20 border border-[#10b981] text-[#10b981] text-[10px] font-bold">
                            ADMITTED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-[#523009]/30 border border-[#854d0e] text-[#f59e0b] text-[10px]">
                            PENDING
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        {!isCheckedIn ? (
                          <button
                            onClick={() => handleCheckIn(b.id)}
                            disabled={actionLoading}
                            className="px-2.5 py-1 bg-[#d83128] hover:bg-[#b8241c] text-white text-[10px] uppercase font-bold transition-colors cursor-pointer"
                          >
                            CHECK IN
                          </button>
                        ) : (
                          <span className="text-[10px] text-[#9f9b94]">DONE</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Add Movie */}
      {showAddMovieModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#171513] border border-[#2a2622] p-6 space-y-4">
            <h3 className="text-base font-serif font-bold uppercase text-[#eee9df]">Add Film to Archive</h3>
            <form onSubmit={handleAddMovie} className="space-y-3 text-xs font-sans">
              <input
                type="text"
                required
                placeholder="Title (e.g. 2001: A Space Odyssey)"
                value={newMovie.title}
                onChange={(e) => setNewMovie({ ...newMovie, title: e.target.value })}
                className="w-full bg-[#0e0d0c] border border-[#2a2622] p-2 text-[#eee9df] focus:border-[#d83128] focus:outline-none"
              />
              <input
                type="text"
                placeholder="Tagline"
                value={newMovie.tagline}
                onChange={(e) => setNewMovie({ ...newMovie, tagline: e.target.value })}
                className="w-full bg-[#0e0d0c] border border-[#2a2622] p-2 text-[#eee9df] focus:border-[#d83128] focus:outline-none"
              />
              <textarea
                required
                rows={3}
                placeholder="Curatorial synopsis..."
                value={newMovie.description}
                onChange={(e) => setNewMovie({ ...newMovie, description: e.target.value })}
                className="w-full bg-[#0e0d0c] border border-[#2a2622] p-2 text-[#eee9df] focus:border-[#d83128] focus:outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="url"
                  required
                  placeholder="Poster Image URL"
                  value={newMovie.poster_url}
                  onChange={(e) => setNewMovie({ ...newMovie, poster_url: e.target.value })}
                  className="w-full bg-[#0e0d0c] border border-[#2a2622] p-2 text-[#eee9df] focus:border-[#d83128] focus:outline-none"
                />
                <input
                  type="url"
                  placeholder="Backdrop URL (optional)"
                  value={newMovie.backdrop_url}
                  onChange={(e) => setNewMovie({ ...newMovie, backdrop_url: e.target.value })}
                  className="w-full bg-[#0e0d0c] border border-[#2a2622] p-2 text-[#eee9df] focus:border-[#d83128] focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  required
                  placeholder="Duration (Mins)"
                  value={newMovie.duration_mins}
                  onChange={(e) => setNewMovie({ ...newMovie, duration_mins: e.target.value })}
                  className="w-full bg-[#0e0d0c] border border-[#2a2622] p-2 text-[#eee9df] focus:border-[#d83128] focus:outline-none"
                />
                <input
                  type="text"
                  required
                  placeholder="Genre"
                  value={newMovie.genre}
                  onChange={(e) => setNewMovie({ ...newMovie, genre: e.target.value })}
                  className="w-full bg-[#0e0d0c] border border-[#2a2622] p-2 text-[#eee9df] focus:border-[#d83128] focus:outline-none"
                />
                <input
                  type="text"
                  required
                  placeholder="Rating (U/UA/A)"
                  value={newMovie.age_rating}
                  onChange={(e) => setNewMovie({ ...newMovie, age_rating: e.target.value })}
                  className="w-full bg-[#0e0d0c] border border-[#2a2622] p-2 text-[#eee9df] focus:border-[#d83128] focus:outline-none"
                />
              </div>
              <input
                type="url"
                placeholder="Trailer YouTube URL"
                value={newMovie.trailer_url}
                onChange={(e) => setNewMovie({ ...newMovie, trailer_url: e.target.value })}
                className="w-full bg-[#0e0d0c] border border-[#2a2622] p-2 text-[#eee9df] focus:border-[#d83128] focus:outline-none"
              />

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#2a2622]">
                <button
                  type="button"
                  onClick={() => setShowAddMovieModal(false)}
                  className="px-4 py-2 bg-[#0e0d0c] text-[#9f9b94] border border-[#2a2622]"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-[#d83128] hover:bg-[#b8241c] text-white font-bold"
                >
                  SAVE FILM
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add Showtime */}
      {showAddShowtimeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#171513] border border-[#2a2622] p-6 space-y-4">
            <h3 className="text-base font-serif font-bold uppercase text-[#eee9df]">Schedule Screening</h3>
            <form onSubmit={handleAddShowtime} className="space-y-3 text-xs font-sans">
              <div>
                <label className="text-[10px] font-mono text-[#9f9b94] uppercase block mb-1">Select Film</label>
                <select
                  value={newShowtime.movie_id}
                  onChange={(e) => setNewShowtime({ ...newShowtime, movie_id: e.target.value })}
                  className="w-full bg-[#0e0d0c] border border-[#2a2622] p-2 text-[#eee9df] focus:border-[#d83128] focus:outline-none"
                >
                  {movies.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono text-[#9f9b94] uppercase block mb-1">Auditorium</label>
                <select
                  value={newShowtime.auditorium_name}
                  onChange={(e) => setNewShowtime({ ...newShowtime, auditorium_name: e.target.value })}
                  className="w-full bg-[#0e0d0c] border border-[#2a2622] p-2 text-[#eee9df] focus:border-[#d83128] focus:outline-none"
                >
                  <option value="Campus Audi 1 - Main Stage">Campus Audi 1 - Main Stage</option>
                  <option value="Campus Audi 2 - Film Lab">Campus Audi 2 - Film Lab</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono text-[#9f9b94] uppercase block mb-1">Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={newShowtime.start_time}
                  onChange={(e) => setNewShowtime({ ...newShowtime, start_time: e.target.value })}
                  className="w-full bg-[#0e0d0c] border border-[#2a2622] p-2 text-[#eee9df] focus:border-[#d83128] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-mono text-[#9f9b94] uppercase block mb-1">Regular Price (₹)</label>
                  <input
                    type="number"
                    value={newShowtime.price_regular}
                    onChange={(e) => setNewShowtime({ ...newShowtime, price_regular: e.target.value })}
                    className="w-full bg-[#0e0d0c] border border-[#2a2622] p-2 text-[#eee9df] focus:border-[#d83128] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-[#9f9b94] uppercase block mb-1">VIP Bronze Price (₹)</label>
                  <input
                    type="number"
                    value={newShowtime.price_vip}
                    onChange={(e) => setNewShowtime({ ...newShowtime, price_vip: e.target.value })}
                    className="w-full bg-[#0e0d0c] border border-[#2a2622] p-2 text-[#eee9df] focus:border-[#d83128] focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-2 bg-[#0e0d0c] border border-[#2a2622] text-[10px] font-mono text-[#9f9b94]">
                Notice: Creating this screening will automatically provision its 50-seat acoustic grid.
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#2a2622]">
                <button
                  type="button"
                  onClick={() => setShowAddShowtimeModal(false)}
                  className="px-4 py-2 bg-[#0e0d0c] text-[#9f9b94] border border-[#2a2622]"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-[#d83128] hover:bg-[#b8241c] text-white font-bold"
                >
                  SCHEDULE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
