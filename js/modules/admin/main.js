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
  handleAddMovieSubmit,
  initMovies,
  toggleMovieScreeningState,
  bulkUpdateScreeningState,
  bulkDeleteMovies,
  clearMovieSelection,
  toggleSelectAllMovies,
  toggleMovieSelection,
  toggleStagingSelection,
  toggleSelectAllStaging,
  setMovieSearch,
  clearMovieSearch,
  setMovieStatusFilter,
  setMovieGenreFilter,
  setMovieYearRange,
  setMovieSort,
  resetAllFilters,
  nextMoviePage,
  prevMoviePage,
  openBulkIngestModal,
  closeBulkIngestModal,
  switchIngestTab,
  parseRawPastedData,
  commitBulkIngest,
  downloadTemplateJson,
  downloadTemplateCsv
} from './movies.js';

import {
  initSeatLocker,
  renderSeatLockerGrid,
  populateSeats,
  onSeatMovieChange,
  onSeatShowingChange,
  toggleSeatLock,
  handleSeatClick,
  selectRow,
  selectAllAvailable,
  invertSelection,
  clearSelection,
  setFilter,
  setSearchQuery,
  zoomIn,
  zoomOut,
  zoomReset,
  openNewShowingModal,
  closeNewShowingModal,
  handleNewShowingSubmit,
  openLockModal,
  closeLockModal,
  openUnlockModal,
  closeUnlockModal,
  openUnlockAllModal,
  closeUnlockAllModal,
  closeAttendeeDrawer,
  closeCancelBookingModal,
  toggleShowingSales,
  loadSeatAuditLog,
  startPolling,
  stopPolling
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
  switchCamera,
  handleFileScan,
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
  // Stop seat polling if leaving seats view
  if (currentSection === 'seats' && sectionKey !== 'seats') {
    stopPolling();
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
    if (typeof initMovies === 'function') {
      initMovies();
    } else if (typeof renderFilmCatalogue === 'function') {
      renderFilmCatalogue();
    } else {
      loadMovies();
    }
  } else if (sectionKey === 'seats') {
    startPolling();
    if (typeof renderSeatLockerGrid === 'function') {
      renderSeatLockerGrid();
    } else if (typeof populateSeats === 'function') {
      populateSeats();
    } else {
      initSeatLocker();
    }
  }
 else if (sectionKey === 'bookings') {
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
        // Auto-close drawer only on mobile overlay (<900px); keep docked nav open on desktop
        const vnavToggle = document.getElementById('vnavToggle');
        if (vnavToggle && vnavToggle.checked && window.innerWidth < 900) {
          vnavToggle.checked = false;
        }
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

    // Bulk Ingest Modal Open/Close/Tabs
    if (e.target.closest('[data-action="open-bulk-ingest"]')) {
      e.preventDefault();
      openBulkIngestModal();
      return;
    }
    if (e.target.closest('[data-action="close-bulk-ingest"]')) {
      e.preventDefault();
      closeBulkIngestModal();
      return;
    }
    const tabSwitchBtn = e.target.closest('[data-action="switch-ingest-tab"]');
    if (tabSwitchBtn) {
      e.preventDefault();
      const targetTab = tabSwitchBtn.getAttribute('data-target-tab');
      if (targetTab) switchIngestTab(targetTab);
      return;
    }
    if (e.target.closest('[data-action="download-template-json"]')) {
      e.preventDefault();
      downloadTemplateJson();
      return;
    }
    if (e.target.closest('[data-action="download-template-csv"]')) {
      e.preventDefault();
      downloadTemplateCsv();
      return;
    }
    if (e.target.closest('[data-action="parse-raw-ingest"]')) {
      e.preventDefault();
      parseRawPastedData();
      return;
    }
    if (e.target.closest('[data-action="commit-bulk-ingest"]')) {
      e.preventDefault();
      commitBulkIngest();
      return;
    }

    // Movie Bulk Actions Toolbar
    if (e.target.closest('[data-action="bulk-mark-active"]')) {
      e.preventDefault();
      bulkUpdateScreeningState(true);
      return;
    }
    if (e.target.closest('[data-action="bulk-mark-archived"]')) {
      e.preventDefault();
      bulkUpdateScreeningState(false);
      return;
    }
    if (e.target.closest('[data-action="bulk-delete-movies"]')) {
      e.preventDefault();
      bulkDeleteMovies();
      return;
    }
    if (e.target.closest('[data-action="clear-movie-selection"]')) {
      e.preventDefault();
      clearMovieSelection();
      return;
    }
    if (e.target.closest('[data-action="clear-movie-search"]')) {
      e.preventDefault();
      clearMovieSearch();
      return;
    }
    if (e.target.closest('[data-action="reset-movie-filters"]')) {
      e.preventDefault();
      resetAllFilters();
      return;
    }

    // Movie Status Filter Chips
    const movieChipBtn = e.target.closest('#movieStatusChips .chip-btn');
    if (movieChipBtn) {
      e.preventDefault();
      const status = movieChipBtn.getAttribute('data-status');
      if (status) setMovieStatusFilter(status);
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

    // Inspect Seat / Selection / Attendee Details
    const seatBtn = e.target.closest('[data-action="inspect-seat"], [data-action="toggle-seat"], .admin-seat');
    if (seatBtn && seatBtn.closest('#adminSeatGrid')) {
      e.preventDefault();
      const seatId = seatBtn.getAttribute('data-seat-id');
      handleSeatClick(seatId);
      return;
    }

    // Filter Chips
    const chipBtn = e.target.closest('#seatFilterChips .chip-btn, [data-filter]');
    if (chipBtn && chipBtn.closest('#tabSeatLocker')) {
      e.preventDefault();
      const filter = chipBtn.getAttribute('data-filter');
      setFilter(filter);
      return;
    }

    // Selection shortcuts
    if (e.target.closest('[data-action="select-all-available"]')) {
      e.preventDefault();
      selectAllAvailable();
      return;
    }
    if (e.target.closest('[data-action="invert-selection"]')) {
      e.preventDefault();
      invertSelection();
      return;
    }
    if (e.target.closest('[data-action="clear-selection"]')) {
      e.preventDefault();
      clearSelection();
      return;
    }
    if (e.target.closest('[data-action="clear-seat-search"]')) {
      e.preventDefault();
      const sInput = document.getElementById('seatSearchInput');
      if (sInput) sInput.value = '';
      setSearchQuery('');
      return;
    }

    // Showing Sales Toggle & Refresh
    if (e.target.closest('[data-action="toggle-showing-sales"]')) {
      e.preventDefault();
      toggleShowingSales();
      return;
    }
    if (e.target.closest('[data-action="refresh-seats"]')) {
      e.preventDefault();
      onSeatShowingChange();
      return;
    }
    if (e.target.closest('[data-action="refresh-audit"]')) {
      e.preventDefault();
      loadSeatAuditLog();
      return;
    }

    // Modals open/close
    if (e.target.closest('[data-action="open-lock-modal"]')) {
      e.preventDefault();
      openLockModal();
      return;
    }
    if (e.target.closest('[data-action="close-lock-modal"]')) {
      e.preventDefault();
      closeLockModal();
      return;
    }
    if (e.target.closest('[data-action="open-unlock-selected"]')) {
      e.preventDefault();
      openUnlockModal();
      return;
    }
    if (e.target.closest('[data-action="close-unlock-modal"]')) {
      e.preventDefault();
      closeUnlockModal();
      return;
    }
    if (e.target.closest('[data-action="open-unlock-all-modal"]')) {
      e.preventDefault();
      openUnlockAllModal();
      return;
    }
    if (e.target.closest('[data-action="close-unlock-all-modal"]')) {
      e.preventDefault();
      closeUnlockAllModal();
      return;
    }
    if (e.target.closest('[data-action="close-attendee-drawer"]')) {
      e.preventDefault();
      closeAttendeeDrawer();
      return;
    }
    if (e.target.closest('[data-action="close-cancel-booking-modal"]')) {
      e.preventDefault();
      closeCancelBookingModal();
      return;
    }

    // Movie Pagination
    if (e.target.closest('[data-action="next-movie-page"]')) {
      e.preventDefault();
      nextMoviePage();
      return;
    }
    if (e.target.closest('[data-action="prev-movie-page"]')) {
      e.preventDefault();
      prevMoviePage();
      return;
    }

    // New Showing Modal
    if (e.target.closest('[data-action="open-new-showing-modal"]')) {
      e.preventDefault();
      openNewShowingModal();
      return;
    }
    if (e.target.closest('[data-action="close-new-showing-modal"]')) {
      e.preventDefault();
      closeNewShowingModal();
      return;
    }

    // Zoom Controls
    if (e.target.closest('[data-action="zoom-in"]')) {
      e.preventDefault();
      zoomIn();
      return;
    }
    if (e.target.closest('[data-action="zoom-out"]')) {
      e.preventDefault();
      zoomOut();
      return;
    }
    if (e.target.closest('[data-action="zoom-reset"]')) {
      e.preventDefault();
      zoomReset();
      return;
    }

    // Restart Scanner
    const restartBtn = e.target.closest('[data-action="restart-scanner"]');
    if (restartBtn) {
      e.preventDefault();
      restartScanner();
      return;
    }

    // Flip / Switch Camera
    const switchCamBtn = e.target.closest('[data-action="switch-camera"]');
    if (switchCamBtn) {
      e.preventDefault();
      switchCamera();
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
    // Movies / Catalogue
    if (e.target.matches('#selectAllMoviesCheckbox')) {
      toggleSelectAllMovies(e.target.checked);
    } else if (e.target.matches('.movie-row-checkbox')) {
      toggleMovieSelection(e.target.dataset.movieId, e.target.checked);
    } else if (e.target.matches('.screening-toggle-input')) {
      toggleMovieScreeningState(e.target.dataset.movieId, e.target.checked);
    } else if (e.target.matches('#selectAllStagingCheckbox')) {
      toggleSelectAllStaging(e.target.checked);
    } else if (e.target.matches('.staging-row-checkbox')) {
      toggleStagingSelection(parseInt(e.target.dataset.index, 10), e.target.checked);
    } else if (e.target.matches('#movieGenreFilter')) {
      setMovieGenreFilter(e.target.value);
    } else if (e.target.matches('#movieSortSelect')) {
      setMovieSort(e.target.value);
    }
    // Seat Locker
    else if (e.target.matches('#seatMovieSelect') || e.target.closest('[data-action="change-movie"]')) {
      onSeatMovieChange();
    } else if (e.target.matches('#seatShowingSelect') || e.target.closest('[data-action="change-showing"]')) {
      onSeatShowingChange();
    } else if (e.target.matches('#bulkRowSelect') || e.target.closest('[data-action="select-row"]')) {
      selectRow(e.target.value);
    } else if (e.target.matches('#seatFilterSelect') || e.target.closest('[data-action="select-filter"]')) {
      setFilter(e.target.value);
    }
    // QR Image File Scan
    else if (e.target.matches('#qrImageFileInput')) {
      if (e.target.files && e.target.files[0]) {
        handleFileScan(e.target.files[0]);
      }
    }
  });

  // 3. Search & Range input delegation
  document.addEventListener('input', (e) => {
    // Movies Search & Filters
    if (e.target.matches('#movieSearchInput') || e.target.closest('[data-action="search-movies"]')) {
      setMovieSearch(e.target.value);
    } else if (e.target.matches('#movieYearMin') || e.target.matches('#movieYearMax')) {
      setMovieYearRange(
        document.getElementById('movieYearMin')?.value,
        document.getElementById('movieYearMax')?.value
      );
    }
    // Bookings & Seat Locker Search
    else if (e.target.matches('#bookingSearchInput') || e.target.closest('[data-action="search-bookings"]')) {
      loadBookings(e.target.value);
    } else if (e.target.matches('#seatSearchInput') || e.target.closest('[data-action="search-seat-grid"]')) {
      setSearchQuery(e.target.value);
    }
  });

  // 4. Form Submissions
  const newMovieForm = document.getElementById('newMovieForm');
  if (newMovieForm) {
    newMovieForm.addEventListener('submit', handleAddMovieSubmit);
  }

  const newShowingForm = document.getElementById('newShowingForm');
  if (newShowingForm) {
    newShowingForm.addEventListener('submit', handleNewShowingSubmit);
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

export async function pollDatabaseHealth() {
  const pill = document.getElementById('adminDbStatus');
  if (!pill) return;
  const dot = pill.querySelector('.db-pill-dot');
  const label = pill.querySelector('.db-pill-label');

  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    if (res.ok && data.database === 'connected') {
      if (dot) dot.className = 'db-pill-dot connected';
      if (label) label.textContent = `DB: Online (${data.latencyMs || 0}ms)`;
      pill.title = `Supabase PostgreSQL Connected (Latency: ${data.latencyMs || 0}ms)`;
    } else {
      if (dot) dot.className = 'db-pill-dot disconnected';
      if (label) label.textContent = 'DB: Error';
      pill.title = data.error || 'Database connection error';
    }
  } catch (err) {
    if (dot) dot.className = 'db-pill-dot disconnected';
    if (label) label.textContent = 'DB: Offline';
    pill.title = err.message || 'Server unreachable';
  }
}

export async function bootstrap() {
  bindEventDelegation();
  initAuth();
  pollDatabaseHealth();
  setInterval(pollDatabaseHealth, 20000);

  // Docked nav starts open on desktop, closed on mobile overlay
  const vnavToggle = document.getElementById('vnavToggle');
  if (vnavToggle) {
    vnavToggle.checked = window.innerWidth >= 900;
  }

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
  window.switchCamera = switchCamera;
  window.handleFileScan = handleFileScan;
  window.resetScanView = resetScanView;
  window.adminApp = {
    switchTab,
    switchAdminTab,
    showSection: switchTab,
    loadMovies,
    initMovies,
    openBulkIngestModal,
    closeBulkIngestModal,
    toggleMovieScreeningState,
    bulkUpdateScreeningState,
    bulkDeleteMovies,
    pollDatabaseHealth,
    initSeatLocker,
    renderSeatLockerGrid,
    loadBookings,
    loadBookingsRoster,
    startQrScanner,
    stopQrScanner,
    restartScanner,
    switchCamera,
    handleFileScan,
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
