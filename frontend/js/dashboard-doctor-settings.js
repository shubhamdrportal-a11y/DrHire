/**
 * dashboard-doctor-settings.js — powers dashboard-doctor-settings.html
 */
(function () {
  'use strict';
  window.__expectedRole = 'doctor';

  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  document.addEventListener('drhire:auth', async () => {
    await Promise.all([loadGeneral(), loadSettings(), loadAvailability()]);

    document.getElementById('saveGeneralBtn')?.addEventListener('click', saveGeneral);
    document.getElementById('savePrefsBtn')?.addEventListener('click', savePrefs);
    document.getElementById('saveNotifBtn')?.addEventListener('click', saveNotifications);
    document.getElementById('saveAvailBtn')?.addEventListener('click', saveAvailability);
    document.getElementById('changePwBtn')?.addEventListener('click', changePassword);
    document.getElementById('deleteAccountBtn')?.addEventListener('click', deleteAccount);
  });

  // ── General (profile fields) ─────────────────────────────────
  async function loadGeneral() {
    try {
      const profile = await api.get('/doctor/profile');
      setVal('genFullName', profile.full_name);
      setVal('genEmail', profile.email);
      setVal('genPhone', profile.phone);
    } catch (e) { console.error('profile load error', e); }
  }

  async function saveGeneral() {
    const btn = document.getElementById('saveGeneralBtn');
    setBusy(btn, true);
    try {
      await api.put('/doctor/profile', {
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

      setChecked('notifNewAppt', s.notif_new_appt !== '0');
      setChecked('notifCancel', s.notif_cancel !== '0');
      setChecked('notifDailySummary', s.notif_daily_summary !== '0');
      setChecked('notifPatientMsg', s.notif_patient_msg === '1');
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
      // Apply theme immediately using the existing global theme.js API
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
        notif_new_appt: isChecked('notifNewAppt') ? '1' : '0',
        notif_cancel: isChecked('notifCancel') ? '1' : '0',
        notif_daily_summary: isChecked('notifDailySummary') ? '1' : '0',
        notif_patient_msg: isChecked('notifPatientMsg') ? '1' : '0',
        notif_system_updates: isChecked('notifSystemUpdates') ? '1' : '0',
      });
      apiUI.toast('Notification preferences saved.', 'success');
    } catch (e) { apiUI.toast(e.message || 'Failed to save.', 'error'); }
    finally { setBusy(btn, false); }
  }

  // ── Availability ──────────────────────────────────────────────
  async function loadAvailability() {
    const container = document.getElementById('availabilityRows');
    if (!container) return;
    try {
      const res = await api.get('/doctor/availability');
      const slots = res.data || [];
      const byDay = {};
      (slots || []).forEach(s => { byDay[s.day_of_week] = s; });

      container.innerHTML = DAYS.map((name, idx) => {
        const slot = byDay[idx];
        const active = slot ? !!parseInt(slot.is_active) : false;
        const start = slot ? slot.start_time.slice(0, 5) : '09:00';
        const end = slot ? slot.end_time.slice(0, 5) : '17:00';
        return `
        <div style="display:flex;align-items:center;gap:14px;padding:12px;background:var(--bg3);border-radius:var(--radius-sm);border:1px solid var(--border)">
            <input type="checkbox" data-avail-day="${idx}" data-avail-active ${active ? 'checked' : ''} style="width:16px;height:16px" />
            <span style="font-weight:600;color:var(--text);min-width:90px">${name}</span>
            <input class="form-input" type="time" data-avail-day="${idx}" data-avail-start value="${start}" style="width:auto;flex:1" />
            <span style="color:var(--text3)">to</span>
            <input class="form-input" type="time" data-avail-day="${idx}" data-avail-end value="${end}" style="width:auto;flex:1" />
        </div>`;
      }).join('');
    } catch (e) {
      container.innerHTML = `<div style="color:var(--danger);font-size:.85rem">Failed to load availability.</div>`;
    }
  }

  async function saveAvailability() {
    const btn = document.getElementById('saveAvailBtn');
    const container = document.getElementById('availabilityRows');
    if (!container) return;
    setBusy(btn, true);
    try {
      const slots = DAYS.map((_, idx) => {
        const active = container.querySelector(`[data-avail-day="${idx}"][data-avail-active]`)?.checked;
        const start = container.querySelector(`[data-avail-day="${idx}"][data-avail-start]`)?.value || '09:00';
        const end = container.querySelector(`[data-avail-day="${idx}"][data-avail-end]`)?.value || '17:00';
        return { day_of_week: idx, start_time: start, end_time: end, is_active: active ? 1 : 0 };
      });
      await api.put('/doctor/availability', { slots });
      apiUI.toast('Availability saved.', 'success');
    } catch (e) { apiUI.toast(e.message || 'Failed to save availability.', 'error'); }
    finally { setBusy(btn, false); }
  }

  // ── Security ─────────────────────────────────────────────────
  async function changePassword() {
    const cur = getVal('curPassword');
    const next = getVal('newPassword');
    const confirm = getVal('confirmPassword');

    if (!cur || !next || !confirm) { apiUI.toast('Fill in all password fields.', 'warning'); return; }
    if (next.length < 8) { apiUI.toast('New password must be at least 8 characters.', 'warning'); return; }
    if (next !== confirm) { apiUI.toast('New passwords do not match.', 'warning'); return; }

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
