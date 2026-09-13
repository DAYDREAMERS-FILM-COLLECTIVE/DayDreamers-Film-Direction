import { create } from 'zustand';
import { MOVIE_CATALOG, MovieItem, MovieShowtimeConfig } from '@/config/movies.schema';

interface ShowcaseState {
  activeMovie: MovieItem;
  normalizedScroll: number;
  scrollVelocity: number;
  isPageTransitioning: boolean;
  isBookingRoute: boolean;
  selectedShowtime: MovieShowtimeConfig;

  setActiveMovie: (movie: MovieItem) => void;
  setScrollState: (normalizedScroll: number, scrollVelocity: number) => void;
  setSelectedShowtime: (showtime: MovieShowtimeConfig) => void;
  setIsPageTransitioning: (status: boolean) => void;
  setIsBookingRoute: (status: boolean) => void;
}

export const useShowcaseStore = create<ShowcaseState>((set) => ({
  activeMovie: MOVIE_CATALOG[0],
  normalizedScroll: 0,
  scrollVelocity: 0,
  isPageTransitioning: false,
  isBookingRoute: false,
  selectedShowtime: MOVIE_CATALOG[0].showtimes[0],

  setActiveMovie: (movie) => set({ activeMovie: movie }),
  setScrollState: (normalizedScroll, scrollVelocity) => set({ normalizedScroll, scrollVelocity }),
  setSelectedShowtime: (showtime) => set({ selectedShowtime: showtime }),
  setIsPageTransitioning: (status) => set({ isPageTransitioning: status }),
  setIsBookingRoute: (status) => set({ isBookingRoute: status }),
}));
