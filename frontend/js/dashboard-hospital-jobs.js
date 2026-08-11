/**
 * dashboard-hospital-jobs.js
 * Powers dashboard-hospital-jobs.html
 */
(function () {
  'use strict';
  window.__expectedRole = 'hospital';

  let currentPage = 1;
  let currentStatus = '';

  document.addEventListener('drhire:auth', () => {
    loadJobs();
    bindEvents();
  });

  function bindEvents() {
    document.getElementById('jobStatusFilter')?.addEventListener('change', function() {
      currentStatus = this.value;
      currentPage = 1;
      loadJobs();
    });

    document.getElementById('createJobBtn')?.addEventListener('click', () => {
      document.getElementById('jobModalTitle').textContent = 'Post New Job';
      document.getElementById('jobForm').reset();
      document.getElementById('jobId').value = '';
      document.getElementById('jobModal').classList.add('active');
    });

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
          apiUI.toast('Job created successfully.', 'success');
        }
        document.getElementById('jobModal').classList.remove('active');
        loadJobs();
      } catch (err) {
        apiUI.toast(err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Save Job';
      }
    });
  }

  async function loadJobs() {
    const container = document.getElementById('jobsTbody');
    if (!container) return;
    apiUI.loading(container.closest('.dash-card') || container);

    try {
      const data = await api.get(`/hospital/jobs?page=${currentPage}&per_page=15${currentStatus ? '&status=' + currentStatus : ''}`);
      const jobs = data.data || [];

      if (!jobs.length) {
        container.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px">No jobs found.</td></tr>';
        return;
      }

      container.innerHTML = jobs.map(j => `
        <tr>
          <td><div style="font-weight:600">${escHtml(j.title)}</div><div style="font-size:.75rem;color:var(--text3)">${escHtml(j.specialization)}</div></td>
          <td>${escHtml(j.type)}</td>
          <td>${formatDate(j.created_at)}</td>
          <td>${j.application_count}</td>
          <td>${statusBadge(j.status)}</td>
          <td>
            <button class="btn-sm btn-outline-sm" onclick="editJob(${j.id})"><i class="fa-solid fa-pen"></i></button>
            <button class="btn-sm btn-outline-sm" style="color:var(--danger);border-color:rgba(239,68,68,.2)" onclick="deleteJob(${j.id})"><i class="fa-solid fa-trash"></i></button>
          </td>
        </tr>
      `).join('');

      renderPagination('jobsPagination', data.page, data.total_pages, p => { currentPage = p; loadJobs(); });

    } catch (err) {
      if (container.closest('.dash-card')) apiUI.error(container.closest('.dash-card'), 'Failed to load jobs.');
    }
  }

  window.editJob = async function(id) {
    try {
      // Find job in local list or fetch specific job (assume local fetch for brevity)
      const data = await api.get(`/hospital/jobs`);
      const job = data.data.find(j => j.id == id);
      if (!job) return;

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
    if (!confirm('Are you sure you want to close this job? It will not be deleted but will no longer accept applications.')) return;
    try {
      await api.delete(`/hospital/jobs/${id}`);
      apiUI.toast('Job closed.', 'success');
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
