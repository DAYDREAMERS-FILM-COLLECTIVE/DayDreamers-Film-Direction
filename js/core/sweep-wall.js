/**
 * js/core/sweep-wall.js
 * Dogstudio horizontal continuous curtain transition and burger navigation.
 * Manages full-screen sweep wall animations, route transitions, and responsive menu drawer.
 * Includes safeguards against missing GSAP and 2D fallback mode.
 */

import {
  toggle as toggleBurgerMenu,
  show as openBurgerMenu,
  hide as closeBurgerMenu,
  isBurgerMenuOpen
} from '../modules/burger-menu/burger-menu.js';
import { navigateTo } from './router.js';

let isOpen = false;
let isAnimating = false;
let pendingHash = null;

// Cached DOM references for zero-latency lookups
let cachedSweepWall = null;
let cachedNavOverlay = null;
let cachedBurgerToggle = null;
let isDelegated = false;

function getElements() {
  if (!cachedSweepWall) cachedSweepWall = document.getElementById('sweepWall');
  if (!cachedNavOverlay) cachedNavOverlay = document.querySelector('.nav-overlay') || document.getElementById('menuView');
  if (!cachedBurgerToggle) cachedBurgerToggle = document.getElementById('burgerToggle');
  return {
    sweepWall: cachedSweepWall,
    navOverlay: cachedNavOverlay,
    burgerToggle: cachedBurgerToggle
  };
}

// Pre-warm the GSAP timeline on module load / boot to pre-allocate GPU textures
export function prewarmSweep() {
  const { sweepWall } = getElements();
  if (typeof window !== 'undefined' && typeof window.gsap !== 'undefined' && sweepWall) {
    window.gsap.set(sweepWall, { xPercent: -100, force3D: true });
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', prewarmSweep);
  } else {
    prewarmSweep();
  }
}

function isModifiedClick(e) {
  return e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || (e.button !== undefined && e.button !== 0);
}

function splitNav(href) {
  const i = href.indexOf('#');
  if (i < 0) return { page: href, hash: '' };
  return { page: href.slice(0, i), hash: href.slice(i) };
}

function currentPage() {
  const parts = window.location.pathname.split('/');
  const last = parts[parts.length - 1];
  return last || 'index.html';
}

export function setBurger(open) {
  const burgerToggle = cachedBurgerToggle || document.getElementById('burgerToggle');
  if (burgerToggle) {
    burgerToggle.classList.toggle('is-active', open);
    burgerToggle.classList.toggle('menu-active', open);
    burgerToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    try { burgerToggle.blur(); } catch(e) {}
  }
}


export function swapViews() {
  const navOverlay = cachedNavOverlay || document.querySelector('.nav-overlay') || document.getElementById('menuView');
  if (!navOverlay) return;

  if (!isOpen) {
    navOverlay.style.display = 'flex';
    document.body.classList.add('menu-open');
  } else {
    navOverlay.style.display = 'none';
    document.body.classList.remove('menu-open');
  }
}

function animateMenuText(entering) {
  const hasGsap = typeof window.gsap !== 'undefined';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const navOverlay = cachedNavOverlay || document.querySelector('.nav-overlay') || document.getElementById('menuView');
  if (!hasGsap || reduceMotion || !navOverlay) return;

  const links = navOverlay.querySelectorAll('.menu-item');
  const meta = navOverlay.querySelectorAll('.nav-meta, .menu-action, .menu-socials, .menu-venue');

  if (entering) {
    window.gsap.fromTo(links,
      { y: 50, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.65, stagger: 0.05, ease: 'power3.out', delay: 0.1 }
    );
    if (meta.length) {
      window.gsap.fromTo(meta,
        { y: 25, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.55, stagger: 0.04, ease: 'power2.out', delay: 0.25 }
      );
    }
  } else {
    window.gsap.to(links, { y: -25, opacity: 0, duration: 0.25, stagger: 0.02, ease: 'power2.in' });
    if (meta.length) {
      window.gsap.to(meta, { y: -12, opacity: 0, duration: 0.2, ease: 'power2.in' });
    }
  }
}

function finishToggle() {
  const sweepWall = cachedSweepWall || document.getElementById('sweepWall');
  const hasGsap = typeof window.gsap !== 'undefined';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (hasGsap && sweepWall) {
    window.gsap.set(sweepWall, { xPercent: -100, force3D: true });
  }

  isOpen = !isOpen;
  isAnimating = false;

  if (isOpen) {
    animateMenuText(true);
  }

  if (!isOpen && pendingHash) {
    const target = document.querySelector(pendingHash);
    const hash = pendingHash;
    pendingHash = null;
    if (target) {
      try { history.pushState(null, '', hash); } catch (e) {}
      if (hash === '#booking' && typeof window.slowScrollToBooking === 'function') {
        window.slowScrollToBooking();
      } else {
        target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
      }
    }
  }
}

export function toggleMenu() {
  toggleBurgerMenu();
}

export function leavePage(url, newTab) {
  if (isAnimating) return;
  if (!url || url.indexOf('mailto:') === 0 || url.indexOf('tel:') === 0) {
    if (url) window.location.href = url;
    return;
  }

  if (newTab) {
    window.open(url, '_blank', 'noopener');
    return;
  }

  if (typeof navigateTo === 'function') {
    navigateTo(url);
    return;
  }

  window.location.href = url;
}

export function initSweepWall() {
  const { sweepWall, burgerToggle } = getElements();
  const menuClose = document.getElementById('menuClose');
  const hasGsap = typeof window.gsap !== 'undefined';
  const is2DFallback = Boolean(window.is2DFallbackActive || (document.body && document.body.classList.contains('seatmap-2d-mode')));

  // Pre-warm GSAP hardware acceleration immediately on boot
  if (hasGsap && sweepWall && !is2DFallback) {
    window.gsap.set(sweepWall, { xPercent: -100, force3D: true });
  }

  // Guard: If 2D fallback is active or GSAP is missing, hide sweepWall so it never blocks the viewport
  if (is2DFallback || !hasGsap) {
    document.documentElement.classList.remove('wall-entering');
    if (sweepWall) sweepWall.style.display = 'none';
  }

  // Arrival hash scrolling (arrival curtain sweep-out is handled uniformly by burger-menu.js / CSS)
  if (window.location.hash) {
    setTimeout(() => {
      const target = document.querySelector(window.location.hash);
      if (target) {
        if (window.location.hash === '#booking' && typeof window.slowScrollToBooking === 'function') {
          window.slowScrollToBooking();
        } else {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }, 800);
  }

  // Event Listeners for Burger handled by burger-menu.js
  if (burgerToggle) {
    burgerToggle.removeEventListener('click', toggleMenu);
  }

  if (menuClose) {
    menuClose.removeEventListener('click', toggleMenu);
    menuClose.addEventListener('click', () => closeBurgerMenu());
  }

  // Document-level event delegation for navigation links
  if (!isDelegated) {
    isDelegated = true;
    document.addEventListener('click', function(e) {
      if (isModifiedClick(e)) return;

      // 1. Same-page hash anchors: a[href^="#"] must NOT trigger the sweep wall
      const hashLink = e.target.closest('a[href^="#"]');
      if (hashLink) {
        const href = hashLink.getAttribute('href');
        if (!href || href === '#') return;
        e.preventDefault();
        e.stopPropagation();
        if (isOpen || isBurgerMenuOpen()) {
          pendingHash = href;
          closeBurgerMenu();
        } else {
          if (href === '#booking' && typeof window.slowScrollToBooking === 'function') {
            window.slowScrollToBooking();
          } else {
            const target = document.querySelector(href);
            if (target) {
              target.scrollIntoView({ behavior: 'smooth' });
              try { history.pushState(null, '', href); } catch (_) {}
            }
          }
        }
        return;
      }

      // 2. Internal cross-page links
      const link = e.target.closest('a[href]:not([target="_blank"]):not([href^="#"]):not([href^="mailto:"]):not([href^="tel:"])');
      if (!link) return;

      const rawHref = link.getAttribute('href');
      if (!rawHref || rawHref.startsWith('javascript:')) return;

      let targetUrl;
      try {
        targetUrl = new URL(link.href, window.location.origin);
      } catch (_) {
        return;
      }

      // Only handle internal origin
      if (targetUrl.origin !== window.location.origin) return;

      // Handle same-page paths (e.g. screening.html#booking while on screening.html)
      if (targetUrl.pathname === window.location.pathname) {
        if (targetUrl.hash) {
          e.preventDefault();
          e.stopPropagation();
          if (isOpen) {
            pendingHash = targetUrl.hash;
            toggleMenu();
          } else {
            if (targetUrl.hash === '#booking' && typeof window.slowScrollToBooking === 'function') {
              window.slowScrollToBooking();
            } else {
              const target = document.querySelector(targetUrl.hash);
              if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
                try { history.pushState(null, '', targetUrl.hash); } catch (_) {}
              }
            }
          }
          return;
        }
        e.preventDefault();
        if (isOpen) toggleMenu();
        else window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // Internal cross-page navigation -> delegate to unified 1.6s router wipe
      e.preventDefault();
      if (typeof navigateTo === 'function') {
        navigateTo(link.href);
      } else {
        window.location.href = link.href;
      }
      return;
    });
  }

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && isOpen && !isAnimating) {
      toggleMenu();
    }
  });

  window.addEventListener('pageshow', function(e) {
    if (!e.persisted) return;
    isAnimating = false;
    if (sweepWall && hasGsap) {
      window.gsap.set(sweepWall, { xPercent: -100, force3D: true });
    }
  });
}

// Global window bindings for backward compatibility
if (typeof window !== 'undefined') {
  window.initSweepWall = initSweepWall;
  window.toggleMenu = toggleMenu;
  window.leavePage = leavePage;
  window.setBurger = setBurger;
  window.prewarmSweep = prewarmSweep;
}

// Auto-run when DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSweepWall);
  } else {
    initSweepWall();
  }
}
