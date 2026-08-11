/**
 * dashboard-hospital-main.js — powers dashboard-hospital.html
 */
(function () {
  'use strict';
  window.__expectedRole = 'hospital';

  document.addEventListener('drhire:auth', async () => {
    await Promise.all([loadStats(), loadRecentApplications()]);
  });

  async function loadStats() {
    try {
      const data = await api.get('/hospital/stats');
      const map = {
        'stat-active-jobs': data.active_jobs,
        'stat-total-jobs':  data.total_jobs,
        'stat-total-apps':  data.total_apps,
        'stat-new-apps':    data.new_apps,
      };
      Object.entries(map).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) animateCount(el, parseInt(val)||0);
      });
    } catch(e) { console.error(e); }
  }

  async function loadRecentApplications() {
    const container = document.getElementById('recentAppsContainer');
    if (!container) return;
    apiUI.loading(container);
    try {
      const data = await api.get('/hospital/applications?per_page=5');
      const apps = data.data || [];
      if (!apps.length) { apiUI.empty(container, 'No applications yet.', 'fa-file-contract'); return; }
      container.innerHTML = apps.map(a => `
        <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border)">
          <div class="ua ua-blue">${(a.applicant_name||a.applicant_email||'?')[0].toUpperCase()}</div>
          <div style="flex:1">
            <div style="font-weight:600;font-size:.85rem">${escHtml(a.applicant_name||a.applicant_email)}</div>
            <div style="font-size:.73rem;color:var(--text3)">${escHtml(a.job_title)} · ${formatDate(a.applied_at)}</div>
          </div>
          <span class="badge ${sBadge(a.status)}">${capitalize(a.status)}</span>
        </div>
      `).join('');
    } catch(e) { apiUI.error(container, 'Failed to load.'); }
  }

  function animateCount(el, target) {
    let c = 0; const s = Math.max(1, Math.ceil(target/40));
    const t = setInterval(() => { c = Math.min(c+s,target); el.textContent = c; if(c>=target) clearInterval(t); }, 25);
  }
  function sBadge(s) { return {new:'badge-pending',reviewed:'badge-pending',shortlisted:'badge-active',hired:'',rejected:''}[s]||''; }
  function capitalize(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }
  function formatDate(d) { return d ? new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short'}) : '–'; }
  function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
})();
