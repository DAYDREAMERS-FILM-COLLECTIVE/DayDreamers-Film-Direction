/**
 * js/modules/screening/secret-story.js
 * Archival Nitrate Camera Lens Toggle (PC Only).
 * Direct WebGL Inversion Lens controller without dossier, clue HUD, or badges.
 */

class SecretStoryEngine {
  constructor() {
    this.isActive = false;
    this.cameraBtn = null;
    this.onToggleCallbacks = [];
  }

  isPCDevice() {
    if (typeof window === 'undefined') return false;
    const isWidescreen = window.innerWidth > 1024;
    const isTouchOnly = ('ontouchstart' in window) && !window.matchMedia('(hover: hover)').matches;
    return isWidescreen && !isTouchOnly;
  }

  init() {
    this.cameraBtns = document.querySelectorAll('#menuCameraBtn, #archivalCameraBtn, .menu-camera-icon-btn');

    if (!this.isPCDevice()) {
      // Mobile / Tablet: Ensure camera button is hidden and never activated
      this.cameraBtns.forEach(btn => { btn.style.display = 'none'; });
      return;
    }

    this.cameraBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleNitrateMode();
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isActive) {
        this.setNitrateMode(false);
      }
    });

    window.addEventListener('resize', () => {
      if (!this.isPCDevice() && this.isActive) {
        this.setNitrateMode(false);
      }
    });
  }

  onToggle(fn) {
    if (typeof fn === 'function') this.onToggleCallbacks.push(fn);
  }

  toggleNitrateMode() {
    if (!this.isPCDevice()) return;
    this.setNitrateMode(!this.isActive);
  }

  setNitrateMode(active) {
    if (!this.isPCDevice() && active) return;
    if (this.isActive === active) return;
    this.isActive = active;

    document.body.classList.toggle('nitrate-mode-active', this.isActive);

    if (this.cameraBtns) {
      this.cameraBtns.forEach(btn => {
        btn.setAttribute('aria-pressed', String(this.isActive));
        btn.classList.toggle('is-active', this.isActive);
      });
    }

    this.onToggleCallbacks.forEach(fn => {
      try { fn(this.isActive); } catch (_) {}
    });
  }

  checkProximity() {
    // Clue proximity removed per user visual direction
  }
}

export const secretStory = new SecretStoryEngine();
export const STORY_FRAGMENTS = [];

