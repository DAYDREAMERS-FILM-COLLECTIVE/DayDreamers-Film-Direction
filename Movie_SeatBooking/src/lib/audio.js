/**
 * Procedural Cinema Audio Engine (Web Audio API)
 * Generates tactile sound effects purely in code:
 *  - Low, warm cinematic theater drone & projector hum
 *  - Mechanical 35mm shutter click on seat hover
 *  - Deep physical acoustic stamp sound on seat selection
 * Zero external audio assets required; guaranteed zero 404s.
 */

class CinemaAudioEngine {
  constructor() {
    this.ctx = null;
    this.droneGain = null;
    this.droneOsc1 = null;
    this.droneOsc2 = null;
    this.droneNoise = null;
    this.isMuted = true; // Default muted per web audio policy
    this.initialized = false;
  }

  init() {
    if (this.initialized || typeof window === 'undefined') return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      this.initialized = true;
    } catch (e) {
      console.warn('[AudioEngine] Web Audio not supported:', e);
    }
  }

  ensureContext() {
    if (!this.initialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.ensureContext();
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopDrone();
    } else {
      this.startDrone();
    }
    return !this.isMuted;
  }

  getMuted() {
    return this.isMuted;
  }

  /**
   * Low, immersive theater drone + 35mm projector carbon-arc hum
   */
  startDrone() {
    if (this.isMuted || !this.ctx) return;
    if (this.droneGain) return; // Already playing

    try {
      const now = this.ctx.currentTime;
      this.droneGain = this.ctx.createGain();
      this.droneGain.gain.setValueAtTime(0.001, now);
      this.droneGain.gain.exponentialRampToValueAtTime(0.09, now + 2.5);

      // Low 55Hz Cinema Drone (A1 fundamental)
      this.droneOsc1 = this.ctx.createOscillator();
      this.droneOsc1.type = 'sine';
      this.droneOsc1.frequency.setValueAtTime(55, now);

      // Warm Sub-harmonic (110Hz gentle octave)
      this.droneOsc2 = this.ctx.createOscillator();
      this.droneOsc2.type = 'triangle';
      this.droneOsc2.frequency.setValueAtTime(110, now);

      // Subtle projector hum filter
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(220, now);

      const oscGain = this.ctx.createGain();
      oscGain.gain.value = 0.6;

      this.droneOsc1.connect(filter);
      this.droneOsc2.connect(filter);
      filter.connect(this.droneGain);
      this.droneGain.connect(this.ctx.destination);

      this.droneOsc1.start(now);
      this.droneOsc2.start(now);
    } catch (e) {
      console.warn('[AudioEngine] startDrone error:', e);
    }
  }

  stopDrone() {
    if (!this.droneGain || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      this.droneGain.gain.setValueAtTime(this.droneGain.gain.value, now);
      this.droneGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
      setTimeout(() => {
        if (this.droneOsc1) {
          try { this.droneOsc1.stop(); this.droneOsc1.disconnect(); } catch (_) {}
          this.droneOsc1 = null;
        }
        if (this.droneOsc2) {
          try { this.droneOsc2.stop(); this.droneOsc2.disconnect(); } catch (_) {}
          this.droneOsc2 = null;
        }
        if (this.droneGain) {
          try { this.droneGain.disconnect(); } catch (_) {}
          this.droneGain = null;
        }
      }, 850);
    } catch (e) {
      console.warn('[AudioEngine] stopDrone error:', e);
    }
  }

  /**
   * Tactile 35mm mechanical camera shutter click on seat hover
   */
  playShutterClick() {
    if (this.isMuted || !this.ctx) return;
    this.ensureContext();

    try {
      const now = this.ctx.currentTime;
      // High-frequency mechanical burst
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1600, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.035);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  }

  /**
   * Deep physical "stamp" / latch sound on seat selection or ticket confirmation
   */
  playStampSound() {
    if (this.isMuted || !this.ctx) return;
    this.ensureContext();

    try {
      const now = this.ctx.currentTime;
      // Deep sub thump
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(38, now + 0.18);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.22);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  }
}

export const cinemaAudio = new CinemaAudioEngine();
