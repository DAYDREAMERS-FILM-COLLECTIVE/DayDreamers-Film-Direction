/**
 * js/modules/admin/main.js
 * Central Administrative Orchestrator:
 * Integrates auth gate, film catalog, seat locker, booking roster, and QR scanner.
 * Coordinates programmatic event delegation for declarative data attributes.
 */

import {
  getAdminKey,
  verifyPasskey,
  checkExistingAuth,
  unlockDashboard,
  lockDashboard
} from './auth.js';

import {
  loadMovies,
  toggleAddMovieForm,
  deleteMovie,
  handleAddMovieSubmit
} from './movies.js';

import {
  initSeatLocker,
  onSeatMovieChange,
  onSeatShowingChange,
  toggleSeatLock
} from './seat-locker.js';

import {
  loadBookings,
  exportBookingsCsv
} from './bookings.js';

import {
  startQrScanner,
  stopQrScanner,
  restartScanner,
  resetScanView,
  handleManualLookupSubmit
} from './qr-scanner.js';

let currentSection = 'movies';

export function showSection(section) {
  if (!section) return;

  // Stop scanner camera if leaving scanner view
  if (currentSection === 'scanner' && section !== 'scanner') {
    stopQrScanner();
  }
  currentSection = section;

  // Update nav item active states
  document.querySelectorAll('.nav-item').forEach(el => {
    const targetSection = el.getAttribute('data-section');
    if (targetSection === section) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  });

  const moviesSec = document.getElementById('moviesSection');
  const seatsSec = document.getElementById('seatsSection');
  const bookingsSec = document.getElementById('bookingsSection');
  const scannerSec = document.getElementById('scannerSection');

  if (moviesSec) moviesSec.style.display = 'none';
  if (seatsSec) seatsSec.style.display = 'none';
  if (bookingsSec) bookingsSec.style.display = 'none';
  if (scannerSec) scannerSec.style.display = 'none';

  if (section === 'movies') {
    if (moviesSec) moviesSec.style.display = 'block';
    loadMovies();
  } else if (section === 'seats') {
    if (seatsSec) seatsSec.style.display = 'block';
    initSeatLocker();
  } else if (section === 'bookings') {
    if (bookingsSec) bookingsSec.style.display = 'block';
    loadBookings();
  } else if (section === 'scanner') {
    if (scannerSec) scannerSec.style.display = 'block';
    startQrScanner();
  }
}

function bindEventDelegation() {
  // 1. Click delegation
  document.addEventListener('click', (e) => {
    // Navigation
    const navBtn = e.target.closest('[data-action="navigate"]');
    if (navBtn) {
      e.preventDefault();
      const section = navBtn.getAttribute('data-section');
      showSection(section);
      return;
    }

    // Toggle Add Movie Form
    const addMovieBtn = e.target.closest('[data-action="toggle-add-movie"]');
    if (addMovieBtn) {
      e.preventDefault();
      toggleAddMovieForm();
      return;
    }

    // Delete Movie
    const deleteBtn = e.target.closest('[data-action="delete-movie"]');
    if (deleteBtn) {
      e.preventDefault();
      const movieId = deleteBtn.getAttribute('data-movie-id');
      deleteMovie(movieId);
      return;
    }

    // Toggle Seat Lock / Unlock
    const seatBtn = e.target.closest('[data-action="toggle-seat"]');
    if (seatBtn && !seatBtn.disabled) {
      e.preventDefault();
      const seatId = seatBtn.getAttribute('data-seat-id');
      const action = seatBtn.getAttribute('data-seat-action');
      toggleSeatLock(seatId, action);
      return;
    }

    // Restart Scanner
    const restartBtn = e.target.closest('[data-action="restart-scanner"]');
    if (restartBtn) {
      e.preventDefault();
      restartScanner();
      return;
    }

    // Reset Scan View
    const resetBtn = e.target.closest('[data-action="reset-scan"]');
    if (resetBtn) {
      e.preventDefault();
      resetScanView();
      return;
    }

    // Export Bookings CSV
    const exportBtn = e.target.closest('[data-action="export-csv"]');
    if (exportBtn) {
      e.preventDefault();
      exportBookingsCsv();
      return;
    }

    // Logout
    const logoutBtn = e.target.closest('[data-action="logout"]');
    if (logoutBtn) {
      e.preventDefault();
      lockDashboard();
      return;
    }
  });

  // 2. Change delegation
  document.addEventListener('change', (e) => {
    if (e.target.matches('#seatMovieSelect') || e.target.closest('[data-action="change-movie"]')) {
      onSeatMovieChange();
    } else if (e.target.matches('#seatShowingSelect') || e.target.closest('[data-action="change-showing"]')) {
      onSeatShowingChange();
    }
  });

  // 3. Search input delegation
  document.addEventListener('input', (e) => {
    if (e.target.matches('#bookingSearchInput') || e.target.closest('[data-action="search-bookings"]')) {
      loadBookings(e.target.value);
    }
  });

  // 4. Form Submissions
  const newMovieForm = document.getElementById('newMovieForm');
  if (newMovieForm) {
    newMovieForm.addEventListener('submit', handleAddMovieSubmit);
  }

  const manualVerifyForm = document.getElementById('manualVerifyForm');
  if (manualVerifyForm) {
    manualVerifyForm.addEventListener('submit', handleManualLookupSubmit);
  }

  const authGateForm = document.getElementById('authGateForm');
  if (authGateForm) {
    authGateForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const passkeyInput = document.getElementById('adminPasskey');
      const errorEl = document.getElementById('authError');
      const key = passkeyInput ? passkeyInput.value : '';

      if (errorEl) errorEl.style.display = 'none';

      const res = await verifyPasskey(key);
      if (res.success) {
        showSection('movies');
      } else {
        if (errorEl) {
          errorEl.textContent = res.error || 'Authentication Failed';
          errorEl.style.display = 'block';
        }
      }
    });
  }
}

export async function bootstrap() {
  bindEventDelegation();

  const authenticated = await checkExistingAuth();
  if (authenticated) {
    showSection('movies');
  } else {
    const passkeyInput = document.getElementById('adminPasskey');
    if (passkeyInput) passkeyInput.focus();
  }
}

// Global window exposure for debugging and backward compatibility
if (typeof window !== 'undefined') {
  window.showSection = showSection;
  window.toggleAddMovieForm = toggleAddMovieForm;
  window.restartScanner = restartScanner;
  window.resetScanView = resetScanView;
  window.adminApp = {
    showSection,
    loadMovies,
    initSeatLocker,
    loadBookings,
    startQrScanner,
    verifyPasskey,
    lockDashboard
  };
}

// Boot on document readiness
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
}
