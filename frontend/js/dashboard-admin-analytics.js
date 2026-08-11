/**
 * dashboard-admin-analytics.js
 * Powers dashboard-admin-analytics.html — real platform counters (GET
 * /admin/stats) plus breakdown charts (GET /admin/reports). Charts are
 * rendered as plain CSS bar rows (no charting library is loaded anywhere
 * else in the project, so this stays consistent with the codebase).
 */

(function () {
  'use strict';
  window.__expectedRole = 'admin';

  document.addEventListener('drhire:auth', loadAnalytics);

  async function loadAnalytics() {
    const counters = document.getElementById('analyticsCounters');
    const container = document.getElementById('analyticsContainer');
    if (!counters || !container) return;
    apiUI.loading(container);

    try {
      const [stats, reports] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/reports'),
      ]);

      counters.innerHTML = [
        ['Total Users', stats.users],
        ['Doctors', stats.doctors],
        ['Hospitals', stats.hospitals],
        ['Staff', stats.staff],
        ['Active Jobs', stats.active_jobs],
        ['Appointments', stats.appointments],
        ['Applications', stats.applications],
        ['New This Month', stats.monthly_growth?.current ?? 0],
      ].map(([label, val]) => `
        <div class="analytics-counter">
          <div class="val">${val ?? 0}</div>
          <div class="label">${label}</div>
        </div>`).join('');

      container.innerHTML = `
        ${section('Users Registered per Month', reports.users_per_month, 'month')}
        ${section('Appointments by Status', reports.appointments_by_status, 'status')}
        ${section('Applications by Status', reports.applications_by_status, 'status')}
        ${section('Active Jobs by Type', reports.jobs_by_type, 'type')}
        ${section('Top Doctor Specializations', reports.top_specializations, 'specialization')}
      `;
    } catch (err) {
      apiUI.error(container, 'Failed to load analytics: ' + err.message);
      counters.innerHTML = '';
    }
  }

  function section(title, rows, labelKey) {
    rows = rows || [];
    if (!rows.length) {
      return `<div class="dash-card" style="margin-bottom:18px">
        <div class="dash-card-header"><div class="dash-card-title">${title}</div></div>
        <div style="padding:20px;color:var(--text3);font-size:.85rem">No data available.</div>
      </div>`;
    }
    const max = Math.max(...rows.map(r => Number(r.count) || 0), 1);
    return `<div class="dash-card" style="margin-bottom:18px">
      <div class="dash-card-header"><div class="dash-card-title">${title}</div></div>
      <div style="padding:20px">
        ${rows.map(r => `
          <div class="report-bar-row">
            <div class="report-bar-label">${escHtml(r[labelKey] || '–')}</div>
            <div class="report-bar-track"><div class="report-bar-fill" style="width:${(Number(r.count) / max) * 100}%"></div></div>
            <div class="report-bar-count">${r.count}</div>
          </div>`).join('')}
      </div>
    </div>`;
  }

  function escHtml(s) { return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
})();
