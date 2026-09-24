/**
 * js/core/router.js
 * Persistent Shell & Zero-Reload Client Router (Phase 3).
 *
 * Header, button, menu, backdrop, panel, scene, star cursor, and loader curtain
 * live permanently OUTSIDE data-router-wrapper.
 * Navigation swaps #routerWrapper content and toggles preloaded stylesheets
 * behind the unified 1.6s curtain wipe with zero page reload.
 */

import {
  updateCurrentNavItem,
  hide as closeBurgerMenu,
  isBurgerMenuOpen
} from '../modules/burger-menu/burger-menu.js';

import { initHome, destroyHome } from '../modules/home/main.js';
import { initScreening, destroyScreening } from '../modules/screening/main.js';
import { initContact, destroyContact } from '../modules/contact/main.js';

const pageCache = new Map();
let isNavigating = false;

/**
 * Fetch and extract routerWrapper content and title from a page.
 */
async function fetchTargetPage(url) {
  const cleanUrl = url.split('#')[0];
  if (pageCache.has(cleanUrl)) {
    return pageCache.get(cleanUrl);
  }

  try {
    const res = await fetch(cleanUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/html');
    const wrapper = doc.getElementById('routerWrapper');
    const data = {
      html: wrapper ? wrapper.innerHTML : '',
      title: doc.title || document.title
    };
    pageCache.set(cleanUrl, data);
    return data;
  } catch (err) {
    console.error(`[Router] Failed to fetch ${cleanUrl}:`, err);
    return null;
  }
}

/**
 * Speculatively prefetch an HTML page into memory cache.
 */
export function prefetch(url) {
  if (
    !url ||
    url.startsWith('javascript:') ||
    url.startsWith('#') ||
    url.startsWith('mailto:') ||
    url.startsWith('tel:')
  ) {
    return Promise.resolve(null);
  }
  const cleanUrl = url.split('#')[0];
  return fetchTargetPage(cleanUrl);
}

/**
 * Determine page view type from URL ('home' vs 'screening').
 */
function getViewFromUrl(urlStr) {
  try {
    const u = new URL(urlStr, window.location.href);
    const path = u.pathname;
    if (path.includes('admin')) {
      return null;
    }
    if (path.endsWith('/screening.html') || path.endsWith('/screening')) {
      return 'screening';
    }
    if (path.endsWith('/contact.html') || path.endsWith('/contact')) {
      return 'contact';
    }
    if (path === '/' || path.endsWith('/index.html') || path.endsWith('/index') || path.endsWith('/')) {
      return 'home';
    }
    return null;
  } catch (_) {
    return null;
  }
}

/**
 * Switch active page stylesheet in <head> instantly behind the curtain.
 */
function switchPageStylesheet(targetView) {
  const homeStyle = document.getElementById('pageStyleHome');
  const screeningStyle = document.getElementById('pageStyleScreening');
  const contactStyle = document.getElementById('pageStyleContact');

  if (homeStyle) homeStyle.disabled = (targetView !== 'home');
  if (screeningStyle) screeningStyle.disabled = (targetView !== 'screening');
  if (contactStyle) contactStyle.disabled = (targetView !== 'contact');

  if (targetView && document.body) {
    document.body.setAttribute('data-page', targetView);
  }
}

/**
 * Perform zero-reload in-memory page transition behind the 1.6s solid curtain.
 *
 * @param {string} targetUrl Destination URL (e.g. "index.html#home", "screening.html")
 * @param {boolean} replace If true, replace history state instead of push
 * @param {boolean} fromMenu If true, curtain wipe was already triggered by menu hide()
 */
export async function navigateTo(targetUrl, replace = false, fromMenu = false) {
  if (!targetUrl || targetUrl.startsWith('javascript:')) return;
  if (targetUrl.includes('admin')) {
    window.location.href = targetUrl;
    return;
  }
  if (isNavigating) return;

  const urlObj = new URL(targetUrl, window.location.href);
  const targetView = getViewFromUrl(targetUrl);
  const currentView = getViewFromUrl(window.location.href);
  const hash = urlObj.hash;

  // Same-view hash navigation -> smooth scroll without view swap
  if (targetView === currentView) {
    if (typeof isBurgerMenuOpen === 'function' && isBurgerMenuOpen()) {
      closeBurgerMenu();
    }
    if (hash) {
      setTimeout(() => {
        if (hash === '#booking' && typeof window.slowScrollToBooking === 'function') {
          window.slowScrollToBooking();
        } else {
          const el = document.querySelector(hash);
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }
        try {
          if (!replace) history.pushState(null, '', hash);
        } catch (_) {}
      }, fromMenu ? 800 : 50);
    }
    return;
  }

  isNavigating = true;

  // Start curtain sweep if not already triggered by menu
  if (!fromMenu) {
    document.body.classList.add('lock-scroll', 'loader-running');
  }

  // Pre-fetch target HTML in parallel while curtain is sweeping
  const targetFile = targetView === 'screening' ? 'screening.html' : (targetView === 'contact' ? 'contact.html' : 'index.html');
  const fetchPromise = fetchTargetPage(targetFile);

  // Wait 800ms until screen is 100% blanketed by the solid curtain
  await new Promise((resolve) => setTimeout(resolve, 800));

  // --- AT t = 800ms: SWAP BEHIND SOLID CURTAIN ---
  const targetData = await fetchPromise;

  // 1. Teardown active view
  if (currentView === 'screening') {
    try { destroyScreening(); } catch (_) {}
  } else if (currentView === 'contact') {
    try { destroyContact(); } catch (_) {}
  } else {
    try { destroyHome(); } catch (_) {}
  }

  // 2. Inject target view DOM into #routerWrapper
  const wrapper = document.getElementById('routerWrapper');
  if (wrapper && targetData && targetData.html) {
    wrapper.innerHTML = targetData.html;
  }

  // 3. Switch stylesheet instantly (preloaded, 0ms lag)
  switchPageStylesheet(targetView);

  // 4. Update title & history pushState (Zero reload!)
  if (targetData && targetData.title) {
    document.title = targetData.title;
  }
  try {
    if (replace) {
      history.replaceState({ view: targetView }, '', targetUrl);
    } else {
      history.pushState({ view: targetView }, '', targetUrl);
    }
  } catch (_) {}

  // 5. Update active "You Are Here" indicator in menu
  try {
    updateCurrentNavItem();
  } catch (_) {}

  // 6. Initialize newly mounted view
  if (targetView === 'home') {
    try { initHome(); } catch (e) { console.error('[Router] initHome error:', e); }
  } else if (targetView === 'screening') {
    try { initScreening(); } catch (e) { console.error('[Router] initScreening error:', e); }
  } else if (targetView === 'contact') {
    try { initContact(); } catch (e) { console.error('[Router] initContact error:', e); }
  }

  // 7. Scroll to top or target hash
  if (hash) {
    if (hash === '#booking' && typeof window.slowScrollToBooking === 'function') {
      window.slowScrollToBooking();
    } else {
      const el = document.querySelector(hash);
      if (el) el.scrollIntoView({ behavior: 'auto' });
    }
  } else {
    window.scrollTo(0, 0);
  }

  // Dispatch custom route event for any external listeners
  window.dispatchEvent(
    new CustomEvent('page:swapped', {
      detail: { view: targetView, url: targetUrl }
    })
  );

  // 8. Curtain sweep-out (800ms -> 1600ms)
  await new Promise((resolve) => setTimeout(resolve, 800));

  document.body.classList.remove('lock-scroll', 'loader-running');
  isNavigating = false;
}

if (typeof window !== 'undefined') {
  window.navigateTo = navigateTo;
}

/**
 * Initialize client router, link interceptors, and speculative cache.
 */
export function initRouter() {
  if (typeof window === 'undefined') return;

  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }

  // Cache current initial page wrapper
  const curView = getViewFromUrl(window.location.href);
  const curFile = curView === 'screening' ? 'screening.html' : (curView === 'contact' ? 'contact.html' : 'index.html');
  const wrapper = document.getElementById('routerWrapper');
  if (wrapper) {
    pageCache.set(curFile, {
      html: wrapper.innerHTML,
      title: document.title
    });
  }

  // Speculatively preload the other pages into cache
  if (curView !== 'screening') prefetch('screening.html');
  if (curView !== 'home') prefetch('index.html');
  if (curView !== 'contact') prefetch('contact.html');

  // High-performance warm-up of screening page assets and data
  if (curView !== 'screening') {
    fetch('/api/movies').catch(() => {});
    const warmScreening = () => {
      import('../modules/screening/main.js').catch(() => {});
      const img = new Image();
      img.src = '/assets/hero-arch-bg.webp';
      const pImg = new Image();
      pImg.src = '/assets/poster-the-last-reel.webp';
    };
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(warmScreening, { timeout: 1500 });
    } else {
      setTimeout(warmScreening, 800);
    }
  }

  // Intercept standard internal links
  document.addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || (e.button !== undefined && e.button !== 0)) {
      return;
    }

    const link = e.target.closest('a[href]');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href) return;

    // Check anchor before any routing logic:
    // If href contains 'admin', or if link.dataset.noRouter === 'true', or if href starts with 'http',
    // do NOT call e.preventDefault(). Return immediately and allow standard browser navigation.
    if (
      href.includes('admin') ||
      link.dataset.noRouter === 'true' ||
      href.startsWith('http') ||
      link.hasAttribute('data-router-disabled') ||
      link.getAttribute('target') === '_blank' ||
      link.hasAttribute('download') ||
      href.startsWith('javascript:') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:')
    ) {
      return;
    }

    let url;
    try {
      url = new URL(href, window.location.href);
    } catch (_) {
      return;
    }

    if (url.origin !== window.location.origin) return;

    if (url.pathname.includes('admin')) {
      return;
    }

    // Do not intercept menu links here; burger-menu.js handles menu clicks directly
    if (link.closest('#site-menu')) return;

    e.preventDefault();
    navigateTo(href, false, false);
  });

  // Handle browser back/forward buttons (popstate)
  window.addEventListener('popstate', () => {
    navigateTo(window.location.href, true, false);
  });
}

// Auto-boot on DOM readiness
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRouter);
  } else {
    initRouter();
  }
}
