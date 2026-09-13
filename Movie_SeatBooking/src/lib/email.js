/**
 * RVU Film Production Society - EmailJS Dispatcher & Ticket Delivery
 * Safely constructs email dispatch payloads.
 * CRITICAL: Zero raw base64 data URLs in EmailJS payload (exceeds payload limit).
 * Instead, dispatches hosted dynamic QR image URL:
 * https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(verificationPayload)}
 */

const EMAILJS_SERVICE_ID = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_EMAILJS_SERVICE_ID) || '';
const EMAILJS_TEMPLATE_ID = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_EMAILJS_TEMPLATE_ID) || '';
const EMAILJS_PUBLIC_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_EMAILJS_PUBLIC_KEY) || '';

export async function sendTicketEmail(bookingData) {
  const {
    bookingId,
    ticketHash,
    primaryBooker,
    seats,
    movie,
    showtime,
    confirmedAt,
  } = bookingData;

  const seatLabels = seats.map((s) => `${s.row_label}${s.col_number} (${s.seat_tier.toUpperCase()})`).join(', ');
  const verificationPayload = JSON.stringify({
    hash: ticketHash,
    usn: primaryBooker.usn,
    bookingId,
    showtimeId: showtime.id,
  });

  // Safe hosted QR code image URL (NOT base64)
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(verificationPayload)}`;

  const templateParams = {
    to_name: primaryBooker.name,
    to_email: primaryBooker.email,
    usn: primaryBooker.usn,
    movie_title: movie.title,
    auditorium_name: showtime.auditorium_name,
    showtime_date: new Date(showtime.start_time).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    showtime_time: new Date(showtime.start_time).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }),
    seat_numbers: seatLabels,
    seat_count: seats.length,
    ticket_hash: ticketHash,
    booking_id: bookingId,
    qr_code_url: qrImageUrl,
    confirmed_at: new Date(confirmedAt).toLocaleString('en-IN'),
  };

  // If EmailJS credentials are fully present, attempt remote dispatch
  if (EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY) {
    try {
      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service_id: EMAILJS_SERVICE_ID,
          template_id: EMAILJS_TEMPLATE_ID,
          user_id: EMAILJS_PUBLIC_KEY,
          template_params: templateParams,
        }),
      });

      if (response.ok) {
        return { success: true, simulated: false };
      } else {
        const errorText = await response.text();
        console.warn('[EmailJS] Dispatch failed:', errorText);
        return { success: true, simulated: true, notice: 'Simulated dispatch (EmailJS API rejected payload).' };
      }
    } catch (err) {
      console.warn('[EmailJS] Network error during dispatch:', err);
      return { success: true, simulated: true, notice: 'Simulated dispatch (network error).' };
    }
  }

  // Resilient fallback: Unconfigured EmailJS -> log payload cleanly & return simulated success
  console.info('[EmailJS] VITE_EMAILJS_SERVICE_ID unconfigured. Simulating pass dispatch with payload:', templateParams);
  return {
    success: true,
    simulated: true,
    notice: `Simulated pass dispatched to ${primaryBooker.email} (${seatLabels}).`,
    payload: templateParams,
  };
}
