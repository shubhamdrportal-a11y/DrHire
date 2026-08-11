/**
 * dashboard-hospital-applications.js
 * Powers dashboard-hospital-applications.html
 */
(function () {
  'use strict';
  window.__expectedRole = 'hospital';

  let currentPage = 1;
  let currentStatus = '';

  document.addEventListener('drhire:auth', () => {
    loadApplications();
    bindFilters();
  });

  function bindFilters() {
    document.getElementById('appStatusFilter')?.addEventListener('change', function() {
      currentStatus = this.value;
      currentPage = 1;
      loadApplications();
    });
  }

  async function loadApplications() {
    const container = document.getElementById('appsTbody');
    if (!container) return;
    apiUI.loading(container.closest('.dash-card') || container);

    try {
      const data = await api.get(`/hospital/applications?page=${currentPage}&per_page=15${currentStatus ? '&status=' + currentStatus : ''}`);
      const apps = data.data || [];

      if (!apps.length) {
        container.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px">No applications found.</td></tr>';
        return;
      }

      container.innerHTML = apps.map(a => `
        <tr>
          <td>
            <div class="user-cell">
              <div class="ua ua-blue">${(a.applicant_name||a.applicant_email||'?')[0].toUpperCase()}</div>
              <div><div class="td-name">${escHtml(a.applicant_name||a.applicant_email)}</div><div class="td-sub">${escHtml(a.applicant_phone||'–')}</div></div>
            </div>
          </td>
          <td><div style="font-weight:600">${escHtml(a.job_title)}</div></td>
          <td>${formatDate(a.applied_at)}</td>
          <td>${sBadge(a.status)}</td>
          <td>
            ${a.resume_url ? `<a href="${a.resume_url}" target="_blank" class="btn-sm btn-outline-sm" style="display:inline-block;padding:4px 8px"><i class="fa-solid fa-file-pdf"></i> Resume</a>` : '<span style="color:var(--text3);font-size:.8rem">No resume</span>'}
          </td>
          <td>
            <select class="auth-input" style="padding:4px 8px;height:auto;font-size:.8rem" onchange="updateStatus(${a.id}, this.value)">
              <option value="new" ${a.status==='new'?'selected':''}>New</option>
              <option value="reviewed" ${a.status==='reviewed'?'selected':''}>Reviewed</option>
              <option value="shortlisted" ${a.status==='shortlisted'?'selected':''}>Shortlisted</option>
              <option value="interview" ${a.status==='interview'?'selected':''}>Interview</option>
              <option value="hired" ${a.status==='hired'?'selected':''}>Hired</option>
              <option value="rejected" ${a.status==='rejected'?'selected':''}>Rejected</option>
            </select>
          </td>
        </tr>
      `).join('');

      renderPagination('appsPagination', data.page, data.total_pages, p => { currentPage = p; loadApplications(); });

    } catch (err) {
      if (container.closest('.dash-card')) apiUI.error(container.closest('.dash-card'), 'Failed to load applications.');
    }
  }

  window.updateStatus = async function(id, status) {
    try {
      await api.patch(`/hospital/applications/${id}/status`, { status });
      apiUI.toast('Status updated to ' + status, 'success');
      // optional: reload data to reflect any server-side cascades
    } catch(e) {
      apiUI.toast(e.message, 'error');
      loadApplications(); // revert select
    }
  };

  function sBadge(s) {
    const map = {
      new: '<span class="badge badge-pending">New</span>',
      reviewed: '<span class="badge" style="background:#e0f2fe;color:#0284c7">Reviewed</span>',
      shortlisted: '<span class="badge badge-active">Shortlisted</span>',
      interview: '<span class="badge" style="background:#fef08a;color:#854d0e">Interview</span>',
      hired: '<span class="badge badge-success">Hired</span>',
      rejected: '<span class="badge badge-inactive">Rejected</span>',
    };
    return map[s] || `<span class="badge">${s}</span>`;
  }

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

  function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function formatDate(d) { return d ? new Date(d).toLocaleDateString('en-IN') : '–'; }
})();
