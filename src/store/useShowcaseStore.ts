import { create } from 'zustand';
import { MOVIE_CATALOG, MovieItem, MovieShowtimeConfig } from '@/config/movies.schema';

interface ShowcaseState {
  activeMovie: MovieItem;
  normalizedScroll: number;
  scrollVelocity: number;
  isBookingOpen: boolean;
  isTransitioningToBooking: boolean;
  selectedShowtime: MovieShowtimeConfig | null;

  setActiveMovie: (movie: MovieItem) => void;
  setScrollState: (normalizedScroll: number, scrollVelocity: number) => void;
  openBooking: (movie: MovieItem, showtime?: MovieShowtimeConfig) => void;
  closeBooking: () => void;
  setTransitioning: (status: boolean) => void;
}

export const useShowcaseStore = create<ShowcaseState>((set) => ({
  activeMovie: MOVIE_CATALOG[0],
  normalizedScroll: 0,
  scrollVelocity: 0,
  isBookingOpen: false,
  isTransitioningToBooking: false,
  selectedShowtime: MOVIE_CATALOG[0].showtimes[0] || null,

  setActiveMovie: (movie) => set({ activeMovie: movie }),
  setScrollState: (normalizedScroll, scrollVelocity) => set({ normalizedScroll, scrollVelocity }),
  openBooking: (movie, showtime) => {
    set({
      activeMovie: movie,
      selectedShowtime: showtime || movie.showtimes[0],
      isTransitioningToBooking: true,
    });
  },
  closeBooking: () => set({ isBookingOpen: false, isTransitioningToBooking: false }),
  setTransitioning: (status) => set({ isTransitioningToBooking: status }),
}));
