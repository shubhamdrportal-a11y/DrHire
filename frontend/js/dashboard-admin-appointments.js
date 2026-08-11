/**
 * dashboard-admin-appointments.js
 * Powers dashboard-admin-appointments.html — real appointment list backed by
 * GET /admin/appointments (search + status filter + pagination).
 */

(function () {
  'use strict';
  window.__expectedRole = 'admin';

  let currentPage = 1;
  let currentFilters = { search: '', status: '' };
  let rowsById = {};

  document.addEventListener('drhire:auth', () => {
    loadAppointments();
    bindFilters();
  });

  function bindFilters() {
    document.getElementById('filterBtn')?.addEventListener('click', () => {
      currentFilters.search = document.getElementById('apptSearchInput')?.value.trim() || '';
      currentFilters.status = document.getElementById('apptStatusFilter')?.value || '';
      currentPage = 1;
      loadAppointments();
    });
    document.getElementById('apptSearchInput')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('filterBtn')?.click();
    });
  }

  async function loadAppointments() {
    const card = document.getElementById('apptCard');
    if (!card) return;
    apiUI.loading(card);

    const params = new URLSearchParams({
      page: currentPage,
      per_page: 20,
      ...Object.fromEntries(Object.entries(currentFilters).filter(([, v]) => v)),
    });

    try {
      const data = await api.get('/admin/appointments?' + params);
      const appts = data.data || [];
      rowsById = {};

      card.innerHTML = `
        <div class="table-wrap">
          <table class="dash-table">
            <thead><tr><th>Patient</th><th>Doctor</th><th>Date &amp; Time</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody id="apptTbody"></tbody>
          </table>
        </div>
        <div id="apptPagination" style="display:flex;justify-content:center;gap:8px;padding:16px"></div>
      `;
      const tbody = document.getElementById('apptTbody');

      if (!appts.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text3);padding:40px">No appointments found.</td></tr>';
        return;
      }

      const badgeFor = s => ({
        pending:   '<span class="badge badge-pending">Pending</span>',
        confirmed: '<span class="badge badge-active">Confirmed</span>',
        completed: '<span class="badge" style="color:var(--accent);background:rgba(14,165,233,.1)">Completed</span>',
        cancelled: '<span class="badge" style="color:var(--danger);background:rgba(239,68,68,.1)">Cancelled</span>',
      }[s] || s);

      tbody.innerHTML = appts.map(a => {
        rowsById[a.id] = a;
        return `
          <tr>
            <td><div class="td-name">${escHtml(a.patient_name)}</div><div class="td-sub">${escHtml(a.patient_phone || '')}</div></td>
            <td><div class="td-name">Dr. ${escHtml(a.doctor_name || '–')}</div><div class="td-sub">${escHtml(a.doctor_spec || '')}</div></td>
            <td>${formatDate(a.appointment_date)} · ${escHtml(a.appointment_time)}</td>
            <td>${badgeFor(a.status)}</td>
            <td><button class="btn-sm btn-outline-sm" title="View Appointment" onclick="viewAppt(${a.id})"><i class="fa-solid fa-eye"></i></button></td>
          </tr>`;
      }).join('');

      renderPagination('apptPagination', data.page, data.total_pages, p => { currentPage = p; loadAppointments(); });
    } catch (err) {
      apiUI.error(card, 'Failed to load appointments: ' + err.message);
    }
  }

  window.viewAppt = function (id) {
    const a = rowsById[id];
    if (!a) return;
    openModal('Appointment #' + a.id, `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;font-size:.85rem">
        <div><strong>Patient</strong><div style="color:var(--text2)">${escHtml(a.patient_name)}</div></div>
        <div><strong>Phone</strong><div style="color:var(--text2)">${escHtml(a.patient_phone || '–')}</div></div>
        <div><strong>Age / Gender</strong><div style="color:var(--text2)">${a.patient_age || '–'} / ${escHtml(a.patient_gender || '–')}</div></div>
        <div><strong>Doctor</strong><div style="color:var(--text2)">Dr. ${escHtml(a.doctor_name || '–')} (${escHtml(a.doctor_spec || '–')})</div></div>
        <div><strong>Date &amp; Time</strong><div style="color:var(--text2)">${formatDate(a.appointment_date)} · ${escHtml(a.appointment_time)}</div></div>
        <div><strong>Status</strong><div style="color:var(--text2)">${escHtml(a.status)}</div></div>
        <div style="grid-column:1/-1"><strong>Address</strong><div style="color:var(--text2)">${escHtml(a.patient_address || '–')}</div></div>
        <div style="grid-column:1/-1"><strong>Reason</strong><div style="color:var(--text2)">${escHtml(a.reason || '–')}</div></div>
        ${a.notes ? `<div style="grid-column:1/-1"><strong>Notes</strong><div style="color:var(--text2)">${escHtml(a.notes)}</div></div>` : ''}
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
