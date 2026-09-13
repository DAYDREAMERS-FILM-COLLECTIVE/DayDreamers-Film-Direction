/**
 * RVU Campus Cinema - Persistent Session Manager
 * Generates and stores a unique client UUID to track seat locks across browser interactions.
 */

const SESSION_KEY = 'rvu_cinema_session_id';

/**
 * Generate a cryptographically secure UUID fallback for older environments
 */
function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get the current session ID, creating a persistent one if none exists.
 * Prefers sessionStorage so separate browser tabs can test concurrent locking,
 * with graceful fallback to localStorage.
 */
export function getSessionId() {
  if (typeof window === 'undefined') {
    return '00000000-0000-0000-0000-000000000000';
  }

  try {
    let sessionId = sessionStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      // If not in sessionStorage, check if we want to sync or generate fresh
      sessionId = generateUUID();
      sessionStorage.setItem(SESSION_KEY, sessionId);
    }
    return sessionId;
  } catch {
    // Fallback if cookies/storage blocked
    try {
      let localId = localStorage.getItem(SESSION_KEY);
      if (!localId) {
        localId = generateUUID();
        localStorage.setItem(SESSION_KEY, localId);
      }
      return localId;
    } catch {
      return generateUUID();
    }
  }
}

/**
 * Manually reset session ID (useful for testing race conditions)
 */
export function resetSessionId() {
  if (typeof window !== 'undefined') {
    const newId = generateUUID();
    try {
      sessionStorage.setItem(SESSION_KEY, newId);
    } catch {
      // ignore
    }
    return newId;
  }
  return generateUUID();
}
