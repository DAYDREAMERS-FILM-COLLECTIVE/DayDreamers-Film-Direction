/**
 * js/modules/admin/auth.js
 * Admin authentication, passkey verification, session storage, and authorization headers.
 * Unlocks the admin dashboard UI by toggling body.authenticated.
 */

const STORAGE_KEY = 'dd_admin_passkey';
export const DEFAULT_KEY = 'fps-door-admin-alpha-2026';

export function getAdminKey() {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) || '';
  } catch (e) {
    return '';
  }
}

export function setAdminKey(key) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, key);
  } catch (e) {}
}

export function clearAdminKey() {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch (e) {}
}

export function getAuthHeaders(extraHeaders = {}) {
  const key = getAdminKey();
  return {
    ...extraHeaders,
    'x-admin-key': key || DEFAULT_KEY
  };
}

export function isAuthenticated() {
  return document.body.classList.contains('authenticated');
}

export function unlockDashboard() {
  document.body.classList.add('authenticated');
  window.dispatchEvent(new CustomEvent('admin:authenticated', {
    detail: { key: getAdminKey() }
  }));
}

export function lockDashboard() {
  document.body.classList.remove('authenticated');
  clearAdminKey();
  const authGate = document.getElementById('authGate');
  if (authGate) {
    const input = authGate.querySelector('#adminPasskey');
    if (input) input.value = '';
    const errorEl = authGate.querySelector('#authError');
    if (errorEl) errorEl.style.display = 'none';
  }
  window.dispatchEvent(new CustomEvent('admin:locked'));
}

export async function verifyPasskey(passkey) {
  const key = (passkey || '').trim();
  if (!key) {
    return { success: false, error: 'Passkey cannot be empty' };
  }

  try {
    const res = await fetch('/api/admin/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': key
      },
      body: JSON.stringify({ key })
    });

    const data = await res.json();
    if (res.ok && data.valid) {
      setAdminKey(key);
      unlockDashboard();
      return { success: true, message: data.message };
    }
    return { success: false, error: data.error || 'Invalid admin passkey' };
  } catch (err) {
    return { success: false, error: 'Network error: ' + err.message };
  }
}

export async function checkExistingAuth() {
  const existing = getAdminKey();
  if (existing) {
    const result = await verifyPasskey(existing);
    if (result.success) {
      return true;
    }
    clearAdminKey();
  }
  return false;
}
