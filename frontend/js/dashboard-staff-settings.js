/**
 * dashboard-staff-settings.js — powers dashboard-staff-settings.html
 */
(function () {
  'use strict';
  window.__expectedRole = 'staff';

  document.addEventListener('drhire:auth', async () => {
    await Promise.all([loadGeneral(), loadSettings()]);
    updateNavBadge();

    document.getElementById('saveGeneralBtn')?.addEventListener('click', saveGeneral);
    document.getElementById('savePrefsBtn')?.addEventListener('click', savePrefs);
    document.getElementById('saveNotifBtn')?.addEventListener('click', saveNotifications);
    document.getElementById('changePwBtn')?.addEventListener('click', changePassword);
    document.getElementById('deleteAccountBtn')?.addEventListener('click', deleteAccount);
  });

  async function updateNavBadge() {
    try {
      const data = await api.get('/staff/stats');
      const total = data.applications?.total ?? 0;
      document.querySelectorAll('.nav-badge').forEach(b => { b.textContent = total; });
    } catch (e) { /* non-critical */ }
  }

  // ── General (profile fields) ─────────────────────────────────
  async function loadGeneral() {
    try {
      const profile = await api.get('/staff/profile');
      setVal('genFullName', profile.full_name);
      setVal('genEmail', profile.email);
      setVal('genPhone', profile.phone);
    } catch (e) { console.error('profile load error', e); }
  }

  async function saveGeneral() {
    const btn = document.getElementById('saveGeneralBtn');
    setBusy(btn, true);
    try {
      await api.put('/staff/profile', {
        full_name: getVal('genFullName'),
        phone: getVal('genPhone'),
      });
      apiUI.toast('Profile details saved.', 'success');
    } catch (e) { apiUI.toast(e.message || 'Failed to save.', 'error'); }
    finally { setBusy(btn, false); }
  }

  // ── Settings (language, theme, date/time format, notifications) ──
  async function loadSettings() {
    try {
      const res = await api.get('/settings');
      const s = res.data || {};
      if (s.language) setVal('genLanguage', s.language);
      if (s.theme) setVal('genTheme', s.theme);
      if (s.date_format) setVal('genDateFormat', s.date_format);
      if (s.time_format) setVal('genTimeFormat', s.time_format);

      setChecked('notifNewJob', s.notif_new_job !== '0');
      setChecked('notifAppStatus', s.notif_app_status !== '0');
      setChecked('notifSystemUpdates', s.notif_system_updates === '1');
    } catch (e) { console.error('settings load error', e); }
  }

  async function savePrefs() {
    const btn = document.getElementById('savePrefsBtn');
    setBusy(btn, true);
    try {
      const desiredTheme = getVal('genTheme');
      await api.put('/settings', {
        language: getVal('genLanguage'),
        theme: desiredTheme,
        date_format: getVal('genDateFormat'),
        time_format: getVal('genTimeFormat'),
      });
      const isLight = document.body.classList.contains('light-theme');
      if (desiredTheme === 'light' && !isLight) window.toggleTheme();
      if (desiredTheme === 'dark' && isLight) window.toggleTheme();
      apiUI.toast('Preferences saved.', 'success');
    } catch (e) { apiUI.toast(e.message || 'Failed to save.', 'error'); }
    finally { setBusy(btn, false); }
  }

  async function saveNotifications() {
    const btn = document.getElementById('saveNotifBtn');
    setBusy(btn, true);
    try {
      await api.put('/settings', {
        notif_new_job: isChecked('notifNewJob') ? '1' : '0',
        notif_app_status: isChecked('notifAppStatus') ? '1' : '0',
        notif_system_updates: isChecked('notifSystemUpdates') ? '1' : '0',
      });
      apiUI.toast('Notification preferences saved.', 'success');
    } catch (e) { apiUI.toast(e.message || 'Failed to save.', 'error'); }
    finally { setBusy(btn, false); }
  }

  // ── Security ─────────────────────────────────────────────────
  async function changePassword() {
    const cur = getVal('curPassword');
    const next = getVal('newPassword');
    const confirmPw = getVal('confirmPassword');

    if (!cur || !next || !confirmPw) { apiUI.toast('Fill in all password fields.', 'warning'); return; }
    if (next.length < 8) { apiUI.toast('New password must be at least 8 characters.', 'warning'); return; }
    if (next !== confirmPw) { apiUI.toast('New passwords do not match.', 'warning'); return; }

    const btn = document.getElementById('changePwBtn');
    setBusy(btn, true);
    try {
      await api.post('/auth/change-password', { current_password: cur, new_password: next });
      apiUI.toast('Password updated.', 'success');
      setVal('curPassword', ''); setVal('newPassword', ''); setVal('confirmPassword', '');
    } catch (e) { apiUI.toast(e.message || 'Failed to change password.', 'error'); }
    finally { setBusy(btn, false); }
  }

  async function deleteAccount() {
    const password = prompt('This will permanently delete your account and all data. Enter your password to confirm:');
    if (!password) return;
    if (!confirm('Are you absolutely sure? This cannot be undone.')) return;

    try {
      await api.delete('/auth/account', { password });
      apiUI.toast('Account deleted.', 'success');
      setTimeout(() => { window.location.href = 'login.html'; }, 1200);
    } catch (e) { apiUI.toast(e.message || 'Failed to delete account.', 'error'); }
  }

  // ── Helpers ──────────────────────────────────────────────────
  function getVal(id) { return document.getElementById(id)?.value ?? ''; }
  function setVal(id, v) { const el = document.getElementById(id); if (el && v !== undefined && v !== null) el.value = v; }
  function isChecked(id) { return !!document.getElementById(id)?.checked; }
  function setChecked(id, v) { const el = document.getElementById(id); if (el) el.checked = !!v; }
  function setBusy(btn, busy) { if (!btn) return; btn.disabled = busy; btn.style.opacity = busy ? '.6' : '1'; }
})();
