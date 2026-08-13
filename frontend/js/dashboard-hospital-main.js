/**
 * dashboard-hospital-main.js — powers dashboard-hospital.html
 */
(function () {
  'use strict';
  window.__expectedRole = 'hospital';

  document.addEventListener('drhire:auth', async () => {
    await Promise.all([
      loadStats(),
      loadActiveJobs(),
      loadRecentApplications(),
      loadOurDoctors(),
      loadRecentActivity(),
    ]);
  });

  async function loadStats() {
    try {
      const data = await api.get('/hospital/stats');
      const map = {
        'stat-total-doctors': data.total_doctors,
        'stat-active-jobs':   data.active_jobs,
        'stat-new-apps':      data.new_apps,
        'stat-appts-today':   data.appts_today,
      };
      Object.entries(map).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) animateCount(el, parseInt(val) || 0);
      });
    } catch (e) { console.error(e); }
  }

  async function loadActiveJobs() {
    const body = document.getElementById('activeJobsBody');
    if (!body) return;
    try {
      const data = await api.get('/hospital/jobs?status=active&per_page=5');
      const jobs = data.data || [];
      if (!jobs.length) {
        body.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:30px;color:var(--text3)">No active job listings.</td></tr>';
        return;
      }
      body.innerHTML = jobs.map(j => `
        <tr>
          <td style="font-weight:600;color:var(--text)">${escHtml(j.title)}</td>
          <td style="font-weight:700;color:var(--text)">${j.application_count}</td>
          <td><span class="badge badge-active">Active</span></td>
          <td><div style="display:flex;gap:6px">
            <a href="dashboard-hospital-jobs.html" class="btn-sm btn-outline-sm">View</a>
          </div></td>
        </tr>`).join('');
    } catch (e) {
      body.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:30px;color:var(--danger)">Failed to load jobs.</td></tr>';
    }
  }

  async function loadRecentApplications() {
    const container = document.getElementById('recentAppsContainer');
    if (!container) return;
    apiUI.loading(container);
    try {
      const data = await api.get('/hospital/applications?per_page=5');
      const apps = data.data || [];
      if (!apps.length) { apiUI.empty(container, 'No applications yet.', 'fa-file-contract'); return; }
      container.innerHTML = `
        <table class="dash-table">
          <thead><tr><th>Applicant</th><th>Applied For</th><th>Status</th></tr></thead>
          <tbody>
            ${apps.map(a => `
              <tr>
                <td><div class="user-cell"><div class="ua ua-blue">${(a.applicant_name||a.applicant_email||'?')[0].toUpperCase()}</div><div><div class="td-name">${escHtml(a.applicant_name||a.applicant_email)}</div><div class="td-sub">${escHtml(a.specialization||'')}</div></div></div></td>
                <td>${escHtml(a.job_title)}</td>
                <td><span class="badge ${sBadge(a.status)}">${capitalize(a.status)}</span></td>
              </tr>`).join('')}
          </tbody>
        </table>`;
    } catch (e) { apiUI.error(container, 'Failed to load.'); }
  }

  async function loadOurDoctors() {
    const body = document.getElementById('ourDoctorsBody');
    if (!body) return;
    try {
      const data = await api.get('/hospital/doctors');
      const doctors = (data.data || []).slice(0, 5);
      if (!doctors.length) {
        body.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:30px;color:var(--text3)">No doctors on your roster yet.</td></tr>';
        return;
      }
      body.innerHTML = doctors.map(d => `
        <tr>
          <td><div class="user-cell"><div class="ua ua-blue">${(d.full_name||'?')[0].toUpperCase()}</div><div><div class="td-name">${escHtml(d.full_name)}</div><div class="td-sub">${escHtml(d.specialization||'–')}</div></div></div></td>
          <td>${escHtml(d.specialization || '–')}</td>
          <td>${d.experience_years ? d.experience_years + ' yrs' : '–'}</td>
          <td><span class="badge ${d.is_available == 1 ? 'badge-active' : 'badge-inactive'}">${d.is_available == 1 ? 'On Duty' : 'Off Duty'}</span></td>
        </tr>`).join('');
    } catch (e) {
      body.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:30px;color:var(--danger)">Failed to load doctors.</td></tr>';
    }
  }

  async function loadRecentActivity() {
    const container = document.getElementById('recentActivityList');
    if (!container) return;
    try {
      const data = await api.get('/hospital/applications?per_page=5');
      const apps = data.data || [];
      if (!apps.length) { apiUI.empty(container, 'No recent activity.', 'fa-clock-rotate-left'); return; }
      container.innerHTML = apps.map(a => `
        <div class="act-item">
          <div class="act-dot"></div>
          <div><div class="act-text">New application from <strong>${escHtml(a.applicant_name||a.applicant_email)}</strong> for ${escHtml(a.job_title)}</div><div class="act-time">${formatDate(a.applied_at)}</div></div>
        </div>`).join('');
    } catch (e) { apiUI.error(container, 'Failed to load activity.'); }
  }

  function animateCount(el, target) {
    let c = 0; const s = Math.max(1, Math.ceil(target/40));
    const t = setInterval(() => { c = Math.min(c+s,target); el.textContent = c; if(c>=target) clearInterval(t); }, 25);
  }
  function sBadge(s) { return {new:'badge-pending',reviewed:'badge-pending',shortlisted:'badge-active',interview:'badge-confirmed',hired:'badge-completed',rejected:'badge-inactive'}[s]||''; }
  function capitalize(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }
  function formatDate(d) { return d ? new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short'}) : '–'; }
  function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
})();
