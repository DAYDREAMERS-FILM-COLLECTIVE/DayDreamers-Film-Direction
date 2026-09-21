/**
 * js/modules/screening/booking-modal.js
 * 4-Step Cinematic Booking Experience:
 * Step 1: Show & Seat Confirmation
 * Step 2: Attendee Details (1 Shared Email + Collapsible Additional Info)
 * Step 3: Identity Verification (OTP placeholder 0000)
 * Step 4: Official Admission Pass & Ticket Renderer
 */

import { getState, getActiveShowing, clearPickedSeats } from './state.js';
import { submitBooking } from './api.js';
import { rebuildSeatsAnimated } from './seatmap.js';

const RVU_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@(blr\.)?rvu\.edu\.in$/i;

let currentStep = 1;
let isSubmitting = false;

// In-memory cache to preserve attendee information across steps and seat adjustments
let cachedAttendees = [];
let cachedDeliveryEmail = '';
let cachedExtraInfo = { batch: '', year: '', dept: '' };

function getModal() {
  return document.getElementById('attendeeModal') || document.getElementById('modal');
}

export function setStep(step) {
  currentStep = step;

  // Update Stepper indicators
  const indicators = document.querySelectorAll('#modalStepper .step-indicator');
  indicators.forEach(ind => {
    const s = parseInt(ind.getAttribute('data-step'), 10);
    ind.classList.remove('active', 'completed');
    if (s === currentStep) {
      ind.classList.add('active');
    } else if (s < currentStep) {
      ind.classList.add('completed');
    }
  });

  // Step panels
  const step1 = document.getElementById('stepConfirmation');
  const step2 = document.getElementById('stepDetails');
  const step3 = document.getElementById('stepVerification');
  const step4 = document.getElementById('stepTicket');

  if (step1) step1.style.display = currentStep === 1 ? 'block' : 'none';
  if (step2) step2.style.display = currentStep === 2 ? 'block' : 'none';
  if (step3) step3.style.display = currentStep === 3 ? 'block' : 'none';
  if (step4) step4.style.display = currentStep === 4 ? 'block' : 'none';

  // Clear transient error messages
  const err2 = document.getElementById('step2Error');
  const err3 = document.getElementById('step3Error');
  if (err2) { err2.style.display = 'none'; err2.textContent = ''; }
  if (err3) { err3.style.display = 'none'; err3.textContent = ''; }
}

export function openBookingModal() {
  const state = getState();
  const active = getActiveShowing();
  const modal = getModal();

  if (!state.selectedMovie || !state.pickedSeats.length || !active || !modal) {
    return;
  }

  const sortedSeats = [...state.pickedSeats].sort();

  // Populate Step 1: Show & Seat Confirmation
  const posterImg = document.getElementById('confPosterImg');
  if (posterImg) {
    posterImg.src = state.selectedMovie.poster_url || '/assets/poster-the-last-reel.webp';
    posterImg.alt = state.selectedMovie.rawTitle || state.selectedMovie.title;
  }

  const movieTitle = document.getElementById('confMovieTitle');
  if (movieTitle) {
    movieTitle.textContent = state.selectedMovie.rawTitle || state.selectedMovie.title;
  }

  const confDate = document.getElementById('confDate');
  if (confDate) {
    confDate.textContent = active.fullDateStr || `${active.weekday || 'Fri'}, ${active.dayNum || '18'} ${active.monthStr || 'Sep'}`;
  }

  const confTime = document.getElementById('confTime');
  if (confTime) {
    confTime.textContent = active.time12h || active.time || '7:30 PM';
  }

  const confHall = document.getElementById('confHall');
  if (confHall) {
    confHall.textContent = active.hall || 'D Block 4th Floor Auditorium';
  }

  const seatsBadge = document.getElementById('confSeatsBadge');
  if (seatsBadge) {
    seatsBadge.textContent = sortedSeats.length === 1
      ? `Seat ${sortedSeats[0]}`
      : sortedSeats.join(' · ');
  }

  // Populate Step 2: Attendee Details
  const detailsSub = document.getElementById('detailsStepSubtitle');
  if (detailsSub) {
    detailsSub.textContent = sortedSeats.length > 1
      ? `Group Reservation (${sortedSeats.length} Seats) • 1 Shared Ticket Delivery Email`
      : 'Individual Reservation (1 Seat)';
  }

  const container = document.getElementById('attendeesListContainer');
  if (container) {
    container.innerHTML = '';
    sortedSeats.forEach((seat, idx) => {
      const prev = cachedAttendees[idx] || {};
      const card = document.createElement('div');
      card.className = 'attendee-card';
      card.innerHTML = `
        <div class="attendee-head">
          <span class="attendee-title">${sortedSeats.length > 1 ? `Attendee #${idx + 1}` : 'Attendee Information'}</span>
          <span class="attendee-seat-badge">Seat ${seat}</span>
        </div>
        <div class="attendee-row">
          <div class="f-group">
            <label for="attName_${idx}">Full Name *</label>
            <input type="text" id="attName_${idx}" class="att-name-input" required placeholder="e.g. Student Name" value="${prev.name || ''}" />
          </div>
          <div class="f-group">
            <label for="attUsn_${idx}">University Serial Number (USN) *</label>
            <input type="text" id="attUsn_${idx}" class="att-usn-input" required placeholder="e.g. 1RVU24CSE045" style="text-transform: uppercase;" value="${prev.usn || ''}" />
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  }

  // Restore Delivery Email
  const emailInput = document.getElementById('primaryDeliveryEmail');
  if (emailInput && cachedDeliveryEmail) {
    emailInput.value = cachedDeliveryEmail;
  }

  // Restore Extra Info
  const batchInput = document.getElementById('extraBatch');
  if (batchInput && cachedExtraInfo.batch) batchInput.value = cachedExtraInfo.batch;
  const yearInput = document.getElementById('extraYear');
  if (yearInput && cachedExtraInfo.year) yearInput.value = cachedExtraInfo.year;
  const deptInput = document.getElementById('extraDept');
  if (deptInput && cachedExtraInfo.dept) deptInput.value = cachedExtraInfo.dept;

  // Launch modal on Step 1
  setStep(1);
  modal.classList.add('open');
  document.body.classList.add('modal-open');
}

export function resetBookingForm() {
  const p = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const testStep = p ? parseInt(p.get('test_step') || '0', 10) : 0;
  if (testStep >= 1 && testStep <= 4) {
    setStep(testStep);
  } else {
    setStep(1);
  }
  const otpInput = document.getElementById('otpCodeInput');
  if (otpInput && !testStep) otpInput.value = '';
  const otpMsg = document.getElementById('otpStatusMsg');
  if (otpMsg && !testStep) { otpMsg.style.display = 'none'; otpMsg.innerHTML = ''; }
}

export function closeBookingModal() {
  if (isSubmitting) return;
  const modal = getModal();
  if (modal) modal.classList.remove('open');
  document.body.classList.remove('modal-open');
  resetBookingForm();
}

function saveFormState() {
  const state = getState();
  const sortedSeats = [...state.pickedSeats].sort();
  const list = [];

  sortedSeats.forEach((seat, idx) => {
    const nameEl = document.getElementById(`attName_${idx}`);
    const usnEl = document.getElementById(`attUsn_${idx}`);
    list.push({
      seat: seat,
      name: nameEl ? nameEl.value.trim() : '',
      usn: usnEl ? usnEl.value.trim().toUpperCase() : ''
    });
  });

  cachedAttendees = list;

  const emailEl = document.getElementById('primaryDeliveryEmail');
  if (emailEl) cachedDeliveryEmail = emailEl.value.trim().toLowerCase();

  const batchEl = document.getElementById('extraBatch');
  const yearEl = document.getElementById('extraYear');
  const deptEl = document.getElementById('extraDept');
  cachedExtraInfo = {
    batch: batchEl ? batchEl.value.trim() : '',
    year: yearEl ? yearEl.value.trim() : '',
    dept: deptEl ? deptEl.value.trim() : ''
  };
}

export function renderTicketSuccess(bookings) {
  const list = document.getElementById('passesList');
  if (!list) return;

  list.innerHTML = '';
  const titleEl = document.getElementById('step4Title');
  if (titleEl) {
    titleEl.textContent = bookings.length > 1
      ? `Reservation Confirmed (${bookings.length} Passes)`
      : 'Reservation Confirmed';
  }

  bookings.forEach(b => {
    const code = b.passCode || b.refCode || '';
    const seatLabel = b.seat || (Array.isArray(b.seats) ? b.seats.join(', ') : (b.seats || ''));
    const passCard = document.createElement('div');
    passCard.className = 'single-pass-card';
    passCard.innerHTML = `
      <div class="pass-card-top">
        <div class="pass-brand">DAYDREAMERS &bull; ADMIT ONE</div>
        <div class="pass-ref-code">${code}</div>
      </div>
      <div class="pass-card-body">
        <div class="pass-row">
          <span class="pass-label">Film</span>
          <strong class="pass-val">${b.filmTitle || ''}</strong>
        </div>
        <div class="pass-row">
          <span class="pass-label">Attendee</span>
          <strong class="pass-val">${b.userName || ''}</strong>
        </div>
        <div class="pass-row">
          <span class="pass-label">USN</span>
          <strong class="pass-val usn-val">${b.userUsn || ''}</strong>
        </div>
        <div class="pass-row">
          <span class="pass-label">Screening</span>
          <strong class="pass-val">${b.showDate || ''} | ${b.showTime || ''}</strong>
        </div>
        <div class="pass-row">
          <span class="pass-label">Auditorium</span>
          <strong class="pass-val">${b.hall || ''}</strong>
        </div>
        <div class="pass-row">
          <span class="pass-label">Seat</span>
          <strong class="pass-val seat-highlight">Seat ${seatLabel}</strong>
        </div>
      </div>
      <div class="pass-qr-wrap">
        <img src="${b.qrDataUri}" alt="QR Ticket ${code}" width="140" height="140" class="pass-qr-img" />
        <span class="pass-qr-hint">Door Check-in Pass</span>
      </div>
      <div class="pass-download-wrap">
        <a href="${b.qrDataUri}" download="daydreamers-ticket-${code}.png" class="btn-step-outline pass-download-btn">Download Pass [${code}]</a>
      </div>
    `;
    list.appendChild(passCard);
  });

  const modal = getModal();
  if (modal) {
    modal.classList.add('open');
    document.body.classList.add('modal-open');
  }
}

// Global Event Listeners for 4-Step Navigation
if (typeof document !== 'undefined') {
  document.addEventListener('click', (e) => {
    // 1. Reserve Seats CTA -> Scroll smoothly to seat map
    const reserveBtn = e.target.closest('[data-action="reserve-seats"], .reserve-seats-btn, #heroReserveBtn, a[href="#booking"]');
    if (reserveBtn) {
      e.preventDefault();
      e.stopPropagation();
      if (typeof window.slowScrollToBooking === 'function') {
        window.slowScrollToBooking();
      } else {
        const bookingEl = document.getElementById('booking');
        if (bookingEl) bookingEl.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }

    // 2. Open Modal from Seat Map Confirm Button
    const confirmBtn = e.target.closest('#confirmBtn');
    if (confirmBtn) {
      e.preventDefault();
      openBookingModal();
      return;
    }

    // 3. Step 1 -> Step 2
    if (e.target.closest('#btnGoToStep2')) {
      e.preventDefault();
      setStep(2);
      return;
    }

    // 4. Step 1 -> Change Seats (Close modal and scroll to seatmap)
    if (e.target.closest('#btnChangeSeats')) {
      e.preventDefault();
      saveFormState();
      closeBookingModal();
      const bookingEl = document.getElementById('booking');
      if (bookingEl) bookingEl.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    // 5. Step 2 -> Back to Step 1
    if (e.target.closest('#btnBackToStep1')) {
      e.preventDefault();
      saveFormState();
      setStep(1);
      return;
    }

    // 6. Step 3 -> Back to Step 2
    if (e.target.closest('#btnBackToStep2')) {
      e.preventDefault();
      setStep(2);
      return;
    }

    // 7. Step 3 -> Confirm & Issue Ticket Pass
    if (e.target.closest('#btnConfirmAndBook')) {
      e.preventDefault();
      handleFinalBookingSubmit();
      return;
    }

    // 8. Close Modal buttons & Done button
    const closeBtn = e.target.closest('#modalClose, .modal-close, [data-action="close-modal"], #donePassBtn');
    if (closeBtn) {
      e.preventDefault();
      closeBookingModal();
      return;
    }

    // 9. Backdrop click
    const modal = getModal();
    if (modal && e.target === modal) {
      if (isSubmitting) return;
      if (currentStep === 4) return; // Keep pass open
      closeBookingModal();
    }
  });

  // Step 2 Form Submission -> Validates & advances to Step 3 (Verification)
  document.addEventListener('submit', (e) => {
    if (e.target && e.target.id === 'stepDetailsForm') {
      e.preventDefault();
      handleStep2Submit();
    }
  });

  // Step 3: Real-time OTP Input Check
  document.addEventListener('input', (e) => {
    if (e.target && e.target.id === 'otpCodeInput') {
      const val = e.target.value.trim();
      const msg = document.getElementById('otpStatusMsg');
      if (!msg) return;

      if (val === '0000') {
        msg.style.display = 'block';
        msg.innerHTML = '<span class="otp-success">Identity Verified &#10003;</span>';
      } else if (val.length === 4) {
        msg.style.display = 'block';
        msg.innerHTML = '<span class="otp-err">Invalid code. Enter 0000 for verification.</span>';
      } else {
        msg.style.display = 'none';
        msg.innerHTML = '';
      }
    }
  });

  // Escape Key Handler
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = getModal();
      if (modal && modal.classList.contains('open')) {
        if (currentStep === 4) return;
        closeBookingModal();
      }
    }
  });
}

function handleStep2Submit() {
  saveFormState();
  const state = getState();
  const sortedSeats = [...state.pickedSeats].sort();
  const errBox = document.getElementById('step2Error');

  if (errBox) {
    errBox.style.display = 'none';
    errBox.textContent = '';
  }

  // Validate Attendees
  const seenUsns = new Set();
  for (let i = 0; i < sortedSeats.length; i++) {
    const attendee = cachedAttendees[i];
    if (!attendee || !attendee.name || !attendee.usn) {
      if (errBox) {
        errBox.textContent = `Please enter Full Name and USN for Attendee #${i + 1} (Seat ${sortedSeats[i]}).`;
        errBox.style.display = 'block';
      }
      return;
    }

    if (seenUsns.has(attendee.usn)) {
      if (errBox) {
        errBox.textContent = `Duplicate USN "${attendee.usn}" detected. Each attendee must have a unique student USN.`;
        errBox.style.display = 'block';
      }
      return;
    }
    seenUsns.add(attendee.usn);
  }

  // Validate Primary Delivery Email
  if (!cachedDeliveryEmail || !RVU_EMAIL_REGEX.test(cachedDeliveryEmail)) {
    if (errBox) {
      errBox.textContent = 'Please enter a valid RVU email address (@rvu.edu.in or @blr.rvu.edu.in) for ticket delivery.';
      errBox.style.display = 'block';
    }
    return;
  }

  // Update Step 3 Display Email
  const destEmailEl = document.getElementById('otpDestEmail');
  if (destEmailEl) {
    destEmailEl.textContent = cachedDeliveryEmail;
  }

  // Advance to Step 3
  setStep(3);
}

async function handleFinalBookingSubmit() {
  if (isSubmitting) return;

  const otpInput = document.getElementById('otpCodeInput');
  const otpCode = otpInput ? otpInput.value.trim() : '';
  const errBox = document.getElementById('step3Error');
  const btnBook = document.getElementById('btnConfirmAndBook');

  if (errBox) {
    errBox.style.display = 'none';
    errBox.textContent = '';
  }

  // Placeholder OTP check
  if (otpCode !== '0000') {
    if (errBox) {
      errBox.textContent = 'Please enter verification code 0000 to complete identity verification.';
      errBox.style.display = 'block';
    }
    if (otpInput) otpInput.focus();
    return;
  }

  const state = getState();
  const active = getActiveShowing();
  if (!active || !active.id) {
    if (errBox) {
      errBox.textContent = 'Showing session details could not be resolved. Please reload.';
      errBox.style.display = 'block';
    }
    return;
  }

  isSubmitting = true;
  if (btnBook) {
    btnBook.disabled = true;
    btnBook.textContent = 'Issuing Official Pass...';
  }

  try {
    const attendeesPayload = cachedAttendees.map(a => ({
      name: a.name,
      usn: a.usn,
      email: cachedDeliveryEmail,
      seat: a.seat
    }));

    const payload = {
      showingId: active.id,
      bookingMode: state.bookingMode || (attendeesPayload.length > 1 ? 'group' : 'individual'),
      primaryEmail: cachedDeliveryEmail,
      attendees: attendeesPayload,
      additionalInfo: cachedExtraInfo
    };

    const result = await submitBooking(payload);

    if (!result.ok) {
      const msg = result.data?.error || result.data?.message || 'Server was unable to complete your reservation.';
      if (errBox) {
        errBox.textContent = msg;
        errBox.style.display = 'block';
      }
      return;
    }

    const bookings = result.data.bookings || (result.data.booking ? [result.data.booking] : []);

    // Render confirmed passes
    renderTicketSuccess(bookings);

    // Clear picked seats & update map
    clearPickedSeats();
    rebuildSeatsAnimated();

    // Move to Step 4
    setStep(4);

  } catch (err) {
    console.error('Final booking error:', err);
    if (errBox) {
      errBox.textContent = err.message || 'Network connection failed. Please retry.';
      errBox.style.display = 'block';
    }
  } finally {
    isSubmitting = false;
    if (btnBook) {
      btnBook.disabled = false;
      btnBook.textContent = 'Confirm & Issue Ticket Pass';
    }
  }
}

export function initBookingModal() {
  resetBookingForm();
}
