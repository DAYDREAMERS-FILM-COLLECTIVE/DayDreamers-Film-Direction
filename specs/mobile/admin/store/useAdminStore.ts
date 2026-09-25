/**
 * src/admin/store/useAdminStore.ts
 * Central Zustand store for Admin CMS session, navigation, and state caching.
 */

import { create } from 'zustand';
import { AdminSection, AdminMovie, AdminBooking } from '../types';

interface AdminState {
  passkey: string;
  isAuthenticated: boolean;
  currentSection: AdminSection;
  movies: AdminMovie[];
  bookings: AdminBooking[];
  selectedMovieId: string | null;
  selectedShowingId: string | null;
  lockedSeats: Set<string>;
  bookedSeats: Set<string>;
  searchQuery: string;

  // Actions
  setPasskey: (passkey: string) => void;
  setAuthenticated: (auth: boolean) => void;
  setSection: (section: AdminSection) => void;
  setMovies: (movies: AdminMovie[]) => void;
  setBookings: (bookings: AdminBooking[]) => void;
  setSelectedMovieId: (id: string | null) => void;
  setSelectedShowingId: (id: string | null) => void;
  setLockedSeats: (seats: Set<string> | string[]) => void;
  setBookedSeats: (seats: Set<string> | string[]) => void;
  setSearchQuery: (query: string) => void;
  logout: () => void;
}

export const useAdminStore = create<AdminState>((set) => ({
  passkey: '',
  isAuthenticated: false,
  currentSection: 'movies',
  movies: [],
  bookings: [],
  selectedMovieId: null,
  selectedShowingId: null,
  lockedSeats: new Set<string>(),
  bookedSeats: new Set<string>(),
  searchQuery: '',

  setPasskey: (passkey) => set({ passkey }),

  setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),

  setSection: (currentSection) => set({ currentSection }),

  setMovies: (movies) => set({ movies }),

  setBookings: (bookings) => set({ bookings }),

  setSelectedMovieId: (selectedMovieId) => set({ selectedMovieId }),

  setSelectedShowingId: (selectedShowingId) => set({ selectedShowingId }),

  setLockedSeats: (seats) =>
    set({ lockedSeats: seats instanceof Set ? seats : new Set(seats) }),

  setBookedSeats: (seats) =>
    set({ bookedSeats: seats instanceof Set ? seats : new Set(seats) }),

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  logout: () =>
    set({
      passkey: '',
      isAuthenticated: false,
      currentSection: 'movies',
      movies: [],
      bookings: [],
      lockedSeats: new Set<string>()
    })
}));
