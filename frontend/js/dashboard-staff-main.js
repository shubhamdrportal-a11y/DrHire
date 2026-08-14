/**
 * dashboard-staff-main.js
 * Powers dashboard-staff.html
 */
(function () {
  'use strict';
  window.__expectedRole = 'staff';

  document.addEventListener('drhire:auth', async () => {
    await Promise.all([loadStats(), loadRecentApplications(), loadProfileCard()]);
  });

  async function loadStats() {
    try {
      const data = await api.get('/staff/stats');
      const a = data.applications || {};
      const ids = {
        'stat-total-apps':    a.total,
        'stat-under-review':  a.pending,
        'stat-interviews':    a.interviews,
      };
      Object.entries(ids).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) animateCount(el, parseInt(val) || 0);
      });
      document.querySelectorAll('.nav-badge').forEach(b => { b.textContent = a.total ?? 0; });
    } catch (e) { console.error(e); }

    // Open jobs count is separate from application stats.
    try {
      const jobs = await api.get('/staff/jobs?per_page=1');
      const el = document.getElementById('stat-new-jobs');
      if (el) animateCount(el, parseInt(jobs.total) || 0);
    } catch (e) { /* non-critical */ }
  }

  async function loadRecentApplications() {
    const container = document.getElementById('recentAppsContainer');
    if (!container) return;
    apiUI.loading(container);

    try {
      const data = await api.get('/staff/applications?per_page=3');
      const apps = data.data || [];

      if (!apps.length) {
        apiUI.empty(container, "You haven't applied to any jobs yet.", 'fa-file-contract');
        return;
      }

      container.innerHTML = `
        <table class="dash-table">
          <thead><tr><th>Role / Hospital</th><th>Date Applied</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            ${apps.map(a => `
              <tr>
                <td><div class="td-name">${escHtml(a.job_title)}</div><div class="td-sub"><i class="fa-solid fa-building" style="margin-right:4px;color:var(--accent)"></i>${escHtml(a.hospital || '')}</div></td>
                <td>${formatDate(a.applied_at)}</td>
                <td><span class="badge ${badgeClass(a.status)}">${statusLabel(a.status)}</span></td>
                <td><a href="dashboard-staff-applications.html" class="btn-sm btn-outline-sm">Details</a></td>
              </tr>`).join('')}
          </tbody>
        </table>`;
    } catch (e) { apiUI.error(container, 'Failed to load applications.'); }
  }

  async function loadProfileCard() {
    try {
      const p = await api.get('/staff/profile');
      setText('profCardName', p.full_name || 'User');
      setText('profCardOrg', p.organization || 'Not specified yet');

      // Real, data-driven completion score — not a hardcoded number.
      const fields = [p.full_name, p.phone, p.organization, p.address, p.city, p.state, p.bio];
      const filled = fields.filter(v => v && String(v).trim()).length;
      const pct = Math.round((filled / fields.length) * 100);
      const bar = document.getElementById('profCompletionBar');
      const val = document.getElementById('profCompletionVal');
      if (bar) bar.style.width = pct + '%';
      if (val) val.textContent = pct + '%';

      setChecklistItem('checkPersonal', !!(p.full_name && p.phone));
      setChecklistItem('checkOrg', !!p.organization);
      setChecklistItem('checkAddress', !!(p.address && p.city));
      setChecklistItem('checkBio', !!p.bio);
    } catch (e) { /* non-critical */ }
  }

  function setChecklistItem(id, done) {
    const el = document.getElementById(id);
    if (!el) return;
    const icon = el.querySelector('i');
    if (!icon) return;
    icon.className = done ? 'fa-solid fa-circle-check' : 'fa-regular fa-circle';
    icon.style.color = done ? 'var(--success)' : 'var(--text3)';
  }

  function animateCount(el, target) {
    let c = 0; const s = Math.max(1, Math.ceil(target / 40));
    const t = setInterval(() => { c = Math.min(c + s, target); el.textContent = c; if (c >= target) clearInterval(t); }, 25);
  }
  function badgeClass(s) {
    return { new: 'badge-pending', reviewed: 'badge-pending', shortlisted: 'badge-active', interview: 'badge-confirmed', hired: 'badge-completed', rejected: 'badge-rejected' }[s] || 'badge-pending';
  }
  function statusLabel(s) {
    return { new: 'Under Review', reviewed: 'Reviewed', shortlisted: 'Shortlisted', interview: 'Interview', hired: 'Hired', rejected: 'Rejected' }[s] || (s || '–');
  }
  function setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }
  function formatDate(d) { return d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '–'; }
  function escHtml(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
})();
