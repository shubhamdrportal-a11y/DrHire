/**
 * dashboard-admin-doctors.js
 * Powers dashboard-admin-doctors.html — real doctor directory backed by
 * GET /admin/doctors (search + status filter + pagination).
 */

(function () {
  'use strict';
  window.__expectedRole = 'admin';

  let currentPage = 1;
  let currentFilters = { search: '', status: '' };
  let rowsById = {}; // cache last-loaded rows so "View" can render without another request

  document.addEventListener('drhire:auth', () => {
    loadDoctors();
    bindFilters();
  });

  function bindFilters() {
    document.getElementById('filterBtn')?.addEventListener('click', () => {
      currentFilters.search = document.getElementById('doctorSearchInput')?.value.trim() || '';
      currentFilters.status = document.getElementById('doctorStatusFilter')?.value || '';
      currentPage = 1;
      loadDoctors();
    });
    document.getElementById('doctorSearchInput')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('filterBtn')?.click();
    });
  }

  async function loadDoctors() {
    const card = document.getElementById('doctorsCard');
    if (!card) return;
    apiUI.loading(card);

    const params = new URLSearchParams({
      page: currentPage,
      per_page: 20,
      ...Object.fromEntries(Object.entries(currentFilters).filter(([, v]) => v)),
    });

    try {
      const data = await api.get('/admin/doctors?' + params);
      const doctors = data.data || [];
      rowsById = {};

      card.innerHTML = `
        <div class="table-wrap">
          <table class="dash-table">
            <thead><tr><th>Doctor</th><th>Specialization</th><th>Experience</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody id="doctorsTbody"></tbody>
          </table>
        </div>
        <div id="doctorsPagination" style="display:flex;justify-content:center;gap:8px;padding:16px"></div>
      `;
      const tbody = document.getElementById('doctorsTbody');

      if (!doctors.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text3);padding:40px">No doctors found.</td></tr>';
        return;
      }

      tbody.innerHTML = doctors.map(d => {
        rowsById[d.user_id] = d;
        const initials = (d.full_name || '?').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
        const statusBadge = d.status === 'active'
          ? '<span class="badge badge-active"><i class="fa-solid fa-certificate"></i> Active</span>'
          : d.status === 'suspended'
            ? '<span class="badge" style="color:var(--danger);background:rgba(239,68,68,.1)">Suspended</span>'
            : '<span class="badge badge-pending">Pending</span>';

        return `
          <tr>
            <td>
              <div class="user-cell">
                <div class="ua ua-blue">${escHtml(initials)}</div>
                <div><div class="td-name">Dr. ${escHtml(d.full_name)}</div><div class="td-sub">${escHtml(d.qualification || d.email)}</div></div>
              </div>
            </td>
            <td>${escHtml(d.specialization || '–')}</td>
            <td>${d.experience_years ?? 0} Years</td>
            <td>${statusBadge}</td>
            <td><button class="btn-sm btn-outline-sm" title="View Profile" onclick="viewDoctor(${d.user_id})"><i class="fa-solid fa-eye"></i></button></td>
          </tr>`;
      }).join('');

      renderPagination('doctorsPagination', data.page, data.total_pages, p => { currentPage = p; loadDoctors(); });
    } catch (err) {
      apiUI.error(card, 'Failed to load doctors: ' + err.message);
    }
  }

  window.viewDoctor = function (userId) {
    const d = rowsById[userId];
    if (!d) return;
    openModal(`Dr. ${escHtml(d.full_name)}`, `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;font-size:.85rem">
        <div><strong>Email</strong><div style="color:var(--text2)">${escHtml(d.email)}</div></div>
        <div><strong>Phone</strong><div style="color:var(--text2)">${escHtml(d.phone || '–')}</div></div>
        <div><strong>Specialization</strong><div style="color:var(--text2)">${escHtml(d.specialization || '–')}</div></div>
        <div><strong>Qualification</strong><div style="color:var(--text2)">${escHtml(d.qualification || '–')}</div></div>
        <div><strong>Experience</strong><div style="color:var(--text2)">${d.experience_years ?? 0} years</div></div>
        <div><strong>License No.</strong><div style="color:var(--text2)">${escHtml(d.license_no || '–')}</div></div>
        <div><strong>City / State</strong><div style="color:var(--text2)">${escHtml(d.city || '–')}, ${escHtml(d.state || '–')}</div></div>
        <div><strong>Rating</strong><div style="color:var(--text2)"><i class="fa-solid fa-star" style="color:var(--warning)"></i> ${Number(d.rating || 0).toFixed(1)}</div></div>
        <div><strong>Availability</strong><div style="color:var(--text2)">${d.is_available == 1 ? 'Available' : 'Unavailable'}</div></div>
        <div><strong>Account Status</strong><div style="color:var(--text2)">${escHtml(d.status)}</div></div>
        <div style="grid-column:1/-1"><strong>Clinic Address</strong><div style="color:var(--text2)">${escHtml(d.clinic_address || '–')}</div></div>
        ${d.bio ? `<div style="grid-column:1/-1"><strong>Bio</strong><div style="color:var(--text2)">${escHtml(d.bio)}</div></div>` : ''}
      </div>
    `);
  };

  // ── Shared modal helper ────────────────────────────────────────
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
})();
