import React, { useState } from 'react';
import { Calendar, Clock, MapPin, IndianRupee } from 'lucide-react';

export function ShowtimePicker({ movie, showtimes, selectedShowtime, onSelectShowtime }) {
  const movieShowtimes = showtimes.filter((s) => s.movie_id === movie.id);

  // Group showtimes by date
  const showtimesByDate = movieShowtimes.reduce((acc, st) => {
    const dateKey = new Date(st.start_time).toISOString().split('T')[0];
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(st);
    return acc;
  }, {});

  const dates = Object.keys(showtimesByDate).sort();
  const [activeDate, setActiveDate] = useState(dates[0] || '');

  // Keep activeDate aligned if movie changes
  if (dates.length > 0 && !dates.includes(activeDate)) {
    setActiveDate(dates[0]);
  }

  const activeSlotList = showtimesByDate[activeDate] || [];

  return (
    <section className="space-y-6" id="showtimes-section">
      {/* Header */}
      <div className="border-b border-[#2a2622] pb-4">
        <span className="text-[10px] font-mono tracking-widest text-[#d83128] uppercase block">
          SCHEDULE // SCREENING TIMETABLE
        </span>
        <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#eee9df] uppercase">
          {movie.title}
        </h3>
      </div>

      {movieShowtimes.length === 0 ? (
        <div className="p-8 bg-[#171513] border border-[#2a2622] text-center space-y-2">
          <p className="text-xs font-mono text-[#9f9b94]">
            NO SCREENINGS CURRENTLY SCHEDULED FOR THIS TITLE
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Horizontal Date Selector (QuickShow DateSelect inspired) */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-2">
            {dates.map((dStr) => {
              const dObj = new Date(dStr + 'T00:00:00');
              const isToday = new Date().toISOString().split('T')[0] === dStr;
              const isSelected = activeDate === dStr;

              const dayName = isToday
                ? 'TODAY'
                : dObj.toLocaleDateString('en-IN', { weekday: 'short' }).toUpperCase();
              const dateNumber = dObj.getDate();
              const monthName = dObj.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase();

              return (
                <button
                  key={dStr}
                  onClick={() => setActiveDate(dStr)}
                  className={`min-w-[84px] p-3 text-center border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#d83128] text-white border-[#d83128] shadow-[0_2px_12px_rgba(216,49,40,0.25)]'
                      : 'bg-[#171513] text-[#9f9b94] border-[#2a2622] hover:border-[#3a3530] hover:text-[#eee9df]'
                  }`}
                >
                  <span className="text-[9px] font-mono tracking-wider block opacity-80">
                    {dayName}
                  </span>
                  <span className="text-base font-serif font-bold block my-0.5">
                    {dateNumber}
                  </span>
                  <span className="text-[9px] font-mono tracking-wider block opacity-80">
                    {monthName}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Screening Slots for Active Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeSlotList.map((st) => {
              const isSelected = selectedShowtime?.id === st.id;
              const timeStr = new Date(st.start_time).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              });

              return (
                <button
                  key={st.id}
                  onClick={() => onSelectShowtime(st)}
                  className={`p-4 text-left border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#1e1b18] border-[#d83128] shadow-[0_2px_16px_rgba(216,49,40,0.2)]'
                      : 'bg-[#171513] border-[#2a2622] hover:border-[#3a3530]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-serif font-bold text-[#eee9df]">
                      {timeStr}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-[#0e0d0c] border border-[#2a2622] text-[#d83128] uppercase">
                      50 SEATS
                    </span>
                  </div>

                  <div className="mt-2 space-y-1 text-xs font-sans text-[#9f9b94]">
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-3 h-3 text-[#d83128]" />
                      <span className="text-[#eee9df] font-medium">{st.auditorium_name}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-[#2a2622] flex items-center justify-between text-[11px] font-mono">
                    <span className="text-[#9f9b94]">REGULAR: ₹{st.price_regular}</span>
                    <span className="text-[#d4af37]">VIP: ₹{st.price_vip}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
