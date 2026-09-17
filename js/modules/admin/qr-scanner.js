/**
 * js/modules/admin/qr-scanner.js
 * Door ticket check-in: camera QR scanner, ticket token verification, and manual USN/Ref lookup.
 */

import { getAuthHeaders } from './auth.js';

let html5QrScanner = null;

export function startQrScanner() {
  stopQrScanner();

  if (typeof window.Html5QrcodeScanner === 'undefined') {
    console.warn('Html5QrcodeScanner is not loaded yet');
    return;
  }

  const readerEl = document.getElementById('reader');
  if (!readerEl) return;

  try {
    html5QrScanner = new window.Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
      /* verbose= */ false
    );
    html5QrScanner.render(onScanSuccess, onScanError);
  } catch (err) {
    console.error('Failed to initialize QR scanner:', err);
  }
}

export function stopQrScanner() {
  if (html5QrScanner) {
    try {
      html5QrScanner.clear();
    } catch (e) {}
    html5QrScanner = null;
  }
}

export function restartScanner() {
  startQrScanner();
}

function onScanSuccess(decodedText) {
  if (decodedText) {
    verifyAndCheckIn({ qrToken: decodedText });
  }
}

function onScanError(errorMessage) {
  // Ignored continuous frame parse events
}

export async function verifyAndCheckIn(payload) {
  const banner = document.getElementById('scanStatusBanner');
  const details = document.getElementById('scanDetailsGrid');
  const actionBox = document.getElementById('scanActionBox');

  if (banner) {
    banner.className = 'result-banner';
    banner.textContent = 'Verifying cryptographic credentials...';
  }
  if (details) details.style.display = 'none';
  if (actionBox) actionBox.style.display = 'none';

  try {
    const res = await fetch('/api/bookings/verify', {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (banner) {
      if (res.status === 200 && data.valid) {
        banner.className = 'result-banner success';
        banner.innerHTML = data.message || 'Check-in Verified';
        populateDetails(data.booking);
      } else if (res.status === 409 && data.duplicate) {
        banner.className = 'result-banner duplicate';
        banner.innerHTML = data.message || 'Already Checked In';
        populateDetails(data.booking);
      } else {
        banner.className = 'result-banner error';
        banner.innerHTML = '[ERROR] ' + (data.message || data.error || 'Verification Failed');
      }
    }

    if (actionBox) actionBox.style.display = 'block';
    return data;
  } catch (err) {
    if (banner) {
      banner.className = 'result-banner error';
      banner.innerHTML = '[ERROR] Network Error: ' + err.message;
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

  if (setName) setName.textContent = b.userName || b.user_name || '-';
  if (setUsn) setUsn.textContent = b.userUsn || b.user_usn || '-';
  if (setFilm) setFilm.textContent = b.filmTitle || b.film_title || '-';
  if (setSeats) {
    const seats = b.seats;
    setSeats.textContent = Array.isArray(seats) ? seats.join(', ') : (seats || '-');
  }
  if (setShow) {
    const d = b.showDate || b.show_date;
    const t = b.showTime || b.show_time || '';
    setShow.textContent = (d ? new Date(d).toLocaleDateString() : '') + (t ? ` @ ${t}` : '');
  }
  if (setHall) setHall.textContent = b.hall || '-';
  if (setRef) setRef.textContent = b.refCode || b.ref_code || '-';
  if (setTime) {
    const checkedAt = b.checkedInAt || b.checked_in_at;
    setTime.textContent = checkedAt ? new Date(checkedAt).toLocaleTimeString() : 'Just now';
  }
}

export function resetScanView() {
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

export function handleManualLookupSubmit(e) {
  if (e) e.preventDefault();
  const manualInput = document.getElementById('manualInput');
  if (!manualInput) return;

  const val = manualInput.value.trim();
  if (!val) return;

  if (val.startsWith('DD-') || val.startsWith('dd-')) {
    verifyAndCheckIn({ refCode: val });
  } else {
    verifyAndCheckIn({ usn: val });
  }
}
