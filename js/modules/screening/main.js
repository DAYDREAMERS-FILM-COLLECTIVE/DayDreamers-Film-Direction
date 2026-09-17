/**
 * js/modules/screening/main.js
 * Central Screening & Seat Reservation Orchestrator.
 * Coordinates reactive state, API catalog, interactive seatmap, booking modal, and 3D stage.
 */

import {
  getState,
  setMovies,
  setSelectedMovie,
  setCurrentShowings,
  setSelectedShowingIdx,
  setBookingMode,
  getActiveShowing
} from './state.js';

import { fetchMovies, fetchShowings } from './api.js';
import { initSeatmap, enable2DFallback, rebuildSeatsAnimated } from './seatmap.js';
import { initBookingModal, openBookingModal } from './booking-modal.js';
import { initScrubShowcase } from './scrub-showcase.js';

let revealObserver = null;
if (typeof window !== 'undefined' && window.location.hash !== '#booking') {
  window.scrollTo(0, 0);
}

export function slowScrollToBooking() {
  const bookingEl = document.getElementById('booking');
  const showcaseEl = document.getElementById('showcase');
  if (!bookingEl) return;

  const startY = window.scrollY;
  const bookingY = bookingEl.getBoundingClientRect().top + window.scrollY;
  const showcaseY = showcaseEl ? (showcaseEl.getBoundingClientRect().top + window.scrollY) : (startY + (bookingY - startY) * 0.3);
  const showcaseEndY = showcaseEl ? (showcaseY + showcaseEl.offsetHeight - window.innerHeight) : (startY + (bookingY - startY) * 0.7);

  const duration = 2400; // 2.4s total
  const startTime = performance.now();

  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);

    let currentY;
    if (progress < 0.25) {
      // Phase 1 (0.0s - 0.6s): Quick ease from hero to showcase
      const p1 = progress / 0.25;
      const ease1 = p1 * p1 * (3 - 2 * p1);
      currentY = startY + (showcaseY - startY) * ease1;
    } else if (progress < 0.75) {
      // Phase 2 (0.6s - 1.8s): Steady glide through showcase to watch 3D room assemble
      const p2 = (progress - 0.25) / 0.50;
      currentY = showcaseY + (showcaseEndY - showcaseY) * p2;
    } else {
      // Phase 3 (1.8s - 2.4s): Smooth ease directly into booking panel
      const p3 = (progress - 0.75) / 0.25;
      const ease3 = p3 * p3 * (3 - 2 * p3);
      currentY = showcaseEndY + (bookingY - showcaseEndY) * ease3;
    }

    window.scrollTo(0, currentY);

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      if (typeof window.__checkScrubVisibility === 'function') {
        window.__checkScrubVisibility();
      }
    }
  }

  requestAnimationFrame(step);
}

if (typeof window !== 'undefined') {
  window.slowScrollToBooking = slowScrollToBooking;
}

export function scrollToHash(hash) {
  if (!hash) return;
  if (hash === '#booking') {
    slowScrollToBooking();
    return;
  }
  try {
    const el = document.querySelector(hash);
    if (el) {
      const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    }
  } catch (e) {}
}

export function initLandingScroll() {
  if (window.location.hash === '#booking') {
    slowScrollToBooking();
  } else {
    window.scrollTo(0, 0);
  }
}

export function paintDetails(m) {
  if (!m) return;
  const poster = document.getElementById('detPoster');
  const posterImg = document.getElementById('detPosterImg');

  if (poster && posterImg) {
    if (m.poster_url) {
      posterImg.src = m.poster_url;
      posterImg.style.display = 'block';
    } else {
      posterImg.style.display = 'none';
    }
    poster.style.setProperty('--pg', m.g);
  }

  const glyphEl = document.getElementById('detGlyph');
  if (glyphEl) glyphEl.textContent = m.glyph;

  const hallEl = document.getElementById('detHall');
  if (hallEl) hallEl.textContent = m.hall ? m.hall.toUpperCase() : 'D BLOCK / 3RD FLOOR';

  const titleEl = document.getElementById('detTitle');
  if (titleEl) titleEl.textContent = m.rawTitle || m.title;

  const dirEl = document.getElementById('detDir');
  if (dirEl) dirEl.textContent = '— ' + (m.dir || '').toUpperCase();

  const metaEl = document.getElementById('detMeta');
  if (metaEl) metaEl.textContent = `${m.genre}  |  ${m.runtime}  |  ${m.year}  |  ${m.rating}`;

  const blurbEl = document.getElementById('detBlurb');
  if (blurbEl) blurbEl.textContent = m.blurb || '';
}

export function updateShowingLabels() {
  const state = getState();
  const s = getActiveShowing();
  if (!s || !state.selectedMovie) return;

  const showtimeEl = document.getElementById('dateShowtime');
  if (showtimeEl) showtimeEl.textContent = s.time;

  const movieMetaEl = document.getElementById('bkMovieMeta');
  if (movieMetaEl) {
    movieMetaEl.textContent = `${state.selectedMovie.rawTitle || state.selectedMovie.title}, ${state.selectedMovie.dir}, ${s.fullDateStr}, ${s.time}, ${s.hall}`;
  }

  const sumFilm = document.getElementById('sumFilm');
  if (sumFilm) sumFilm.textContent = state.selectedMovie.rawTitle || state.selectedMovie.title;

  const sumHall = document.getElementById('sumHall');
  if (sumHall) sumHall.textContent = s.hall;

  const sumDate = document.getElementById('sumDate');
  if (sumDate) sumDate.textContent = s.fullDateStr;

  const sumShowtime = document.getElementById('sumShowtime');
  if (sumShowtime) sumShowtime.textContent = s.time;
}

export function renderDates() {
  const box = document.getElementById('datePills');
  if (!box) return;

  const state = getState();
  box.innerHTML = '';

  state.currentShowings.forEach((s, i) => {
    const b = document.createElement('div');
    b.className = 'hero-date-card' + (i === state.selectedShowingIdx ? ' active' : '');
    b.setAttribute('data-cursor', 'DATE');
    b.setAttribute('aria-label', 'Screening date ' + s.fullDateStr);
    b.innerHTML = `<b>${s.dayNum}</b><span>${s.monthStr}</span>`;
    b.addEventListener('click', () => {
      if (state.selectedShowingIdx === i) return;
      setSelectedShowingIdx(i);
      renderDates();
      updateShowingLabels();
    });
    box.appendChild(b);
  });
}

export async function selectMovie(id, scroll = false) {
  const state = getState();
  const m = state.movies.find(item => item.id === id);
  if (!m) return;

  setSelectedMovie(m);
  paintDetails(m);

  // Update visual selection ring on cards
  document.querySelectorAll('.movie-card-row').forEach(c => {
    if (c.getAttribute('data-id') === m.id) {
      c.classList.add('selected-ring');
    } else {
      c.classList.remove('selected-ring');
    }
  });

  const showings = await fetchShowings(m.id);
  setCurrentShowings(showings, 0);

  renderDates();
  updateShowingLabels();

  if (scroll) {
    slowScrollToBooking();
  }
}

export function renderMovies(list) {
  const grid = document.getElementById('moviesGrid');
  const emptyBox = document.getElementById('moviesEmpty');
  if (!grid) return;

  grid.innerHTML = '';
  if (!list || !list.length) {
    if (emptyBox) emptyBox.hidden = false;
    return;
  }
  if (emptyBox) emptyBox.hidden = true;

  list.forEach(m => {
    const card = document.createElement('article');
    card.className = 'movie-card-row reveal in';
    card.setAttribute('data-id', m.id);
    card.setAttribute('data-action', 'select-movie');

    const topArea = document.createElement('div');
    topArea.className = 'movie-card-top';

    const thumb = document.createElement('div');
    thumb.className = 'movie-thumb';
    if (m.poster_url) {
      thumb.innerHTML = `<img src="${m.poster_url}" alt="${m.title}">`;
    } else {
      thumb.style.background = m.g;
      thumb.innerHTML = `<span class="movie-thumb-text">${m.title.slice(0, 8)}</span>`;
    }

    const details = document.createElement('div');
    details.className = 'movie-card-details';
    details.innerHTML = `
      <div class="movie-card-title">${m.rawTitle || m.title}</div>
      <div class="movie-card-dir">${(m.dir || '').toUpperCase()}</div>
      <div class="movie-card-tags">${m.genre} &nbsp;|&nbsp; ${m.runtime}</div>
    `;

    topArea.appendChild(thumb);
    topArea.appendChild(details);

    const bottomArea = document.createElement('div');
    bottomArea.className = 'movie-card-bottom';
    bottomArea.innerHTML = `
      <span class="movie-card-time">${m.runtime} &bull; ${m.hall}</span>
      <span class="movie-card-btn">RESERVE SEATS &rarr;</span>
    `;

    card.appendChild(topArea);
    card.appendChild(bottomArea);

    card.addEventListener('click', () => {
      selectMovie(m.id, true);
    });

    grid.appendChild(card);
  });
}

function bindDateArrows() {
  const prevBtn = document.getElementById('prevDateBtn');
  const nextBtn = document.getElementById('nextDateBtn');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      const s = getState();
      if (s.selectedShowingIdx > 0) {
        setSelectedShowingIdx(s.selectedShowingIdx - 1);
        renderDates();
        updateShowingLabels();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const s = getState();
      if (s.selectedShowingIdx < s.currentShowings.length - 1) {
        setSelectedShowingIdx(s.selectedShowingIdx + 1);
        renderDates();
        updateShowingLabels();
      }
    });
  }
}

function setupBookingModes() {
  const btnIndiv = document.getElementById('btnModeIndividual');
  const btnGroup = document.getElementById('btnModeGroup');
  const hint = document.getElementById('modeHint');

  if (btnIndiv) {
    btnIndiv.addEventListener('click', () => {
      setBookingMode('individual');
      btnIndiv.classList.add('active');
      if (btnGroup) btnGroup.classList.remove('active');
      if (hint) hint.innerHTML = 'Individual Mode &bull; Select exactly 1 seat';
    });
  }

  if (btnGroup) {
    btnGroup.addEventListener('click', () => {
      setBookingMode('group');
      btnGroup.classList.add('active');
      if (btnIndiv) btnIndiv.classList.remove('active');
      if (hint) hint.innerHTML = 'Group Mode &bull; Select up to 4 seats at once';
    });
  }

  // Intercept any click for all "Reserve Seats" buttons
  const reserveSelector = '[data-action="reserve-seats"], .reserve-seats-btn, #heroReserveBtn, a[href="#booking"]';
  document.querySelectorAll(reserveSelector).forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      slowScrollToBooking();
    });
  });

  document.addEventListener('click', (e) => {
    const btn = e.target.closest(reserveSelector);
    if (btn) {
      e.preventDefault();
      e.stopPropagation();
      slowScrollToBooking();
    }
  });
}

function observeReveals() {
  if (revealObserver) {
    try { revealObserver.disconnect(); } catch (e) {}
  }
  if (!window.IntersectionObserver) return;

  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        en.target.classList.add('in');
        revealObserver.unobserve(en.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
}

export async function initScreening() {
  if (window.location.hash !== '#booking') {
    window.scrollTo(0, 0);
  }
  setupBookingModes();
  bindDateArrows();
  initSeatmap();
  initBookingModal();
  initScrubShowcase();

  const movies = await fetchMovies();
  setMovies(movies);
  renderMovies(movies);

  if (movies && movies.length) {
    await selectMovie(movies[0].id, false);
  }

  observeReveals();
  initLandingScroll();
}

export function destroyScreening() {
  if (revealObserver) {
    try { revealObserver.disconnect(); } catch (e) {}
    revealObserver = null;
  }
}

if (typeof window !== 'undefined') {
  window.initScreening = initScreening;
  window.destroyScreening = destroyScreening;
}

// Auto-boot on DOM readiness
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScreening);
  } else {
    initScreening();
  }
}

// Speculatively preload index HTML into HTTP cache
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    const preload = () => {
      fetch('index.html', { priority: 'low' }).catch(() => {});
    };
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(preload, { timeout: 2000 });
    } else {
      setTimeout(preload, 1200);
    }
  });
}

