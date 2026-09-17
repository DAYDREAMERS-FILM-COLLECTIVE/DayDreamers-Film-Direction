/**
 * js/modules/home/main.js
 * Central Home Page Orchestrator & Lifecycle Manager.
 */

let animObserver = null;
let scrollBound = false;

function handleHeaderScroll() {
  const header = document.querySelector('.site-header');
  if (header) {
    header.classList.toggle('scrolled', window.scrollY > 40);
  }
}

export function observeReveals() {
  if (animObserver) {
    try {
      animObserver.disconnect();
    } catch (_) {}
    animObserver = null;
  }

  if (!window.IntersectionObserver) return;

  animObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          animObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  document
    .querySelectorAll('.anim-fade, .anim-scale, .anim-img')
    .forEach((el) => {
      animObserver.observe(el);
    });
}

export function bindDialog() {
  const dialog = document.querySelector('#film-dialog');
  if (!dialog) return;

  const closeDialog = dialog.querySelector('.close-dialog');
  document.querySelectorAll('.film-card').forEach((card) => {
    card.addEventListener('click', () => {
      const h2 = dialog.querySelector('h2');
      const meta = dialog.querySelector('.dialog-meta');
      const info = dialog.querySelector('.dialog-info');
      if (h2) h2.textContent = card.dataset.title || '';
      if (meta) meta.textContent = card.dataset.meta || '';
      if (info) info.textContent = card.dataset.info || '';
      if (typeof dialog.showModal === 'function') {
        dialog.showModal();
      }
    });
  });

  if (closeDialog) {
    closeDialog.addEventListener('click', () => dialog.close());
  }

  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
}

export function bindJoinForm() {
  const form = document.querySelector('#join-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = new FormData(e.currentTarget).get('name') || '';
    const status = e.currentTarget.querySelector('.form-status');
    if (status) {
      status.textContent = "Cut! Thanks, " + name + ". We'll be in touch.";
    }
    e.currentTarget.reset();
  });
}

export function initHome() {
  document.documentElement.classList.add('motion-ready');

  if (!scrollBound) {
    window.addEventListener('scroll', handleHeaderScroll, { passive: true });
    scrollBound = true;
  }
  handleHeaderScroll();

  observeReveals();
  bindDialog();
  bindJoinForm();
}

export function destroyHome() {
  if (animObserver) {
    try {
      animObserver.disconnect();
    } catch (_) {}
    animObserver = null;
  }
  const dialog = document.querySelector('#film-dialog');
  if (dialog && dialog.open) {
    try { dialog.close(); } catch (_) {}
  }
}

if (typeof window !== 'undefined') {
  window.initHome = initHome;
  window.destroyHome = destroyHome;
}
