/**
 * dashboard-doctor-main.js — powers dashboard-doctor.html
 */
(function () {
  'use strict';
  window.__expectedRole = 'doctor';

  document.addEventListener('drhire:auth', async () => {
    await Promise.all([loadStats(), loadTodayAppointments(), loadProfileCard(), loadRecentPatients()]);
  });

  async function loadStats() {
    try {
      const data = await api.get('/doctor/stats');
      const a = data.appointments || {};
      const map = {
        'stat-today':     a.today,
        'stat-upcoming':  a.upcoming,
        'stat-completed': a.completed,
        'stat-patients':  a.unique_patients,
      };
      Object.entries(map).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) animateCount(el, parseInt(val) || 0);
      });

      const total = parseInt(a.total) || 0;
      const parts = [
        ['Completed', a.completed, 'success'],
        ['Confirmed', a.confirmed, 'confirmed'],
        ['Pending',   a.pending,   'pending'],
        ['Cancelled', a.cancelled, 'cancelled'],
      ];
      const ids = { Completed: 'progCompleted', Confirmed: 'progConfirmed', Pending: 'progPending', Cancelled: 'progCancelled' };
      parts.forEach(([label, val]) => {
        const pct = total ? Math.round(((parseInt(val) || 0) / total) * 100) : 0;
        const bar = document.getElementById(ids[label] + 'Bar');
        const txt = document.getElementById(ids[label] + 'Val');
        if (bar) bar.style.width = pct + '%';
        if (txt) txt.textContent = pct + '%';
      });

      setText('profCardPatients', a.unique_patients || 0);
      setText('profCardToday', a.today || 0);
    } catch (e) { console.error('stats error', e); }
  }

  async function loadProfileCard() {
    try {
      const p = await api.get('/doctor/profile');
      setText('profCardSpec', [p.specialization, p.qualification].filter(Boolean).join(' · ') || '–');
      setText('profCardCity', [p.clinic_address, p.city].filter(Boolean).join(', ') || '–');
      setText('profCardExp', p.experience_years ? p.experience_years : '–');
    } catch (e) { /* non-fatal */ }
  }

  async function loadTodayAppointments() {
    const container = document.getElementById('todayApptList');
    if (!container) return;
    apiUI.loading(container);
    try {
      const data = await api.get('/doctor/appointments?date=today&per_page=6');
      const appts = data.data || [];
      if (!appts.length) {
        apiUI.empty(container, 'No appointments scheduled for today.', 'fa-calendar-xmark');
        return;
      }
      container.innerHTML = appts.map(a => {
        const [hh, mm] = (a.appointment_time || '00:00').split(':');
        const hr = +hh;
        const ampm = hr >= 12 ? 'PM' : 'AM';
        const hr12 = hr > 12 ? hr - 12 : (hr || 12);
        return `
        <div class="appt-item">
          <div class="appt-time-box"><div class="appt-time-h">${String(hr12).padStart(2,'0')}:${mm}</div><div class="appt-time-p">${ampm}</div></div>
          <div class="appt-info">
            <div class="appt-name">${escHtml(a.patient_name)}</div>
            <div class="appt-meta"><span><i class="fa-solid fa-stethoscope"></i>${escHtml(a.reason || '–')}</span><span><i class="fa-solid fa-phone"></i>${escHtml(a.patient_phone || '–')}</span></div>
          </div>
          <div class="appt-actions">
            <span class="badge ${statusBadge(a.status)}">${capitalize(a.status)}</span>
            ${a.status === 'pending' ? `<button class="btn-sm btn-outline-sm" onclick="updateApptStatus(${a.id},'confirmed')">Confirm</button>` : ''}
          </div>
        </div>`;
      }).join('');
    } catch (e) { apiUI.error(container, 'Failed to load appointments.'); }
  }

  async function loadRecentPatients() {
    const body = document.getElementById('recentPatientsBody');
    if (!body) return;
    body.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:30px"><i class="fa-solid fa-spinner fa-spin" style="color:var(--accent)"></i></td></tr>`;
    try {
      const data = await api.get('/doctor/patients?per_page=5');
      const patients = data.data || [];
      if (!patients.length) {
        body.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text3)">No patients yet.</td></tr>`;
        return;
      }
      const colors = ['ua-blue','ua-green','ua-purple','ua-orange','ua-pink','ua-cyan'];
      body.innerHTML = patients.map((p, i) => {
        const initials = (p.patient_name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
        return `
        <tr>
          <td><div class="user-cell"><div class="ua ${colors[i % colors.length]}">${initials}</div><div><div class="td-name">${escHtml(p.patient_name)}</div><div class="td-sub">Age ${p.patient_age || '–'} · ${(p.patient_gender||'–')[0] || '–'}</div></div></div></td>
          <td>${p.last_visit ? new Date(p.last_visit).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '–'}</td>
          <td>${escHtml((p.conditions || '–').slice(0, 30))}</td>
          <td><span class="badge ${statusBadge(p.last_status)}">${capitalize(p.last_status || '')}</span></td>
          <td><a href="dashboard-doctor-patients.html" class="btn-sm btn-outline-sm">View</a></td>
        </tr>`;
      }).join('');
    } catch (e) { body.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--danger)">Failed to load patients.</td></tr>`; }
  }

  window.updateApptStatus = async function(id, status) {
    try {
      await api.patch(`/doctor/appointments/${id}/status`, { status });
      apiUI.toast('Appointment ' + status + '.', 'success');
      loadTodayAppointments();
      loadStats();
    } catch(e) { apiUI.toast(e.message, 'error'); }
  };

  function animateCount(el, target) {
    let c = 0; const s = Math.max(1, Math.ceil(target / 40));
    const t = setInterval(() => { c = Math.min(c + s, target); el.textContent = c; if(c >= target) clearInterval(t); }, 25);
  }
  function statusBadge(s) { return {pending:'badge-pending',confirmed:'badge-confirmed',completed:'badge-completed',cancelled:'badge-cancelled'}[s]||''; }
  function capitalize(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }
  function setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }
  function escHtml(s) { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
})();
