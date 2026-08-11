/**
 * dashboard-staff-appointments.js
 * Powers dashboard-staff-appointments.html
 */
(function () {
  'use strict';
  window.__expectedRole = 'staff';

  let currentPage = 1;
  let currentStatus = '';

  document.addEventListener('drhire:auth', () => {
    loadAppointments();
    bindFilters();
  });

  function bindFilters() {
    document.getElementById('apptStatusFilter')?.addEventListener('change', function() {
      currentStatus = this.value;
      currentPage = 1;
      loadAppointments();
    });
  }

  async function loadAppointments() {
    const container = document.getElementById('myApptsContainer');
    if (!container) return;
    apiUI.loading(container);

    const params = new URLSearchParams({ page: currentPage, per_page: 15 });
    if (currentStatus) params.set('status', currentStatus);

    try {
      const data = await api.get('/staff/appointments?' + params);
      const appts = data.data || [];

      if (!appts.length) { apiUI.empty(container, 'No appointments found.', 'fa-calendar-xmark'); return; }

      container.innerHTML = appts.map(a => `
        <div class="dash-card" style="padding:16px;margin-bottom:16px">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px">
            <div style="display:flex;gap:12px;align-items:center">
              <div class="ua ua-blue" style="width:40px;height:40px"><i class="fa-solid fa-user-doctor"></i></div>
              <div>
                <div style="font-weight:700;color:var(--text)">${escHtml(a.doctor_name || 'Doctor')}</div>
                <div style="font-size:.78rem;color:var(--text3)">${escHtml(a.doctor_specialization || 'General')}</div>
              </div>
            </div>
            <span class="badge ${sBadge(a.status)}">${capitalize(a.status)}</span>
          </div>

          <div style="background:var(--bg);border-radius:8px;padding:12px;margin-bottom:12px;display:flex;gap:20px;font-size:.8rem">
            <div><div style="color:var(--text3);margin-bottom:4px">Date & Time</div><div style="font-weight:600"><i class="fa-solid fa-calendar" style="margin-right:4px"></i>${formatDate(a.appointment_date)} at ${formatTime(a.appointment_time)}</div></div>
            <div><div style="color:var(--text3);margin-bottom:4px">Patient</div><div style="font-weight:600"><i class="fa-solid fa-user" style="margin-right:4px"></i>${escHtml(a.patient_name)}</div></div>
          </div>

          <div style="display:flex;justify-content:space-between;align-items:center">
            <div style="font-size:.8rem;color:var(--text2)"><strong>Reason:</strong> ${escHtml(a.reason || '–')}</div>
            ${['pending','confirmed'].includes(a.status) ? `<button class="btn-sm btn-outline-sm" style="color:var(--danger);border-color:rgba(239,68,68,.2)" onclick="cancelAppt(${a.id})"><i class="fa-solid fa-xmark"></i> Cancel</button>` : ''}
          </div>
        </div>
      `).join('');

      renderPagination('apptsPagination', data.page, data.total_pages, p => { currentPage = p; loadAppointments(); });
    } catch(e) { apiUI.error(container, 'Failed to load appointments: ' + e.message); }
  }

  window.cancelAppt = async function(id) {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await api.delete(`/staff/appointments/${id}`);
      apiUI.toast('Appointment cancelled.', 'success');
      loadAppointments();
    } catch(e) { apiUI.toast(e.message, 'error'); }
  };

  function sBadge(s) { return {pending:'badge-pending',confirmed:'badge-active',completed:'badge-success',cancelled:'badge-inactive'}[s]||''; }
  function capitalize(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }
  function formatDate(d) { return d ? new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '–'; }
  function formatTime(t) { if(!t) return '–'; const [h,m]=t.split(':'); const hr=+h; return (hr>12?hr-12:hr||12)+':'+m+(hr>=12?' PM':' AM'); }
  function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function renderPagination(id, current, total, onPage) {
    const el = document.getElementById(id);
    if (!el || total <= 1) { if(el) el.innerHTML=''; return; }
    el.innerHTML = '';
    for (let i = 1; i <= Math.min(total, 10); i++) {
      const btn = document.createElement('button');
      btn.textContent = i;
      btn.className = 'btn-sm ' + (i === current ? 'btn-primary' : 'btn-outline-sm');
      btn.onclick = () => onPage(i);
      el.appendChild(btn);
    }
  }
})();
