/**
 * dashboard-admin-reports.js
 * Powers dashboard-admin-reports.html — real aggregate reports backed by
 * GET /admin/reports (optional ?from=&to= date range).
 * "Export CSV" builds a real CSV client-side from the currently loaded
 * report data (there is no server-side file-generation endpoint for this,
 * so a fabricated download link would be fake — this instead downloads the
 * real numbers that are on screen).
 */

(function () {
  'use strict';
  window.__expectedRole = 'admin';

  let lastData = null;

  document.addEventListener('drhire:auth', () => {
    loadReports();
    document.getElementById('applyRangeBtn')?.addEventListener('click', loadReports);
    document.getElementById('exportCsvBtn')?.addEventListener('click', exportCsv);
  });

  async function loadReports() {
    const container = document.getElementById('reportsContainer');
    if (!container) return;
    apiUI.loading(container);

    const from = document.getElementById('reportFrom')?.value || '';
    const to   = document.getElementById('reportTo')?.value || '';
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to)   params.set('to', to);

    try {
      const data = await api.get('/admin/reports' + (params.toString() ? '?' + params : ''));
      lastData = data;
      render(container, data);
    } catch (err) {
      apiUI.error(container, 'Failed to load reports: ' + err.message);
    }
  }

  function render(container, data) {
    container.innerHTML = `
      ${section('Appointments by Status', data.appointments_by_status, 'status')}
      ${section('Applications by Status', data.applications_by_status, 'status')}
      ${section('Active Jobs by Type', data.jobs_by_type, 'type')}
      ${section('New Users per Month', data.users_per_month, 'month')}
      ${section('Top Specializations', data.top_specializations, 'specialization')}
    `;
  }

  function section(title, rows, labelKey) {
    rows = rows || [];
    if (!rows.length) {
      return `<div class="dash-card" style="margin-bottom:18px">
        <div class="dash-card-header"><div class="dash-card-title">${title}</div></div>
        <div style="padding:20px;color:var(--text3);font-size:.85rem">No data for this range.</div>
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

  function exportCsv() {
    if (!lastData) { apiUI.toast('Load a report first.', 'error'); return; }

    const lines = ['Section,Label,Count'];
    const add = (section, rows, key) => {
      (rows || []).forEach(r => lines.push(`"${section}","${String(r[key] ?? '').replace(/"/g, '""')}",${r.count}`));
    };
    add('Appointments by Status', lastData.appointments_by_status, 'status');
    add('Applications by Status', lastData.applications_by_status, 'status');
    add('Active Jobs by Type', lastData.jobs_by_type, 'type');
    add('New Users per Month', lastData.users_per_month, 'month');
    add('Top Specializations', lastData.top_specializations, 'specialization');

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `drhire-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    apiUI.toast('Report exported.', 'success');
  }

  function escHtml(s) { return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
})();
