/**
 * js/modules/admin/qr-scanner.js
 * High-performance door ticket check-in engine.
 * Direct Html5Qrcode camera integration with anti-multi-fire lock,
 * dynamic responsive viewfinder, flip camera, and image file scanning.
 */

import { getAuthHeaders } from './auth.js';

let html5QrCode = null;
let availableCameras = [];
let activeCameraIndex = 0;
let isScanning = false;
let isStarting = false;
let isScanLocked = false;
let unlockTimer = null;

/**
 * Web Audio API synthesized audible feedback for scan results.
 */
function playAudioChirp(type = 'success') {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'success') {
      // High pleasant two-tone chime (A5 -> D6)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1174.66, now + 0.08);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.22);
    } else if (type === 'duplicate') {
      // Mid-pitch warning double pulse
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(370, now + 0.12);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else {
      // Low buzz error
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    }
  } catch (e) {
    // Audio contexts may be blocked by browser gesture policies; ignore silently
  }
}

/**
 * Visual flash indicator on the camera viewport
 */
function flashReaderBorder(type = 'success') {
  const readerEl = document.getElementById('reader');
  if (!readerEl) return;
  readerEl.classList.remove('scan-success-flash', 'scan-warning-flash', 'scan-error-flash');

  const className = type === 'success' ? 'scan-success-flash' : (type === 'duplicate' ? 'scan-warning-flash' : 'scan-error-flash');
  readerEl.classList.add(className);

  setTimeout(() => {
    if (readerEl) {
      readerEl.classList.remove(className);
    }
  }, 1200);
}

/**
 * Ensure Html5Qrcode instance exists
 */
function getOrCreateScanner() {
  if (!html5QrCode) {
    const readerEl = document.getElementById('reader');
    if (!readerEl) return null;
    html5QrCode = new window.Html5Qrcode("reader");
  }
  return html5QrCode;
}

/**
 * Start the direct camera scanner
 */
export async function startQrScanner(retryCount = 0) {
  if (isStarting) return;
  if (isScanning) return;

  if (typeof window.Html5Qrcode === 'undefined') {
    if (retryCount < 6) {
      setTimeout(() => startQrScanner(retryCount + 1), 250);
      return;
    }
    console.warn('Html5Qrcode library not loaded yet');
    const banner = document.getElementById('scanStatusBanner');
    if (banner) {
      banner.textContent = 'Scanner library loading failed. Please use manual lookup or upload image.';
    }
    return;
  }

  const readerEl = document.getElementById('reader');
  if (!readerEl) return;

  isStarting = true;

  try {
    // Stop any existing instance
    await stopQrScanner();

    const scanner = getOrCreateScanner();
    if (!scanner) {
      isStarting = false;
      return;
    }

    // Discover cameras
    try {
      const devices = await window.Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        availableCameras = devices;
        // Prioritize rear/environment camera on first launch
        if (activeCameraIndex === 0 && devices.length > 1) {
          const rearIdx = devices.findIndex(d => /back|rear|environment/i.test(d.label));
          if (rearIdx !== -1) {
            activeCameraIndex = rearIdx;
          }
        }
        const switchBtn = document.getElementById('btnSwitchCamera');
        if (switchBtn) {
          switchBtn.style.display = devices.length > 1 ? 'inline-flex' : 'none';
        }
      }
    } catch (e) {
      console.warn('Could not enumerate cameras, falling back to facingMode constraint:', e);
    }

    // Camera config
    const cameraConfig = (availableCameras.length > 0 && availableCameras[activeCameraIndex])
      ? { deviceId: { exact: availableCameras[activeCameraIndex].id } }
      : { facingMode: "environment" };

    const scanConfig = {
      fps: 15,
      qrbox: (viewfinderWidth, viewfinderHeight) => {
        const edge = Math.min(viewfinderWidth, viewfinderHeight);
        const size = Math.floor(edge * 0.72);
        return {
          width: Math.max(160, size),
          height: Math.max(160, size)
        };
      }
    };

    await scanner.start(
      cameraConfig,
      scanConfig,
      onScanSuccess,
      onScanError
    );

    isScanning = true;
    isStarting = false;
    isScanLocked = false;

    const banner = document.getElementById('scanStatusBanner');
    if (banner && banner.textContent.includes('failed')) {
      resetScanView();
    }
  } catch (err) {
    console.error('Failed to start camera scanner:', err);
    isStarting = false;
    isScanning = false;

    const banner = document.getElementById('scanStatusBanner');
    if (banner) {
      banner.className = 'result-banner error';
      if (String(err).includes('Permission') || String(err).includes('NotAllowedError')) {
        banner.innerHTML = '[CAMERA DENIED] Please allow camera access in browser permissions or use Manual Lookup.';
      } else {
        banner.innerHTML = `[CAMERA ERROR] ${err.message || 'Unable to access camera. Use Manual USN Lookup or Upload Image.'}`;
      }
    }
  }
}

/**
 * Stop scanner cleanly
 */
export async function stopQrScanner() {
  if (html5QrCode) {
    if (isScanning) {
      try {
        await html5QrCode.stop();
      } catch (e) {
        // Stop failed or already stopped
      }
    }
    try {
      await html5QrCode.clear();
    } catch (e) {}
    html5QrCode = null;
  }
  isScanning = false;
  isStarting = false;
}

/**
 * Restart scanner
 */
export async function restartScanner() {
  await stopQrScanner();
  await startQrScanner();
}

/**
 * Switch camera between available devices
 */
export async function switchCamera() {
  if (availableCameras.length < 2) return;
  activeCameraIndex = (activeCameraIndex + 1) % availableCameras.length;
  await restartScanner();
}

/**
 * Scan an uploaded image file for QR code
 */
export async function handleFileScan(file) {
  if (!file) return;

  const banner = document.getElementById('scanStatusBanner');
  if (banner) {
    banner.className = 'result-banner';
    banner.textContent = `Analyzing image ${file.name}...`;
  }

  try {
    // If currently scanning camera, stop temporarily
    await stopQrScanner();

    const scanner = getOrCreateScanner();
    if (!scanner) {
      throw new Error('Scanner instance unavailable');
    }

    const decodedText = await scanner.scanFile(file, true);
    if (decodedText) {
      onScanSuccess(decodedText);
    }
  } catch (err) {
    console.error('File scan failed:', err);
    if (banner) {
      banner.className = 'result-banner error';
      banner.innerHTML = `[SCAN ERROR] No QR code detected in "${file.name}". Try manual lookup.`;
    }
    const actionBox = document.getElementById('scanActionBox');
    if (actionBox) actionBox.style.display = 'block';
  }
}

/**
 * Sanitize and extract ticket pass code / reference from any QR text format
 */
export function sanitizeQrCode(rawText) {
  if (!rawText) return '';
  let str = String(rawText).trim();

  // 1. JSON payload
  if ((str.startsWith('{') && str.endsWith('}')) || (str.startsWith('[') && str.endsWith(']'))) {
    try {
      const parsed = JSON.parse(str);
      if (parsed && typeof parsed === 'object') {
        const item = Array.isArray(parsed) ? parsed[0] : parsed;
        const candidate = item.passCode || item.pass_code || item.bookingId || item.booking_id || item.code || item.refCode || item.ref_code || item.id || item.qrToken;
        if (candidate) {
          str = String(candidate).trim();
        }
      }
    } catch (e) {}
  }

  // 2. URL parameter extraction
  if (str.includes('http://') || str.includes('https://') || str.includes('?') || str.includes('/')) {
    try {
      const urlObj = (str.startsWith('http://') || str.startsWith('https://'))
        ? new URL(str)
        : new URL(str, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');

      const codeParam = urlObj.searchParams.get('code') ||
                        urlObj.searchParams.get('passCode') ||
                        urlObj.searchParams.get('pass_code') ||
                        urlObj.searchParams.get('refCode') ||
                        urlObj.searchParams.get('ref_code') ||
                        urlObj.searchParams.get('ticket') ||
                        urlObj.searchParams.get('token') ||
                        urlObj.searchParams.get('bookingId');
      if (codeParam) {
        return codeParam.trim();
      }

      // Check URL path segment (e.g. /ticket/DD-XXXX or /DD-XXXX)
      const segments = urlObj.pathname.split('/').filter(Boolean);
      if (segments.length > 0) {
        const lastSeg = segments[segments.length - 1];
        if (/^DD-[A-Z0-9-]+$/i.test(lastSeg)) {
          return lastSeg.trim();
        }
      }
    } catch (e) {}
  }

  // 3. Plain text: strip wrapping quotes and whitespace
  str = str.replace(/^["']+|["']+$/g, '').trim();
  return str;
}

/**
 * Handle successful QR decode with debounce lock & audio feedback
 */
function onScanSuccess(decodedText) {
  if (!decodedText || isScanLocked) return;

  const cleanedCode = sanitizeQrCode(decodedText);
  if (!cleanedCode) return;

  // Lock scanner to prevent duplicate firing on subsequent video frames
  isScanLocked = true;

  if (unlockTimer) {
    clearTimeout(unlockTimer);
  }

  // Trigger admission check
  verifyAndCheckIn({ passCode: cleanedCode });

  // Auto-resume after 4 seconds if admin doesn't press "Ready for Next Attendee"
  unlockTimer = setTimeout(() => {
    isScanLocked = false;
  }, 4000);
}

function onScanError(errorMessage) {
  // Ignored continuous frame parse events (normal behavior during scanning)
}

/**
 * Post verification request to /api/admin/check-in
 */
export async function verifyAndCheckIn(payload) {
  const banner = document.getElementById('scanStatusBanner');
  const details = document.getElementById('scanDetailsGrid');
  const actionBox = document.getElementById('scanActionBox');

  if (banner) {
    banner.className = 'result-banner';
    banner.textContent = 'Verifying admission credentials...';
  }
  if (details) details.style.display = 'none';
  if (actionBox) actionBox.style.display = 'none';

  let bodyPayload = payload;
  if (typeof payload === 'string') {
    bodyPayload = { passCode: sanitizeQrCode(payload) };
  } else if (payload && payload.passCode) {
    bodyPayload = { passCode: sanitizeQrCode(payload.passCode) };
  } else if (payload && payload.refCode) {
    bodyPayload = { passCode: sanitizeQrCode(payload.refCode) };
  } else if (payload && payload.qrToken) {
    bodyPayload = { passCode: sanitizeQrCode(payload.qrToken) };
  }

  try {
    const res = await fetch('/api/admin/check-in', {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(bodyPayload)
    });

    const data = await res.json();

    if (banner) {
      if (res.status === 200 && data.success) {
        banner.className = 'result-banner success';
        banner.innerHTML = data.message || `[ADMISSION CONFIRMED] Welcome ${data.attendee?.name || ''}!`;
        flashReaderBorder('success');
        playAudioChirp('success');
        populateDetails(data.booking || data.attendee);
      } else if (res.status === 200 && (data.alreadyCheckedIn || !data.success)) {
        banner.className = 'result-banner duplicate';
        banner.innerHTML = `[WARNING] ${data.message || 'Ticket already used'}`;
        flashReaderBorder('duplicate');
        playAudioChirp('duplicate');
        populateDetails(data.booking || data.attendee);
      } else if (res.status === 409 && data.duplicate) {
        banner.className = 'result-banner duplicate';
        banner.innerHTML = data.message || 'Already Checked In';
        flashReaderBorder('duplicate');
        playAudioChirp('duplicate');
        populateDetails(data.booking || data.attendee);
      } else {
        banner.className = 'result-banner error';
        banner.innerHTML = '[ERROR] ' + (data.message || data.error || 'Verification Failed');
        flashReaderBorder('error');
        playAudioChirp('error');
      }
    }

    if (actionBox) actionBox.style.display = 'block';
    return data;
  } catch (err) {
    if (banner) {
      banner.className = 'result-banner error';
      banner.innerHTML = '[ERROR] Network Error: ' + err.message;
      flashReaderBorder('error');
      playAudioChirp('error');
    }
    if (actionBox) actionBox.style.display = 'block';
    return { error: err.message };
  }
}

export function populateDetails(b) {
  if (!b) return;
  const details = document.getElementById('scanDetailsGrid');
  if (details) details.style.display = 'grid';

  const setName = document.getElementById('scName');
  const setUsn = document.getElementById('scUsn');
  const setFilm = document.getElementById('scFilm');
  const setSeats = document.getElementById('scSeats');
  const setShow = document.getElementById('scShow');
  const setHall = document.getElementById('scHall');
  const setRef = document.getElementById('scRef');
  const setTime = document.getElementById('scTime');

  if (setName) setName.textContent = b.name || b.userName || b.user_name || '-';
  if (setUsn) setUsn.textContent = b.usn || b.userUsn || b.user_usn || '-';
  if (setFilm) setFilm.textContent = b.movieTitle || b.filmTitle || b.film_title || '-';
  if (setSeats) {
    const seats = b.seat || b.seats;
    setSeats.textContent = Array.isArray(seats) ? seats.join(', ') : (seats || '-');
  }
  if (setShow) {
    const d = b.showDate || b.show_date;
    const t = b.showTime || b.show_time || '';
    setShow.textContent = (d ? new Date(d).toLocaleDateString() : '') + (t ? ` @ ${t}` : '');
  }
  if (setHall) setHall.textContent = b.hall || '-';
  if (setRef) setRef.textContent = b.passCode || b.pass_code || b.refCode || b.ref_code || '-';
  if (setTime) {
    const checkedAt = b.checkedInAt || b.checked_in_at;
    setTime.textContent = checkedAt ? new Date(checkedAt).toLocaleTimeString() : 'Just now';
  }
}

/**
 * Reset scanner view to ready state and unlock scanning
 */
export function resetScanView() {
  isScanLocked = false;
  if (unlockTimer) {
    clearTimeout(unlockTimer);
    unlockTimer = null;
  }

  const readerEl = document.getElementById('reader');
  if (readerEl) {
    readerEl.classList.remove('scan-success-flash', 'scan-warning-flash', 'scan-error-flash');
  }

  const banner = document.getElementById('scanStatusBanner');
  if (banner) {
    banner.className = 'result-banner';
    banner.style.background = 'rgba(255,255,255,0.05)';
    banner.style.color = 'var(--muted)';
    banner.textContent = 'Ready for scan. Point camera at ticket QR code or use manual lookup.';
  }

  const details = document.getElementById('scanDetailsGrid');
  if (details) details.style.display = 'none';

  const actionBox = document.getElementById('scanActionBox');
  if (actionBox) actionBox.style.display = 'none';

  const manualInput = document.getElementById('manualInput');
  if (manualInput) manualInput.value = '';
}

/**
 * Handle manual USN / ticket ref check-in form submission
 */
export function handleManualLookupSubmit(e) {
  if (e) e.preventDefault();
  const manualInput = document.getElementById('manualInput');
  if (!manualInput) return;

  const val = manualInput.value.trim();
  if (!val) return;

  const cleanedCode = sanitizeQrCode(val);
  verifyAndCheckIn({ passCode: cleanedCode });
}
