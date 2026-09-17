/**
 * js/modules/screening/booking-modal.js
 * Attendee Reservation Modal, RVU USN/Domain Validation, and Ticket Pass Renderer.
 */

import { getState, getActiveShowing, clearPickedSeats } from './state.js';
import { submitBooking } from './api.js';
import { rebuildSeatsAnimated } from './seatmap.js';

const RVU_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@(blr\.)?rvu\.edu\.in$/i;

export function openBookingModal() {
  const state = getState();
  const active = getActiveShowing();
  const modal = document.getElementById('modal');

  if (!state.selectedMovie || !state.pickedSeats.length || !active || !modal) {
    return;
  }

  const form = document.getElementById('attendeeForm');
  if (form) {
    form.setAttribute('data-showing-id', active.id);
  }

  const filmEl = document.getElementById('formFilm');
  if (filmEl) filmEl.textContent = state.selectedMovie.rawTitle || state.selectedMovie.title;

  const showEl = document.getElementById('formShowing');
  if (showEl) showEl.textContent = active.fullDateStr + ' | ' + active.time;

  const sortedSeats = [...state.pickedSeats].sort();
  const seatsEl = document.getElementById('formSeats');
  if (seatsEl) seatsEl.textContent = sortedSeats.join(', ');

  const subtitle = document.getElementById('modalFormSubtitle');
  if (subtitle) {
    subtitle.textContent = sortedSeats.length > 1
      ? `Group Reservation (${sortedSeats.length} Seats)`
      : 'Individual Reservation (1 Seat)';
  }

  // Populate attendee fields dynamically for all selected seats
  const container = document.getElementById('attendeesContainer');
  if (container) {
    container.innerHTML = '';
    sortedSeats.forEach((seat, i) => {
      const card = document.createElement('div');
      card.className = 'attendee-card';
      card.innerHTML = `
        <div class="attendee-head">
          <span class="attendee-title">${sortedSeats.length > 1 ? `Attendee #${i + 1} Details` : 'Attendee Information'}</span>
          <span class="attendee-seat-badge">Seat ${seat}</span>
        </div>
        <div class="f-group" style="margin-bottom: 12px;">
          <label for="bkName_${i}">Full Name *</label>
          <input type="text" id="bkName_${i}" class="bk-name-input" required placeholder="e.g. Student Name" />
        </div>
        <div class="f-group" style="margin-bottom: 12px;">
          <label for="bkUsn_${i}">University Serial Number (USN) *</label>
          <input type="text" id="bkUsn_${i}" class="bk-usn-input" required placeholder="e.g. 1RVU24CSE045" style="text-transform: uppercase;" />
        </div>
        <div class="f-group">
          <label for="bkEmail_${i}">RVU Email Address (@rvu.edu.in or @blr.rvu.edu.in) *</label>
          <input type="email" id="bkEmail_${i}" class="bk-email-input" required placeholder="student@rvu.edu.in" pattern=".+@(blr\\.)?rvu\\.edu\\.in$" title="Must end with @rvu.edu.in or @blr.rvu.edu.in" />
        </div>
      `;
      container.appendChild(card);
    });
  }

  const formStep = document.getElementById('bookingFormStep');
  const successStep = document.getElementById('ticketSuccessStep');
  const errBox = document.getElementById('bkError');

  if (formStep) formStep.style.display = 'block';
  if (successStep) successStep.style.display = 'none';
  if (errBox) errBox.style.display = 'none';

  modal.classList.add('open');
}

export function closeBookingModal() {
  const modal = document.getElementById('modal');
  if (modal) modal.classList.remove('open');
}

export function renderTicketSuccess(bookings) {
  const list = document.getElementById('passesList');
  if (!list) return;

  list.innerHTML = '';
  const titleEl = document.getElementById('successPassTitle');
  if (titleEl) {
    titleEl.textContent = bookings.length > 1
      ? `Official Admission Passes (${bookings.length} Confirmed)`
      : 'Official Admission Pass, Admit One';
  }

  bookings.forEach(b => {
    const passCard = document.createElement('div');
    passCard.className = 'single-pass-card';
    passCard.innerHTML = `
      <div class="t-mid" style="padding: 12px 14px; border-bottom: 1px dashed rgba(200,155,178,0.2);">
        <div class="r"><span>Film</span><b>${b.filmTitle || ''}</b></div>
        <div class="r"><span>Attendee</span><b style="color: #fff;">${b.userName || ''}</b></div>
        <div class="r"><span>USN</span><b style="font-family: monospace; color: var(--gold);">${b.userUsn || ''}</b></div>
        <div class="r"><span>Date &amp; Time</span><b>${b.showDate || ''} | ${b.showTime || ''}</b></div>
        <div class="r"><span>Venue</span><b>${b.hall || ''}</b></div>
        <div class="r"><span>Seat Reserved</span><b style="color: var(--gold); font-size: 15px;">Seat ${b.seat || (Array.isArray(b.seats) ? b.seats.join(', ') : (b.seats || ''))}</b></div>
        <div class="r"><span>Reference</span><b style="color: var(--gold); font-family: monospace;">${b.refCode || ''}</b></div>
      </div>
      <div style="text-align: center; margin: 16px 0 10px;">
        <img src="${b.qrDataUri}" alt="QR Ticket ${b.refCode}" width="150" height="150" style="background:#fff; padding:6px; display:inline-block; border-radius:4px;" />
      </div>
      <div style="text-align: center; margin-bottom: 6px;">
        <a href="${b.qrDataUri}" download="daydreamers-ticket-${b.refCode}.png" class="btn-line" style="display:inline-block; font-size:10px; padding:6px 14px; text-decoration:none; cursor:pointer;">Download Pass [${b.refCode}]</a>
      </div>
    `;
    list.appendChild(passCard);
  });

  const formStep = document.getElementById('bookingFormStep');
  const successStep = document.getElementById('ticketSuccessStep');
  if (formStep) formStep.style.display = 'none';
  if (successStep) successStep.style.display = 'block';
}

export async function handleBookingSubmit(e) {
  if (e) e.preventDefault();

  const state = getState();
  const active = getActiveShowing();
  const form = document.getElementById('attendeeForm');
  const showingId = (active && active.id) ? active.id : (form ? form.getAttribute('data-showing-id') : '');
  const submitBtn = document.getElementById('bkSubmitBtn');
  const errBox = document.getElementById('bkError');

  if (errBox) errBox.style.display = 'none';

  if (!showingId) {
    if (errBox) {
      errBox.textContent = 'Screening showing information could not be resolved. Please re-select your movie or showing time.';
      errBox.style.display = 'block';
    }
    return;
  }

  const sortedSeats = [...state.pickedSeats].sort();
  const attendees = [];
  const seenUsns = new Set();
  const seenEmails = new Set();

  for (let i = 0; i < sortedSeats.length; i++) {
    const nameInput = document.getElementById(`bkName_${i}`);
    const usnInput = document.getElementById(`bkUsn_${i}`);
    const emailInput = document.getElementById(`bkEmail_${i}`);

    const name = nameInput ? nameInput.value.trim() : '';
    const usn = usnInput ? usnInput.value.trim().toUpperCase() : '';
    const email = emailInput ? emailInput.value.trim().toLowerCase() : '';
    const seat = sortedSeats[i];

    if (!name || !usn || !email) {
      if (errBox) {
        errBox.textContent = `Please fill out all required fields for Attendee #${i + 1} (Seat ${seat}).`;
        errBox.style.display = 'block';
      }
      return;
    }

    if (!RVU_EMAIL_REGEX.test(email)) {
      if (errBox) {
        errBox.textContent = `Invalid email for Attendee #${i + 1} (${email}). Must be an official @rvu.edu.in or @blr.rvu.edu.in address.`;
        errBox.style.display = 'block';
      }
      return;
    }

    if (seenUsns.has(usn)) {
      if (errBox) {
        errBox.textContent = `Duplicate USN "${usn}" detected in your group! Every attendee must have a unique student USN.`;
        errBox.style.display = 'block';
      }
      return;
    }
    seenUsns.add(usn);

    if (seenEmails.has(email)) {
      if (errBox) {
        errBox.textContent = `Duplicate email "${email}" detected in your group! Each attendee must have a distinct email.`;
        errBox.style.display = 'block';
      }
      return;
    }
    seenEmails.add(email);

    attendees.push({ name, usn, email, seat });
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing reservation...';
  }

  const payload = {
    showingId,
    showing_id: showingId,
    bookingMode: state.bookingMode,
    attendees
  };

  const result = await submitBooking(payload);

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Confirm & Generate Ticket Pass';
  }

  if (!result.ok) {
    if (errBox) {
      errBox.textContent = result.data?.error || 'Booking failed. Please try again.';
      errBox.style.display = 'block';
    }
    return;
  }

  // Success!
  const bookings = result.data.bookings || [result.data.booking];
  renderTicketSuccess(bookings);

  // Clear selections and refresh live seat status
  clearPickedSeats();
  rebuildSeatsAnimated();
}

export function initBookingModal() {
  const form = document.getElementById('attendeeForm');
  if (form) {
    form.addEventListener('submit', handleBookingSubmit);
  }

  const closeBtn = document.getElementById('modalClose');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeBookingModal);
  }

  const doneBtn = document.getElementById('donePassBtn');
  if (doneBtn) {
    doneBtn.addEventListener('click', closeBookingModal);
  }

  const modal = document.getElementById('modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeBookingModal();
    });
  }

  const confirmBtn = document.getElementById('confirmBtn');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', openBookingModal);
  }
}
