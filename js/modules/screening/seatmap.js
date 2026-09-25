/**
 * js/modules/screening/seatmap.js
 * Hydrate-Then-Listen Seat Grid Visualizer, 3D Arc Perspective, & 2D CSS Fallback.
 */

import {
  getState,
  getActiveShowing,
  togglePickedSeat,
  setOccupiedSeats,
  setIs2DFallback
} from './state.js';
import { fetchSeatStatus } from './api.js';

let seatmapWindowEventsBound = false;

export const ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
export const SEATS_PER_ROW = 10;

export function tierName(rowIndex) {
  if (rowIndex < 2) return 'Front';
  if (rowIndex < 5) return 'Prime';
  return 'Recliner';
}

export function is2DMode() {
  const s = getState();
  return (
    s.is2DFallback ||
    (typeof window !== 'undefined' && window.is2DFallbackActive) ||
    document.documentElement.classList.contains('seatmap-2d-mode')
  );
}

export function enable2DFallback() {
  setIs2DFallback(true);
  document.documentElement.classList.add('seatmap-2d-mode');

  const stage = document.getElementById('voxelStage');
  const fb = document.getElementById('voxelFallback');
  if (stage) stage.style.display = 'none';
  if (fb) fb.style.opacity = '1';


  const wall = document.getElementById('sweepWall');
  if (wall) wall.style.display = 'none';

  arcSeats();
}

// Expose globally for any legacy callers
if (typeof window !== 'undefined') {
  window.enable2DFallback = enable2DFallback;
}

export function arcSeats() {
  const seatmap = document.getElementById('seatmap');
  if (!seatmap) return;

  const lines = seatmap.querySelectorAll('.rowline');
  const is2D = is2DMode();

  lines.forEach(line => {
    const seats = line.querySelectorAll('.seat');
    seats.forEach((s, i) => {
      if (is2D) {
        s.style.removeProperty('--tz');
        s.style.removeProperty('--ry');
      } else {
        const off = i - (SEATS_PER_ROW - 1) / 2;
        s.style.setProperty('--tz', (-Math.abs(off) * 3.2) + 'px');
        s.style.setProperty('--ry', (off * 1.6) + 'deg');
      }
    });
  });
}

export function showTip(btn, id, rowIndex) {
  const tip = document.getElementById('tip');
  if (!tip) return;

  const r = tip.querySelector('b');
  const sub = tip.querySelector('i');
  if (r) r.textContent = 'SEAT ' + id;
  if (sub) sub.textContent = tierName(rowIndex) + ', tap to select';

  const rect = btn.getBoundingClientRect();
  tip.style.left = (rect.left + rect.width / 2) + 'px';
  tip.style.top = rect.top + 'px';
  tip.style.opacity = '1';
}

export function hideTip() {
  const tip = document.getElementById('tip');
  if (tip) tip.style.opacity = '0';
}

export function buildSeatmap() {
  const seatmap = document.getElementById('seatmap');
  if (!seatmap) return;

  const state = getState();
  seatmap.innerHTML = '';

  if (!state.selectedMovie) {
    const hint = document.createElement('div');
    hint.style.textAlign = 'center';
    hint.style.color = '#8b8778';
    hint.style.padding = '30px 10px';
    hint.style.fontSize = '14px';
    hint.textContent = 'Choose a film above to load the seating plan.';
    seatmap.appendChild(hint);
    seatmap.style.transform = 'none';
    return;
  }

  seatmap.style.transform = '';
  const pickedSet = new Set(state.pickedSeats);

  ROWS.forEach((row, ri) => {
    const line = document.createElement('div');
    line.className = 'rowline';

    const lab = document.createElement('div');
    lab.className = 'rowlab';
    lab.textContent = row;
    line.appendChild(lab);

    const aisleL = document.createElement('div');
    aisleL.className = 'side-aisle';
    line.appendChild(aisleL);

    for (let i = 1; i <= SEATS_PER_ROW; i++) {
      const id = row + i;
      const taken = state.occupiedSeatsSet.has(id);
      const isSelected = pickedSet.has(id);

      const btn = document.createElement('button');
      btn.className = 'seat' + (taken ? ' occupied' : '') + (isSelected ? ' selected' : '');
      btn.setAttribute('data-id', id);
      btn.setAttribute('data-action', 'toggle-seat');
      btn.setAttribute('aria-label', `Seat ${id}, ${tierName(ri)}${taken ? ', occupied' : ''}`);
      btn.innerHTML = '<svg viewBox="0 0 44 44"><path class="back" d="M10 3h24a5 5 0 0 1 5 5v15H5V8a5 5 0 0 1 5-5z"/><path class="base" d="M6 26h32a4 4 0 0 1 4 4v4a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4v-4a4 4 0 0 1 4-4z"/></svg>';

      if (!taken) {
        btn.setAttribute('data-cursor', 'PICK');
        btn.addEventListener('mouseenter', () => showTip(btn, id, ri));
        btn.addEventListener('mousemove', (ev) => {
          const tip = document.getElementById('tip');
          if (tip) {
            tip.style.left = ev.clientX + 'px';
            tip.style.top = ev.clientY + 'px';
          }
        });
        btn.addEventListener('mouseleave', hideTip);
        btn.addEventListener('focus', () => showTip(btn, id, ri));
        btn.addEventListener('blur', hideTip);
      } else {
        btn.disabled = true;
      }

      line.appendChild(btn);
    }

    const aisleR = document.createElement('div');
    aisleR.className = 'side-aisle';
    line.appendChild(aisleR);

    seatmap.appendChild(line);
  });

  arcSeats();
}

export function refreshSummary() {
  const state = getState();
  const box = document.getElementById('picked');
  if (box) {
    box.innerHTML = '';
    if (!state.pickedSeats.length) {
      const note = document.createElement('span');
      note.className = 'empty-note';
      note.textContent = 'No seats selected yet.';
      box.appendChild(note);
    } else {
      const sorted = [...state.pickedSeats].sort();
      sorted.forEach(id => {
        const c = document.createElement('span');
        c.className = 'chip';
        c.textContent = id;
        box.appendChild(c);
      });
    }
  }

  const countEl = document.getElementById('sumCount');
  if (countEl) countEl.textContent = String(state.pickedSeats.length);

  const listEl = document.getElementById('sumSeatsList');
  if (listEl) {
    listEl.textContent = state.pickedSeats.length
      ? [...state.pickedSeats].sort().join(', ')
      : 'None yet';
  }

  const btn = document.getElementById('confirmBtn');
  if (btn) {
    btn.disabled = !(state.pickedSeats.length && state.selectedMovie && getActiveShowing());
  }
}

export async function rebuildSeatsAnimated() {
  const active = getActiveShowing();
  if (!active) {
    buildSeatmap();
    refreshSummary();
    return;
  }

  const occupiedSet = await fetchSeatStatus(active.id);
  setOccupiedSeats(occupiedSet);
  buildSeatmap();
  refreshSummary();

  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof window !== 'undefined' && typeof window.gsap !== 'undefined';
  if (hasGsap && window.gsap.ticker && typeof window.gsap.ticker.fps === 'function') {
    window.gsap.ticker.fps(120);
  }

  if (!reduceMotion && hasGsap && !is2DMode()) {
    const rows = document.querySelectorAll('#seatmap .rowline');
    window.gsap.fromTo('#seatmap', { opacity: 0.35 }, { opacity: 1, duration: 0.35, ease: 'power2.out', clearProps: 'opacity' });
    window.gsap.fromTo(rows, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.35, stagger: 0.04, ease: 'power3.out', clearProps: 'opacity,transform' });
  }
}

export function handleSeatToggle(seatId) {
  hideTip();
  const success = togglePickedSeat(seatId);
  if (!success) {
    alert('Group reservations are limited to a maximum of 4 seats at once.');
    return;
  }

  // Update selected class directly on DOM seat
  const seatBtn = document.querySelector(`.seat[data-id="${seatId}"]`);
  const state = getState();
  const isSelected = state.pickedSeats.includes(seatId);

  if (state.bookingMode === 'individual') {
    // Clear other selected buttons
    document.querySelectorAll('.seat.selected').forEach(el => {
      if (el.getAttribute('data-id') !== seatId) {
        el.classList.remove('selected');
      }
    });
  }

  if (seatBtn) {
    if (isSelected) {
      seatBtn.classList.add('selected');
      if (typeof seatBtn.animate === 'function') {
        seatBtn.animate([
          { transform: 'translate3d(0, 0, var(--tz, 0px)) rotateY(var(--ry, 0deg)) scale(1)' },
          { transform: 'translate3d(0, -6px, var(--tz, 0px)) rotateY(var(--ry, 0deg)) scale(1.22)' },
          { transform: 'translate3d(0, -2px, var(--tz, 0px)) rotateY(var(--ry, 0deg)) scale(1.08)' }
        ], {
          duration: 200,
          easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
        });
      }
    } else {
      seatBtn.classList.remove('selected');
    }
  }

  refreshSummary();
}

/**
 * Hydrate-Then-Listen Initialization
 */
export function initSeatmap() {
  // 1. Hydrate immediately from existing state
  const state = getState();
  if (state.is2DFallback) {
    enable2DFallback();
  }

  if (state.selectedMovie) {
    rebuildSeatsAnimated();
  } else {
    buildSeatmap();
    refreshSummary();
  }

  // 2. Listen to state changes
  if (!seatmapWindowEventsBound) {
    window.addEventListener('movie:selected', () => {
      rebuildSeatsAnimated();
    });

    window.addEventListener('showing:changed', () => {
      rebuildSeatsAnimated();
    });

    window.addEventListener('seats:updated', () => {
      refreshSummary();
    });

    window.addEventListener('mode:changed', () => {
      buildSeatmap();
      refreshSummary();
    });

    window.addEventListener('fallback:toggled', (e) => {
      if (e.detail?.is2DFallback) {
        enable2DFallback();
      } else {
        arcSeats();
      }
    });
    seatmapWindowEventsBound = true;
  }
}

if (typeof window !== 'undefined') {
  window.handleSeatToggle = handleSeatToggle;
}

// Unconditional document-level click delegation for seats
if (typeof document !== 'undefined') {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.seat:not(.occupied)');
    if (btn) {
      const id = btn.getAttribute('data-id');
      if (id) handleSeatToggle(id);
    }
  });
}
