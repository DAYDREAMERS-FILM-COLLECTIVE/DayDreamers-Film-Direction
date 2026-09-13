const SESSION_STORAGE_KEY = 'fps_client_session_id';

export function getClientSessionId(): string {
  if (typeof window === 'undefined') {
    return 'server_session';
  }

  let sessionId = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  }
  return sessionId;
}
