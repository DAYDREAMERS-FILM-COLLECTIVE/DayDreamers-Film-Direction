/**
 * js/modules/screening/state.js
 * Central Reactive State Store for Screening & Seat Reservation.
 * Emits decoupled custom DOM events and maintains state synchronization.
 */

function isWebGLSupported() {
  if (typeof window === 'undefined') return false;
  if (window.__DISABLE_WEBGL) return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('nowebgl') === '1' || params.get('fallback') === '2d') return false;
  } catch (e) {}
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl', { powerPreference: 'low-power' }) || canvas.getContext('experimental-webgl');
    return !!(window.WebGLRenderingContext && gl);
  } catch (e) {
    return false;
  }
}

const state = {
  movies: [],
  selectedMovie: null,
  currentShowings: [],
  selectedShowingIdx: 0,
  pickedSeats: [],
  occupiedSeatsSet: new Set(),
  bookingMode: 'individual', // 'individual' (1 seat) or 'group' (up to 4 seats)
  is2DFallback: !isWebGLSupported()
};

// Mirror initial values onto window for compatibility
if (typeof window !== 'undefined') {
  window.is2DFallbackActive = state.is2DFallback;
  window.bookingMode = state.bookingMode;
  window.picked = state.pickedSeats;
}

function dispatch(eventName, detail = {}) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
    window.dispatchEvent(new CustomEvent('screening:state-change', { detail: { ...state, eventName } }));
  }
}

export function getState() {
  return {
    ...state,
    pickedSeats: [...state.pickedSeats],
    currentShowings: [...state.currentShowings]
  };
}

export function getActiveShowing() {
  if (!state.currentShowings.length) return null;
  return state.currentShowings[state.selectedShowingIdx] || state.currentShowings[0] || null;
}

export function setMovies(movies) {
  state.movies = movies || [];
  dispatch('movies:loaded', { movies: state.movies });
}

export function setSelectedMovie(movie) {
  state.selectedMovie = movie;
  state.pickedSeats = [];
  if (typeof window !== 'undefined') {
    window.picked = state.pickedSeats;
  }
  dispatch('movie:selected', { movie });
  dispatch('seats:updated', { pickedSeats: [], count: 0 });
}

export function setCurrentShowings(showings, selectIdx = 0) {
  state.currentShowings = showings || [];
  state.selectedShowingIdx = Math.max(0, Math.min(selectIdx, state.currentShowings.length - 1));
  state.pickedSeats = [];
  
  const active = getActiveShowing();
  if (typeof window !== 'undefined') {
    window.selectedShowingId = active ? active.id : null;
    window.picked = state.pickedSeats;
  }

  dispatch('showing:changed', { showing: active, index: state.selectedShowingIdx });
  dispatch('seats:updated', { pickedSeats: [], count: 0 });
}

export function setSelectedShowingIdx(idx) {
  if (idx < 0 || idx >= state.currentShowings.length) return;
  state.selectedShowingIdx = idx;
  state.pickedSeats = [];
  
  const active = getActiveShowing();
  if (typeof window !== 'undefined') {
    window.selectedShowingId = active ? active.id : null;
    window.picked = state.pickedSeats;
  }

  dispatch('showing:changed', { showing: active, index: state.selectedShowingIdx });
  dispatch('seats:updated', { pickedSeats: [], count: 0 });
}

export function setOccupiedSeats(seatsSet) {
  state.occupiedSeatsSet = seatsSet instanceof Set ? seatsSet : new Set(seatsSet || []);
  dispatch('occupied:updated', { occupiedSeatsSet: state.occupiedSeatsSet });
}

export function setBookingMode(mode) {
  if (mode !== 'individual' && mode !== 'group') return;
  state.bookingMode = mode;
  if (typeof window !== 'undefined') {
    window.bookingMode = mode;
  }

  // If in individual mode and user has multiple seats selected, keep only first
  if (mode === 'individual' && state.pickedSeats.length > 1) {
    state.pickedSeats = [state.pickedSeats[0]];
    if (typeof window !== 'undefined') {
      window.picked = state.pickedSeats;
    }
    dispatch('seats:updated', { pickedSeats: state.pickedSeats, count: state.pickedSeats.length });
  }

  dispatch('mode:changed', { mode });
}

export function togglePickedSeat(seatId) {
  if (!seatId) return false;
  const idx = state.pickedSeats.indexOf(seatId);

  if (idx >= 0) {
    // Deselect
    state.pickedSeats.splice(idx, 1);
  } else {
    // Select
    if (state.bookingMode === 'individual') {
      state.pickedSeats = [seatId];
    } else {
      if (state.pickedSeats.length >= 4) {
        return false; // Limit reached
      }
      state.pickedSeats.push(seatId);
    }
  }

  if (typeof window !== 'undefined') {
    window.picked = state.pickedSeats;
  }

  dispatch('seats:updated', { pickedSeats: [...state.pickedSeats], count: state.pickedSeats.length });
  return true;
}

export function clearPickedSeats() {
  state.pickedSeats = [];
  if (typeof window !== 'undefined') {
    window.picked = state.pickedSeats;
  }
  dispatch('seats:updated', { pickedSeats: [], count: 0 });
}

export function setIs2DFallback(active) {
  state.is2DFallback = !!active;
  if (typeof window !== 'undefined') {
    window.is2DFallbackActive = state.is2DFallback;
  }
  dispatch('fallback:toggled', { is2DFallback: state.is2DFallback });
}
