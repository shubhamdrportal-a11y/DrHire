/**
 * dashboard-admin-users.js
 * Powers dashboard-admin-users.html — user table with search, filter, and actions.
 */

(function () {
  'use strict';
  window.__expectedRole = 'admin';

  let currentPage = 1;
  let currentFilters = { role: '', status: '', search: '' };

  document.addEventListener('drhire:auth', () => {
    loadUsers();
    bindFilters();
  });

  function bindFilters() {
    const searchInput  = document.getElementById('userSearchInput');
    const roleSelect   = document.getElementById('userRoleFilter');
    const statusSelect = document.getElementById('userStatusFilter');
    const filterBtn    = document.getElementById('filterBtn');

    filterBtn?.addEventListener('click', () => {
      currentFilters.search = searchInput?.value.trim() || '';
      currentFilters.role   = roleSelect?.value || '';
      currentFilters.status = statusSelect?.value || '';
      currentPage = 1;
      loadUsers();
    });

    // Search on Enter
    searchInput?.addEventListener('keydown', e => {
      if (e.key === 'Enter') filterBtn?.click();
    });
  }

  async function loadUsers() {
    const tbody = document.getElementById('usersTbody');
    const tableCard = tbody?.closest('.dash-card');
    if (!tbody) return;

    apiUI.loading(tableCard || tbody);

    const params = new URLSearchParams({
      page: currentPage,
      per_page: 20,
      ...Object.fromEntries(Object.entries(currentFilters).filter(([, v]) => v)),
    });

    try {
      const data = await api.get('/admin/users?' + params);
      const users = data.data || [];

      // Restore table structure
      tableCard.innerHTML = `
        <div class="table-wrap">
          <table class="dash-table" id="usersTable">
            <thead>
              <tr><th>User Info</th><th>Role</th><th>Date Joined</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody id="usersTbody"></tbody>
          </table>
        </div>
        <div id="usersPagination" style="display:flex;justify-content:center;gap:8px;padding:16px"></div>
      `;

      const newTbody = document.getElementById('usersTbody');

      if (!users.length) {
        newTbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text3);padding:40px">No users found.</td></tr>';
        return;
      }

      const roleColors = { admin: 'var(--danger)', doctor: 'var(--accent)', hospital: 'var(--success)', staff: '#8b5cf6' };
      const roleIcons  = { admin: 'fa-shield-halved', doctor: 'fa-user-doctor', hospital: 'fa-hospital', staff: 'fa-id-badge' };

      newTbody.innerHTML = users.map(u => {
        const name    = escHtml(u.display_name || u.email.split('@')[0]);
        const initials = name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
        const color   = roleColors[u.role] || 'var(--accent)';
        const icon    = roleIcons[u.role] || 'fa-user';

        const statusBadge = u.status === 'active'
          ? '<span class="badge badge-active">Active</span>'
          : u.status === 'suspended'
            ? '<span class="badge" style="color:var(--danger);background:rgba(239,68,68,.1)">Suspended</span>'
            : '<span class="badge badge-pending">Pending</span>';

        const actionBtn = u.status === 'active'
          ? `<button class="btn-sm btn-outline-sm" style="color:var(--danger);border-color:rgba(239,68,68,.2)"
               onclick="updateStatus(${u.id},'suspended')" title="Suspend"><i class="fa-solid fa-ban"></i></button>`
          : `<button class="btn-sm btn-outline-sm" style="color:var(--success);border-color:rgba(16,185,129,.2)"
               onclick="updateStatus(${u.id},'active')" title="Activate"><i class="fa-solid fa-check"></i></button>`;

        return `
          <tr>
            <td>
              <div class="user-cell">
                <div class="ua" style="background:${color}20;color:${color}">${initials}</div>
                <div>
                  <div class="td-name">${name}</div>
                  <div class="td-sub">${escHtml(u.email)}</div>
                </div>
              </div>
            </td>
            <td><span style="font-weight:600;color:${color}"><i class="fa-solid ${icon}" style="margin-right:4px"></i>${capitalize(u.role)}</span></td>
            <td>${formatDate(u.created_at)}</td>
            <td>${statusBadge}</td>
            <td>${actionBtn}</td>
          </tr>`;
      }).join('');

      // Pagination
      renderPagination('usersPagination', data.page, data.total_pages, (p) => {
        currentPage = p;
        loadUsers();
      });

    } catch (err) {
      if (tableCard) apiUI.error(tableCard, 'Failed to load users: ' + err.message);
    }
  }

  window.updateStatus = async function (userId, status) {
    try {
      await api.patch(`/admin/users/${userId}/status`, { status });
      apiUI.toast(`User ${status === 'active' ? 'activated' : 'suspended'} successfully.`, 'success');
      loadUsers();
    } catch (err) {
      apiUI.toast(err.message, 'error');
    }
  };

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

  function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function capitalize(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }
  function formatDate(d) { return d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '–'; }
})();
