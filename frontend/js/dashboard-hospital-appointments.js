/**
 * dashboard-hospital-appointments.js
 * Powers dashboard-hospital-appointments.html
 */
(function () {
  'use strict';
  window.__expectedRole = 'hospital';

  let currentPage = 1;
  let currentStatus = '';
  let currentSearch = '';
  let currentDate = '';
  let searchDebounce = null;
  let allAppts = [];

  document.addEventListener('drhire:auth', () => {
    loadAppointments();
    bindEvents();
  });

  function bindEvents() {
    document.getElementById('apptStatusFilter')?.addEventListener('change', function () {
      currentStatus = this.value; currentPage = 1; loadAppointments();
    });
    document.getElementById('apptDateFilter')?.addEventListener('change', function () {
      currentDate = this.value; currentPage = 1; loadAppointments();
    });
    document.getElementById('apptSearchInput')?.addEventListener('input', function () {
      clearTimeout(searchDebounce);
      const val = this.value;
      searchDebounce = setTimeout(() => { currentSearch = val.trim(); currentPage = 1; loadAppointments(); }, 350);
    });
    document.getElementById('refreshApptsBtn')?.addEventListener('click', loadAppointments);
    document.getElementById('closeApptModal')?.addEventListener('click', () => {
      document.getElementById('apptDetailsModal').classList.remove('active');
    });
  }

  async function loadAppointments() {
    const tbody = document.getElementById('apptsTbody');
    const card = tbody.closest('.dash-card');
    apiUI.loading(card);
    try {
      const qs = new URLSearchParams({ page: currentPage, per_page: 15 });
      if (currentStatus) qs.set('status', currentStatus);
      if (currentSearch) qs.set('search', currentSearch);
      if (currentDate) qs.set('date', currentDate);
      const data = await api.get(`/hospital/appointments?${qs.toString()}`);
      const appts = data.data || [];
      allAppts = appts;

      updateStats(appts, data.total);

      if (!appts.length) {
        apiUI.empty(card, 'No appointments found.', 'fa-calendar-xmark');
        return;
      }

      card.innerHTML = `
        <div class="dash-card-header">
          <span class="dash-card-title"><i class="fa-solid fa-list"></i> Appointments List</span>
          <span class="dash-card-action" id="refreshApptsBtn" style="cursor:pointer"><i class="fa-solid fa-rotate"></i> Refresh</span>
        </div>
        <div class="table-wrap">
          <table class="dash-table">
            <thead><tr><th>Patient</th><th>Doctor</th><th>Specialization</th><th>Date & Time</th><th>Reason</th><th>Status</th></tr></thead>
            <tbody id="apptsTbody">
              ${appts.map(a => `
                <tr style="cursor:pointer" onclick="viewAppt(${a.id})">
                  <td><div class="user-cell"><div class="ua ua-blue">${initials(a.patient_name)}</div><div><div class="td-name">${escHtml(a.patient_name)}</div><div class="td-sub">${escHtml(a.patient_phone||'')}</div></div></div></td>
                  <td>${escHtml(a.doctor_name)}</td>
                  <td>${escHtml(a.specialization||'–')}</td>
                  <td>${formatDate(a.appointment_date)} · ${formatTime(a.appointment_time)}</td>
                  <td>${escHtml(a.reason||'–')}</td>
                  <td><span class="badge ${badgeClass(a.status)}">${capitalize(a.status)}</span></td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
        <div id="apptsPagination" style="display:flex;gap:8px;justify-content:center;padding:16px"></div>
      `;
      document.getElementById('refreshApptsBtn').addEventListener('click', loadAppointments);
      renderPagination('apptsPagination', data.page, data.total_pages, p => { currentPage = p; loadAppointments(); });

    } catch (e) {
      apiUI.error(card, 'Failed to load appointments.');
    }
  }

  function updateStats(pageAppts, total) {
    const today = new Date().toISOString().slice(0, 10);
    document.getElementById('statTotalAppts').textContent = total ?? pageAppts.length;
    document.getElementById('statTodayAppts').textContent = pageAppts.filter(a => a.appointment_date === today).length;
    document.getElementById('statPendingAppts').textContent = pageAppts.filter(a => a.status === 'pending').length;
    document.getElementById('statCancelledAppts').textContent = pageAppts.filter(a => a.status === 'cancelled').length;
  }

  window.viewAppt = function (id) {
    const a = allAppts.find(x => x.id === id);
    if (!a) return;
    document.getElementById('apptDetailsBody').innerHTML = `
      <div style="display:flex;flex-direction:column;gap:10px">
        <div><strong>Patient:</strong> ${escHtml(a.patient_name)} (${a.patient_age||'–'}, ${escHtml(a.patient_gender||'')})</div>
        <div><strong>Phone:</strong> ${escHtml(a.patient_phone||'–')}</div>
        <div><strong>Address:</strong> ${escHtml(a.patient_address||'–')}</div>
        <div><strong>Doctor:</strong> ${escHtml(a.doctor_name)} (${escHtml(a.specialization||'–')})</div>
        <div><strong>Date & Time:</strong> ${formatDate(a.appointment_date)} · ${formatTime(a.appointment_time)}</div>
        <div><strong>Reason:</strong> ${escHtml(a.reason||'–')}</div>
        ${a.notes ? `<div><strong>Notes:</strong> ${escHtml(a.notes)}</div>` : ''}
        <div><strong>Status:</strong> <span class="badge ${badgeClass(a.status)}">${capitalize(a.status)}</span></div>
      </div>`;
    document.getElementById('apptDetailsModal').classList.add('active');
  };

  function renderPagination(id, current, total, onPage) {
    const el = document.getElementById(id);
    if (!el || total <= 1) { if (el) el.innerHTML = ''; return; }
    el.innerHTML = '';
    for (let i = 1; i <= Math.min(total, 10); i++) {
      const btn = document.createElement('button');
      btn.textContent = i;
      btn.className = 'btn-sm ' + (i === current ? 'btn-primary' : 'btn-outline-sm');
      btn.onclick = () => onPage(i);
      el.appendChild(btn);
    }
  }

  function badgeClass(s) { return { pending: 'badge-pending', confirmed: 'badge-confirmed', completed: 'badge-completed', cancelled: 'badge-cancelled' }[s] || ''; }
  function capitalize(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }
  function initials(s) { return (s || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase(); }
  function formatDate(d) { return d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '–'; }
  function formatTime(t) { if (!t) return ''; const [h,m] = t.split(':'); const hh = parseInt(h); const ampm = hh >= 12 ? 'PM' : 'AM'; const h12 = hh % 12 || 12; return `${h12}:${m} ${ampm}`; }
  function escHtml(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
})();
