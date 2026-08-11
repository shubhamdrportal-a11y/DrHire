/**
 * dashboard-doctor-main.js — powers dashboard-doctor.html
 */
(function () {
  'use strict';
  window.__expectedRole = 'doctor';

  document.addEventListener('drhire:auth', async () => {
    await Promise.all([loadStats(), loadTodayAppointments()]);
  });

  async function loadStats() {
    try {
      const data = await api.get('/doctor/stats');
      const a = data.appointments || {};
      const map = {
        'stat-today':    a.today,
        'stat-upcoming': a.upcoming,
        'stat-completed':a.completed,
        'stat-patients': a.unique_patients,
        'stat-pending':  a.pending,
      };
      Object.entries(map).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) animateCount(el, parseInt(val) || 0);
      });
    } catch (e) { console.error('stats error', e); }
  }

  async function loadTodayAppointments() {
    const container = document.getElementById('todayApptList');
    if (!container) return;
    apiUI.loading(container);
    try {
      const data = await api.get('/doctor/appointments?date=today&per_page=5');
      const appts = data.data || [];
      if (!appts.length) {
        apiUI.empty(container, 'No appointments scheduled for today.', 'fa-calendar-xmark');
        return;
      }
      container.innerHTML = appts.map(a => `
        <div class="appt-card">
          <div class="appt-card-top">
            <div class="appt-patient-avatar" style="background:${statusColor(a.status)}20;color:${statusColor(a.status)}">${a.patient_name[0].toUpperCase()}</div>
            <div>
              <div class="appt-patient-name">${escHtml(a.patient_name)}</div>
              <div class="appt-patient-meta">
                <span><i class="fa-solid fa-clock"></i> ${formatTime(a.appointment_time)}</span>
                <span><i class="fa-solid fa-venus-mars"></i> ${a.patient_gender || '–'}</span>
                <span><i class="fa-solid fa-calendar"></i> Age ${a.patient_age || '–'}</span>
              </div>
            </div>
            <span class="badge ${statusBadge(a.status)}" style="margin-left:auto">${capitalize(a.status)}</span>
          </div>
          <div class="appt-reason-box"><strong>Reason:</strong> ${escHtml(a.reason || '–')}</div>
          <div class="appt-card-actions">
            <div class="appt-card-btns">
              ${a.status === 'pending' ? `<button class="btn-sm btn-outline-sm" onclick="updateApptStatus(${a.id},'confirmed')"><i class="fa-solid fa-check"></i> Confirm</button>` : ''}
              ${a.status === 'confirmed' ? `<button class="btn-sm btn-outline-sm" style="color:var(--success)" onclick="updateApptStatus(${a.id},'completed')"><i class="fa-solid fa-circle-check"></i> Complete</button>` : ''}
              ${['pending','confirmed'].includes(a.status) ? `<button class="btn-sm btn-outline-sm" style="color:var(--danger)" onclick="updateApptStatus(${a.id},'cancelled')"><i class="fa-solid fa-xmark"></i> Cancel</button>` : ''}
            </div>
            <span style="font-size:.72rem;color:var(--text3)">${a.patient_phone || ''}</span>
          </div>
        </div>
      `).join('');
    } catch (e) { apiUI.error(container, 'Failed to load appointments.'); }
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
  function statusColor(s) { return {pending:'#f59e0b',confirmed:'#0ea5e9',completed:'#10b981',cancelled:'#ef4444'}[s]||'#8b5cf6'; }
  function statusBadge(s) { return {pending:'badge-pending',confirmed:'badge-active',completed:'badge-success',cancelled:'badge-inactive'}[s]||''; }
  function capitalize(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }
  function formatTime(t) { if (!t) return '–'; const [h,m] = t.split(':'); const hr = +h; return (hr > 12 ? hr-12 : hr||12) + ':' + m + (hr >= 12 ? ' PM' : ' AM'); }
  function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
})();
