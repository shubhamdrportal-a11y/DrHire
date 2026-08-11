/**
 * dashboard-admin-jobs.js
 * Powers dashboard-admin-jobs.html — real job listings backed by
 * GET /admin/jobs (search + status filter + pagination).
 */

(function () {
  'use strict';
  window.__expectedRole = 'admin';

  let currentPage = 1;
  let currentFilters = { search: '', status: '' };
  let rowsById = {};

  document.addEventListener('drhire:auth', () => {
    loadJobs();
    bindFilters();
  });

  function bindFilters() {
    document.getElementById('filterBtn')?.addEventListener('click', () => {
      currentFilters.search = document.getElementById('jobSearchInput')?.value.trim() || '';
      currentFilters.status = document.getElementById('jobStatusFilter')?.value || '';
      currentPage = 1;
      loadJobs();
    });
    document.getElementById('jobSearchInput')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('filterBtn')?.click();
    });
  }

  async function loadJobs() {
    const card = document.getElementById('jobsCard');
    if (!card) return;
    apiUI.loading(card);

    const params = new URLSearchParams({
      page: currentPage,
      per_page: 20,
      ...Object.fromEntries(Object.entries(currentFilters).filter(([, v]) => v)),
    });

    try {
      const data = await api.get('/admin/jobs?' + params);
      const jobs = data.data || [];
      rowsById = {};

      card.innerHTML = `
        <div class="table-wrap">
          <table class="dash-table">
            <thead><tr><th>Job Title</th><th>Hospital</th><th>Type</th><th>Status</th><th>Posted</th><th>Actions</th></tr></thead>
            <tbody id="jobsTbody"></tbody>
          </table>
        </div>
        <div id="jobsPagination" style="display:flex;justify-content:center;gap:8px;padding:16px"></div>
      `;
      const tbody = document.getElementById('jobsTbody');

      if (!jobs.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text3);padding:40px">No jobs found.</td></tr>';
        return;
      }

      const statusColors = { active: 'badge-active', draft: 'badge-pending', closed: '' };

      tbody.innerHTML = jobs.map(j => {
        rowsById[j.id] = j;
        const badge = j.status === 'active'
          ? '<span class="badge badge-active">Active</span>'
          : j.status === 'draft'
            ? '<span class="badge badge-pending">Draft</span>'
            : '<span class="badge" style="color:var(--danger);background:rgba(239,68,68,.1)">Closed</span>';

        return `
          <tr>
            <td><div class="td-name">${escHtml(j.title)}</div><div class="td-sub">${escHtml(j.specialization || '')}</div></td>
            <td>${escHtml(j.hospital || '–')}</td>
            <td>${escHtml(j.type || '–')}</td>
            <td>${badge}</td>
            <td>${formatDate(j.created_at)}</td>
            <td><button class="btn-sm btn-outline-sm" title="View Job" onclick="viewJob(${j.id})"><i class="fa-solid fa-eye"></i></button></td>
          </tr>`;
      }).join('');

      renderPagination('jobsPagination', data.page, data.total_pages, p => { currentPage = p; loadJobs(); });
    } catch (err) {
      apiUI.error(card, 'Failed to load jobs: ' + err.message);
    }
  }

  window.viewJob = function (jobId) {
    const j = rowsById[jobId];
    if (!j) return;
    const reqs = (j.requirements || []).map(r => `<li>${escHtml(r)}</li>`).join('') || '<li>–</li>';
    const benefits = (j.benefits || []).map(b => `<li>${escHtml(b)}</li>`).join('') || '<li>–</li>';
    openModal(escHtml(j.title), `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;font-size:.85rem">
        <div><strong>Hospital</strong><div style="color:var(--text2)">${escHtml(j.hospital || '–')}, ${escHtml(j.city || '')}</div></div>
        <div><strong>Type</strong><div style="color:var(--text2)">${escHtml(j.type || '–')}</div></div>
        <div><strong>Specialization</strong><div style="color:var(--text2)">${escHtml(j.specialization || '–')}</div></div>
        <div><strong>Experience</strong><div style="color:var(--text2)">${escHtml(j.experience || '–')}</div></div>
        <div><strong>Salary</strong><div style="color:var(--text2)">${escHtml(j.salary || '–')}</div></div>
        <div><strong>Location</strong><div style="color:var(--text2)">${escHtml(j.location || '–')}</div></div>
        <div><strong>Status</strong><div style="color:var(--text2)">${escHtml(j.status)}</div></div>
        <div><strong>Posted</strong><div style="color:var(--text2)">${formatDate(j.created_at)}</div></div>
        <div style="grid-column:1/-1"><strong>Description</strong><div style="color:var(--text2)">${escHtml(j.description || '–')}</div></div>
        <div><strong>Requirements</strong><ul style="color:var(--text2);margin:4px 0 0 18px">${reqs}</ul></div>
        <div><strong>Benefits</strong><ul style="color:var(--text2);margin:4px 0 0 18px">${benefits}</ul></div>
      </div>
    `);
  };

  function openModal(title, bodyHtml) {
    let overlay = document.getElementById('_genModal');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.id = '_genModal';
      overlay.innerHTML = `
        <div class="modal-box" style="max-width:640px">
          <div class="modal-header">
            <div class="modal-title" id="_genModalTitle"></div>
            <button class="modal-close" id="_genModalClose"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div id="_genModalBody"></div>
        </div>`;
      document.body.appendChild(overlay);
      overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
      document.getElementById('_genModalClose').addEventListener('click', closeModal);
    }
    document.getElementById('_genModalTitle').textContent = title;
    document.getElementById('_genModalBody').innerHTML = bodyHtml;
    overlay.classList.add('active');
  }
  function closeModal() { document.getElementById('_genModal')?.classList.remove('active'); }

  function renderPagination(containerId, current, total, onPage) {
    const el = document.getElementById(containerId);
    if (!el || total <= 1) return;
    el.innerHTML = '';
    for (let i = 1; i <= total; i++) {
      const btn = document.createElement('button');
      btn.textContent = i;
      btn.className = 'btn-sm ' + (i === current ? 'btn-primary' : 'btn-outline-sm');
      btn.addEventListener('click', () => onPage(i));
      el.appendChild(btn);
    }
  }

  function escHtml(s) { return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function formatDate(d) { return d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '–'; }
})();
