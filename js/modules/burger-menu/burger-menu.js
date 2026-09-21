/**
 * js/modules/burger-menu/burger-menu.js
 * Complete Daydreamers Burger Menu System module.
 * Phase 1: 60fps GPU Compositor Toggle Button.
 * Phase 2: Persistent Fullscreen Room, 1600ms Body-Class Timeline Engine, & Curtain Wipe.
 */

let isInitialized = false;
let visible = false;
let running = false;
let activeTimeouts = [];
let lastFocusedElement = null;

/**
 * Mobile viewport height fix: prevents jumps when mobile browser chrome shows/hides.
 */
function updateVh() {
  if (typeof window === 'undefined') return;
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}

/**
 * Tracks and clears pending setTimeout calls to prevent corrupted states across rapid navigations.
 */
function scheduleTimeout(fn, delay) {
  const id = setTimeout(() => {
    activeTimeouts = activeTimeouts.filter((t) => t !== id);
    fn();
  }, delay);
  activeTimeouts.push(id);
  return id;
}

function clearAllTimeouts() {
  activeTimeouts.forEach((id) => clearTimeout(id));
  activeTimeouts = [];
}

/**
 * Synchronously cancels all running transitions, timers, and restores clean idle state.
 * Required by router on fast page switches while menu is mid-transition.
 */
export function forceHide() {
  clearAllTimeouts();
  visible = false;
  running = false;

  const body = document.body;
  const button = document.getElementById('burgerToggle');
  const menu = document.getElementById('site-menu');
  const panel = document.querySelector('.site-menu-panel');

  body.classList.remove('menu-running', 'menu-active', 'menu-open', 'menu-close', 'lock-scroll');

  if (button) {
    button.classList.remove('is-active');
    button.setAttribute('aria-expanded', 'false');
  }

  if (menu) {
    menu.setAttribute('aria-hidden', 'true');
    menu.setAttribute('inert', '');
  }

  if (panel) {
    panel.style.willChange = 'auto';
  }

  if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
    try { lastFocusedElement.focus(); } catch (_) {}
    lastFocusedElement = null;
  }
}

/**
 * Open the menu room following the strict 1600ms body-class timeline.
 */
export function show() {
  if (running || visible) return;
  visible = true;
  running = true;

  lastFocusedElement = document.activeElement;
  updateCurrentNavItem();

  const body = document.body;
  const button = document.getElementById('burgerToggle');
  const menu = document.getElementById('site-menu');
  const panel = document.querySelector('.site-menu-panel');
  const prefersReducedMotion = typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (panel) panel.style.willChange = 'transform';

  // t = 0ms: wipe curtain starts sweeping, burger morphs, room accessible
  body.classList.add('menu-running');
  body.classList.remove('menu-close');
  if (button) {
    button.classList.add('is-active');
    button.setAttribute('aria-expanded', 'true');
  }
  if (menu) {
    menu.setAttribute('aria-hidden', 'false');
    menu.removeAttribute('inert');
  }

  if (prefersReducedMotion) {
    body.classList.add('menu-active', 'menu-open');
    body.classList.remove('menu-running');
    if (button) {
      try { button.blur(); } catch (_) {}
    }
    const firstLink = menu ? menu.querySelector('.site-menu-item a') : null;
    if (firstLink && typeof firstLink.focus === 'function') {
      try { firstLink.focus(); } catch (_) {}
    }
    running = false;
    return;
  }

  // t = 200ms: logo, header buttons cross-fade to white
  scheduleTimeout(() => {
    body.classList.add('menu-active');
  }, 200);

  // t = 800ms: curtain covers 50% screen center; room un-hides instantly; staggered rise starts
  scheduleTimeout(() => {
    if (typeof window.backgroundScene?.toMenuCenter === 'function') {
      try { window.backgroundScene.toMenuCenter(); } catch (e) {}
    }
    window.dispatchEvent(new CustomEvent('burgerMenu:recenter'));
    window.dispatchEvent(new CustomEvent('menuGlass:start'));
    window.dispatchEvent(new CustomEvent('burgerMenu:open'));

    body.classList.add('menu-open');
    if (button) {
      try { button.blur(); } catch (e) {}
    }

    const firstLink = menu ? menu.querySelector('.site-menu-item a') : null;
    if (firstLink && typeof firstLink.focus === 'function') {
      try { firstLink.focus(); } catch (_) {}
    }
  }, 800);

  // t = 1600ms: curtain exits screen right; timeline complete, interactive again
  scheduleTimeout(() => {
    running = false;
    body.classList.remove('menu-running');
    if (panel) panel.style.willChange = 'auto';
  }, 1600);
}

/**
 * Close the menu room: asymmetric teardown covered by sweeping curtain.
 */
export function hide() {
  if (!visible || running) return;
  visible = false;
  running = true;

  const body = document.body;
  const button = document.getElementById('burgerToggle');
  const menu = document.getElementById('site-menu');
  const panel = document.querySelector('.site-menu-panel');
  const prefersReducedMotion = typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (panel) panel.style.willChange = 'transform';

  // t = 0ms: curtain starts sweeping, room stays visible but inert during cover
  body.classList.add('menu-close', 'menu-running');
  if (button) {
    button.classList.remove('is-active');
    button.setAttribute('aria-expanded', 'false');
  }
  if (menu) {
    menu.setAttribute('aria-hidden', 'true');
    menu.setAttribute('inert', '');
  }

  if (prefersReducedMotion) {
    body.classList.remove('menu-close', 'menu-running', 'menu-active', 'menu-open');
    if (button && typeof button.focus === 'function') {
      try { button.focus(); } catch (_) {}
    }
    running = false;
    return;
  }

  // t = 800ms: curtain reaches 50% screen center covering teardown; hide menu behind curtain
  scheduleTimeout(() => {
    body.classList.remove('menu-close', 'menu-open');
    if (typeof window.backgroundScene?.reset === 'function') {
      try { window.backgroundScene.reset(); } catch (e) {}
    }
    window.dispatchEvent(new CustomEvent('burgerMenu:restore'));
  }, 800);

  // t = 1000ms: restore page theme colors
  scheduleTimeout(() => {
    body.classList.remove('menu-active');
  }, 1000);

  // t = 1600ms: curtain exits; UI fully restored and interactive
  scheduleTimeout(() => {
    running = false;
    body.classList.remove('menu-running');
    if (panel) panel.style.willChange = 'auto';
    if (menu) {
      menu.setAttribute('aria-hidden', 'true');
      menu.setAttribute('inert', '');
    }
    window.dispatchEvent(new CustomEvent('menuGlass:stop'));
    window.dispatchEvent(new CustomEvent('burgerMenu:close'));

    if (button && typeof button.focus === 'function') {
      try { button.focus(); } catch (_) {}
    }
    lastFocusedElement = null;
  }, 1600);
}

/**
 * Toggle menu open/close safely with running-guard lock.
 */
export function toggle() {
  if (running) return;
  if (visible) {
    hide();
  } else {
    show();
  }
}

/**
 * "You Are Here" Active Indicator:
 * Highlights the current page in the menu (01 Home on index, 02 Screening on screening).
 */
export function updateCurrentNavItem() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const path = window.location.pathname;
  const isScreening = path.endsWith('/screening.html') || path.endsWith('/screening');
  const isContact = path.endsWith('/contact.html') || path.endsWith('/contact');

  const menuItems = document.querySelectorAll('.site-menu-item');
  menuItems.forEach((item) => {
    item.classList.remove('is-current');
    const a = item.querySelector('a');
    if (a) a.removeAttribute('aria-current');
  });

  let selector;
  if (isScreening) {
    selector = '.site-menu-item a[href*="screening.html"], .site-menu-item a[href="screening.html"]';
  } else if (isContact) {
    selector = '.site-menu-item a[href*="contact.html"], .site-menu-item a[href="contact.html"]';
  } else {
    selector = '.site-menu-item a[href*="index.html#home"], .site-menu-item a[href="#home"], .site-menu-item:first-child a';
  }

  const activeLink = document.querySelector(selector);
  if (activeLink) {
    const parentItem = activeLink.closest('.site-menu-item');
    if (parentItem) parentItem.classList.add('is-current');
    activeLink.setAttribute('aria-current', 'page');
  }
}

/**
 * Zero-latency arrival sweep-out if navigated via continuous curtain.
 */
function handleArrivalCurtain() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const cleanup = () => {
    document.documentElement.classList.remove('wall-entering', 'wall-exiting');
    if (document.body) {
      document.body.classList.remove('wall-entering', 'wall-exiting', 'loader-running');
    }
    const loader = document.querySelector('.site-loader');
    if (loader) {
      loader.style.pointerEvents = 'none';
      loader.style.opacity = '0';
    }
  };

  try {
    if (sessionStorage.getItem('wallEnter') === '1') {
      sessionStorage.removeItem('wallEnter');
      document.documentElement.classList.remove('wall-entering');
      if (document.body) document.body.classList.remove('wall-entering');
      document.documentElement.classList.add('wall-exiting');
      setTimeout(cleanup, 500);
    } else {
      cleanup();
    }
  } catch (_) {
    cleanup();
  }
}

/**
 * Bind DOM click, navigation, resize, and accessibility events.
 */
export function initBurgerMenu() {
  if (isInitialized || typeof document === 'undefined') return;
  isInitialized = true;

  updateVh();
  updateCurrentNavItem();
  handleArrivalCurtain();

  window.addEventListener('resize', updateVh, { passive: true });
  window.addEventListener('orientationchange', updateVh, { passive: true });

  const btn = document.getElementById('burgerToggle');
  if (btn) {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      toggle();
    });
  }

  if (typeof window !== 'undefined' && window.location.search.includes('openMenu')) {
    setTimeout(() => {
      show();
    }, 400);
  }

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && visible && !running) {
      hide();
    }
  });

  // Explicit Admin link handler bypassing router
  const adminLinks = document.querySelectorAll('#site-menu a[href*="admin"], a[href*="admin"]');
  adminLinks.forEach((link) => {
    link.setAttribute('data-no-router', 'true');
    link.addEventListener('click', (e) => {
      e.stopPropagation();
      window.location.href = 'admin.html';
    });
  });

  // Menu Camera Toggle for Nitrate Inversion Lens (PC Only, Boxless Icon)
  const menuCameraBtn = document.getElementById('menuCameraBtn');
  if (menuCameraBtn) {
    menuCameraBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      hide();
      scheduleTimeout(() => {
        if (window.secretStory && typeof window.secretStory.toggleNitrateMode === 'function') {
          window.secretStory.toggleNitrateMode();
        } else {
          import('../screening/secret-story.js').then(({ secretStory }) => {
            secretStory.toggleNitrateMode();
          }).catch(() => {});
        }
      }, 500);
    });
  }

  // Intercept clicks on links inside the menu room
  const menu = document.getElementById('site-menu');
  if (menu) {
    menu.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (!link) return;

      const href = link.getAttribute('href');
      if (!href) return;

      // Explicit Admin link bypass
      if (href.includes('admin') || link.dataset.noRouter === 'true') {
        e.stopPropagation();
        window.location.href = 'admin.html';
        return;
      }

      // If opening in a new tab or external protocol, let default behavior proceed
      if (link.target === '_blank' || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return;
      }

      // If clicking the current page item ("You are here"), smoothly close menu back to the page
      if (link.getAttribute('aria-current') === 'page' || link.closest('.is-current')) {
        e.preventDefault();
        hide();
        return;
      }

      // Hash link on same page
      const hashIndex = href.indexOf('#');
      const isSamePageHash = hashIndex !== -1 && (
        href.startsWith('#') || 
        window.location.pathname.endsWith(href.slice(0, hashIndex))
      );

      if (isSamePageHash) {
        e.preventDefault();
        const hash = href.slice(hashIndex);
        hide();
        scheduleTimeout(() => {
          if (hash === '#booking' && typeof window.slowScrollToBooking === 'function') {
            window.slowScrollToBooking();
          } else {
            const target = document.querySelector(hash);
            if (target) {
              target.scrollIntoView({ behavior: 'smooth' });
              try { history.pushState(null, '', hash); } catch (err) {}
            }
          }
        }, 800);
      } else {
        // Different page navigation (ZERO FULL-PAGE RELOAD):
        // Keep menu room visible while curtain sweeps over it (0ms -> 800ms).
        // At 800ms when screen is 100% covered, swap view and stylesheets in-memory!
        e.preventDefault();
        hide();
        if (href.includes('admin.html') || href.includes('admin') || link.dataset.noRouter === 'true') {
          window.location.href = 'admin.html';
          return;
        }
        if (typeof window.navigateTo === 'function') {
          window.navigateTo(href, false, true);
        } else {
          scheduleTimeout(() => {
            try { sessionStorage.setItem('wallEnter', '1'); } catch (_) {}
            window.location.href = href;
          }, 800);
        }
      }
    });
  }
}

// Backward-compatible alias exports
export const toggleBurgerMenu = toggle;
export const openBurgerMenu = show;
export const closeBurgerMenu = hide;
export const isBurgerMenuOpen = () => visible;

// Auto-initialize on DOM ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBurgerMenu);
  } else {
    initBurgerMenu();
  }
}
