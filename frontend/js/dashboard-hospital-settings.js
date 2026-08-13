/**
 * dashboard-hospital-settings.js
 * Powers dashboard-hospital-settings.html
 */
(function () {
  'use strict';
  window.__expectedRole = 'hospital';

  document.addEventListener('drhire:auth', () => {
    loadGeneral();
    loadSettings();
    loadLoginHistory();
    bindEvents();
  });

  async function loadGeneral() {
    try {
      const profile = await api.get('/hospital/profile');
      document.getElementById('settingHospitalName').value = profile.hospital_name || '';
      document.getElementById('settingAdminEmail').value = profile.email || '';
      document.getElementById('settingContactPhone').value = profile.contact_phone || '';
    } catch (e) { /* leave blank if profile not created yet */ }
  }

  async function loadSettings() {
    try {
      const data = await api.get('/settings');
      const s = data.data || {};
      document.getElementById('settingTimezone').value = s.timezone || 'Asia/Kolkata';
      document.getElementById('notifNewApps').checked = s.notif_new_apps !== '0';
      document.getElementById('notifNewAppts').checked = s.notif_new_appts !== '0';
      document.getElementById('notifCancellations').checked = s.notif_cancellations !== '0';
      document.getElementById('notifWeekly').checked = s.notif_weekly === '1';
      document.getElementById('notifAnnouncements').checked = s.notif_announcements === '1';
    } catch (e) { /* defaults already set in HTML */ }
  }

  async function loadLoginHistory() {
    const el = document.getElementById('loginHistoryList');
    try {
      const data = await api.get('/auth/login-history');
      const rows = data.data || [];
      if (!rows.length) {
        el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text3)">No login history recorded yet.</div>';
        return;
      }
      el.innerHTML = rows.map((r, i) => `
        <div class="act-item">
          <div class="act-dot ${i === 0 ? 'act-dot-green' : 'act-dot-blue'}"></div>
          <div class="act-body">
            <div class="act-title">Login${r.ip_address ? ' from ' + escHtml(r.ip_address) : ''}</div>
            <div class="act-meta">${formatDateTime(r.created_at)}</div>
          </div>
        </div>`).join('');
    } catch (e) {
      el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text3)">Could not load login history.</div>';
    }
  }

  function bindEvents() {
    document.getElementById('saveGeneralBtn')?.addEventListener('click', async () => {
      const btn = document.getElementById('saveGeneralBtn');
      btn.disabled = true;
      try {
        await api.put('/hospital/profile', {
          hospital_name: document.getElementById('settingHospitalName').value,
          contact_phone: document.getElementById('settingContactPhone').value,
        });
        await api.put('/settings', { timezone: document.getElementById('settingTimezone').value });
        apiUI.toast('Settings saved.', 'success');
      } catch (e) {
        apiUI.toast(e.message, 'error');
      } finally { btn.disabled = false; }
    });

    document.getElementById('saveNotifBtn')?.addEventListener('click', async () => {
      const btn = document.getElementById('saveNotifBtn');
      btn.disabled = true;
      try {
        await api.put('/settings', {
          notif_new_apps: document.getElementById('notifNewApps').checked ? '1' : '0',
          notif_new_appts: document.getElementById('notifNewAppts').checked ? '1' : '0',
          notif_cancellations: document.getElementById('notifCancellations').checked ? '1' : '0',
          notif_weekly: document.getElementById('notifWeekly').checked ? '1' : '0',
          notif_announcements: document.getElementById('notifAnnouncements').checked ? '1' : '0',
        });
        apiUI.toast('Notification preferences saved.', 'success');
      } catch (e) {
        apiUI.toast(e.message, 'error');
      } finally { btn.disabled = false; }
    });

    document.getElementById('pwForm')?.addEventListener('submit', async function (e) {
      e.preventDefault();
      const current = document.getElementById('curPw').value;
      const next = document.getElementById('newPw').value;
      const confirm = document.getElementById('confirmPw').value;
      if (next !== confirm) { apiUI.toast('New passwords do not match.', 'error'); return; }
      const btn = this.querySelector('button[type="submit"]');
      btn.disabled = true;
      try {
        await api.post('/auth/change-password', { current_password: current, new_password: next });
        apiUI.toast('Password updated successfully.', 'success');
        this.reset();
      } catch (err) {
        apiUI.toast(err.message, 'error');
      } finally { btn.disabled = false; }
    });

    document.getElementById('deleteAccountBtn')?.addEventListener('click', async () => {
      if (!confirm('This will permanently delete your hospital account and all associated data. This cannot be undone. Continue?')) return;
      const pw = prompt('Please enter your password to confirm account deletion:');
      if (!pw) return;
      try {
        await api.delete('/auth/account', { password: pw });
        apiUI.toast('Account deleted. Logging out…', 'success');
        setTimeout(() => { localStorage.clear(); window.location.href = 'signin.html'; }, 1200);
      } catch (e) {
        apiUI.toast(e.message, 'error');
      }
    });
  }

  function formatDateTime(d) {
    if (!d) return '–';
    return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  }
  function escHtml(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
})();
