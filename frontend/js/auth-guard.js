/**
 * auth-guard.js
 * Must be loaded on EVERY dashboard page.
 * - Checks session via GET /api/auth/me
 * - Redirects to login if unauthenticated
 * - Populates [data-user-name], [data-user-email], [data-user-avatar]
 * - Handles logout for all [data-logout] buttons
 * - Optionally enforces expected role (set window.__expectedRole before including this)
 */

(function () {
  'use strict';

  // Show a page-level loading overlay while we verify auth
  function showPageLoading() {
    const el = document.createElement('div');
    el.id = '_authLoader';
    el.style.cssText = 'position:fixed;inset:0;z-index:99999;background:var(--bg,#0d1117);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:14px;';
    el.innerHTML = '<i class="fa-solid fa-spinner fa-spin fa-2x" style="color:#0ea5e9"></i><span style="font-size:.82rem;color:#64748b">Verifying session…</span>';
    document.body.appendChild(el);
  }

  function hidePageLoading() {
    const el = document.getElementById('_authLoader');
    if (el) el.remove();
  }

  function redirectToLogin() {
    const isPages = window.location.pathname.includes('/pages/');
    window.location.href = isPages ? 'login.html' : '/pages/login.html';
  }

  // Populate all [data-user-*] elements
  function populateUser(user, profile) {
    const displayName = profile?.full_name || profile?.hospital_name || user.email.split('@')[0];
    const initials    = displayName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

    document.querySelectorAll('[data-user-name]').forEach(el => el.textContent = displayName);
    document.querySelectorAll('[data-user-email]').forEach(el => el.textContent = user.email);
    document.querySelectorAll('[data-user-avatar]').forEach(el => el.textContent = initials);
    document.querySelectorAll('[data-user-role]').forEach(el => el.textContent = user.role);

    // Update profile photo if stored
    const photoUrl = profile?.photo_url;
    if (photoUrl) {
      document.querySelectorAll('[data-user-photo]').forEach(img => {
        img.src = photoUrl;
        img.style.display = '';
      });
    }

    // Store in window for other scripts to use
    window.__currentUser    = user;
    window.__currentProfile = profile;
  }

  // Wire logout buttons
  function initLogout() {
    document.querySelectorAll('[data-logout]').forEach(btn => {
      btn.addEventListener('click', async () => {
        try { await api.post('/auth/logout'); } catch {}
        redirectToLogin();
      });
    });
  }

  // Load notifications badge
  async function loadNotifications() {
    try {
      const data = await api.get('/notifications?unread=1');
      const count = data.unread_count || 0;
      document.querySelectorAll('.notif-dot').forEach(dot => {
        dot.style.display = count > 0 ? '' : 'none';
      });
      document.querySelectorAll('[data-notif-count]').forEach(el => {
        el.textContent = count > 0 ? String(count) : '';
      });
    } catch {}
  }

  // Generic settings-tab switcher (Doctor/Hospital/Staff Settings pages use
  // .settings-tab[data-settings-tab] + .settings-panel#settings-<name>).
  // Harmless no-op on pages without these elements.
  function initSettingsTabs() {
    const tabs = document.querySelectorAll('[data-settings-tab]');
    if (!tabs.length) return;

    function activate(name) {
      tabs.forEach(t => t.classList.toggle('active', t.dataset.settingsTab === name));
      document.querySelectorAll('.settings-panel').forEach(p => {
        p.classList.toggle('active', p.id === 'settings-' + name);
      });
    }

    tabs.forEach(tab => {
      tab.addEventListener('click', () => activate(tab.dataset.settingsTab));
    });

    const hash = window.location.hash.replace('#', '');
    if (hash && document.getElementById('settings-' + hash)) {
      activate(hash);
    }
  }

  // Main guard function
  async function guard() {
    showPageLoading();

    let user, profile;
    try {
      const me = await api.get('/auth/me');
      user    = { id: me.id, email: me.email, role: me.role, status: me.status };
      profile = me.profile || null;
    } catch {
      hidePageLoading();
      redirectToLogin();
      return;
    }

    // Role check
    const expectedRole = window.__expectedRole || null;
    if (expectedRole && user.role !== expectedRole && user.role !== 'admin') {
      document.body.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:var(--bg,#0d1117);color:var(--text,#e2e8f0);text-align:center;padding:20px;">
          <i class="fa-solid fa-triangle-exclamation fa-4x" style="color:var(--danger,#ef4444);margin-bottom:20px;"></i>
          <h2 style="margin-bottom:10px;">Session Conflict</h2>
          <p style="margin-bottom:20px;color:var(--text2,#94a3b8);max-width:400px;line-height:1.5;">
            You are currently logged in as a <strong>${user.role.toUpperCase()}</strong> in this browser. <br><br>
            To use the ${expectedRole.toUpperCase()} dashboard, you must log out first. If you want to use multiple accounts at the same time, please use an Incognito/Private window or a different browser.
          </p>
          <button onclick="api.post('/auth/logout').then(() => window.location.href='login.html').catch(() => window.location.href='login.html')" style="padding:10px 24px;background:var(--danger,#ef4444);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:bold;font-size:0.9rem;">
            Logout & Switch Role
          </button>
        </div>
      `;
      return;
    }

    populateUser(user, profile);
    initLogout();
    hidePageLoading();

    // Set current date in [id="dashDate"] if present
    const dateEl = document.getElementById('dashDate');
    if (dateEl) {
      dateEl.textContent = new Date().toLocaleDateString('en-IN', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      });
    }

    // Load notifications async (non-blocking)
    loadNotifications();

    // Dispatch event so page-specific scripts can run
    document.dispatchEvent(new CustomEvent('drhire:auth', { detail: { user, profile } }));
  }

  // Mobile sidebar toggle (shared across all dashboard pages)
  function initMobileSidebar() {
    const hamburger = document.getElementById('hamburgerMob') || document.getElementById('hamburgerBtn');
    const sidebar   = document.getElementById('dashSidebar');
    const overlay   = document.getElementById('sidebarOverlay');

    function open() {
      sidebar?.classList.add('open');
      overlay?.classList.add('active');
    }
    function close() {
      sidebar?.classList.remove('open');
      overlay?.classList.remove('active');
    }

    hamburger?.addEventListener('click', open);
    overlay?.addEventListener('click', close);
    document.getElementById('sidebarCloseBtn')?.addEventListener('click', close);
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { initMobileSidebar(); initSettingsTabs(); guard(); });
  } else {
    initMobileSidebar();
    initSettingsTabs();
    guard();
  }
})();
