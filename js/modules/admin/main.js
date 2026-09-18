/**
 * js/modules/admin/main.js
 * Central Administrative Orchestrator:
 * Integrates auth gate, film catalog, seat locker, booking roster, and QR scanner.
 * Coordinates programmatic event delegation for declarative data attributes and tabs.
 */

import {
  getAdminKey,
  getAdminToken,
  verifyPasskey,
  checkExistingAuth,
  unlockDashboard,
  lockDashboard,
  initAuth
} from './auth.js';

import {
  loadMovies,
  renderFilmCatalogue,
  toggleAddMovieForm,
  deleteMovie,
  handleAddMovieSubmit
} from './movies.js';

import {
  initSeatLocker,
  renderSeatLockerGrid,
  populateSeats,
  onSeatMovieChange,
  onSeatShowingChange,
  toggleSeatLock
} from './seat-locker.js';

import {
  loadBookings,
  loadBookingsRoster,
  fetchBookings,
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

export function switchTab(target) {
  if (!target) return;

  let panelId = target;
  let sectionKey = 'movies';

  if (target === 'movies' || target === '#tabCatalogue' || target === 'tabCatalogue' || target === 'moviesSection' || target === '#moviesSection' || target === 'catalogue' || target === 'film-catalogue' || target === 'filmCatalogue') {
    panelId = 'tabCatalogue';
    sectionKey = 'movies';
  } else if (target === 'seats' || target === '#tabSeatLocker' || target === 'tabSeatLocker' || target === 'seatsSection' || target === '#seatsSection' || target === 'seat-locker' || target === 'seatLocker' || target === 'seatlocker') {
    panelId = 'tabSeatLocker';
    sectionKey = 'seats';
  } else if (target === 'bookings' || target === '#tabBookings' || target === 'tabBookings' || target === 'bookingsSection' || target === '#bookingsSection' || target === 'attendee-bookings' || target === 'attendeeBookings') {
    panelId = 'tabBookings';
    sectionKey = 'bookings';
  } else if (target === 'scanner' || target === '#tabScanner' || target === 'tabScanner' || target === 'scannerSection' || target === '#scannerSection' || target === 'door-scanner' || target === 'doorScanner' || target === 'doorscanner') {
    panelId = 'tabScanner';
    sectionKey = 'scanner';
  } else {
    panelId = target.replace(/^#/, '');
    if (panelId.toLowerCase().includes('catalogue') || panelId.toLowerCase().includes('movie')) sectionKey = 'movies';
    else if (panelId.toLowerCase().includes('seat')) sectionKey = 'seats';
    else if (panelId.toLowerCase().includes('booking')) sectionKey = 'bookings';
    else if (panelId.toLowerCase().includes('scan')) sectionKey = 'scanner';
  }

  // Stop scanner camera if leaving scanner view
  if (currentSection === 'scanner' && sectionKey !== 'scanner') {
    stopQrScanner();
  }
  currentSection = sectionKey;

  // 1. Update button active states
  document.querySelectorAll('.sidebar .nav-item, [data-tab], .admin-tab-btn').forEach(btn => {
    const bTab = btn.getAttribute('data-tab');
    const bSec = btn.getAttribute('data-section');
    if (bTab === `#${panelId}` || bTab === panelId || bSec === sectionKey) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // 2. Hide all tab panels, display only target panel
  const allPanels = document.querySelectorAll('.admin-tab-pane, #tabCatalogue, #tabSeatLocker, #tabBookings, #tabScanner, #moviesSection, #seatsSection, #bookingsSection, #scannerSection');
  allPanels.forEach(pane => {
    pane.classList.remove('active');
    pane.style.display = 'none';
  });

  const activePanel = document.getElementById(panelId) || document.querySelector(`[data-tab-pane="${panelId}"]`);
  if (activePanel) {
    activePanel.classList.add('active');
    activePanel.style.display = 'block';
  }

  // 3. Trigger Panel-Specific Renderers on Switch
  if (sectionKey === 'movies') {
    if (typeof renderFilmCatalogue === 'function') {
      renderFilmCatalogue();
    } else {
      loadMovies();
    }
  } else if (sectionKey === 'seats') {
    if (typeof renderSeatLockerGrid === 'function') {
      renderSeatLockerGrid();
    } else if (typeof populateSeats === 'function') {
      populateSeats();
    } else {
      initSeatLocker();
    }
  } else if (sectionKey === 'bookings') {
    if (typeof loadBookingsRoster === 'function') {
      loadBookingsRoster();
    } else if (typeof fetchBookings === 'function') {
      fetchBookings();
    } else {
      loadBookings();
    }
  } else if (sectionKey === 'scanner') {
    startQrScanner();
    // Force scanner container reflow: layout was computed as 0 while hidden
    // behind the auth gate, so re-assert dimensions after unhiding.
    requestAnimationFrame(() => {
      const reader = document.getElementById('reader');
      if (reader) {
        reader.style.minHeight = '280px';
        reader.style.width = '100%';
      }
    });
  }
}

export function showSection(section) {
  switchTab(section);
}

export function switchAdminTab(tabName) {
  return switchTab(tabName);
}

function bindEventDelegation() {
  // 1. Document-level Click Delegation (survives auth-gate unhiding)
  document.addEventListener('click', (e) => {
    // Admin Tab Navigation
    const tabBtn = e.target.closest('[data-tab], .nav-item, .admin-tab-btn, .admin-nav-btn');
    if (tabBtn && !tabBtn.closest('.admin-header-actions') && !tabBtn.closest('[data-action="logout"]')) {
      e.preventDefault();
      const target = tabBtn.getAttribute('data-tab')
        || tabBtn.getAttribute('data-section')
        || tabBtn.getAttribute('href')?.replace('#', '');
      if (target) {
        switchTab(target);
        return;
      }
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
    const logoutBtn = e.target.closest('[data-action="logout"], #adminLogoutBtn');
    if (logoutBtn) {
      e.preventDefault();
      lockDashboard();
      window.location.href = 'index.html';
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

  // 5. Authentication Event Listener
  window.addEventListener('admin:authenticated', () => {
    switchTab('#tabCatalogue');
  });
}

export async function bootstrap() {
  bindEventDelegation();
  initAuth();

  const authenticated = await checkExistingAuth();
  if (authenticated) {
    switchTab('#tabCatalogue');
  } else {
    const userInp = document.getElementById('adminUsername');
    if (userInp) userInp.focus();
  }
}

// Global window exposure for debugging and backward compatibility
if (typeof window !== 'undefined') {
  window.switchTab = switchTab;
  window.switchAdminTab = switchAdminTab;
  window.showSection = switchTab;
  window.toggleAddMovieForm = toggleAddMovieForm;
  window.restartScanner = restartScanner;
  window.resetScanView = resetScanView;
  window.adminApp = {
    switchTab,
    switchAdminTab,
    showSection: switchTab,
    loadMovies,
    initSeatLocker,
    renderSeatLockerGrid,
    loadBookings,
    loadBookingsRoster,
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
