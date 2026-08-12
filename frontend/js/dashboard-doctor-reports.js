/**
 * dashboard-doctor-reports.js — powers dashboard-doctor-reports.html
 */
(function () {
  'use strict';
  window.__expectedRole = 'doctor';

  let lastMonthly = [];
  let lastStats = {};

  document.addEventListener('drhire:auth', () => {
    loadReports();
    document.getElementById('reportsRangeFilter')?.addEventListener('change', loadReports);
    document.getElementById('reportsExportBtn')?.addEventListener('click', exportCsv);
    document.getElementById('reportsExportBtn2')?.addEventListener('click', exportCsv);
  });

  async function loadReports() {
    const months = document.getElementById('reportsRangeFilter')?.value || 6;
    try {
      const data = await api.get(`/doctor/reports?months=${months}`);
      lastMonthly = data.monthly_data || [];
      lastStats   = data.stats || {};
      renderStats(lastStats);
      renderChart(lastMonthly);
      renderBreakdown(lastStats);
      renderTopReasons(data.top_reasons || []);
    } catch (e) {
      apiUI.toast(e.message || 'Failed to load reports.', 'error');
    }
  }

  function renderStats(s) {
    const total = parseInt(s.total) || 0;
    const completed = parseInt(s.completed) || 0;
    setText('rpt-total', total);
    setText('rpt-completed', completed);
    setText('rpt-cancelled', parseInt(s.cancelled) || 0);
    setText('rpt-patients', parseInt(s.unique_patients) || 0);
    setText('rpt-completion-rate', total ? `${Math.round((completed / total) * 100)}% completion rate` : '');
  }

  function renderChart(monthly) {
    const container = document.getElementById('barChart');
    if (!container) return;

    // Aggregate counts per month (all statuses combined)
    const byMonth = {};
    const order = [];
    monthly.forEach(row => {
      if (!(row.month in byMonth)) { byMonth[row.month] = 0; order.push(row.month); }
      byMonth[row.month] += parseInt(row.count) || 0;
    });

    if (!order.length) {
      container.innerHTML = `<div style="width:100%;text-align:center;color:var(--text3);font-size:.82rem;padding:30px 0">No appointment data in this period.</div>`;
      setText('rpt-this-month', 0);
      setText('rpt-last-month', 0);
      return;
    }

    const max = Math.max(...order.map(m => byMonth[m]), 1);
    container.innerHTML = order.map((m, i) => {
      const pct = Math.max(4, Math.round((byMonth[m] / max) * 100));
      const isLast = i === order.length - 1;
      const bg = isLast ? 'linear-gradient(to top,#0ea5e9,#06b6d4)' : 'rgba(14,165,233,.3)';
      return `<div class="bar-wrap"><div class="bar" style="height:${pct}%;background:${bg}" title="${byMonth[m]} appointments"></div><div class="bar-label">${m}</div></div>`;
    }).join('');

    setText('rpt-this-month', byMonth[order[order.length - 1]] || 0);
    setText('rpt-last-month', order.length > 1 ? (byMonth[order[order.length - 2]] || 0) : 0);
  }

  function renderBreakdown(s) {
    const total = parseInt(s.total) || 0;
    const parts = [
      ['completed', parseInt(s.completed) || 0],
      ['pending',   parseInt(s.pending)   || 0],
      ['confirmed', parseInt(s.confirmed) || 0],
      ['cancelled', parseInt(s.cancelled) || 0],
    ];
    parts.forEach(([key, val]) => {
      const pct = total ? Math.round((val / total) * 100) : 0;
      setText(`brk-${key}-val`, `${val} (${pct}%)`);
      const bar = document.getElementById(`brk-${key}-bar`);
      if (bar) bar.style.width = pct + '%';
    });
  }

  function renderTopReasons(reasons) {
    const container = document.getElementById('rpt-top-reasons');
    if (!container) return;
    if (!reasons.length) {
      container.innerHTML = `<div style="font-size:.8rem;color:var(--text3)">No visit reasons recorded yet.</div>`;
      return;
    }
    const total = reasons.reduce((sum, r) => sum + (parseInt(r.count) || 0), 0) || 1;
    container.innerHTML = reasons.slice(0, 6).map(r => {
      const pct = Math.round(((parseInt(r.count) || 0) / total) * 100);
      const label = r.reason && r.reason.trim() ? r.reason : '(No reason given)';
      return `<div style="display:flex;align-items:center;justify-content:space-between;font-size:.82rem"><span style="color:var(--text2)">${escHtml(label)}</span><span style="color:var(--text);font-weight:600">${pct}%</span></div>`;
    }).join('');
  }

  function exportCsv() {
    if (!lastMonthly.length && !Object.keys(lastStats).length) {
      apiUI.toast('Nothing to export yet.', 'warning');
      return;
    }
    const rows = [['Metric', 'Value']];
    Object.entries(lastStats).forEach(([k, v]) => rows.push([k, v ?? 0]));
    rows.push([]);
    rows.push(['Month', 'Status', 'Count']);
    lastMonthly.forEach(r => rows.push([r.month, r.status, r.count]));

    const csv = rows.map(r => r.map(csvEscape).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `doctor-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    apiUI.toast('Report downloaded.', 'success');
  }

  function csvEscape(v) {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
  function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
})();
