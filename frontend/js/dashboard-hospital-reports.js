/**
 * dashboard-hospital-reports.js
 * Powers dashboard-hospital-reports.html
 */
(function () {
  'use strict';
  window.__expectedRole = 'hospital';

  let lastReport = null;

  document.addEventListener('drhire:auth', () => {
    loadReports();
    document.getElementById('reportFrom')?.addEventListener('change', loadReports);
    document.getElementById('reportTo')?.addEventListener('change', loadReports);
    document.getElementById('exportAllBtn')?.addEventListener('click', exportCsv);
  });

  async function loadReports() {
    const from = document.getElementById('reportFrom').value;
    const to = document.getElementById('reportTo').value;
    const qs = new URLSearchParams();
    if (from && to) { qs.set('from', from); qs.set('to', to); }

    try {
      const [report, jobsData] = await Promise.all([
        api.get(`/hospital/reports?${qs.toString()}`),
        api.get('/hospital/jobs?status=active&per_page=1'),
      ]);
      lastReport = report;

      document.getElementById('statAppts').textContent = report.total_appointments;
      document.getElementById('statActiveDoctors').textContent = report.active_doctors;
      const totalApps = (report.apps_by_status || []).reduce((s, r) => s + parseInt(r.count), 0);
      document.getElementById('statApps').textContent = totalApps;
      document.getElementById('statActiveJobsR').textContent = jobsData.total ?? 0;

      renderBarChart(report.monthly_appointments || []);
      renderSpecBreakdown(report.specialization_breakdown || []);
      renderJobStats(report.job_stats || []);
    } catch (e) {
      apiUI.toast('Failed to load report data.', 'error');
    }
  }

  function renderBarChart(rows) {
    const el = document.getElementById('apptsBarChart');
    if (!rows.length) { el.innerHTML = '<div style="text-align:center;width:100%;color:var(--text3);font-size:.8rem">No appointment data yet.</div>'; return; }
    const max = Math.max(...rows.map(r => parseInt(r.count)), 1);
    el.innerHTML = rows.map(r => {
      const pct = Math.max(6, Math.round((parseInt(r.count) / max) * 100));
      const [y, m] = r.ym.split('-');
      const label = new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short' });
      return `<div class="bar-wrap"><div class="bar" style="height:${pct}%;background:linear-gradient(to top,#0ea5e9,#06b6d4)" title="${r.count}"></div><div class="bar-label">${label}</div></div>`;
    }).join('');
  }

  function renderSpecBreakdown(rows) {
    const el = document.getElementById('specBreakdown');
    if (!rows.length) { el.innerHTML = '<div style="text-align:center;color:var(--text3);font-size:.8rem">No doctors on your roster yet.</div>'; return; }
    const total = rows.reduce((s, r) => s + parseInt(r.count), 0) || 1;
    const colors = ['var(--accent)', 'var(--success)', 'var(--purple)', 'var(--warning)', 'var(--text3)'];
    el.innerHTML = rows.map((r, i) => {
      const pct = Math.round((parseInt(r.count) / total) * 100);
      return `<div class="prog-row"><div class="prog-header"><span class="prog-label">${escHtml(r.specialization || 'Unspecified')}</span><span class="prog-val">${pct}%</span></div><div class="prog-bar"><div class="prog-fill" style="width:${pct}%;background:${colors[i % colors.length]}"></div></div></div>`;
    }).join('');
  }

  function renderJobStats(rows) {
    const el = document.getElementById('jobStatsReport');
    if (!rows.length) { el.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text3)">No jobs posted in this period.</div>'; return; }
    el.innerHTML = rows.map(r => `
      <div class="report-row">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="width:38px;height:38px;border-radius:8px;background:rgba(14,165,233,.1);display:flex;align-items:center;justify-content:center;color:var(--accent)"><i class="fa-solid fa-briefcase-medical"></i></div>
          <div><div style="font-size:.86rem;font-weight:600;color:var(--text)">${escHtml(r.title)}</div><div style="font-size:.72rem;color:var(--text3)">${r.applications} application${r.applications == 1 ? '' : 's'} · ${escHtml(r.status)}</div></div>
        </div>
      </div>
    `).join('');
  }

  function exportCsv() {
    if (!lastReport) { apiUI.toast('Report not loaded yet.', 'error'); return; }
    const rows = [['Section', 'Label', 'Value']];
    rows.push(['Summary', 'Total Appointments', lastReport.total_appointments]);
    rows.push(['Summary', 'Active Doctors', lastReport.active_doctors]);
    (lastReport.apps_by_status || []).forEach(r => rows.push(['Applications by Status', r.status, r.count]));
    (lastReport.job_stats || []).forEach(r => rows.push(['Jobs', r.title, r.applications]));
    (lastReport.specialization_breakdown || []).forEach(r => rows.push(['Roster by Specialization', r.specialization || 'Unspecified', r.count]));
    (lastReport.monthly_appointments || []).forEach(r => rows.push(['Monthly Appointments', r.ym, r.count]));

    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hospital-report-${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function escHtml(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
})();
