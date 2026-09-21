/**
 * js/modules/admin/seat-locker.js
 * Enterprise Administrative Seat Management & Capacity Control:
 * - Real-time seat grid (70 seats A-G x 10)
 * - Single & bulk selection engine (click, row, all available, invert)
 * - Categorized locks (Maintenance, VIP, Staff, etc.) with notes and auto-expiry
 * - Conflict-safe locking (blocks already-booked seats)
 * - Interactive attendee inspection drawer for booked seats
 * - Deep-link to attendee bookings roster and booking cancellation
 * - Live capacity telemetry HUD & occupancy calculation
 * - Showing sales toggle (Open / Closed)
 * - Live 15-second polling & visibilitychange auto-refresh
 * - Non-blocking enterprise toast notifications
 * - Full audit trail integration
 */

import { getAuthHeaders } from './auth.js';

// State Management
let currentShowingId = null;
let allMovies = [];
let allShowings = [];
let selectedSeats = new Set();
let lockedMap = {};
let bookedMap = {};
let checkedInSet = new Set();
let isSalesOpen = true;
let currentFilter = 'all';
let searchQuery = '';
let pollTimer = null;
let activeShowingObj = null;
let pendingCancelBooking = null;

// =========================================================================
// 1. Toast Notification System
// =========================================================================

export function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('adminToastContainer');
  if (!container) {
    console.log(`[Toast ${type.toUpperCase()}] ${message}`);
    return;
  }

  const toast = document.createElement('div');
  toast.className = `admin-toast toast-${type}`;

  const iconMap = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  toast.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <span style="font-weight: bold; font-size: 1rem;">${iconMap[type] || '•'}</span>
      <span>${escapeHtml(message)}</span>
    </div>
    <button class="btn-close-toast" title="Dismiss">✕</button>
  `;

  const closeBtn = toast.querySelector('.btn-close-toast');
  const dismiss = () => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 250);
  };

  closeBtn.addEventListener('click', dismiss);
  container.appendChild(toast);

  if (duration > 0) {
    setTimeout(dismiss, duration);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// =========================================================================
// 2. Lifecycle & Initialization
// =========================================================================

export function getCurrentShowingId() {
  return currentShowingId;
}

export const renderSeatLockerGrid = initSeatLocker;
export const populateSeats = initSeatLocker;

export async function initSeatLocker() {
  try {
    const [moviesRes, showingsRes] = await Promise.all([
      fetch('/api/admin/movies?limit=200', { headers: getAuthHeaders() }),
      fetch('/api/admin/showings', { headers: getAuthHeaders() })
    ]);

    const moviesData = await moviesRes.json();
    allMovies = Array.isArray(moviesData) ? moviesData : (moviesData.movies || []);
    allShowings = await showingsRes.json();

    const movieSelect = document.getElementById('seatMovieSelect');
    if (movieSelect) {
      movieSelect.innerHTML = '';
      allMovies.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = `${m.title}${!m.is_active ? ' [Archived]' : ''}`;
        movieSelect.appendChild(opt);
      });
    }

    onSeatMovieChange();
    startPolling();
    setupModalEvents();
  } catch (err) {
    console.error('Failed to init seat locker:', err);
    showToast('Failed to initialize seat locker: ' + err.message, 'error');
  }
}

export function isAnyModalOpen() {
  const modalIds = [
    'seatLockModal',
    'seatUnlockModal',
    'seatUnlockAllModal',
    'seatCancelBookingModal',
    'seatAttendeeDrawer',
    'newShowingModal'
  ];
  return modalIds.some(id => {
    const el = document.getElementById(id);
    return el && el.style.display && el.style.display !== 'none';
  });
}

export function startPolling() {
  stopPolling();
  pollTimer = setInterval(() => {
    const tab = document.getElementById('tabSeatLocker');
    if (tab && tab.style.display !== 'none' && currentShowingId) {
      onSeatShowingChange(true);
    }
  }, 15000);

  document.removeEventListener('visibilitychange', handleVisibilityChange);
  document.addEventListener('visibilitychange', handleVisibilityChange);
}

export function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    const tab = document.getElementById('tabSeatLocker');
    if (tab && tab.style.display !== 'none' && currentShowingId) {
      onSeatShowingChange(true);
    }
  }
}

// =========================================================================
// 3. Dropdown Handling & Showing Status Fetch
// =========================================================================

export function onSeatMovieChange() {
  const movieSelect = document.getElementById('seatMovieSelect');
  const showingSelect = document.getElementById('seatShowingSelect');
  if (!movieSelect || !showingSelect) return;

  const movieId = movieSelect.value;
  const currentMovie = allMovies.find(m => m.id === movieId);
  const thumb = document.getElementById('selectedMovieThumb');
  if (thumb) {
    if (currentMovie && (currentMovie.poster_url || currentMovie.backdrop_url)) {
      thumb.src = currentMovie.poster_url || currentMovie.backdrop_url;
    } else {
      thumb.src = 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800';
    }
  }

  const filteredShowings = allShowings.filter(s => s.movie_id === movieId);
  showingSelect.innerHTML = '';

  if (!filteredShowings.length) {
    showingSelect.innerHTML = '<option value="">No showings scheduled</option>';
    currentShowingId = null;
    activeShowingObj = null;
    selectedSeats.clear();
    updateSelectionUI();
    renderAdminSeats();
    updateStatsHUD({ total: 70, available: 0, booked: 0, locked: 0, checkedIn: 0, occupancyPercent: 0 });
    return;
  }

  filteredShowings.forEach(s => {
    const d = new Date(s.show_date);
    const dateStr = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = `${dateStr} @ ${s.show_time} (${s.hall})`;
    showingSelect.appendChild(opt);
  });

  onSeatShowingChange();
}

export async function onSeatShowingChange(isBackgroundPoll = false) {
  // If background poll triggers while admin is working in any modal or drawer, don't clobber
  if (isBackgroundPoll && isAnyModalOpen()) {
    return;
  }

  const showingSelect = document.getElementById('seatShowingSelect');
  if (!showingSelect) return;

  currentShowingId = showingSelect.value;
  if (!currentShowingId) {
    renderAdminSeats();
    return;
  }

  activeShowingObj = allShowings.find(s => s.id === currentShowingId) || null;
  if (activeShowingObj) {
    const d = new Date(activeShowingObj.show_date);
    const dateFormatted = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    const cap = activeShowingObj.capacity || 70;

    const heroCap = document.getElementById('heroCapacity');
    if (heroCap) heroCap.textContent = `${cap} seats`;

    const heroAud = document.getElementById('heroAuditorium');
    if (heroAud) heroAud.textContent = `Auditorium: ${activeShowingObj.hall || 'Screen 1'}`;

    const heroTime = document.getElementById('heroShowTime');
    if (heroTime) heroTime.innerHTML = `${dateFormatted} &bull; ${activeShowingObj.show_time}`;

    const sub = document.getElementById('seatShowingInfoSubtitle');
    if (sub) {
      sub.textContent = `Capacity: ${cap} seats • Auditorium: ${activeShowingObj.hall} • Time: ${activeShowingObj.show_time}`;
    }
  }

  try {
    const res = await fetch(`/api/seats/status?showing_id=${encodeURIComponent(currentShowingId)}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Status HTTP ' + res.status);
    const data = await res.json();

    lockedMap = data.lockedMap || {};
    bookedMap = data.bookedMap || {};
    checkedInSet = new Set(data.checkedInSeats || []);
    isSalesOpen = data.isSalesOpen !== false;

    // Prune selections if seat status changed
    selectedSeats.forEach(seatId => {
      if (bookedMap[seatId]) {
        selectedSeats.delete(seatId);
      }
    });

    updateSalesToggleUI();
    updateStatsHUD(data.stats);
    updateFilterChipCounts();
    updateLegendCounts(data.stats);
    updateLastUpdatedTimestamp();
    renderAdminSeats();
    updateSelectionUI();
    loadSeatAuditLog();
  } catch (err) {
    console.error('Failed to load seat status:', err);
    if (!isBackgroundPoll) {
      showToast('Failed to load seat map: ' + err.message, 'error');
    }
  }
}

function updateLastUpdatedTimestamp() {
  const el = document.getElementById('seatLastUpdated');
  if (el) {
    const now = new Date();
    el.textContent = 'Updated ' + now.toLocaleTimeString();
  }
}

function updateSalesToggleUI() {
  const textEl = document.getElementById('seatSalesStatusText');
  const btn = document.getElementById('seatSalesToggleBtn');
  if (!textEl || !btn) return;

  if (isSalesOpen) {
    textEl.textContent = 'OPEN';
    textEl.style.color = '#10b981';
    btn.style.borderColor = 'rgba(16, 185, 129, 0.4)';
  } else {
    textEl.textContent = 'CLOSED';
    textEl.style.color = '#f43f5e';
    btn.style.borderColor = 'rgba(244, 63, 94, 0.5)';
  }
}

function updateStatsHUD(stats) {
  if (!stats) return;

  const totalEl = document.getElementById('statTotal');
  const availEl = document.getElementById('statAvailable');
  const bookedEl = document.getElementById('statBooked');
  const lockedEl = document.getElementById('statLocked');
  const checkEl = document.getElementById('statCheckedIn');
  const occEl = document.getElementById('statOccupancy');
  const houseEl = document.getElementById('statHousefullBadge');

  if (totalEl) totalEl.textContent = stats.total || 70;
  if (availEl) availEl.textContent = stats.available ?? '--';
  if (bookedEl) bookedEl.textContent = stats.booked ?? '--';
  if (lockedEl) lockedEl.textContent = stats.locked ?? '--';
  if (checkEl) checkEl.textContent = stats.checkedIn ?? '--';
  if (occEl) occEl.textContent = (stats.occupancyPercent ?? 0) + '%';

  if (houseEl) {
    if (stats.available === 0) {
      houseEl.textContent = 'HOUSEFULL (100%)';
      houseEl.style.color = '#f43f5e';
      houseEl.style.fontWeight = '700';
    } else {
      houseEl.textContent = `${stats.available} seats remaining`;
      houseEl.style.color = '#a49aa0';
      houseEl.style.fontWeight = 'normal';
    }
  }
}

function updateFilterChipCounts() {
  const lockedCount = Object.keys(lockedMap).length;
  const bookedCount = Object.keys(bookedMap).length;
  const checkedCount = checkedInSet.size;
  const availCount = Math.max(0, 70 - (lockedCount + bookedCount));

  const fAvail = document.getElementById('filterAvailCount');
  const fLock = document.getElementById('filterLockedCount');
  const fBook = document.getElementById('filterBookedCount');
  const fCheck = document.getElementById('filterCheckedCount');

  if (fAvail) fAvail.textContent = availCount;
  if (fLock) fLock.textContent = lockedCount;
  if (fBook) fBook.textContent = bookedCount;
  if (fCheck) fCheck.textContent = checkedCount;
}

function updateLegendCounts(stats) {
  if (!stats) return;
  const lAvail = document.getElementById('legendAvailCount');
  const lLock = document.getElementById('legendLockedCount');
  const lBook = document.getElementById('legendBookedCount');
  const lCheck = document.getElementById('legendCheckedCount');

  if (lAvail) lAvail.textContent = stats.available ?? 0;
  if (lLock) lLock.textContent = stats.locked ?? 0;
  if (lBook) lBook.textContent = stats.booked ?? 0;
  if (lCheck) lCheck.textContent = stats.checkedIn ?? 0;
}

// =========================================================================
// 4. Rendering the Seat Grid
// =========================================================================

export function renderAdminSeats() {
  const grid = document.getElementById('adminSeatGrid');
  if (!grid) return;

  grid.innerHTML = '';
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const query = searchQuery.trim().toLowerCase();

  rows.forEach(r => {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'seat-row';

    const label = document.createElement('div');
    label.className = 'seat-row-label';
    label.textContent = r;
    rowDiv.appendChild(label);

    for (let i = 1; i <= 10; i++) {
      const seatId = r + i;
      const seatBtn = document.createElement('button');
      seatBtn.type = 'button';
      seatBtn.className = 'admin-seat';
      seatBtn.textContent = i;
      seatBtn.setAttribute('data-action', 'inspect-seat');
      seatBtn.setAttribute('data-seat-id', seatId);

      const isBooked = !!bookedMap[seatId];
      const isLocked = !!lockedMap[seatId];
      const isAvailable = !isBooked && !isLocked;
      const isCheckedIn = isBooked && checkedInSet.has(seatId);
      const isSelected = selectedSeats.has(seatId);

      // State Classes
      if (isBooked) {
        seatBtn.classList.add('booked');
        if (isCheckedIn) seatBtn.classList.add('checked-in');
        const b = bookedMap[seatId];
        seatBtn.setAttribute(
          'title',
          `Seat ${seatId} • Booked by: ${b.userName} (${b.userUsn}) • Ref: ${b.refCode} • ${b.checkedIn ? 'Checked-In' : 'Not Checked In'} (Click to view attendee)`
        );
      } else if (isLocked) {
        seatBtn.classList.add('locked');
        const l = lockedMap[seatId];
        const expiryText = l.expiresAt ? ` (Expires: ${new Date(l.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : '';
        seatBtn.setAttribute(
          'title',
          `Seat ${seatId} • Locked: [${l.category}] ${l.note || l.reason || 'Admin hold'}${expiryText} • by ${l.lockedBy} (Click to unlock or select)`
        );
      } else {
        seatBtn.setAttribute('title', `Seat ${seatId} • Available (Click to select for locking)`);
      }

      // Selection State
      if (isSelected) {
        seatBtn.classList.add('selected');
      }

      // Filter State
      let matchesFilter = true;
      if (currentFilter === 'available' && !isAvailable) matchesFilter = false;
      else if (currentFilter === 'locked' && !isLocked) matchesFilter = false;
      else if (currentFilter === 'booked' && !isBooked) matchesFilter = false;
      else if (currentFilter === 'checked-in' && !isCheckedIn) matchesFilter = false;

      if (!matchesFilter) {
        seatBtn.classList.add('dimmed');
      }

      // Search Highlight
      if (query.length > 0) {
        let matchesSearch = false;
        if (seatId.toLowerCase().includes(query)) matchesSearch = true;
        if (isBooked) {
          const b = bookedMap[seatId];
          if (b.userUsn?.toLowerCase().includes(query)) matchesSearch = true;
          if (b.userName?.toLowerCase().includes(query)) matchesSearch = true;
          if (b.refCode?.toLowerCase().includes(query)) matchesSearch = true;
          if (b.userEmail?.toLowerCase().includes(query)) matchesSearch = true;
        }
        if (isLocked) {
          const l = lockedMap[seatId];
          if (l.category?.toLowerCase().includes(query)) matchesSearch = true;
          if (l.note?.toLowerCase().includes(query)) matchesSearch = true;
        }

        if (matchesSearch) {
          seatBtn.classList.add('search-highlight');
        } else if (currentFilter === 'all') {
          seatBtn.classList.add('dimmed');
        }
      }

      rowDiv.appendChild(seatBtn);
    }

    grid.appendChild(rowDiv);
  });
}

// =========================================================================
// 5. Selection Engine & Toolbar
// =========================================================================

export function handleSeatClick(seatId) {
  if (!seatId) return;

  // 1. If seat is Booked -> open Attendee Inspector Drawer
  if (bookedMap[seatId]) {
    openAttendeeDrawer(seatId);
    return;
  }

  // 2. If seat is Locked:
  // If user already has other locked seats selected, toggle selection.
  // Otherwise, open Unlock Modal directly for quick action!
  if (lockedMap[seatId]) {
    if (selectedSeats.size > 0 && Array.from(selectedSeats).every(s => lockedMap[s])) {
      toggleSeatInSelection(seatId);
    } else {
      openUnlockModal([seatId]);
    }
    return;
  }

  // 3. If seat is Available -> Toggle in selection set
  toggleSeatInSelection(seatId);
}

function toggleSeatInSelection(seatId) {
  if (selectedSeats.has(seatId)) {
    selectedSeats.delete(seatId);
  } else {
    selectedSeats.add(seatId);
  }
  updateSelectionUI();
  renderAdminSeats();
}

function updateSelectionUI() {
  const summaryEl = document.getElementById('selectionSummary');
  const btnLock = document.getElementById('btnLockSelected');
  const btnLockText = document.getElementById('btnLockSelectedText');
  const btnUnlock = document.getElementById('btnUnlockSelected');
  const mobileDock = document.getElementById('mobileSeatDock');
  const mobileDockCount = document.getElementById('mobileDockCount');
  const mobileDockLock = document.getElementById('mobileDockLockBtn');
  const mobileDockUnlock = document.getElementById('mobileDockUnlockBtn');

  const count = selectedSeats.size;
  if (!count) {
    if (summaryEl) summaryEl.textContent = '0 selected';
    if (btnLock) btnLock.disabled = true;
    if (btnLockText) btnLockText.textContent = 'Lock Selected (0)';
    if (btnUnlock) btnUnlock.disabled = true;
    if (mobileDock) {
      mobileDock.classList.remove('has-selection');
      mobileDock.style.display = 'none';
    }
    return;
  }

  const seatArray = Array.from(selectedSeats).sort();
  const preview = seatArray.slice(0, 4).join(', ') + (count > 4 ? ` (+${count - 4})` : '');
  if (summaryEl) summaryEl.textContent = `${count} selected (${preview})`;

  // Determine if selection contains available seats, locked seats, or both
  const availCount = seatArray.filter(s => !lockedMap[s] && !bookedMap[s]).length;
  const lockedCount = seatArray.filter(s => !!lockedMap[s]).length;
  const hasAvail = availCount > 0;
  const hasLocked = lockedCount > 0;

  if (btnLock) {
    btnLock.disabled = !hasAvail;
  }
  if (btnLockText) {
    btnLockText.textContent = hasAvail ? `Lock Selected (${availCount})` : 'Lock Selected (0)';
  }
  if (btnUnlock) {
    btnUnlock.disabled = !hasLocked;
    btnUnlock.textContent = hasLocked ? `Unlock Selected (${lockedCount})` : 'Unlock Selected';
  }

  // Mobile Bottom Dock Synchronization
  if (mobileDock) {
    mobileDock.classList.add('has-selection');
    mobileDock.style.display = 'flex';
  }
  if (mobileDockCount) {
    mobileDockCount.textContent = `${count} selected`;
  }
  if (mobileDockLock) {
    mobileDockLock.disabled = !hasAvail;
    mobileDockLock.textContent = hasAvail ? `Lock Selected (${availCount})` : 'Lock Selected';
  }
  if (mobileDockUnlock) {
    mobileDockUnlock.disabled = !hasLocked;
  }
}

// =========================================================================
// Zoom Controls
// =========================================================================

let currentZoom = 1.0;

export function zoomIn() {
  currentZoom = Math.min(1.5, Math.round((currentZoom + 0.15) * 100) / 100);
  applyZoom();
}

export function zoomOut() {
  currentZoom = Math.max(0.65, Math.round((currentZoom - 0.15) * 100) / 100);
  applyZoom();
}

export function zoomReset() {
  currentZoom = 1.0;
  applyZoom();
}

function applyZoom() {
  const grid = document.getElementById('adminSeatGrid');
  if (grid) {
    grid.style.transform = currentZoom === 1.0 ? '' : `scale(${currentZoom})`;
  }
}

// =========================================================================
// New Showing Scheduling Modal
// =========================================================================

export function openNewShowingModal() {
  const modal = document.getElementById('newShowingModal');
  if (!modal) return;

  const movieSelect = document.getElementById('newShowingMovieSelect');
  if (movieSelect) {
    movieSelect.innerHTML = '';
    allMovies.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = `${m.title} (${m.year || ''})${!m.is_active ? ' [Archived]' : ''}`;
      movieSelect.appendChild(opt);
    });
    // Default to currently selected movie if applicable
    const currentMovieSelect = document.getElementById('seatMovieSelect');
    if (currentMovieSelect && currentMovieSelect.value) {
      movieSelect.value = currentMovieSelect.value;
    }
  }

  // Set default date to today
  const dateInput = document.getElementById('newShowingDate');
  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }

  const timeInput = document.getElementById('newShowingTime');
  if (timeInput && !timeInput.value) {
    timeInput.value = '21:00';
  }

  const collisionBox = document.getElementById('showingCollisionWarning');
  if (collisionBox) collisionBox.style.display = 'none';

  modal.style.display = 'flex';
}

export function closeNewShowingModal() {
  const modal = document.getElementById('newShowingModal');
  if (modal) modal.style.display = 'none';
}

export async function handleNewShowingSubmit(e) {
  if (e) e.preventDefault();
  const movieId = document.getElementById('newShowingMovieSelect')?.value;
  const showDate = document.getElementById('newShowingDate')?.value;
  const showTime = document.getElementById('newShowingTime')?.value?.trim();
  const hall = document.getElementById('newShowingHall')?.value?.trim() || 'D Block 3rd Floor';
  const capacity = 70;

  if (!movieId || !showDate || !showTime) {
    showToast('Please fill in all required fields for the screening', 'warning');
    return;
  }

  const submitBtn = document.getElementById('btnSubmitNewShowing');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Scheduling...';
  }

  try {
    const res = await fetch('/api/admin/showings', {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        movieId,
        showDate,
        showTime,
        hall,
        capacity
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to create showing');
    }

    showToast(data.message || 'Screening scheduled successfully', 'success');
    closeNewShowingModal();

    // Refresh showings
    const showingsRes = await fetch('/api/admin/showings', { headers: getAuthHeaders() });
    if (showingsRes.ok) {
      allShowings = await showingsRes.json();
    }

    // Select the movie and the newly scheduled showing
    const movieSelect = document.getElementById('seatMovieSelect');
    if (movieSelect) {
      movieSelect.value = movieId;
      onSeatMovieChange();
      const showingSelect = document.getElementById('seatShowingSelect');
      if (showingSelect && data.showing?.id) {
        showingSelect.value = data.showing.id;
        await onSeatShowingChange();
      }
    }
  } catch (err) {
    console.error('Error creating showing:', err);
    showToast(err.message, 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Confirm & Schedule';
    }
  }
}

export function selectRow(rowLetter) {
  if (!rowLetter) return;
  for (let i = 1; i <= 10; i++) {
    const seatId = rowLetter + i;
    if (!bookedMap[seatId]) {
      selectedSeats.add(seatId);
    }
  }
  updateSelectionUI();
  renderAdminSeats();
}

export function selectAllAvailable() {
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  rows.forEach(r => {
    for (let i = 1; i <= 10; i++) {
      const seatId = r + i;
      if (!bookedMap[seatId] && !lockedMap[seatId]) {
        selectedSeats.add(seatId);
      }
    }
  });
  updateSelectionUI();
  renderAdminSeats();
}

export function invertSelection() {
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const newSet = new Set();
  rows.forEach(r => {
    for (let i = 1; i <= 10; i++) {
      const seatId = r + i;
      if (!bookedMap[seatId] && !selectedSeats.has(seatId)) {
        newSet.add(seatId);
      }
    }
  });
  selectedSeats = newSet;
  updateSelectionUI();
  renderAdminSeats();
}

export function clearSelection() {
  selectedSeats.clear();
  const rowSelect = document.getElementById('bulkRowSelect');
  if (rowSelect) rowSelect.value = '';
  updateSelectionUI();
  renderAdminSeats();
}

// Filter and Search Actions
export function setFilter(filterType) {
  currentFilter = filterType;
  document.querySelectorAll('#seatFilterChips .chip-btn').forEach(btn => {
    if (btn.getAttribute('data-filter') === filterType) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  renderAdminSeats();
}

export function setSearchQuery(query) {
  searchQuery = query || '';
  renderAdminSeats();
}

// =========================================================================
// 6. Attendee Slide Drawer
// =========================================================================

export function openAttendeeDrawer(seatId) {
  const b = bookedMap[seatId];
  if (!b) return;

  const drawer = document.getElementById('seatAttendeeDrawer');
  if (!drawer) return;

  document.getElementById('drawerSeatTitle').textContent = `Seat ${seatId}`;
  document.getElementById('drawerUserName').textContent = b.userName || 'Attendee';
  document.getElementById('drawerUserUsn').textContent = b.userUsn || '--';
  document.getElementById('drawerUserEmail').textContent = b.userEmail || '--';
  document.getElementById('drawerBookingRef').textContent = b.refCode || '--';
  
  const checkStatusEl = document.getElementById('drawerCheckInStatus');
  if (checkStatusEl) {
    if (b.checkedIn) {
      const timeStr = b.checkedInAt ? ` at ${new Date(b.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '';
      checkStatusEl.innerHTML = `<span style="color: #10b981; font-weight: 600;">✓ Checked-In${timeStr}</span>`;
    } else {
      checkStatusEl.innerHTML = `<span style="color: #fb7185;">Pending Door Check-in</span>`;
    }
  }

  document.getElementById('drawerAllSeats').textContent = (b.seats || [seatId]).join(', ');
  
  const bookedAtEl = document.getElementById('drawerBookedAt');
  if (bookedAtEl) {
    bookedAtEl.textContent = b.createdAt ? new Date(b.createdAt).toLocaleString() : '--';
  }

  // Wire buttons
  const jumpBtn = document.getElementById('drawerJumpRosterBtn');
  if (jumpBtn) {
    jumpBtn.onclick = () => {
      closeAttendeeDrawer();
      import('./main.js').then(({ switchTab }) => {
        switchTab('bookings');
        setTimeout(() => {
          const input = document.getElementById('bookingSearchInput');
          if (input) {
            input.value = b.refCode || b.userUsn;
            input.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }, 100);
      });
    };
  }

  const cancelBtn = document.getElementById('drawerCancelBookingBtn');
  if (cancelBtn) {
    cancelBtn.onclick = () => {
      pendingCancelBooking = b;
      openCancelBookingModal(b);
    };
  }

  drawer.style.display = 'flex';
}

export function closeAttendeeDrawer() {
  const drawer = document.getElementById('seatAttendeeDrawer');
  if (drawer) drawer.style.display = 'none';
}

// =========================================================================
// 7. Modals: Lock, Unlock, and Danger Unlock All
// =========================================================================

export function openLockModal() {
  const availSelected = Array.from(selectedSeats).filter(s => !lockedMap[s] && !bookedMap[s]);
  if (!availSelected.length) {
    showToast('Please select at least one available seat to lock', 'warning');
    return;
  }

  const modal = document.getElementById('seatLockModal');
  if (!modal) return;

  document.getElementById('lockModalTitle').textContent = `Lock Selected Seats (${availSelected.length})`;
  document.getElementById('lockModalSeatList').textContent = availSelected.join(', ');
  document.getElementById('lockNoteInput').value = '';
  document.getElementById('lockDurationSelect').value = '0';

  modal.style.display = 'flex';
}

export function closeLockModal() {
  const modal = document.getElementById('seatLockModal');
  if (modal) modal.style.display = 'none';
}

export function openUnlockModal(seatsToUnlock = null) {
  const targetSeats = seatsToUnlock || Array.from(selectedSeats).filter(s => !!lockedMap[s]);
  if (!targetSeats.length) {
    showToast('Please select locked seats to unlock', 'warning');
    return;
  }

  const modal = document.getElementById('seatUnlockModal');
  if (!modal) return;

  document.getElementById('unlockModalSeatList').textContent = targetSeats.join(', ');
  const detailsBox = document.getElementById('unlockDetailsBox');

  if (targetSeats.length === 1 && lockedMap[targetSeats[0]]) {
    const l = lockedMap[targetSeats[0]];
    detailsBox.style.display = 'block';
    detailsBox.innerHTML = `
      <div><strong>Category:</strong> ${escapeHtml(l.category)}</div>
      <div><strong>Reason/Note:</strong> ${escapeHtml(l.note || l.reason)}</div>
      <div><strong>Locked By:</strong> ${escapeHtml(l.lockedBy)}</div>
      ${l.expiresAt ? `<div><strong>Expires:</strong> ${new Date(l.expiresAt).toLocaleString()}</div>` : ''}
    `;
  } else {
    detailsBox.style.display = 'none';
  }

  const submitBtn = document.getElementById('btnSubmitUnlock');
  submitBtn.onclick = () => executeUnlockSeats(targetSeats);

  modal.style.display = 'flex';
}

export function closeUnlockModal() {
  const modal = document.getElementById('seatUnlockModal');
  if (modal) modal.style.display = 'none';
}

export function openUnlockAllModal() {
  const modal = document.getElementById('seatUnlockAllModal');
  if (!modal) return;

  const btn = document.getElementById('btnSubmitUnlockAll');
  if (btn) btn.disabled = false;

  modal.style.display = 'flex';
}

export function closeUnlockAllModal() {
  const modal = document.getElementById('seatUnlockAllModal');
  if (modal) modal.style.display = 'none';
}

export function openCancelBookingModal(booking) {
  const modal = document.getElementById('seatCancelBookingModal');
  if (!modal || !booking) return;

  document.getElementById('cancelModalRef').textContent = booking.refCode;
  document.getElementById('cancelModalAttendee').textContent = `${booking.userName} (${booking.userUsn})`;
  document.getElementById('cancelModalSeats').textContent = (booking.seats || []).join(', ');

  modal.style.display = 'flex';
}

export function closeCancelBookingModal() {
  const modal = document.getElementById('seatCancelBookingModal');
  if (modal) modal.style.display = 'none';
  pendingCancelBooking = null;
}

// =========================================================================
// 8. API Operations: Lock, Unlock, Unlock All, Sales Toggle, Cancel Booking
// =========================================================================

export async function executeLockSeats(e) {
  if (e) e.preventDefault();
  if (!currentShowingId) return;

  const availSelected = Array.from(selectedSeats).filter(s => !lockedMap[s] && !bookedMap[s]);
  if (!availSelected.length) return;

  const category = document.getElementById('lockCategorySelect').value;
  const note = document.getElementById('lockNoteInput').value.trim();
  const durationHours = parseInt(document.getElementById('lockDurationSelect').value, 10);

  const btnSubmit = document.getElementById('btnSubmitLock');
  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Locking...';
  }

  try {
    const res = await fetch('/api/seats/lock', {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        showingId: currentShowingId,
        seatIds: availSelected,
        category: category,
        reason: note || category,
        note: note,
        durationHours: durationHours > 0 ? durationHours : null,
        action: 'lock'
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to lock seats');
    }

    showToast(`Successfully locked ${availSelected.length} seat(s): ${availSelected.join(', ')}`, 'success');
    closeLockModal();
    clearSelection();
    await onSeatShowingChange();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'Confirm Lock';
    }
  }
}

export async function executeUnlockSeats(seatList) {
  if (!currentShowingId || !seatList || !seatList.length) return;

  const btn = document.getElementById('btnSubmitUnlock');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Unlocking...';
  }

  try {
    const res = await fetch('/api/seats/lock', {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        showingId: currentShowingId,
        seatIds: seatList,
        action: 'unlock'
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to unlock seats');
    }

    showToast(`Unlocked ${seatList.length} seat(s): ${seatList.join(', ')}`, 'success');
    closeUnlockModal();
    seatList.forEach(s => selectedSeats.delete(s));
    updateSelectionUI();
    await onSeatShowingChange();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Unlock Now';
    }
  }
}

export async function executeUnlockAll() {
  if (!currentShowingId) return;

  const btn = document.getElementById('btnSubmitUnlockAll');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Unlocking all...';
  }

  try {
    const res = await fetch('/api/seats/lock', {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        showingId: currentShowingId,
        action: 'unlock_all'
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to unlock all seats');
    }

    showToast(`All locked seats have been unlocked (${data.unlockedCount || 0} seats freed)`, 'success');
    closeUnlockAllModal();
    clearSelection();
    await onSeatShowingChange();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Unlock All Seats';
    }
  }
}

export async function toggleShowingSales() {
  if (!currentShowingId) return;
  const newStatus = !isSalesOpen;

  try {
    const res = await fetch(`/api/admin/showings/${encodeURIComponent(currentShowingId)}/sales`, {
      method: 'PUT',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ is_sales_open: newStatus })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update sales status');

    isSalesOpen = data.isSalesOpen;
    updateSalesToggleUI();
    showToast(data.message || `Sales set to ${newStatus ? 'OPEN' : 'CLOSED'}`, newStatus ? 'success' : 'warning');
    loadSeatAuditLog();
  } catch (err) {
    showToast('Failed to toggle sales: ' + err.message, 'error');
  }
}

export async function executeCancelBooking() {
  if (!pendingCancelBooking || !pendingCancelBooking.bookingId) return;

  const btn = document.getElementById('btnConfirmCancelBooking');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Cancelling...';
  }

  try {
    const res = await fetch(`/api/admin/bookings/${encodeURIComponent(pendingCancelBooking.bookingId)}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to cancel booking');

    showToast(data.message || 'Booking cancelled and seats released', 'success');
    closeCancelBookingModal();
    closeAttendeeDrawer();
    await onSeatShowingChange();
  } catch (err) {
    showToast('Error cancelling booking: ' + err.message, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Yes, Cancel Booking';
    }
  }
}

// Backward-compatible single-seat toggle
export async function toggleSeatLock(seatId, action) {
  if (!currentShowingId || !seatId) return;
  if (action === 'unlock') {
    return executeUnlockSeats([seatId]);
  } else {
    selectedSeats.add(seatId);
    openLockModal();
  }
}

// =========================================================================
// 9. Audit History Feed
// =========================================================================

export async function loadSeatAuditLog() {
  if (!currentShowingId) return;
  const tbody = document.getElementById('seatAuditTableBody');
  if (!tbody) return;

  try {
    const res = await fetch(`/api/admin/seats/audit?showing_id=${encodeURIComponent(currentShowingId)}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) return;
    const logs = await res.json();

    if (!logs || !logs.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #a49aa0;">No recorded seat actions for this showing yet.</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    logs.forEach(item => {
      const tr = document.createElement('tr');
      const timeStr = item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--';
      
      let actionBadge = `<span class="badge" style="background: rgba(168, 85, 247, 0.2); color: #c084fc;">${escapeHtml(item.action)}</span>`;
      if (item.action === 'lock') actionBadge = `<span class="badge" style="background: rgba(234, 179, 8, 0.2); color: #fef08a;">LOCK</span>`;
      else if (item.action === 'unlock' || item.action === 'unlock_all') actionBadge = `<span class="badge" style="background: rgba(56, 189, 248, 0.2); color: #38bdf8;">UNLOCK</span>`;
      else if (item.action === 'cancel_booking') actionBadge = `<span class="badge" style="background: rgba(244, 63, 94, 0.2); color: #f43f5e;">CANCEL</span>`;

      tr.innerHTML = `
        <td style="font-family: monospace; font-size: 0.75rem; color: #a49aa0;">${timeStr}</td>
        <td><strong style="font-family: monospace; color: #f5f3ff;">${escapeHtml(item.seat_id)}</strong></td>
        <td>${actionBadge}</td>
        <td><span style="color: #c89bb2;">${escapeHtml(item.category || '--')}</span></td>
        <td style="max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(item.note || item.reason || '')}">${escapeHtml(item.note || item.reason || '--')}</td>
        <td><span style="font-size: 0.75rem; color: #c084fc;">${escapeHtml(item.admin_user || 'Admin')}</span></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.warn('Error loading seat audit log:', err.message);
  }
}

// =========================================================================
// 10. Event Setup & Modal Wiring
// =========================================================================

function setupModalEvents() {
  const lockForm = document.getElementById('seatLockForm');
  if (lockForm) {
    lockForm.onsubmit = executeLockSeats;
  }

  const newShowingForm = document.getElementById('newShowingForm');
  if (newShowingForm) {
    newShowingForm.onsubmit = handleNewShowingSubmit;
  }

  const cancelConfirmBtn = document.getElementById('btnConfirmCancelBooking');
  if (cancelConfirmBtn) {
    cancelConfirmBtn.onclick = executeCancelBooking;
  }

  const unlockAllBtn = document.getElementById('btnSubmitUnlockAll');
  if (unlockAllBtn) {
    unlockAllBtn.onclick = executeUnlockAll;
  }

  // Keyboard accessibility: Escape closes open modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeLockModal();
      closeUnlockModal();
      closeUnlockAllModal();
      closeCancelBookingModal();
      closeAttendeeDrawer();
      closeNewShowingModal();
    }
  });
}
