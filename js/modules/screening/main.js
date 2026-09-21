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
import { initBookingModal, openBookingModal, setStep, renderTicketSuccess } from './booking-modal.js';
import { initScrubShowcase, destroyScrubShowcase } from './scrub-showcase.js';
import { InversionLens } from '../three/inversion-lens.js';
import { secretStory } from './secret-story.js';

let heroLens = null;
let globalNitrateLens = null;
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

  // Initialize or update WebGL Fluid Inversion Lens safely
  if (poster) {
    try {
      if (!heroLens) {
        heroLens = new InversionLens(poster);
      }
      if (heroLens) {
        heroLens.setTexture(m.poster_url);
      }
    } catch (err) {
      console.warn('[Screening] InversionLens error:', err);
      heroLens = null;
    }
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
  if (metaEl) {
    metaEl.innerHTML = `
      <span id="detGenre">${(m.genre || 'Drama').toUpperCase()}</span>
      <span class="bullet">|</span>
      <span id="detRuntime">${(m.runtime || '2H').toUpperCase()}</span>
      <span class="bullet">|</span>
      <span id="detYear">${m.year || 2024}</span>
      <span class="bullet">|</span>
      <span id="detRating">${(m.rating || 'UA').toUpperCase()}</span>
    `;
  }

  const blurbEl = document.getElementById('detBlurb');
  if (blurbEl) blurbEl.textContent = m.blurb || '';
}

export function updateShowingLabels() {
  const state = getState();
  const s = getActiveShowing();
  if (!s || !state.selectedMovie) return;

  const m = state.selectedMovie;
  const time12 = s.time12h || s.time || '7:30 PM';

  const weekdayEl = document.getElementById('dateWeekday');
  if (weekdayEl) weekdayEl.textContent = s.weekday || 'FRI';

  const dayEl = document.getElementById('dateDay');
  if (dayEl) dayEl.textContent = s.dayNum || '18';

  const monthEl = document.getElementById('dateMonth');
  if (monthEl) monthEl.textContent = s.monthStr || 'SEP';

  const showtimeEl = document.getElementById('dateShowtime');
  if (showtimeEl) {
    if (time12.includes(' ')) {
      const [numTime, ampm] = time12.split(' ');
      showtimeEl.innerHTML = `${numTime} <span class="sched-ampm">${ampm}</span>`;
    } else {
      showtimeEl.textContent = time12;
    }
  }

  // Interactive schedule click to cycle showings
  const heroSched = document.getElementById('heroSchedule');
  if (heroSched && !heroSched.dataset.bound) {
    heroSched.dataset.bound = 'true';
    heroSched.addEventListener('click', () => {
      const total = state.currentShowings.length;
      if (total > 1) {
        state.selectedShowingIdx = (state.selectedShowingIdx + 1) % total;
        updateShowingLabels();
      }
    });
  }

  // Booking Drawer sync
  const movieMetaEl = document.getElementById('bkMovieMeta');
  if (movieMetaEl) {
    movieMetaEl.textContent = `${m.rawTitle || m.title}, ${m.dir}, ${s.fullDateStr}, ${time12}, ${s.hall}`;
  }

  const sumFilm = document.getElementById('sumFilm');
  if (sumFilm) sumFilm.textContent = m.rawTitle || m.title;

  const sumHall = document.getElementById('sumHall');
  if (sumHall) sumHall.textContent = s.hall;

  const sumDate = document.getElementById('sumDate');
  if (sumDate) sumDate.textContent = s.fullDateStr;

  const sumShowtime = document.getElementById('sumShowtime');
  if (sumShowtime) sumShowtime.textContent = time12;
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
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', i === state.selectedShowingIdx ? 'true' : 'false');
    b.setAttribute('aria-label', `Screening date ${s.weekday || ''} ${s.dayNum} ${s.monthStr}`);
    b.innerHTML = `
      <span class="date-weekday">${s.weekday || 'THU'}</span>
      <b class="date-day">${s.dayNum}</b>
      <span class="date-month">${s.monthStr}</span>
    `;
    b.addEventListener('click', () => {
      if (state.selectedShowingIdx === i) return;
      setSelectedShowingIdx(i);
      renderDates();
      updateShowingLabels();
    });
    box.appendChild(b);
  });
}

let selectSeq = 0;

export async function selectMovie(id, scroll = false) {
  const mySeq = ++selectSeq;
  const state = getState();
  const m = state.movies.find(item => item.id === id);
  if (!m) return;

  // Fast path: already showing this film — just refresh ring + scroll if asked.
  if (state.selectedMovie && state.selectedMovie.id === id && state.currentShowings.length) {
    document.querySelectorAll('.movie-card-row').forEach(c => {
      if (c.getAttribute('data-id') === m.id) {
        c.classList.add('selected-ring');
      } else {
        c.classList.remove('selected-ring');
      }
    });
    updateShowingLabels();
    if (scroll) {
      slowScrollToBooking();
    }
    return;
  }

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
  // Drop stale responses when user clicks A then B quickly.
  if (mySeq !== selectSeq) return;
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
    `;

    const reserveBtn = document.createElement('button');
    reserveBtn.type = 'button';
    reserveBtn.className = 'movie-card-btn';
    reserveBtn.setAttribute('data-action', 'reserve-movie');
    reserveBtn.setAttribute('data-id', m.id);
    reserveBtn.setAttribute('aria-label', `Reserve seats for ${m.rawTitle || m.title}`);
    reserveBtn.textContent = 'RESERVE SEATS \u2192';
    reserveBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectMovie(m.id, true);
    });
    bottomArea.appendChild(reserveBtn);

    card.appendChild(topArea);
    card.appendChild(bottomArea);

    // Card body = preview only, no scroll. Reserve button = select + scroll.
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `Preview ${m.rawTitle || m.title}`);
    card.addEventListener('click', () => {
      selectMovie(m.id, false);
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        // Ignore when focus is on the reserve button itself (button handles it).
        if (e.target && e.target.closest && e.target.closest('.movie-card-btn')) return;
        e.preventDefault();
        selectMovie(m.id, false);
      }
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
  destroyScreening();

  if (window.location.hash !== '#booking') {
    window.scrollTo(0, 0);
  }
  setupBookingModes();
  bindDateArrows();
  initSeatmap();
  initBookingModal();
  initScrubShowcase();

  // Initialize Secret Story & Archival Camera Lens
  try {
    secretStory.init();
    secretStory.onToggle((active) => {
      const overlay = document.getElementById('nitrateLensOverlay');
      if (!overlay) return;

      if (active) {
        overlay.hidden = false;
        if (!globalNitrateLens) {
          try {
            globalNitrateLens = new InversionLens(overlay, {
              mode: 'viewport',
              maskRadius: 0.22,
              maskSpeed: 0.8,
              turbulenceIntensity: 0.25,
              onPointerUpdate: (x, y, radiusPx) => {
                secretStory.checkProximity(x, y, radiusPx);
              }
            });
          } catch (err) {
            console.warn('[Screening] Global InversionLens init caught:', err);
          }
        }
        if (globalNitrateLens) {
          globalNitrateLens.activate();
        }
      } else {
        if (globalNitrateLens) {
          globalNitrateLens.deactivate();
        }
        overlay.hidden = true;
      }
    });
  } catch (err) {
    console.warn('[Screening] SecretStory init caught:', err);
  }

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
  if (globalNitrateLens) {
    try { globalNitrateLens.destroy(); } catch (_) {}
    globalNitrateLens = null;
  }
  if (heroLens) {
    try { heroLens.destroy(); } catch (_) {}
    heroLens = null;
  }
  if (revealObserver) {
    try { revealObserver.disconnect(); } catch (e) {}
    revealObserver = null;
  }
  try { destroyScrubShowcase(); } catch (_) {}
}

if (typeof window !== 'undefined') {
  window.slowScrollToBooking = slowScrollToBooking;
  window.initScreening = initScreening;
  window.destroyScreening = destroyScreening;
  window.__getHeroLens = () => heroLens;
  window.secretStory = secretStory;
}

// Auto-boot on DOM readiness only if screening view elements are present in DOM
if (typeof document !== 'undefined') {
  const bootIfScreening = () => {
    if (document.getElementById('bookingView') || document.getElementById('moviesGrid') || window.location.pathname.includes('screening')) {
      initScreening();
    }
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootIfScreening);
  } else {
    bootIfScreening();
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

