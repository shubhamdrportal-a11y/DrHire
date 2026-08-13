/**
 * dashboard-hospital-applications.js
 * Powers dashboard-hospital-applications.html
 */
(function () {
  'use strict';
  window.__expectedRole = 'hospital';

  let currentPage = 1;
  let currentStatus = '';
  let currentSearch = '';
  let searchDebounce = null;
  let allAppsForExport = [];

  document.addEventListener('drhire:auth', () => {
    loadStats();
    loadApplications();
    bindEvents();
  });

  function bindEvents() {
    document.getElementById('appStatusFilter')?.addEventListener('change', function () {
      currentStatus = this.value;
      currentPage = 1;
      loadApplications();
    });

    document.getElementById('appSearchInput')?.addEventListener('input', function () {
      clearTimeout(searchDebounce);
      const val = this.value;
      searchDebounce = setTimeout(() => {
        currentSearch = val.trim();
        currentPage = 1;
        loadApplications();
      }, 350);
    });

    document.getElementById('closeAppModal')?.addEventListener('click', () => {
      document.getElementById('appDetailsModal').classList.remove('active');
    });

    document.getElementById('exportAppsBtn')?.addEventListener('click', exportCsv);
  }

  async function loadStats() {
    try {
      const data = await api.get('/hospital/applications?per_page=1000');
      const apps = data.data || [];
      const count = s => apps.filter(a => a.status === s).length;
      document.getElementById('statTotalApps').textContent = data.total ?? apps.length;
      document.getElementById('statPendingApps').textContent = count('new') + count('reviewed');
      document.getElementById('statHiredApps').textContent = count('hired');
      document.getElementById('statRejectedApps').textContent = count('rejected');
    } catch (e) { /* stats are non-critical */ }
  }

  async function loadApplications() {
    const tbody = document.getElementById('appsTbody');
    const card = tbody.closest('.dash-card');
    apiUI.loading(card);
    try {
      const qs = new URLSearchParams({ page: currentPage, per_page: 15 });
      if (currentStatus) qs.set('status', currentStatus);
      if (currentSearch) qs.set('search', currentSearch);
      const data = await api.get(`/hospital/applications?${qs.toString()}`);
      const apps = data.data || [];
      allAppsForExport = apps;

      if (!apps.length) {
        apiUI.empty(card, 'No applications found.', 'fa-file-lines');
        return;
      }

      // Re-render full card (apiUI.empty/loading may replace innerHTML of the card)
      card.innerHTML = `
        <div class="dash-card-header">
          <span class="dash-card-title"><i class="fa-solid fa-list"></i> All Applications</span>
          <span class="dash-card-action" id="exportAppsBtn" style="cursor:pointer">Export CSV</span>
        </div>
        <div class="table-wrap">
          <table class="dash-table">
            <thead><tr><th>Applicant</th><th>Position Applied</th><th>Applied On</th><th>Resume</th><th>Status</th></tr></thead>
            <tbody id="appsTbody">
              ${apps.map(a => `
                <tr>
                  <td><div class="user-cell"><div class="ua ua-blue">${initials(a.applicant_name || a.applicant_email)}</div><div><div class="td-name" style="cursor:pointer" onclick="viewApplication(${a.id})">${escHtml(a.applicant_name || a.applicant_email)}</div><div class="td-sub">${escHtml(a.specialization || '')}${a.experience_years ? ' · ' + a.experience_years + ' yrs' : ''}</div></div></div></td>
                  <td>${escHtml(a.job_title)}</td>
                  <td>${formatDate(a.applied_at)}</td>
                  <td>${a.resume_file_id ? `<button class="btn-sm btn-outline-sm" onclick="downloadResume(${a.resume_file_id})"><i class="fa-solid fa-file-arrow-down"></i> Resume</button>` : '<span style="color:var(--text3);font-size:.75rem">Not uploaded</span>'}</td>
                  <td>${statusCell(a)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
        <div id="appsPagination" style="display:flex;gap:8px;justify-content:center;padding:16px"></div>
      `;
      document.getElementById('exportAppsBtn').addEventListener('click', exportCsv);
      renderPagination('appsPagination', data.page, data.total_pages, p => { currentPage = p; loadApplications(); });

    } catch (e) {
      apiUI.error(card, 'Failed to load applications.');
    }
  }

  function statusCell(a) {
    const badge = `<span class="badge ${badgeClass(a.status)}">${capitalize(a.status)}</span>`;
    if (a.status === 'hired' || a.status === 'rejected') return badge;
    return `<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
      ${badge}
      <select onchange="updateAppStatus(${a.id}, this.value)" style="font-size:.7rem;padding:2px 4px;background:var(--bg);border:1px solid var(--border);border-radius:4px;color:var(--text)">
        <option value="">Change…</option>
        <option value="reviewed">Reviewed</option>
        <option value="shortlisted">Shortlisted</option>
        <option value="interview">Interview</option>
        <option value="hired">Hire</option>
        <option value="rejected">Reject</option>
      </select>
    </div>`;
  }

  window.viewApplication = function (id) {
    const a = allAppsForExport.find(x => x.id === id);
    if (!a) return;
    const body = document.getElementById('appDetailsBody');
    body.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:10px">
        <div><strong>${escHtml(a.applicant_name || a.applicant_email)}</strong><br/><span style="color:var(--text3);font-size:.8rem">${escHtml(a.applicant_email)}</span></div>
        <div><strong>Position:</strong> ${escHtml(a.job_title)}</div>
        <div><strong>Specialization:</strong> ${escHtml(a.specialization || '–')}</div>
        <div><strong>Qualification:</strong> ${escHtml(a.qualification || '–')}</div>
        <div><strong>Experience:</strong> ${a.experience_years ? a.experience_years + ' years' : '–'}</div>
        <div><strong>Phone:</strong> ${escHtml(a.applicant_phone || '–')}</div>
        <div><strong>Applied:</strong> ${formatDate(a.applied_at)}</div>
        <div><strong>Status:</strong> <span class="badge ${badgeClass(a.status)}">${capitalize(a.status)}</span></div>
        ${a.cover_letter ? `<div><strong>Cover Note:</strong><br/>${escHtml(a.cover_letter)}</div>` : ''}
        ${a.resume_file_id ? `<button class="btn-sm btn-outline-sm" onclick="downloadResume(${a.resume_file_id})"><i class="fa-solid fa-file-arrow-down"></i> Download Resume</button>` : ''}
      </div>`;
    document.getElementById('appDetailsModal').classList.add('active');
  };

  window.updateAppStatus = async function (id, status) {
    if (!status) return;
    try {
      await api.patch(`/hospital/applications/${id}/status`, { status });
      apiUI.toast('Application status updated.', 'success');
      loadApplications();
      loadStats();
    } catch (e) {
      apiUI.toast(e.message, 'error');
    }
  };

  window.downloadResume = async function (fileId) {
    try {
      const url = await api.fileUrl(fileId);
      if (url) window.open(url, '_blank');
      else apiUI.toast('Resume file not found.', 'error');
    } catch (e) {
      apiUI.toast('Could not open resume.', 'error');
    }
  };

  function exportCsv() {
    if (!allAppsForExport.length) { apiUI.toast('No applications to export.', 'error'); return; }
    const rows = [['Applicant', 'Email', 'Position', 'Specialization', 'Experience', 'Applied On', 'Status']];
    allAppsForExport.forEach(a => rows.push([
      a.applicant_name || '', a.applicant_email || '', a.job_title || '',
      a.specialization || '', a.experience_years || '', a.applied_at || '', a.status || '',
    ]));
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `applications-${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function renderPagination(id, current, total, onPage) {
    const el = document.getElementById(id);
    if (!el || total <= 1) { if (el) el.innerHTML = ''; return; }
    el.innerHTML = '';
    for (let i = 1; i <= Math.min(total, 10); i++) {
      const btn = document.createElement('button');
      btn.textContent = i;
      btn.className = 'btn-sm ' + (i === current ? 'btn-primary' : 'btn-outline-sm');
      btn.onclick = () => onPage(i);
      el.appendChild(btn);
    }
  }

  function badgeClass(s) { return { new: 'badge-new', reviewed: 'badge-pending', shortlisted: 'badge-active', interview: 'badge-confirmed', hired: 'badge-completed', rejected: 'badge-rejected' }[s] || ''; }
  function capitalize(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }
  function initials(s) { return (s || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase(); }
  function formatDate(d) { return d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '–'; }
  function escHtml(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
})();
