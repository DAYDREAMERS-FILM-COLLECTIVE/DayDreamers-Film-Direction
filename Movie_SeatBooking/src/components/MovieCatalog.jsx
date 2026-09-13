import React, { useState } from 'react';
import { Search, Film, Clock, Tag, ChevronRight, Info, Play, Sparkles } from 'lucide-react';
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
    <section className="space-y-8">
      {/* Section Header with Search and Genre Filter */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-widest text-rvu-accent mb-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>CAMPUS SCREENINGS • AUDITORIUM 1 & 2</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Currently Screening
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Exclusive cinema screenings for RV University students and faculty.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search movie or genre..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rvu-accent focus:ring-1 focus:ring-rvu-accent transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Genre Pills */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
        {genres.map((genre) => (
          <button
            key={genre}
            onClick={() => setSelectedGenre(genre)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition-all ${
              selectedGenre === genre
                ? 'bg-rvu-accent text-white shadow-md shadow-rvu-accent/20 scale-105'
                : 'bg-slate-900/80 text-slate-400 border border-slate-800 hover:text-white hover:border-slate-700'
            }`}
          >
            {genre}
          </button>
        ))}
      </div>

      {/* Movie Grid */}
      {filteredMovies.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/40">
          <Film className="w-10 h-10 mx-auto text-slate-600 mb-3" />
          <h3 className="text-base font-bold text-slate-300">No movies found</h3>
          <p className="text-xs text-slate-500 mt-1">
            Try adjusting your search query or genre filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMovies.map((movie) => {
            const isSelected = selectedMovie && selectedMovie.id === movie.id;

            return (
              <div
                key={movie.id}
                className={`group relative flex flex-col rounded-2xl overflow-hidden transition-all duration-300 ${
                  isSelected
                    ? 'bg-slate-900 border-2 border-rvu-accent shadow-2xl shadow-rvu-accent/15 ring-2 ring-rvu-accent/30'
                    : 'bg-rvu-surface border border-slate-800 hover:border-slate-700 hover:shadow-xl hover:shadow-black/50'
                }`}
              >
                {/* Poster Container */}
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-950">
                  <img
                    src={movie.poster_url}
                    alt={movie.title}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-rvu-surface via-transparent to-black/40" />

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <span className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider rounded-md bg-black/70 backdrop-blur-md text-white border border-white/10">
                      {movie.age_rating}
                    </span>

                    <span className="px-2 py-0.5 text-[10px] font-mono font-medium rounded-md bg-black/60 backdrop-blur-md text-amber-300 border border-amber-500/20">
                      {movie.duration_mins}m
                    </span>
                  </div>

                  {/* Selected Indicator Pill */}
                  {isSelected && (
                    <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-rvu-accent text-white text-[10px] font-bold tracking-wider uppercase shadow-md flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                      <span>Selected Movie</span>
                    </div>
                  )}
                </div>

                {/* Card Details */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <p className="text-[11px] font-medium text-rvu-accent/90 uppercase tracking-wider">
                      {movie.genre}
                    </p>
                    <h3 className="text-lg font-bold text-white tracking-tight mt-1 group-hover:text-amber-200 transition-colors">
                      {movie.title}
                    </h3>
                    {movie.tagline && (
                      <p className="text-xs text-slate-400 italic mt-1 font-serif line-clamp-1">
                        "{movie.tagline}"
                      </p>
                    )}
                    <p className="text-xs text-slate-300 mt-2.5 line-clamp-2 leading-relaxed">
                      {movie.description}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center space-x-2.5">
                    <button
                      onClick={() => setModalMovie(movie)}
                      className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white transition-colors"
                      title="View Synopsis & Details"
                    >
                      <Info className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => onSelectMovie(movie)}
                      className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all duration-200 ${
                        isSelected
                          ? 'bg-rvu-accent text-white shadow-lg shadow-rvu-accent/25'
                          : 'bg-slate-800 hover:bg-gradient-to-r hover:from-rvu-ruby hover:to-rvu-accent text-slate-200 hover:text-white'
                      }`}
                    >
                      <span>{isSelected ? 'Selected' : 'Book Showtimes'}</span>
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
