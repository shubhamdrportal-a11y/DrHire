/**
 * dashboard-staff-main.js
 * Powers dashboard-staff.html
 */
(function () {
  'use strict';
  window.__expectedRole = 'staff';

  document.addEventListener('drhire:auth', async () => {
    await Promise.all([loadStats(), loadUpcomingAppointments()]);
  });

  async function loadStats() {
    try {
      const data = await api.get('/staff/stats');
      const a = data.appointments || {};
      const ids = {
        'stat-upcoming': a.upcoming,
        'stat-completed': a.completed,
        'stat-total-apps': data.applications,
      };
      Object.entries(ids).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) animateCount(el, parseInt(val)||0);
      });
    } catch(e) { console.error(e); }
  }

  async function loadUpcomingAppointments() {
    const container = document.getElementById('upcomingApptsContainer');
    if (!container) return;
    apiUI.loading(container);

    try {
      // Get upcoming appointments (pending/confirmed only)
      const data = await api.get('/staff/appointments?per_page=5');
      const appts = (data.data || []).filter(a => ['pending','confirmed'].includes(a.status));

      if (!appts.length) {
        apiUI.empty(container, 'No upcoming appointments.', 'fa-calendar-check');
        return;
      }

      container.innerHTML = appts.map(a => `
        <div class="appt-card" style="margin-bottom:12px">
          <div class="appt-card-top">
            <div class="appt-patient-avatar" style="background:#0ea5e920;color:#0ea5e9">
              <i class="fa-solid fa-user-doctor"></i>
            </div>
            <div>
              <div class="appt-patient-name">${escHtml(a.doctor_name || 'Doctor')}</div>
              <div class="appt-patient-meta">
                <span><i class="fa-solid fa-calendar"></i> ${formatDate(a.appointment_date)}</span>
                <span><i class="fa-solid fa-clock"></i> ${formatTime(a.appointment_time)}</span>
              </div>
            </div>
            <span class="badge ${a.status === 'confirmed' ? 'badge-active' : 'badge-pending'}" style="margin-left:auto">${capitalize(a.status)}</span>
          </div>
        </div>
      `).join('');

    } catch(e) { apiUI.error(container, 'Failed to load appointments.'); }
  }

  function animateCount(el, target) {
    let c = 0; const s = Math.max(1, Math.ceil(target/40));
    const t = setInterval(() => { c = Math.min(c+s,target); el.textContent = c; if(c>=target) clearInterval(t); }, 25);
  }
  function capitalize(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }
  function formatDate(d) { return d ? new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short'}) : '–'; }
  function formatTime(t) { if(!t) return '–'; const [h,m]=t.split(':'); const hr=+h; return (hr>12?hr-12:hr||12)+':'+m+(hr>=12?' PM':' AM'); }
  function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
})();
