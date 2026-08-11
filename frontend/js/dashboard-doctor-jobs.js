/**
 * dashboard-doctor-jobs.js — powers dashboard-doctor-jobs.html
 */
(function () {
  'use strict';
  window.__expectedRole = 'doctor';

  let currentPage = 1;
  let currentFilters = { specialization: '', type: '', location: '', search: '' };

  document.addEventListener('drhire:auth', () => {
    loadJobs();
    bindFilters();
  });

  function bindFilters() {
    const searchInput = document.getElementById('jobSearchInput');
    const typeSelect  = document.getElementById('jobTypeFilter');
    const filterBtn   = document.getElementById('jobFilterBtn');

    filterBtn?.addEventListener('click', () => {
      currentFilters.search = searchInput?.value.trim() || '';
      currentFilters.type   = typeSelect?.value || '';
      currentPage = 1;
      loadJobs();
    });
    searchInput?.addEventListener('keydown', e => { if (e.key === 'Enter') filterBtn?.click(); });
  }

  async function loadJobs() {
    const container = document.getElementById('jobsContainer');
    if (!container) return;
    apiUI.loading(container);

    const params = new URLSearchParams({ page: currentPage, per_page: 12, ...Object.fromEntries(Object.entries(currentFilters).filter(([,v]) => v)) });

    try {
      const data = await api.get('/doctor/jobs?' + params);
      const jobs = data.data || [];

      if (!jobs.length) { apiUI.empty(container, 'No jobs found matching your criteria.', 'fa-briefcase'); return; }

      container.innerHTML = `<div class="jobs-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px">
        ${jobs.map(j => jobCard(j)).join('')}
      </div>`;

      renderPagination('jobsPagination', data.page, data.total_pages, p => { currentPage = p; loadJobs(); });
    } catch(e) { apiUI.error(container, 'Failed to load jobs: ' + e.message); }
  }

  function jobCard(j) {
    return `
      <div class="dash-card" style="padding:16px">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px">
          <div>
            <div style="font-weight:700;font-size:.92rem;color:var(--text)">${escHtml(j.title)}</div>
            <div style="font-size:.78rem;color:var(--text3);margin-top:3px">${escHtml(j.hospital)} · ${escHtml(j.location||j.city||'')}</div>
          </div>
          <span class="${j.badge_type||'badge-new'}" style="font-size:.65rem;padding:3px 8px;border-radius:20px;font-weight:700">${escHtml(j.badge_label||'New')}</span>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">
          <span class="badge badge-pending" style="font-size:.68rem"><i class="fa-solid fa-clock" style="margin-right:3px"></i>${escHtml(j.type)}</span>
          <span class="badge badge-pending" style="font-size:.68rem"><i class="fa-solid fa-stethoscope" style="margin-right:3px"></i>${escHtml(j.specialization)}</span>
          <span class="badge badge-pending" style="font-size:.68rem"><i class="fa-solid fa-briefcase-medical" style="margin-right:3px"></i>${escHtml(j.experience)}</span>
        </div>
        <div style="font-size:.8rem;font-weight:600;color:var(--success);margin-bottom:12px">${escHtml(j.salary)}</div>
        <div style="display:flex;gap:8px">
          <button class="btn-sm btn-outline-sm" style="flex:1" onclick="viewJobDetails(${j.id})"><i class="fa-solid fa-eye"></i> View</button>
          <button class="btn-sm btn-primary" style="flex:1;background:var(--accent);color:#fff;border:none;border-radius:8px;padding:6px 0;font-size:.78rem;cursor:pointer" onclick="applyForJob(${j.id},'${escHtml(j.title)}')"><i class="fa-solid fa-paper-plane"></i> Apply</button>
        </div>
      </div>`;
  }

  window.applyForJob = async function(jobId, jobTitle) {
    const coverLetter = prompt(`Apply for "${jobTitle}"\n\nEnter a cover letter message (optional):`);
    if (coverLetter === null) return; // cancelled
    try {
      await api.post(`/doctor/jobs/${jobId}/apply`, { cover_letter: coverLetter });
      apiUI.toast('Application submitted for "' + jobTitle + '"!', 'success');
    } catch(e) { apiUI.toast(e.message, 'error'); }
  };

  window.viewJobDetails = function(jobId) {
    window.location.href = `../pages/job-details.html?id=${jobId}`;
  };

  function renderPagination(id, current, total, onPage) {
    const el = document.getElementById(id);
    if (!el || total <= 1) return;
    el.innerHTML = '';
    for (let i = 1; i <= Math.min(total, 10); i++) {
      const btn = document.createElement('button');
      btn.textContent = i;
      btn.className = 'btn-sm ' + (i === current ? 'btn-primary' : 'btn-outline-sm');
      btn.onclick = () => onPage(i);
      el.appendChild(btn);
    }
  }

  function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
})();
