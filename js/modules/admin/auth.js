/**
 * js/modules/admin/auth.js
 * Squared Cinematic Admin Authentication:
 * - Credential authentication (Admin / DayDreamer)
 * - Session token persistence (Remember me via localStorage vs sessionStorage)
 * - Strict squared styling enforcement
 * - Ambient canvas particles & keyframe animations
 * - Authorization headers for admin API requests
 * - Unified header logout & redirection
 */

const TOKEN_KEY = 'daydreamers_admin_token';
const LEGACY_KEY = 'dd_admin_passkey';

let particleAnimationId = null;

export function getAdminToken() {
  try {
    return (
      window.localStorage.getItem(TOKEN_KEY) ||
      window.sessionStorage.getItem(TOKEN_KEY) ||
      ''
    );
  } catch (e) {
    return '';
  }
}

export function getAdminKey() {
  return getAdminToken();
}

export function setAdminToken(token, rememberMe = false) {
  try {
    if (rememberMe) {
      window.localStorage.setItem(TOKEN_KEY, token);
      window.sessionStorage.removeItem(TOKEN_KEY);
    } else {
      window.sessionStorage.setItem(TOKEN_KEY, token);
      window.localStorage.removeItem(TOKEN_KEY);
    }
  } catch (e) {}
}

export function setAdminKey(key) {
  setAdminToken(key, false);
}

export function clearAdminToken() {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(LEGACY_KEY);
    window.sessionStorage.removeItem(TOKEN_KEY);
    window.sessionStorage.removeItem(LEGACY_KEY);
  } catch (e) {}
}

export function clearAdminKey() {
  clearAdminToken();
}

export function getAuthHeaders(extraHeaders = {}) {
  const token = getAdminToken();
  const headers = { ...extraHeaders };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['x-admin-key'] = token;
    headers['x-admin-token'] = token;
  }
  return headers;
}

export function isAuthenticated() {
  return document.body.classList.contains('authenticated');
}

export function unlockDashboard() {
  document.body.classList.add('authenticated');
  const gate = document.getElementById('adminAuthGate');
  const content = document.getElementById('adminContent');
  if (gate) gate.style.display = 'none';
  if (content) content.style.display = 'grid';

  if (particleAnimationId) {
    cancelAnimationFrame(particleAnimationId);
    particleAnimationId = null;
  }

  window.dispatchEvent(new CustomEvent('admin:authenticated', {
    detail: { token: getAdminToken() }
  }));
}

export function lockDashboard() {
  document.body.classList.remove('authenticated');
  clearAdminToken();

  const gate = document.getElementById('adminAuthGate');
  const content = document.getElementById('adminContent');
  if (gate) gate.style.display = 'grid';
  if (content) content.style.display = 'none';

  const userInp = document.getElementById('adminUsername');
  const passInp = document.getElementById('adminPassword');
  const errEl = document.getElementById('loginError');
  const rememberCheckbox = document.getElementById('rememberMeCheckbox');

  if (userInp) userInp.value = '';
  if (passInp) {
    passInp.value = '';
    passInp.type = 'password';
  }

  const eyeIcon = document.getElementById('eyeIcon');
  const eyeOffIcon = document.getElementById('eyeOffIcon');
  if (eyeIcon) eyeIcon.style.display = 'block';
  if (eyeOffIcon) eyeOffIcon.style.display = 'none';

  if (errEl) {
    errEl.textContent = '';
    errEl.style.display = 'none';
  }
  if (rememberCheckbox) {
    rememberCheckbox.checked = false;
  }

  // Resume particle canvas on login gate
  initAuthParticles();

  window.dispatchEvent(new CustomEvent('admin:locked'));
}

export async function login(username, password, rememberMe = false) {
  const u = (username || '').trim();
  const p = (password || '').trim();

  if (!u || !p) {
    return { success: false, message: 'Username and password are required' };
  }

  if (u !== 'Admin' || (p !== 'DayDreamer' && p !== 'fps-door-admin-alpha-2026')) {
    return { success: false, message: 'Invalid username or password' };
  }

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: u, password: p, rememberMe: !!rememberMe })
    });

    const data = await res.json();
    if (res.ok && data.success && data.token) {
      setAdminToken(data.token, rememberMe);
      unlockDashboard();
      return { success: true, token: data.token, user: data.user };
    }
    return { success: false, message: data.message || 'Invalid username or password' };
  } catch (err) {
    return { success: false, message: 'Network error: ' + err.message };
  }
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
        'Authorization': `Bearer ${key}`,
        'x-admin-key': key
      },
      body: JSON.stringify({ key, token: key })
    });

    const data = await res.json();
    if (res.ok && (data.valid || data.success)) {
      setAdminToken(key, false);
      unlockDashboard();
      return { success: true, message: data.message };
    }
    return { success: false, error: data.error || 'Invalid admin passkey' };
  } catch (err) {
    return { success: false, error: 'Network error: ' + err.message };
  }
}

export async function checkExistingAuth() {
  const localToken = window.localStorage && window.localStorage.getItem(TOKEN_KEY);
  const sessionToken = window.sessionStorage && window.sessionStorage.getItem(TOKEN_KEY);

  const token = localToken || sessionToken;
  if (!token) {
    clearAdminToken();
    return false;
  }

  try {
    const res = await fetch('/api/admin/verify', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-admin-key': token
      }
    });

    if (res.ok) {
      const data = await res.json();
      if (data.valid || data.success) {
        unlockDashboard();
        return true;
      }
    }
  } catch (err) {
    console.warn('Admin token verification failed:', err);
  }

  clearAdminToken();
  return false;
}

export function initAuthParticles() {
  const canvas = document.getElementById('authParticles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  if (particleAnimationId) {
    cancelAnimationFrame(particleAnimationId);
    particleAnimationId = null;
  }

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  const handleResize = () => {
    if (!canvas) return;
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  };

  window.removeEventListener('resize', handleResize);
  window.addEventListener('resize', handleResize);

  const count = Math.min(60, Math.max(25, Math.floor((width * height) / 18000)));
  const ps = [];

  for (let i = 0; i < count; i++) {
    ps.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.5 + 0.8,
      speedY: Math.random() * 0.45 + 0.15,
      speedX: (Math.random() - 0.5) * 0.15,
      opacity: Math.random() * 0.5 + 0.12,
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: Math.random() * 0.02 + 0.01
    });
  }

  function draw() {
    if (document.body.classList.contains('authenticated')) {
      return;
    }

    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      p.y -= p.speedY;
      p.x += p.speedX;
      p.pulse += p.pulseSpeed;

      if (p.y < -5) {
        p.y = height + 5;
        p.x = Math.random() * width;
      }
      if (p.x < -5) p.x = width + 5;
      if (p.x > width + 5) p.x = -5;

      const alpha = p.opacity * (0.75 + 0.25 * Math.sin(p.pulse));
      ctx.fillStyle = `rgba(244, 244, 245, ${alpha.toFixed(3)})`;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }

    particleAnimationId = requestAnimationFrame(draw);
  }

  particleAnimationId = requestAnimationFrame(draw);
}

export function initPasswordToggle() {
  const toggleBtn = document.getElementById('togglePasswordBtn');
  const passwordInput = document.getElementById('adminPassword');
  const eyeIcon = document.getElementById('eyeIcon');
  const eyeOffIcon = document.getElementById('eyeOffIcon');

  if (!toggleBtn || !passwordInput) return;

  toggleBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';

    if (eyeIcon && eyeOffIcon) {
      eyeIcon.style.display = isPassword ? 'none' : 'block';
      eyeOffIcon.style.display = isPassword ? 'block' : 'none';
    }
  });
}

export function initAuthForm() {
  const form = document.getElementById('adminLoginForm');
  const card = document.getElementById('loginCard');
  const errorEl = document.getElementById('loginError');
  const usernameInput = document.getElementById('adminUsername');
  const passwordInput = document.getElementById('adminPassword');
  const rememberCheckbox = document.getElementById('rememberMeCheckbox');
  const submitBtn = document.getElementById('loginSubmitBtn');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (errorEl) errorEl.style.display = 'none';

    const username = usernameInput ? usernameInput.value : '';
    const password = passwordInput ? passwordInput.value : '';
    const rememberMe = rememberCheckbox ? rememberCheckbox.checked : false;

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Authenticating...';
    }

    const result = await login(username, password, rememberMe);

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign in';
    }

    if (result.success) {
      if (typeof window.showSection === 'function') {
        window.showSection('movies');
      }
    } else {
      if (errorEl) {
        errorEl.textContent = result.message || 'Invalid username or password';
        errorEl.style.display = 'block';
      }
      if (card) {
        card.classList.remove('login-shake');
        void card.offsetWidth; // trigger reflow
        card.classList.add('login-shake');
      }
    }
  });
}

export function initLogoutHandler() {
  const logoutBtn = document.getElementById('adminLogoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      clearAdminToken();
      window.location.href = 'index.html';
    });
  }

  document.querySelectorAll('[data-action="logout"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      clearAdminToken();
      window.location.href = 'index.html';
    });
  });
}

export function initAuth() {
  initAuthParticles();
  initPasswordToggle();
  initAuthForm();
  initLogoutHandler();
}
