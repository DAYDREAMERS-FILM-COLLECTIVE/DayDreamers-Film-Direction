/**
 * js/modules/admin/bookings.js
 * Attendee booking roster: live search, verification status, and CSV export.
 */

import { getAuthHeaders } from './auth.js';

let allBookings = [];

export function getBookings() {
  return allBookings;
}

export const loadBookingsRoster = loadBookings;
export const fetchBookings = loadBookings;

export async function loadBookings(search = '') {
  const tbody = document.getElementById('bookingsList');
  if (!tbody) return [];

  try {
    let url = '/api/admin/bookings';
    if (search && search.trim()) {
      url += '?search=' + encodeURIComponent(search.trim());
    }

    const res = await fetch(url, {
      headers: getAuthHeaders()
    });

    allBookings = await res.json();
    tbody.innerHTML = '';

    if (!allBookings || !allBookings.length) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--muted);">No bookings found</td></tr>';
      return allBookings;
    }

    allBookings.forEach(b => {
      const d = new Date(b.show_date);
      const dateStr = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      const statusClass = b.checked_in ? 'status-checkedin' : 'status-confirmed';
      const statusText = b.checked_in ? 'Checked In' : 'Confirmed';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-family: monospace; font-weight: 600; color: var(--gold);">${b.ref_code}</td>
        <td style="font-weight: 500;">${b.film_title}</td>
        <td style="color: #fff;">${b.user_name}</td>
        <td style="font-family: monospace;">${b.user_usn}</td>
        <td style="color: var(--gold);">${Array.isArray(b.seats) ? b.seats.join(', ') : (b.seats || '')}</td>
        <td>${dateStr} @ ${b.show_time}</td>
        <td style="color: var(--muted);">${b.hall}</td>
        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
      `;
      tbody.appendChild(tr);
    });

    return allBookings;
  } catch (err) {
    console.error('Failed to load bookings:', err);
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--danger);">Error loading bookings: ${err.message}</td></tr>`;
    return [];
  }
}

export function exportBookingsCsv() {
  if (!allBookings || !allBookings.length) {
    alert('No bookings available to export');
    return;
  }

  const headers = ['Ref Code', 'Film Title', 'Attendee Name', 'USN', 'Email', 'Seats', 'Show Date', 'Show Time', 'Hall', 'Status', 'Booking Date'];
  const rows = allBookings.map(b => [
    `"${b.ref_code || ''}"`,
    `"${(b.film_title || '').replace(/"/g, '""')}"`,
    `"${(b.user_name || '').replace(/"/g, '""')}"`,
    `"${b.user_usn || ''}"`,
    `"${b.user_email || ''}"`,
    `"${(Array.isArray(b.seats) ? b.seats.join(', ') : (b.seats || '')).replace(/"/g, '""')}"`,
    `"${b.show_date ? new Date(b.show_date).toISOString().slice(0, 10) : ''}"`,
    `"${b.show_time || ''}"`,
    `"${(b.hall || '').replace(/"/g, '""')}"`,
    `"${b.checked_in ? 'Checked In' : 'Confirmed'}"`,
    `"${b.created_at ? new Date(b.created_at).toISOString() : ''}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Daydreamers_Bookings_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
