/**
 * dashboard-staff-applications.js — powers dashboard-staff-applications.html
 */
(function () {
  'use strict';
  window.__expectedRole = 'staff';

  let currentPage = 1;
  let currentTab = 'all';
  let allApps = [];

  document.addEventListener('drhire:auth', () => {
    loadApplications();
    bindTabs();
    document.getElementById('appDetailsClose')?.addEventListener('click', closeAppModal);
    document.getElementById('appDetailsClose2')?.addEventListener('click', closeAppModal);
  });

  function bindTabs() {
    document.querySelectorAll('[data-tab-target]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-tab-target]').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tabTarget)?.classList.add('active');
        currentTab = btn.dataset.tabTarget === 'interview-tab' ? 'interview' : 'all';
        renderCurrentTab();
      });
    });
  }

  async function loadApplications() {
    const allTab = document.getElementById('all-tab');
    if (!allTab) return;
    apiUI.loading(allTab);
    try {
      const data = await api.get(`/staff/applications?page=${currentPage}&per_page=50`);
      allApps = data.data || [];
      updateBadges(data.total ?? allApps.length);
      renderCurrentTab();
    } catch (e) {
      apiUI.error(allTab, 'Failed to load applications.');
    }
  }

  function updateBadges(total) {
    document.querySelectorAll('.nav-badge').forEach(b => { b.textContent = total; });
    const allTabBtn = document.querySelector('[data-tab-target="all-tab"]');
    if (allTabBtn) allTabBtn.textContent = `All Applications (${total})`;
    const interviewCount = allApps.filter(a => a.status === 'interview').length;
    const interviewTabBtn = document.querySelector('[data-tab-target="interview-tab"]');
    if (interviewTabBtn) interviewTabBtn.textContent = `Interviews (${interviewCount})`;
  }

  function renderCurrentTab() {
    if (currentTab === 'all') renderAllTab(); else renderInterviewTab();
  }

  function renderAllTab() {
    const tab = document.getElementById('all-tab');
    if (!tab) return;

    if (!allApps.length) {
      tab.innerHTML = '<div class="dash-card"></div>';
      apiUI.empty(tab.querySelector('.dash-card'), "You haven't applied to any jobs yet.", 'fa-file-contract');
      return;
    }

    tab.innerHTML = `
      <div class="dash-card">
        <div class="table-wrap">
          <table class="dash-table">
            <thead><tr><th>Role</th><th>Hospital</th><th>Date Applied</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              ${allApps.map(a => `
                <tr>
                  <td>
                    <div style="font-weight:700;color:var(--text);font-size:.88rem">${escHtml(a.job_title)}</div>
                    <div style="font-size:.75rem;color:var(--text3);margin-top:2px">${escHtml(a.job_type || '')}</div>
                  </td>
                  <td>
                    <div style="display:flex;align-items:center;gap:8px">
                      <div style="width:28px;height:28px;background:rgba(255,255,255,.05);border-radius:4px;display:flex;align-items:center;justify-content:center;color:var(--accent)"><i class="fa-solid fa-hospital"></i></div>
                      <span style="font-weight:600;color:var(--text);font-size:.82rem">${escHtml(a.hospital || '')}</span>
                    </div>
                  </td>
                  <td>${formatDate(a.applied_at)}</td>
                  <td><span class="badge ${badgeClass(a.status)}">${statusLabel(a.status)}</span></td>
                  <td><button class="btn-sm btn-outline-sm" onclick="viewApplication(${a.id})">Details</button></td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  function renderInterviewTab() {
    const tab = document.getElementById('interview-tab');
    if (!tab) return;
    const interviews = allApps.filter(a => a.status === 'interview');

    if (!interviews.length) {
      tab.innerHTML = '<div class="dash-card"></div>';
      apiUI.empty(tab.querySelector('.dash-card'), 'No interviews scheduled right now.', 'fa-calendar-check');
      return;
    }

    tab.innerHTML = interviews.map(a => `
      <div class="dash-card" style="margin-bottom:14px">
        <div style="padding:20px">
          <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
            <div style="width:64px;height:64px;border-radius:12px;background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.3);display:flex;align-items:center;justify-content:center;color:var(--warning);flex-shrink:0">
              <i class="fa-solid fa-user-tie fa-lg"></i>
            </div>
            <div style="flex:1">
              <div style="font-size:1.05rem;font-weight:700;color:var(--text);margin-bottom:4px">${escHtml(a.job_title)} — Interview Stage</div>
              <div style="font-size:.85rem;color:var(--text2);margin-bottom:8px">${escHtml(a.hospital || '')}</div>
              <div style="font-size:.76rem;color:var(--text3)">
                <i class="fa-solid fa-circle-info" style="color:var(--accent);margin-right:4px"></i>
                The hospital will contact you directly with interview date, time and joining details — this platform doesn't yet schedule interviews.
              </div>
            </div>
            <span class="badge badge-confirmed">Interview</span>
          </div>
        </div>
      </div>`).join('');
  }

  window.viewApplication = function (id) {
    const a = allApps.find(x => x.id === id);
    if (!a) return;
    const modal = document.getElementById('appDetailsModal');
    const body = document.getElementById('appDetailsBody');
    if (!modal || !body) return;
    body.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:10px">
        <div><strong>${escHtml(a.job_title)}</strong><br/><span style="color:var(--text3);font-size:.8rem">${escHtml(a.hospital || '')} · ${escHtml(a.location || '')}</span></div>
        <div><strong>Type:</strong> ${escHtml(a.job_type || '–')}</div>
        <div><strong>Applied:</strong> ${formatDate(a.applied_at)}</div>
        <div><strong>Status:</strong> <span class="badge ${badgeClass(a.status)}">${statusLabel(a.status)}</span></div>
        ${a.cover_letter ? `<div><strong>Your Cover Note:</strong><br/>${escHtml(a.cover_letter)}</div>` : ''}
      </div>`;
    modal.classList.add('active');
  };

  function closeAppModal() { document.getElementById('appDetailsModal')?.classList.remove('active'); }

  function badgeClass(s) {
    return {
      new: 'badge-pending', reviewed: 'badge-pending', shortlisted: 'badge-active',
      interview: 'badge-confirmed', hired: 'badge-completed', rejected: 'badge-rejected',
    }[s] || 'badge-pending';
  }
  function statusLabel(s) {
    return { new: 'Under Review', reviewed: 'Reviewed', shortlisted: 'Shortlisted', interview: 'Interview', hired: 'Hired', rejected: 'Rejected' }[s] || (s || '–');
  }
  function formatDate(d) { return d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '–'; }
  function escHtml(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
})();
