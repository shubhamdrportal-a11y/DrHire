/**
 * dashboard-admin-hospitals.js
 * Powers dashboard-admin-hospitals.html — real hospital directory backed by
 * GET /admin/hospitals (search + status filter + pagination).
 */

(function () {
  'use strict';
  window.__expectedRole = 'admin';

  let currentPage = 1;
  let currentFilters = { search: '', status: '' };
  let rowsById = {};

  document.addEventListener('drhire:auth', () => {
    loadHospitals();
    bindFilters();
  });

  function bindFilters() {
    document.getElementById('filterBtn')?.addEventListener('click', () => {
      currentFilters.search = document.getElementById('hospitalSearchInput')?.value.trim() || '';
      currentFilters.status = document.getElementById('hospitalStatusFilter')?.value || '';
      currentPage = 1;
      loadHospitals();
    });
    document.getElementById('hospitalSearchInput')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('filterBtn')?.click();
    });
  }

  async function loadHospitals() {
    const card = document.getElementById('hospitalsCard');
    if (!card) return;
    apiUI.loading(card);

    const params = new URLSearchParams({
      page: currentPage,
      per_page: 20,
      ...Object.fromEntries(Object.entries(currentFilters).filter(([, v]) => v)),
    });

    try {
      const data = await api.get('/admin/hospitals?' + params);
      const hospitals = data.data || [];
      rowsById = {};

      card.innerHTML = `
        <div class="table-wrap">
          <table class="dash-table">
            <thead><tr><th>Hospital Name</th><th>Location</th><th>Registration #</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody id="hospitalsTbody"></tbody>
          </table>
        </div>
        <div id="hospitalsPagination" style="display:flex;justify-content:center;gap:8px;padding:16px"></div>
      `;
      const tbody = document.getElementById('hospitalsTbody');

      if (!hospitals.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text3);padding:40px">No hospitals found.</td></tr>';
        return;
      }

      tbody.innerHTML = hospitals.map(h => {
        rowsById[h.user_id] = h;
        const initials = (h.hospital_name || '?').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
        const statusBadge = h.status === 'active'
          ? '<span class="badge badge-active"><i class="fa-solid fa-certificate"></i> Active</span>'
          : h.status === 'suspended'
            ? '<span class="badge" style="color:var(--danger);background:rgba(239,68,68,.1)">Suspended</span>'
            : '<span class="badge badge-pending">Pending</span>';

        return `
          <tr>
            <td>
              <div class="user-cell">
                <div class="ua ua-green">${escHtml(initials)}</div>
                <div><div class="td-name">${escHtml(h.hospital_name)}</div><div class="td-sub">${escHtml(h.type || 'Hospital')}</div></div>
              </div>
            </td>
            <td>${escHtml(h.city || '–')}${h.state ? ', ' + escHtml(h.state) : ''}</td>
            <td>${escHtml(h.registration_no || '–')}</td>
            <td>${statusBadge}</td>
            <td><button class="btn-sm btn-outline-sm" title="View Profile" onclick="viewHospital(${h.user_id})"><i class="fa-solid fa-eye"></i></button></td>
          </tr>`;
      }).join('');

      renderPagination('hospitalsPagination', data.page, data.total_pages, p => { currentPage = p; loadHospitals(); });
    } catch (err) {
      apiUI.error(card, 'Failed to load hospitals: ' + err.message);
    }
  }

  window.viewHospital = function (userId) {
    const h = rowsById[userId];
    if (!h) return;
    openModal(escHtml(h.hospital_name), `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;font-size:.85rem">
        <div><strong>Contact Email</strong><div style="color:var(--text2)">${escHtml(h.contact_email || h.email)}</div></div>
        <div><strong>Contact Phone</strong><div style="color:var(--text2)">${escHtml(h.contact_phone || '–')}</div></div>
        <div><strong>Registration No.</strong><div style="color:var(--text2)">${escHtml(h.registration_no || '–')}</div></div>
        <div><strong>Type</strong><div style="color:var(--text2)">${escHtml(h.type || '–')}</div></div>
        <div><strong>Bed Count</strong><div style="color:var(--text2)">${h.bed_count ?? '–'}</div></div>
        <div><strong>Website</strong><div style="color:var(--text2)">${h.website ? `<a href="${escHtml(h.website)}" target="_blank" rel="noopener">${escHtml(h.website)}</a>` : '–'}</div></div>
        <div><strong>Account Status</strong><div style="color:var(--text2)">${escHtml(h.status)}</div></div>
        <div style="grid-column:1/-1"><strong>Address</strong><div style="color:var(--text2)">${escHtml(h.address || '–')}, ${escHtml(h.city || '')}, ${escHtml(h.state || '')}</div></div>
        ${h.about ? `<div style="grid-column:1/-1"><strong>About</strong><div style="color:var(--text2)">${escHtml(h.about)}</div></div>` : ''}
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
})();
