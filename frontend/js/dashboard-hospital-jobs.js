/**
 * dashboard-hospital-jobs.js
 * Powers dashboard-hospital-jobs.html
 */
(function () {
  'use strict';
  window.__expectedRole = 'hospital';

  let currentPage = 1;
  let currentStatus = '';
  let currentSearch = '';
  let searchDebounce = null;

  // Modal open/close and form wiring are pure UI actions — they must never
  // depend on the auth/network round-trip succeeding first. Bind them as
  // soon as the DOM is ready. Only the initial data load (loadJobs) needs
  // an authenticated session, so that stays gated on 'drhire:auth'.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindEvents);
  } else {
    bindEvents();
  }

  document.addEventListener('drhire:auth', () => {
    loadJobs();
    maybeAutoOpenFromQueryParam();
  });

  // Supports dashboard-hospital.html's "+ Post Job" button, which links to
  // dashboard-hospital-jobs.html?action=new-job — auto-opens the modal
  // once the page (and auth) is ready, instead of just landing on the page.
  function maybeAutoOpenFromQueryParam() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'new-job') {
      openCreateJobModal();
      // Clean the URL so a refresh doesn't reopen the modal.
      params.delete('action');
      const rest = params.toString();
      const newUrl = window.location.pathname + (rest ? `?${rest}` : '');
      window.history.replaceState({}, '', newUrl);
    }
  }

  function openCreateJobModal() {
    // Open the modal FIRST — even if something below throws (a missing
    // field, a bad state), the modal is already visible to the user.
    document.getElementById('jobModal')?.classList.add('active');
    try {
      document.getElementById('jobModalTitle').textContent = 'Post New Job';
      document.getElementById('jobForm').reset();
      document.getElementById('jobId').value = '';
    } catch (e) { /* modal is open regardless; form will just be un-reset */ }
  }

  function bindEvents() {
    document.getElementById('jobStatusFilter')?.addEventListener('change', function() {
      currentStatus = this.value;
      currentPage = 1;
      loadJobs();
    });

    document.getElementById('jobSearchInput')?.addEventListener('input', function() {
      clearTimeout(searchDebounce);
      const val = this.value;
      searchDebounce = setTimeout(() => {
        currentSearch = val.trim();
        currentPage = 1;
        loadJobs();
      }, 350);
    });

    document.getElementById('createJobBtn')?.addEventListener('click', openCreateJobModal);

    document.getElementById('closeJobModal')?.addEventListener('click', () => {
      document.getElementById('jobModal').classList.remove('active');
    });

    document.getElementById('jobForm')?.addEventListener('submit', async function(e) {
      e.preventDefault();
      const id = document.getElementById('jobId').value;
      const btn = this.querySelector('button[type="submit"]');

      const data = {
        title: document.getElementById('jobTitle').value,
        specialization: document.getElementById('jobSpec').value,
        type: document.getElementById('jobType').value,
        experience: document.getElementById('jobExp').value,
        qualification: document.getElementById('jobQual').value,
        salary: document.getElementById('jobSalary').value,
        location: document.getElementById('jobLoc').value,
        status: document.getElementById('jobStatus').value,
        description: document.getElementById('jobDesc').value,
      };

      btn.disabled = true;
      btn.textContent = 'Saving...';

      try {
        if (id) {
          await api.put(`/hospital/jobs/${id}`, data);
          apiUI.toast('Job updated successfully.', 'success');
        } else {
          await api.post('/hospital/jobs', data);
          apiUI.toast('Job posted successfully.', 'success');
        }
        document.getElementById('jobModal').classList.remove('active');
        loadJobs();
      } catch (err) {
        apiUI.toast(err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-save"></i> Save Job';
      }
    });
  }

  async function loadJobs() {
    const container = document.getElementById('jobsTbody');
    if (!container) return;
    container.innerHTML = '<tr><td colspan="6"><div style="text-align:center;padding:60px 20px;color:var(--text3,#64748b)"><i class="fa-solid fa-spinner fa-spin fa-2x" style="color:var(--accent,#0ea5e9)"></i><p style="margin-top:16px;font-size:.85rem">Loading...</p></div></td></tr>';

    try {
      const qs = new URLSearchParams({ page: currentPage, per_page: 15 });
      if (currentStatus) qs.set('status', currentStatus);
      if (currentSearch) qs.set('search', currentSearch);
      const data = await api.get(`/hospital/jobs?${qs.toString()}`);
      const jobs = data.data || [];

      if (!jobs.length) {
        container.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px">No jobs found.</td></tr>';
        document.getElementById('jobsPagination').innerHTML = '';
        return;
      }

      container.innerHTML = jobs.map(j => `
        <tr>
          <td style="padding:15px"><div style="font-weight:600">${escHtml(j.title)}</div><div style="font-size:.75rem;color:var(--text3)">${escHtml(j.specialization)}</div></td>
          <td>${escHtml(j.type)}</td>
          <td>${formatDate(j.created_at)}</td>
          <td>${j.application_count}</td>
          <td>${statusBadge(j.status)}</td>
          <td>
            <button class="btn-sm btn-outline-sm" onclick="viewJob(${j.id})" title="View"><i class="fa-solid fa-eye"></i></button>
            <button class="btn-sm btn-outline-sm" onclick="editJob(${j.id})" title="Edit"><i class="fa-solid fa-pen"></i></button>
            <button class="btn-sm btn-outline-sm" style="color:var(--danger);border-color:rgba(239,68,68,.2)" onclick="deleteJob(${j.id})" title="Delete"><i class="fa-solid fa-trash"></i></button>
          </td>
        </tr>
      `).join('');

      renderPagination('jobsPagination', data.page, data.total_pages, p => { currentPage = p; loadJobs(); });

    } catch (err) {
      container.innerHTML = '<tr><td colspan="6"><div style="text-align:center;padding:60px 20px;color:var(--danger,#ef4444)"><i class="fa-solid fa-triangle-exclamation fa-2x" style="margin-bottom:12px"></i><p style="font-size:.85rem">Failed to load jobs.</p></div></td></tr>';
    }
  }

  window.viewJob = async function(id) {
    try {
      const job = await api.get(`/hospital/jobs/${id}`);
      alert(
        `${job.title}\n\nSpecialization: ${job.specialization}\nType: ${job.type}\nExperience: ${job.experience}\nQualification: ${job.qualification}\nSalary: ${job.salary || '–'}\nLocation: ${job.location}\nStatus: ${job.status}\nApplicants: view on the Applications page.\n\n${job.description || ''}`
      );
    } catch (e) {
      apiUI.toast('Failed to load job details.', 'error');
    }
  };

  window.editJob = async function(id) {
    try {
      const job = await api.get(`/hospital/jobs/${id}`);
      document.getElementById('jobModalTitle').textContent = 'Edit Job';
      document.getElementById('jobId').value = job.id;
      document.getElementById('jobTitle').value = job.title;
      document.getElementById('jobSpec').value = job.specialization;
      document.getElementById('jobType').value = job.type;
      document.getElementById('jobExp').value = job.experience;
      document.getElementById('jobQual').value = job.qualification;
      document.getElementById('jobSalary').value = job.salary;
      document.getElementById('jobLoc').value = job.location;
      document.getElementById('jobStatus').value = job.status;
      document.getElementById('jobDesc').value = job.description;

      document.getElementById('jobModal').classList.add('active');
    } catch (e) {
      apiUI.toast('Failed to load job details.', 'error');
    }
  };

  window.deleteJob = async function(id) {
    if (!confirm('Are you sure you want to permanently delete this job? This action cannot be undone.')) return;
    try {
      await api.delete(`/hospital/jobs/${id}`);
      apiUI.toast('Job deleted.', 'success');
      loadJobs();
    } catch (e) {
      apiUI.toast(e.message, 'error');
    }
  };

  function statusBadge(s) {
    if (s === 'active') return '<span class="badge badge-active">Active</span>';
    if (s === 'closed') return '<span class="badge badge-inactive">Closed</span>';
    return '<span class="badge badge-pending">Draft</span>';
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
