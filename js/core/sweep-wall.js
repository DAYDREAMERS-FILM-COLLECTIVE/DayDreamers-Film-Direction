/**
 * js/core/sweep-wall.js
 * Dogstudio horizontal continuous curtain transition and burger navigation.
 * Manages full-screen sweep wall animations, route transitions, and responsive menu drawer.
 * Includes safeguards against missing GSAP and 2D fallback mode.
 */

let isOpen = false;
let isAnimating = false;
let pendingHash = null;

const SWEEP_IN = 0.55;
const HOLD = 0.35;
const SWEEP_OUT = 0.45;

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
  const burgerToggle = document.getElementById('burgerToggle');
  if (burgerToggle) {
    burgerToggle.classList.toggle('menu-active', open);
    burgerToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  const hasGsap = typeof window.gsap !== 'undefined';
  const bTop = document.querySelector('#burgerToggle .bar-top') || (burgerToggle && burgerToggle.children[0]);
  const bMid = document.querySelector('#burgerToggle .bar-mid') || (burgerToggle && burgerToggle.children[1]);
  const bBottom = document.querySelector('#burgerToggle .bar-bottom') || (burgerToggle && burgerToggle.children[2]);

  if (!hasGsap || !bTop || !bMid || !bBottom) return;

  if (open) {
    window.gsap.to(bTop, { y: 8, rotate: 45, duration: 0.35, ease: 'power2.inOut' });
    window.gsap.to(bMid, { opacity: 0, duration: 0.25, ease: 'power2.inOut' });
    window.gsap.to(bBottom, { y: -8, rotate: -45, duration: 0.35, ease: 'power2.inOut' });
  } else {
    window.gsap.to([bTop, bBottom], { y: 0, rotate: 0, duration: 0.35, ease: 'power2.inOut' });
    window.gsap.to(bMid, { opacity: 1, duration: 0.35, ease: 'power2.inOut' });
  }
}

export function swapViews() {
  const menuView = document.getElementById('menuView');
  if (!menuView) return;

  if (!isOpen) {
    menuView.style.display = 'flex';
    document.body.classList.add('menu-open');
    window.dispatchEvent(new Event('menuGlass:start'));
  } else {
    menuView.style.display = 'none';
    document.body.classList.remove('menu-open');
    window.dispatchEvent(new Event('menuGlass:stop'));
  }
}

function animateMenuText(entering) {
  const hasGsap = typeof window.gsap !== 'undefined';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const menuView = document.getElementById('menuView');
  if (!hasGsap || reduceMotion || !menuView) return;

  const links = menuView.querySelectorAll('.menu-item');
  const meta = menuView.querySelectorAll('.nav-meta, .menu-action, .menu-socials');

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
  const sweepWall = document.getElementById('sweepWall');
  const hasGsap = typeof window.gsap !== 'undefined';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (hasGsap && sweepWall) {
    window.gsap.set(sweepWall, { xPercent: -100 });
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
  const menuView = document.getElementById('menuView');
  const sweepWall = document.getElementById('sweepWall');
  const hasGsap = typeof window.gsap !== 'undefined';
  const is2DFallback = Boolean(window.is2DFallbackActive || (document.body && document.body.classList.contains('seatmap-2d-mode')));

  if (isAnimating || !menuView) return;

  setBurger(!isOpen);

  if (!hasGsap || !sweepWall || is2DFallback) {
    swapViews();
    isOpen = !isOpen;
    if (!isOpen && pendingHash) {
      const t = document.querySelector(pendingHash);
      pendingHash = null;
      if (t) t.scrollIntoView();
    }
    return;
  }

  isAnimating = true;

  const tl = window.gsap.timeline({ onComplete: finishToggle });

  tl.fromTo(
    sweepWall,
    { xPercent: -100 },
    { xPercent: 0, duration: SWEEP_IN, ease: 'power2.inOut' }
  )
  .add(function() {
    swapViews();
    if (!isOpen) {
      animateMenuText(true);
    } else {
      animateMenuText(false);
    }
  })
  .to({}, { duration: HOLD })
  .to(sweepWall, {
    xPercent: 100,
    duration: SWEEP_OUT,
    ease: 'power2.inOut'
  });
}

export function leavePage(url, newTab) {
  if (isAnimating) return;
  if (!url || url.indexOf('mailto:') === 0 || url.indexOf('tel:') === 0) {
    if (url) window.location.href = url;
    return;
  }

  const sweepWall = document.getElementById('sweepWall');
  const hasGsap = typeof window.gsap !== 'undefined';
  const is2DFallback = Boolean(window.is2DFallbackActive || (document.body && document.body.classList.contains('seatmap-2d-mode')));

  if (newTab) {
    window.open(url, '_blank', 'noopener');
    return;
  }

  if (!hasGsap || !sweepWall || is2DFallback) {
    window.location.href = url;
    return;
  }

  isAnimating = true;
  try {
    window.sessionStorage.setItem('wallEnter', '1');
  } catch (e) {}

  window.gsap.timeline({
    onComplete: function() {
      window.location.href = url;
    }
  })
  .set(sweepWall, { xPercent: -100 })
  .to(sweepWall, { xPercent: 0, duration: SWEEP_IN, ease: 'power2.inOut' });
}

function handleNavClick(e) {
  if (isModifiedClick(e)) return;
  const link = e.currentTarget;
  const href = link.getAttribute('href');
  if (!href) return;
  if (href.indexOf('mailto:') === 0 || href.indexOf('tel:') === 0) return;

  const parts = splitNav(href);
  const isExternal = href.indexOf('://') >= 0;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!isExternal && (parts.page === '' || parts.page === currentPage())) {
    if (!parts.hash) {
      e.preventDefault();
      if (isOpen) toggleMenu();
      else window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
      return;
    }

    e.preventDefault();
    if (isAnimating) return;

    if (isOpen) {
      pendingHash = parts.hash;
      toggleMenu();
    } else {
      if (parts.hash === '#booking' && typeof window.slowScrollToBooking === 'function') {
        window.slowScrollToBooking();
      } else {
        const target = document.querySelector(parts.hash);
        if (target) target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
      }
    }
    return;
  }

  e.preventDefault();
  if (e.stopImmediatePropagation) e.stopImmediatePropagation();
  const isBlank = link.getAttribute('target') === '_blank';
  leavePage(href, isBlank);
}

export function initSweepWall() {
  const sweepWall = document.getElementById('sweepWall');
  const burgerToggle = document.getElementById('burgerToggle');
  const menuClose = document.getElementById('menuClose');
  const brandLink = document.getElementById('brandLink');
  const hasGsap = typeof window.gsap !== 'undefined';
  const is2DFallback = Boolean(window.is2DFallbackActive || (document.body && document.body.classList.contains('seatmap-2d-mode')));

  // Guard: If 2D fallback is active or GSAP is missing, hide sweepWall so it never blocks the viewport
  if (is2DFallback || !hasGsap) {
    if (sweepWall) sweepWall.style.display = 'none';
  } else if (sweepWall) {
    window.gsap.set(sweepWall, { xPercent: -100 });
  }

  // Arrival transition if navigated via leavePage
  try {
    if (window.sessionStorage.getItem('wallEnter') === '1') {
      window.sessionStorage.removeItem('wallEnter');
      if (hasGsap && sweepWall && !is2DFallback) {
        isAnimating = true;
        window.gsap.set(sweepWall, { xPercent: 0 });
        window.gsap.timeline({
          onComplete: function() {
            window.gsap.set(sweepWall, { xPercent: -100 });
            isAnimating = false;
            if (window.location.hash) {
              const target = document.querySelector(window.location.hash);
              if (target) target.scrollIntoView({ behavior: 'smooth' });
            }
          }
        })
        .to({}, { duration: 0.1 })
        .to(sweepWall, {
          xPercent: 100,
          duration: SWEEP_OUT,
          ease: 'power2.inOut'
        });
      }
    }
  } catch (e) {}

  // Event Listeners
  if (burgerToggle) {
    burgerToggle.removeEventListener('click', toggleMenu);
    burgerToggle.addEventListener('click', toggleMenu);
  }

  if (menuClose) {
    menuClose.removeEventListener('click', toggleMenu);
    menuClose.addEventListener('click', toggleMenu);
  }

  if (brandLink) {
    brandLink.addEventListener('click', function(e) {
      if (isModifiedClick(e)) return;
      const href = this.getAttribute('href');
      if (href) {
        e.preventDefault();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        leavePage(href, false);
      }
    });
  }

  document.querySelectorAll('[data-nav], [data-leave]').forEach(function(link) {
    link.removeEventListener('click', handleNavClick);
    link.addEventListener('click', handleNavClick);
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && isOpen && !isAnimating) {
      toggleMenu();
    }
  });

  window.addEventListener('pageshow', function(e) {
    if (!e.persisted) return;
    isAnimating = false;
    if (sweepWall && hasGsap) {
      window.gsap.set(sweepWall, { xPercent: -100 });
    }
  });
}

// Global window bindings for backward compatibility
if (typeof window !== 'undefined') {
  window.initSweepWall = initSweepWall;
  window.toggleMenu = toggleMenu;
  window.leavePage = leavePage;
  window.setBurger = setBurger;
}

// Auto-run when DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSweepWall);
  } else {
    initSweepWall();
  }
}
