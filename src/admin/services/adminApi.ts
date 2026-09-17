/**
 * src/admin/services/adminApi.ts
 * API Service for admin operations (passkey verification, catalogue CRUD, seat locker, QR check-in).
 */

import { AdminMovie, AdminBooking, QrCheckInResponse } from '../types';

export const DEFAULT_KEY = 'fps-door-admin-alpha-2026';

function getHeaders(passkey: string) {
  return {
    'Content-Type': 'application/json',
    'x-admin-key': passkey || DEFAULT_KEY
  };
}

export async function verifyPasskeyApi(passkey: string, apiBase = ''): Promise<{ valid: boolean; error?: string }> {
  try {
    const res = await fetch(`${apiBase}/api/admin/verify`, {
      method: 'POST',
      headers: getHeaders(passkey),
      body: JSON.stringify({ key: passkey })
    });
    const data = await res.json();
    if (res.ok && data.valid) return { valid: true };
    return { valid: false, error: data.error || 'Invalid admin passkey' };
  } catch (err: any) {
    return { valid: false, error: err.message || 'Connection error' };
  }
}

export async function fetchAdminMovies(passkey: string, apiBase = ''): Promise<AdminMovie[]> {
  try {
    const res = await fetch(`${apiBase}/api/admin/movies`, {
      headers: getHeaders(passkey)
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function createAdminMovie(movie: Partial<AdminMovie>, passkey: string, apiBase = ''): Promise<boolean> {
  try {
    const res = await fetch(`${apiBase}/api/admin/movies`, {
      method: 'POST',
      headers: getHeaders(passkey),
      body: JSON.stringify(movie)
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteAdminMovie(id: string, passkey: string, apiBase = ''): Promise<boolean> {
  try {
    const res = await fetch(`${apiBase}/api/admin/movies/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getHeaders(passkey)
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function toggleSeatLockApi(
  showingId: string,
  seatId: string,
  locked: boolean,
  passkey: string,
  apiBase = ''
): Promise<boolean> {
  try {
    const res = await fetch(`${apiBase}/api/admin/seats/lock`, {
      method: 'POST',
      headers: getHeaders(passkey),
      body: JSON.stringify({ showingId, seatId, locked })
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchAdminBookings(passkey: string, apiBase = ''): Promise<AdminBooking[]> {
  try {
    const res = await fetch(`${apiBase}/api/admin/bookings`, {
      headers: getHeaders(passkey)
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function verifyCheckInApi(token: string, passkey: string, apiBase = ''): Promise<QrCheckInResponse> {
  try {
    const res = await fetch(`${apiBase}/api/admin/checkin`, {
      method: 'POST',
      headers: getHeaders(passkey),
      body: JSON.stringify({ token: token.trim() })
    });
    return await res.json();
  } catch (err: any) {
    return { valid: false, error: err.message || 'Check-in request error' };
  }
}
