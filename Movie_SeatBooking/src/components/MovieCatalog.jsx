import React, { useState } from 'react';
import { Search, Film, Clock, Tag, ChevronRight, Info } from 'lucide-react';
import { SynopsisModal } from './SynopsisModal.jsx';

export function MovieCatalog({ movies, selectedMovie, onSelectMovie }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [modalMovie, setModalMovie] = useState(null);

  // Extract unique genres
  const genres = ['All', ...new Set(movies.flatMap((m) => m.genre.split(' / ').map((g) => g.trim())))];

  // Filtered movies
  const filteredMovies = movies.filter((movie) => {
    const matchesSearch =
      movie.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      movie.genre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      movie.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesGenre =
      selectedGenre === 'All' ||
      movie.genre.toLowerCase().includes(selectedGenre.toLowerCase());

    return matchesSearch && matchesGenre;
  });

  return (
    <section className="space-y-6">
      {/* Section Header with Search and Genre Filter */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2 text-[10px] font-mono font-bold uppercase tracking-widest text-rvu-accent mb-1">
            <span>CAMPUS SCREENINGS • AUDITORIUM 1 &amp; 2</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white uppercase">
            Currently Screening
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            RV University authorized academic and cultural screenings.
          </p>
        </div>

        {/* Search Input (Sharp borders, no rounded corners) */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search titles or genres..."
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rvu-accent font-mono"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-mono text-slate-500 hover:text-white"
            >
              CLEAR
            </button>
          )}
        </div>
      </div>

      {/* Genre Filter Tabs (Sharp boxes, no rounded corners) */}
      <div className="flex items-center space-x-1 overflow-x-auto pb-1">
        {genres.map((genre) => (
          <button
            key={genre}
            onClick={() => setSelectedGenre(genre)}
            className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider whitespace-nowrap transition-colors border ${
              selectedGenre === genre
                ? 'bg-rvu-accent text-white border-rvu-accent font-bold'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
            }`}
          >
            {genre}
          </button>
        ))}
      </div>

      {/* Movie Grid (Sharp borders, no rounded corners) */}
      {filteredMovies.length === 0 ? (
        <div className="py-14 text-center border border-slate-800 bg-slate-950">
          <Film className="w-8 h-8 mx-auto text-slate-600 mb-2" />
          <h3 className="text-xs font-bold font-mono text-slate-300 uppercase">No matching titles in schedule</h3>
          <p className="text-[11px] text-slate-500 mt-1 font-mono">
            Check search query or reset genre filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMovies.map((movie) => {
            const isSelected = selectedMovie && selectedMovie.id === movie.id;

            return (
              <div
                key={movie.id}
                className={`group flex flex-col border transition-colors ${
                  isSelected
                    ? 'bg-slate-900/90 border-rvu-accent ring-1 ring-rvu-accent'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Poster Container */}
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-black">
                  <img
                    src={movie.poster_url}
                    alt={movie.title}
                    className="w-full h-full object-cover object-center grayscale-[20%] group-hover:grayscale-0 transition-all duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30" />

                  {/* Top Badges (Sharp) */}
                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-black/90 text-white border border-slate-700">
                      RATING: {movie.age_rating}
                    </span>

                    <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-black/90 text-amber-400 border border-slate-700">
                      {movie.duration_mins} MIN
                    </span>
                  </div>

                  {/* Selected Indicator Bar */}
                  {isSelected && (
                    <div className="absolute bottom-2 left-2 px-2.5 py-0.5 bg-rvu-accent text-white text-[9px] font-mono font-bold uppercase tracking-widest">
                      ACTIVE SELECTION
                    </div>
                  )}
                </div>

                {/* Card Details */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <p className="text-[10px] font-mono text-rvu-accent font-semibold uppercase tracking-wider">
                      {movie.genre}
                    </p>
                    <h3 className="text-base font-bold text-white uppercase tracking-tight mt-0.5">
                      {movie.title}
                    </h3>
                    {movie.tagline && (
                      <p className="text-xs text-slate-400 italic font-serif mt-1 line-clamp-1">
                        "{movie.tagline}"
                      </p>
                    )}
                    <p className="text-xs text-slate-300 mt-2 line-clamp-2 leading-relaxed">
                      {movie.description}
                    </p>
                  </div>

                  {/* Action Buttons (Sharp) */}
                  <div className="pt-3 border-t border-slate-900 flex items-center space-x-2">
                    <button
                      onClick={() => setModalMovie(movie)}
                      className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
                      title="View Details"
                    >
                      <Info className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => onSelectMovie(movie)}
                      className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 text-xs font-mono font-bold uppercase tracking-wider transition-colors border ${
                        isSelected
                          ? 'bg-rvu-accent text-white border-rvu-accent'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border-slate-800'
                      }`}
                    >
                      <span>{isSelected ? 'SELECTED' : 'SELECT SHOWTIME'}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Synopsis Modal */}
      {modalMovie && (
        <SynopsisModal
          movie={modalMovie}
          onClose={() => setModalMovie(null)}
          onSelectMovie={onSelectMovie}
        />
      )}
    </section>
  );
}
