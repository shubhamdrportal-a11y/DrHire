/**
 * dashboard-doctor-appointments.js — powers dashboard-doctor-appointments.html
 */
(function () {
  'use strict';
  window.__expectedRole = 'doctor';

  let currentStatus = '';
  let currentDate   = '';

  document.addEventListener('drhire:auth', () => {
    loadStats();
    loadAppointments();
    bindFilters();
  });

  function bindFilters() {
    document.getElementById('filterStatus')?.addEventListener('change', function() {
      currentStatus = this.value;
      loadAppointments();
    });
    document.getElementById('filterDate')?.addEventListener('change', function() {
      currentDate = this.value;
      loadAppointments();
    });
    document.getElementById('filterTodayBtn')?.addEventListener('click', () => {
      currentDate = 'today';
      const inp = document.getElementById('filterDate');
      if (inp) inp.value = '';
      loadAppointments();
    });
    document.getElementById('filterAllBtn')?.addEventListener('click', () => {
      currentStatus = '';
      currentDate = '';
      const s = document.getElementById('filterStatus');
      const d = document.getElementById('filterDate');
      if (s) s.value = '';
      if (d) d.value = '';
      loadAppointments();
    });
  }

  async function loadStats() {
    try {
      const data = await api.get('/doctor/stats');
      const a = data.appointments || {};
      const ids = { 'stat-today': a.today, 'stat-upcoming': a.upcoming, 'stat-completed': a.completed, 'stat-cancelled': a.cancelled };
      Object.entries(ids).forEach(([id, v]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = v || 0;
      });
    } catch {}
  }

  async function loadAppointments() {
    const container = document.getElementById('apptListContainer');
    if (!container) return;
    apiUI.loading(container);

    const params = new URLSearchParams();
    if (currentStatus) params.set('status', currentStatus);
    if (currentDate)   params.set('date', currentDate);
    params.set('per_page', '30');

    try {
      const data  = await api.get('/doctor/appointments?' + params);
      const appts = data.data || [];

      if (!appts.length) {
        apiUI.empty(container, 'No appointments found for the selected filters.', 'fa-calendar-xmark');
        return;
      }

      container.innerHTML = appts.map(a => `
        <div class="appt-card" id="appt-${a.id}">
          <div class="appt-card-top">
            <div class="appt-patient-avatar" style="background:${sColor(a.status)}20;color:${sColor(a.status)}">${(a.patient_name||'?')[0].toUpperCase()}</div>
            <div style="flex:1">
              <div class="appt-patient-name">${escHtml(a.patient_name)}</div>
              <div class="appt-patient-meta">
                <span><i class="fa-solid fa-phone"></i> ${escHtml(a.patient_phone||'–')}</span>
                <span><i class="fa-solid fa-venus-mars"></i> ${a.patient_gender||'–'}</span>
                <span><i class="fa-solid fa-cake-candles"></i> ${a.patient_age ? 'Age ' + a.patient_age : '–'}</span>
              </div>
            </div>
            <span class="badge ${sBadge(a.status)}" style="font-size:.73rem">${capitalize(a.status)}</span>
          </div>
          <div class="appt-card-body">
            <div class="appt-detail"><div class="appt-detail-label">Date</div><div class="appt-detail-val">${formatDate(a.appointment_date)}</div></div>
            <div class="appt-detail"><div class="appt-detail-label">Time</div><div class="appt-detail-val">${formatTime(a.appointment_time)}</div></div>
            <div class="appt-detail"><div class="appt-detail-label">Address</div><div class="appt-detail-val" style="font-size:.75rem">${escHtml(a.patient_address||'–')}</div></div>
          </div>
          <div class="appt-reason-box"><strong>Reason:</strong> ${escHtml(a.reason||'–')}${a.notes?'<br><strong>Notes:</strong> '+escHtml(a.notes):''}</div>
          <div class="appt-card-actions">
            <div class="appt-card-btns">
              ${a.status === 'pending'   ? `<button class="btn-sm btn-outline-sm" onclick="changeStatus(${a.id},'confirmed')"><i class="fa-solid fa-check"></i> Confirm</button>` : ''}
              ${a.status === 'confirmed' ? `<button class="btn-sm btn-outline-sm" style="color:var(--success)" onclick="changeStatus(${a.id},'completed')"><i class="fa-solid fa-circle-check"></i> Complete</button>` : ''}
              ${['pending','confirmed'].includes(a.status) ? `<button class="btn-sm btn-outline-sm" style="color:var(--danger)" onclick="changeStatus(${a.id},'cancelled')"><i class="fa-solid fa-xmark"></i> Cancel</button>` : ''}
            </div>
            <span style="font-size:.7rem;color:var(--text3)">Booked ${formatDate(a.created_at)}</span>
          </div>
        </div>
      `).join('');
    } catch(e) { apiUI.error(container, 'Failed to load appointments: ' + e.message); }
  }

  window.changeStatus = async function(id, status) {
    try {
      await api.patch(`/doctor/appointments/${id}/status`, { status });
      apiUI.toast('Appointment ' + status + '.', 'success');
      loadAppointments();
      loadStats();
    } catch(e) { apiUI.toast(e.message, 'error'); }
  };

  function sColor(s) { return {pending:'#f59e0b',confirmed:'#0ea5e9',completed:'#10b981',cancelled:'#ef4444'}[s]||'#8b5cf6'; }
  function sBadge(s) { return {pending:'badge-pending',confirmed:'badge-active',completed:'',cancelled:''}[s]||''; }
  function capitalize(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }
  function formatDate(d) { return d ? new Date(d).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'}) : '–'; }
  function formatTime(t) { if(!t) return '–'; const [h,m]=t.split(':'); const hr=+h; return (hr>12?hr-12:hr||12)+':'+m+(hr>=12?' PM':' AM'); }
  function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
})();
