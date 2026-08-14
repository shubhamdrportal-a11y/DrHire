/**
 * dashboard-staff-jobs.js — powers dashboard-staff-jobs.html
 */
(function () {
  'use strict';
  window.__expectedRole = 'staff';

  let currentPage = 1;
  let currentFilters = { type: '', location: '', search: '' };
  let appliedJobIds = new Set();

  document.addEventListener('drhire:auth', () => {
    loadAppliedIds().then(loadJobs);
    bindFilters();
    updateNavBadge();
    document.getElementById('jobDetailsClose')?.addEventListener('click', closeJobModal);
    document.getElementById('jobDetailsClose2')?.addEventListener('click', closeJobModal);
  });

  async function updateNavBadge() {
    try {
      const data = await api.get('/staff/stats');
      const total = data.applications?.total ?? 0;
      document.querySelectorAll('.nav-badge').forEach(b => { b.textContent = total; });
    } catch (e) { /* non-critical */ }
  }

  function bindFilters() {
    const searchInput = document.getElementById('jobSearch');
    const roleSelect   = document.getElementById('roleFilter');
    const locSelect    = document.getElementById('locFilter');
    const filterBtn    = document.getElementById('jobFilterBtn');

    filterBtn?.addEventListener('click', () => {
      currentFilters.search   = searchInput?.value.trim() || '';
      currentFilters.type     = roleSelect?.value || '';
      currentFilters.location = locSelect?.value || '';
      currentPage = 1;
      loadJobs();
    });
    searchInput?.addEventListener('keydown', e => { if (e.key === 'Enter') filterBtn?.click(); });
  }

  // Pre-fetch the applicant's existing applications so we can mark
  // jobs already applied to (avoids relying on a failed 409 to know).
  async function loadAppliedIds() {
    try {
      const data = await api.get('/staff/applications?per_page=200');
      (data.data || []).forEach(a => appliedJobIds.add(a.job_id));
    } catch (e) { /* non-critical */ }
  }

  async function loadJobs() {
    const container = document.getElementById('jobsGrid');
    if (!container) return;
    apiUI.loading(container);

    const params = new URLSearchParams({
      page: currentPage, per_page: 12,
      ...Object.fromEntries(Object.entries(currentFilters).filter(([, v]) => v)),
    });

    try {
      const data = await api.get('/staff/jobs?' + params);
      const jobs = data.data || [];

      if (!jobs.length) { apiUI.empty(container, 'No jobs found matching your criteria.', 'fa-briefcase'); return; }

      container.className = 'three-col';
      container.innerHTML = jobs.map(j => jobCard(j)).join('');

      renderPagination('jobsPagination', data.page, data.total_pages, p => { currentPage = p; loadJobs(); });
    } catch (e) { apiUI.error(container, 'Failed to load jobs: ' + e.message); }
  }

  function jobCard(j) {
    const applied = appliedJobIds.has(j.id);
    return `
      <div class="job-card">
        <div class="job-card-top">
          <div class="job-hosp-logo"><i class="fa-solid fa-hospital"></i></div>
        </div>
        <div class="job-title">${escHtml(j.title)}</div>
        <div class="job-hosp-name"><i class="fa-solid fa-building" style="font-size:.75rem"></i> ${escHtml(j.hospital || '')}</div>
        <div class="job-tags">
          <div class="job-tag"><i class="fa-solid fa-location-dot"></i> ${escHtml(j.location || j.city || '–')}</div>
          <div class="job-tag"><i class="fa-solid fa-clock"></i> ${escHtml(j.type || '–')}</div>
          <div class="job-tag"><i class="fa-solid fa-briefcase"></i> ${escHtml(j.experience || '–')}</div>
        </div>
        <div class="job-desc">${escHtml(j.description || '')}</div>
        <div class="job-footer">
          <div class="job-salary">${escHtml(j.salary || '–')}</div>
          <div class="job-posted">${formatPosted(j.created_at)}</div>
        </div>
        <div style="display:flex;gap:8px;margin-top:14px">
          <button class="btn-sm btn-outline-sm" style="flex:1" onclick="viewJobDetails(${j.id})"><i class="fa-solid fa-eye"></i> View</button>
          <button class="btn-primary" style="flex:1;justify-content:center" ${applied ? 'disabled' : ''} onclick="applyForJob(${j.id},'${escHtml(j.title).replace(/'/g, "\\'")}')">
            ${applied ? '<i class="fa-solid fa-check"></i> Applied' : 'Apply Now'}
          </button>
        </div>
      </div>`;
  }

  window.applyForJob = async function (jobId, jobTitle) {
    if (appliedJobIds.has(jobId)) return;
    const coverLetter = prompt(`Apply for "${jobTitle}"\n\nEnter a short cover note (optional):`);
    if (coverLetter === null) return; // cancelled
    try {
      await api.post(`/staff/jobs/${jobId}/apply`, { cover_letter: coverLetter });
      appliedJobIds.add(jobId);
      apiUI.toast('Application submitted for "' + jobTitle + '"!', 'success');
      loadJobs();
    } catch (e) {
      if (String(e.message || '').toLowerCase().includes('already applied')) appliedJobIds.add(jobId);
      apiUI.toast(e.message || 'Failed to submit application.', 'error');
      loadJobs();
    }
  };

  window.viewJobDetails = async function (jobId) {
    const modal = document.getElementById('jobDetailsModal');
    if (!modal) return;
    setText('jdTitle', 'Loading…');
    setText('jdHospital', ''); setText('jdDesc', ''); setText('jdReqs', ''); setText('jdBenefits', '');
    const tagsEl = document.getElementById('jdTags');
    if (tagsEl) tagsEl.innerHTML = '';
    modal.classList.add('active');
    try {
      const j = await api.get(`/jobs/${jobId}`);
      setText('jdTitle', j.title);
      setText('jdHospital', `${j.hospital || ''} · ${j.location || j.city || ''}`);
      setText('jdDesc', j.description || '–');
      if (tagsEl) tagsEl.innerHTML = [
        `<span class="badge badge-pending" style="font-size:.68rem"><i class="fa-solid fa-clock"></i> ${escHtml(j.type || '')}</span>`,
        `<span class="badge badge-pending" style="font-size:.68rem"><i class="fa-solid fa-briefcase-medical"></i> ${escHtml(j.experience || '')}</span>`,
        `<span class="badge badge-active" style="font-size:.68rem"><i class="fa-solid fa-money-bill"></i> ${escHtml(j.salary || '')}</span>`,
      ].join('');
      const reqs = Array.isArray(j.requirements) ? j.requirements : [];
      const bens = Array.isArray(j.benefits) ? j.benefits : [];
      setHtml('jdReqs', reqs.length ? '<ul style="margin:0;padding-left:18px">' + reqs.map(r => `<li>${escHtml(r)}</li>`).join('') + '</ul>' : '–');
      setHtml('jdBenefits', bens.length ? '<ul style="margin:0;padding-left:18px">' + bens.map(b => `<li>${escHtml(b)}</li>`).join('') + '</ul>' : '–');
      const applyBtn = document.getElementById('jdApplyBtn');
      if (applyBtn) {
        const applied = appliedJobIds.has(j.id);
        applyBtn.disabled = applied;
        applyBtn.textContent = applied ? 'Already Applied' : 'Apply Now';
        applyBtn.onclick = () => applyForJob(j.id, j.title);
      }
    } catch (e) {
      setText('jdTitle', 'Failed to load job.');
      apiUI.toast(e.message || 'Failed to load job details.', 'error');
    }
  };

  function closeJobModal() { document.getElementById('jobDetailsModal')?.classList.remove('active'); }
  function setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }
  function setHtml(id, v) { const el = document.getElementById(id); if (el) el.innerHTML = v; }

  function renderPagination(id, current, total, onPage) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '';
    if (total <= 1) return;
    for (let i = 1; i <= Math.min(total, 10); i++) {
      const btn = document.createElement('button');
      btn.textContent = i;
      btn.className = 'btn-sm ' + (i === current ? 'btn-primary' : 'btn-outline-sm');
      btn.onclick = () => onPage(i);
      el.appendChild(btn);
    }
  }

  function formatPosted(d) {
    if (!d) return '–';
    const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
    if (days <= 0) return 'Posted today';
    if (days === 1) return 'Posted 1d ago';
    if (days < 14) return `Posted ${days}d ago`;
    return `Posted ${Math.floor(days / 7)}w ago`;
  }

  function escHtml(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
})();
