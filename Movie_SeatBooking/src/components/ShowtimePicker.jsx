import React, { useState, useMemo } from 'react';
import { Calendar, Clock, MapPin, Armchair, Check } from 'lucide-react';

export function ShowtimePicker({ movie, showtimes, selectedShowtime, onSelectShowtime }) {
  if (!movie) {
    return (
      <div className="py-10 px-4 border border-dashed border-slate-800 bg-slate-950 text-center font-mono">
        <FilmIcon className="w-8 h-8 mx-auto text-slate-600 mb-2" />
        <h3 className="text-xs font-bold text-slate-300 uppercase">SELECT A MOVIE FROM THE CATALOG TO VIEW SCHEDULE</h3>
        <p className="text-[11px] text-slate-500 mt-1">Screening slots for Campus Auditorium 1 &amp; 2 will populate here.</p>
      </div>
    );
  }

  // Filter showtimes for selected movie
  const movieShowtimes = useMemo(() => {
    return showtimes.filter((st) => st.movie_id === movie.id);
  }, [showtimes, movie.id]);

  // Extract unique dates
  const dateOptions = useMemo(() => {
    const dates = new Map();
    const todayStr = new Date().toDateString();

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toDateString();

    movieShowtimes.forEach((st) => {
      const d = new Date(st.start_time);
      const dateKey = d.toISOString().split('T')[0];
      const dStr = d.toDateString();

      let label = dStr === todayStr ? 'Today' : dStr === tomorrowStr ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

      if (!dates.has(dateKey)) {
        dates.set(dateKey, {
          key: dateKey,
          label,
          fullDate: d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }),
        });
      }
    });

    return Array.from(dates.values());
  }, [movieShowtimes]);

  const [selectedDateKey, setSelectedDateKey] = useState(() => {
    return dateOptions.length > 0 ? dateOptions[0].key : '';
  });

  // Filter showtimes by selected date
  const filteredShowtimes = useMemo(() => {
    if (!selectedDateKey) return movieShowtimes;
    return movieShowtimes.filter((st) => st.start_time.startsWith(selectedDateKey));
  }, [movieShowtimes, selectedDateKey]);

  // Group by auditorium
  const auditoriums = useMemo(() => {
    const grouped = {};
    filteredShowtimes.forEach((st) => {
      if (!grouped[st.auditorium_name]) {
        grouped[st.auditorium_name] = [];
      }
      grouped[st.auditorium_name].push(st);
    });
    return grouped;
  }, [filteredShowtimes]);

  // Format time (e.g. 02:30 PM)
  const formatTime = (timeStr) => {
    const d = new Date(timeStr);
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <section id="showtimes-section" className="scroll-mt-24 space-y-5 pt-4 border-t border-slate-800">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center space-x-2 text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400 mb-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>STEP 1: SELECT DATE &amp; AUDITORIUM SLOT</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold uppercase tracking-tight text-white">
            Schedule for <span className="text-rvu-accent">{movie.title}</span>
          </h2>
        </div>

        <div className="text-[11px] font-mono text-slate-400 flex items-center space-x-2">
          <span className="w-1.5 h-1.5 bg-emerald-400" />
          <span>Live 5-minute atomic holds enabled</span>
        </div>
      </div>

      {/* Date Filter Tabs (Sharp boxes) */}
      {dateOptions.length > 0 ? (
        <div className="flex items-center space-x-1 overflow-x-auto pb-1">
          {dateOptions.map((dateObj) => {
            const isSelected = selectedDateKey === dateObj.key;
            return (
              <button
                key={dateObj.key}
                onClick={() => setSelectedDateKey(dateObj.key)}
                className={`flex flex-col items-start px-4 py-2 text-left transition-colors border ${
                  isSelected
                    ? 'bg-slate-900 border-rvu-accent text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <span className="text-xs font-mono font-bold uppercase tracking-wider">{dateObj.label}</span>
                <span className="text-[10px] font-mono text-slate-500">{dateObj.fullDate}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="p-4 bg-slate-950 border border-slate-800 text-xs font-mono text-slate-400">
          No scheduled screenings for this date.
        </div>
      )}

      {/* Auditoriums and Showtime Cards (Sharp) */}
      <div className="space-y-4">
        {Object.entries(auditoriums).map(([auditoriumName, slots]) => {
          const isMainStage = auditoriumName.includes('Audi 1');

          return (
            <div
              key={auditoriumName}
              className="p-4 bg-slate-950 border border-slate-800 space-y-4"
            >
              {/* Auditorium Meta */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-900 gap-2">
                <div className="flex items-center space-x-2.5">
                  <div className="p-1.5 bg-slate-900 border border-slate-800 text-rvu-accent">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold font-mono text-white tracking-wide uppercase">
                      {auditoriumName}
                    </h3>
                    <p className="text-[10px] font-mono text-slate-400">
                      {isMainStage
                        ? '64 SEATS • 4K LASER PROJECTION • DOLBY ATMOS 7.1'
                        : '64 SEATS • FILM LAB DISPLAY • DCI-P3 CALIBRATED'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-400">
                  <span className="px-2 py-0.5 bg-slate-900 border border-slate-800">
                    REGULAR: ₹{Number(slots[0]?.price_regular || 150).toFixed(0)}
                  </span>
                  <span className="px-2 py-0.5 bg-slate-900 border border-amber-900/40 text-amber-300 font-bold">
                    VIP: ₹{Number(slots[0]?.price_vip || 250).toFixed(0)}
                  </span>
                </div>
              </div>

              {/* Time Slots Grid (Sharp) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {slots.map((showtime) => {
                  const isSelected = selectedShowtime && selectedShowtime.id === showtime.id;
                  const timeFormatted = formatTime(showtime.start_time);

                  return (
                    <button
                      key={showtime.id}
                      onClick={() => onSelectShowtime(showtime)}
                      className={`flex items-center justify-between p-3 text-left transition-colors border ${
                        isSelected
                          ? 'bg-slate-900 border-rvu-accent text-white ring-1 ring-rvu-accent'
                          : 'bg-slate-900/50 hover:bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <Clock className={`w-3.5 h-3.5 ${isSelected ? 'text-rvu-accent' : 'text-slate-500'}`} />
                          <span className="text-xs font-bold font-mono text-white">
                            {timeFormatted}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1.5 text-[10px] font-mono text-slate-400">
                          <Armchair className="w-3 h-3 text-emerald-400" />
                          <span>62 AVAILABLE / 64</span>
                        </div>
                      </div>

                      <div>
                        {isSelected ? (
                          <div className="w-6 h-6 bg-rvu-accent flex items-center justify-center text-white">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="px-2 py-0.5 bg-slate-800 border border-slate-700 text-[10px] font-mono font-bold uppercase text-slate-300">
                            SELECT
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function FilmIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="3" />
      <path d="M7 3v18" />
      <path d="M3 7.5h4" />
      <path d="M3 12h18" />
      <path d="M3 16.5h4" />
      <path d="M17 3v18" />
      <path d="M17 7.5h4" />
      <path d="M17 16.5h4" />
    </svg>
  );
}
