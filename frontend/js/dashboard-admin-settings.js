/**
 * dashboard-admin-settings.js
 * Powers dashboard-admin-settings.html.
 * - Notification prefs persist via GET/PUT /settings (per-user key/value store).
 * - Change password via POST /auth/change-password.
 * - Delete account via DELETE /auth/account (requires password confirmation).
 * Theme toggle is untouched — handled entirely by theme.js (already fixed).
 */

(function () {
  'use strict';
  window.__expectedRole = 'admin';

  document.addEventListener('drhire:auth', () => {
    loadSettings();
    document.getElementById('saveNotifBtn')?.addEventListener('click', saveNotifications);
    document.getElementById('changePwBtn')?.addEventListener('click', changePassword);
    document.getElementById('deleteAccountBtn')?.addEventListener('click', deleteAccount);
  });

  async function loadSettings() {
    try {
      const data = await api.get('/settings');
      const s = data.data || {};
      document.getElementById('notifEmail').checked    = s.notif_email    === '1';
      document.getElementById('notifReports').checked  = s.notif_reports  === '1';
      document.getElementById('notifSecurity').checked = s.notif_security === '1';
    } catch (err) {
      apiUI.toast('Could not load saved preferences: ' + err.message, 'error');
    }
  }

  async function saveNotifications() {
    const btn = document.getElementById('saveNotifBtn');
    btn.disabled = true;
    try {
      await api.put('/settings', {
        notif_email:    document.getElementById('notifEmail').checked    ? '1' : '0',
        notif_reports:  document.getElementById('notifReports').checked  ? '1' : '0',
        notif_security: document.getElementById('notifSecurity').checked ? '1' : '0',
      });
      apiUI.toast('Notification preferences saved.', 'success');
    } catch (err) {
      apiUI.toast(err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  }

  async function changePassword() {
    const current = document.getElementById('curPassword').value;
    const next     = document.getElementById('newPassword').value;
    const confirm  = document.getElementById('confirmPassword').value;

    if (!current || !next) { apiUI.toast('Fill in both password fields.', 'error'); return; }
    if (next.length < 8)   { apiUI.toast('New password must be at least 8 characters.', 'error'); return; }
    if (next !== confirm)  { apiUI.toast('New password and confirmation do not match.', 'error'); return; }

    const btn = document.getElementById('changePwBtn');
    btn.disabled = true;
    try {
      await api.post('/auth/change-password', { current_password: current, new_password: next });
      apiUI.toast('Password changed successfully.', 'success');
      document.getElementById('curPassword').value = '';
      document.getElementById('newPassword').value = '';
      document.getElementById('confirmPassword').value = '';
    } catch (err) {
      apiUI.toast(err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  }

  async function deleteAccount() {
    if (!confirm('This will permanently delete your account and all associated data. This cannot be undone. Continue?')) return;
    const password = prompt('Enter your password to confirm account deletion:');
    if (!password) return;

    try {
      await api.delete('/auth/account', { password });
      apiUI.toast('Account deleted.', 'success');
      setTimeout(() => { window.location.href = 'login.html'; }, 800);
    } catch (err) {
      apiUI.toast(err.message, 'error');
    }
  }
})();
