/**
 * src/screening/store.ts
 * Central Reactive Zustand Store for the self-contained Screening module.
 */

import { create } from 'zustand';
import { Movie, Showing, BookingMode } from './types';

export interface ScreeningStoreState {
  movies: Movie[];
  selectedMovie: Movie | null;
  currentShowings: Showing[];
  selectedShowingIdx: number;
  pickedSeats: string[];
  occupiedSeats: Set<string>;
  bookingMode: BookingMode;
  is2DFallback: boolean;
  isLoading: boolean;
  isModalOpen: boolean;

  // Actions
  setMovies: (movies: Movie[]) => void;
  selectMovie: (movie: Movie) => void;
  setShowings: (showings: Showing[], defaultIdx?: number) => void;
  selectShowingIdx: (idx: number) => void;
  setOccupiedSeats: (seats: string[] | Set<string>) => void;
  setBookingMode: (mode: BookingMode) => void;
  toggleSeat: (seatId: string) => boolean;
  clearPickedSeats: () => void;
  set2DFallback: (fallback: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setModalOpen: (open: boolean) => void;
  getActiveShowing: () => Showing | null;
}

export const useScreeningStore = create<ScreeningStoreState>((set, get) => ({
  movies: [],
  selectedMovie: null,
  currentShowings: [],
  selectedShowingIdx: 0,
  pickedSeats: [],
  occupiedSeats: new Set<string>(),
  bookingMode: 'individual',
  is2DFallback: false,
  isLoading: false,
  isModalOpen: false,

  setMovies: (movies) => set({ movies }),

  selectMovie: (movie) =>
    set({
      selectedMovie: movie,
      pickedSeats: []
    }),

  setShowings: (currentShowings, selectedShowingIdx = 0) =>
    set({
      currentShowings,
      selectedShowingIdx: Math.max(0, Math.min(selectedShowingIdx, currentShowings.length - 1)),
      pickedSeats: []
    }),

  selectShowingIdx: (selectedShowingIdx) => {
    const { currentShowings } = get();
    if (selectedShowingIdx < 0 || selectedShowingIdx >= currentShowings.length) return;
    set({ selectedShowingIdx, pickedSeats: [] });
  },

  setOccupiedSeats: (seats) =>
    set({
      occupiedSeats: seats instanceof Set ? seats : new Set(seats)
    }),

  setBookingMode: (bookingMode) =>
    set((state) => ({
      bookingMode,
      // If switching to individual and user selected > 1 seat, retain only first
      pickedSeats:
        bookingMode === 'individual' && state.pickedSeats.length > 1
          ? [state.pickedSeats[0]]
          : state.pickedSeats
    })),

  toggleSeat: (seatId: string) => {
    const { pickedSeats, bookingMode, occupiedSeats } = get();
    if (occupiedSeats.has(seatId)) return false;

    const exists = pickedSeats.includes(seatId);

    if (exists) {
      set({ pickedSeats: pickedSeats.filter((s) => s !== seatId) });
      return true;
    }

    if (bookingMode === 'individual') {
      set({ pickedSeats: [seatId] });
      return true;
    }

    if (pickedSeats.length >= 4) {
      return false; // Limit reached for group mode
    }

    set({ pickedSeats: [...pickedSeats, seatId] });
    return true;
  },

  clearPickedSeats: () => set({ pickedSeats: [] }),

  set2DFallback: (is2DFallback) => set({ is2DFallback }),

  setIsLoading: (isLoading) => set({ isLoading }),

  setModalOpen: (isModalOpen) => set({ isModalOpen }),

  getActiveShowing: () => {
    const { currentShowings, selectedShowingIdx } = get();
    if (!currentShowings.length) return null;
    return currentShowings[selectedShowingIdx] ?? currentShowings[0] ?? null;
  }
}));
