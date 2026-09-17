/**
 * js/modules/admin/seat-locker.js
 * Interactive administrative seat locker: lock, unlock, and inspect reserved seats in real time.
 */

import { getAuthHeaders } from './auth.js';

let currentShowingId = null;
let allMovies = [];
let allShowings = [];

export function getCurrentShowingId() {
  return currentShowingId;
}

export async function initSeatLocker() {
  try {
    const [moviesRes, showingsRes] = await Promise.all([
      fetch('/api/movies'),
      fetch('/api/showings')
    ]);

    allMovies = await moviesRes.json();
    allShowings = await showingsRes.json();

    const movieSelect = document.getElementById('seatMovieSelect');
    if (movieSelect) {
      movieSelect.innerHTML = '';
      allMovies.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = m.title;
        movieSelect.appendChild(opt);
      });
    }

    onSeatMovieChange();
  } catch (err) {
    console.error('Failed to init seat locker:', err);
  }
}

export function onSeatMovieChange() {
  const movieSelect = document.getElementById('seatMovieSelect');
  const showingSelect = document.getElementById('seatShowingSelect');
  if (!movieSelect || !showingSelect) return;

  const movieId = movieSelect.value;
  const filteredShowings = allShowings.filter(s => s.movie_id === movieId);
  showingSelect.innerHTML = '';

  if (!filteredShowings.length) {
    showingSelect.innerHTML = '<option value="">No showings scheduled</option>';
    currentShowingId = null;
    renderAdminSeats([], []);
    return;
  }

  filteredShowings.forEach(s => {
    const d = new Date(s.show_date);
    const dateStr = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = `${dateStr} @ ${s.show_time} (${s.hall})`;
    showingSelect.appendChild(opt);
  });

  onSeatShowingChange();
}

export async function onSeatShowingChange() {
  const showingSelect = document.getElementById('seatShowingSelect');
  if (!showingSelect) return;

  currentShowingId = showingSelect.value;
  if (!currentShowingId) {
    renderAdminSeats([], []);
    return;
  }

  try {
    const res = await fetch(`/api/seats/status?showing_id=${encodeURIComponent(currentShowingId)}`);
    const data = await res.json();
    renderAdminSeats(data.lockedSeats || [], data.bookedSeats || []);
  } catch (err) {
    console.error('Failed to load seat status:', err);
  }
}

export function renderAdminSeats(lockedSeats = [], bookedSeats = []) {
  const grid = document.getElementById('adminSeatGrid');
  if (!grid) return;

  grid.innerHTML = '';
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const lockedSet = new Set(lockedSeats);
  const bookedSet = new Set(bookedSeats);

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
      seatBtn.className = 'admin-seat';
      seatBtn.textContent = i;
      seatBtn.setAttribute('data-action', 'toggle-seat');
      seatBtn.setAttribute('data-seat-id', seatId);

      if (bookedSet.has(seatId)) {
        seatBtn.classList.add('booked');
        seatBtn.setAttribute('title', `Seat ${seatId} (Booked by Attendee)`);
        seatBtn.disabled = true;
      } else if (lockedSet.has(seatId)) {
        seatBtn.classList.add('locked');
        seatBtn.setAttribute('data-seat-action', 'unlock');
        seatBtn.setAttribute('title', `Seat ${seatId} (Locked by Admin - Click to Unlock)`);
      } else {
        seatBtn.setAttribute('data-seat-action', 'lock');
        seatBtn.setAttribute('title', `Seat ${seatId} (Available - Click to Lock)`);
      }

      rowDiv.appendChild(seatBtn);
    }

    grid.appendChild(rowDiv);
  });
}

export async function toggleSeatLock(seatId, action) {
  if (!currentShowingId || !seatId || !action) return;

  try {
    const res = await fetch('/api/seats/lock', {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        showingId: currentShowingId,
        seatId: seatId,
        action: action,
        reason: 'admin_panel'
      })
    });

    if (res.ok) {
      await onSeatShowingChange();
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err.error || 'Failed to update seat lock');
    }
  } catch (err) {
    alert('Error updating seat: ' + err.message);
  }
}
