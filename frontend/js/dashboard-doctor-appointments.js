/**
 * dashboard-doctor-appointments.js — powers dashboard-doctor-appointments.html
 */
(function () {
  'use strict';
  window.__expectedRole = 'doctor';

  let currentStatus = '';
  let currentDate   = 'today';
  let currentSearch = '';
  let currentPage   = 1;
  let apptsById     = {};

  document.addEventListener('drhire:auth', () => {
    loadStats();
    loadAppointments();
    bindControls();
  });

  function bindControls() {
    document.getElementById('statusFilter')?.addEventListener('change', function () {
      currentStatus = this.value;
      loadAppointments(1);
    });
    document.getElementById('dateFilter')?.addEventListener('change', function () {
      currentDate = this.value;
      syncTabPills();
      loadAppointments(1);
    });
    document.getElementById('apptSearchInput')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        currentSearch = e.target.value.trim();
        loadAppointments(1);
      }
    });
    document.getElementById('apptRefreshBtn')?.addEventListener('click', () => loadAppointments(currentPage));

    document.querySelectorAll('[data-tab-date]').forEach(btn => {
      btn.addEventListener('click', () => {
        currentDate = btn.dataset.tabDate;
        const dateSelect = document.getElementById('dateFilter');
        if (dateSelect) dateSelect.value = currentDate;
        syncTabPills();
        loadAppointments(1);
      });
    });

    document.getElementById('apptDetailsClose')?.addEventListener('click', closeModal);
  }

  function syncTabPills() {
    document.querySelectorAll('[data-tab-date]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tabDate === currentDate);
    });
  }

  async function loadStats() {
    try {
      const data = await api.get('/doctor/stats');
      const a = data.appointments || {};
      setText('stat-today', a.today || 0);
      setText('stat-upcoming', a.upcoming || 0);
      setText('stat-pending', a.pending || 0);
    } catch (e) { /* non-fatal */ }
  }

  async function loadAppointments(page) {
    currentPage = page || currentPage;
    const container = document.getElementById('apptListContainer');
    if (!container) return;
    apiUI.loading(container);

    const params = new URLSearchParams();
    if (currentStatus) params.set('status', currentStatus);
    if (currentDate)   params.set('date', currentDate);
    if (currentSearch) params.set('search', currentSearch);
    params.set('page', currentPage);
    params.set('per_page', '10');

    try {
      const data  = await api.get('/doctor/appointments?' + params);
      const appts = data.data || [];
      apptsById = {};
      appts.forEach(a => { apptsById[a.id] = a; });

      if (!appts.length) {
        apiUI.empty(container, 'No appointments found for the selected filters.', 'fa-calendar-xmark');
        renderPagination(data);
        return;
      }

      container.innerHTML = appts.map(a => `
        <div class="appt-card" id="appt-${a.id}">
          <div class="appt-card-top">
            <div class="appt-patient-avatar" style="background:${sColor(a.status)}20;color:${sColor(a.status)}">${(a.patient_name||'?')[0].toUpperCase()}</div>
            <div style="flex:1">
              <div class="appt-patient-name">${escHtml(a.patient_name)}</div>
              <div class="appt-patient-meta">
                <span><i class="fa-solid fa-phone"></i> ${escHtml(a.patient_phone||'–')}</span>
                <span><i class="fa-solid fa-venus-mars"></i> ${a.patient_gender||'–'}</span>
                <span><i class="fa-solid fa-cake-candles"></i> ${a.patient_age ? 'Age ' + a.patient_age : '–'}</span>
              </div>
            </div>
            <span class="badge ${sBadge(a.status)}" style="font-size:.73rem">${capitalize(a.status)}</span>
          </div>
          <div class="appt-card-body">
            <div class="appt-detail"><div class="appt-detail-label">Date</div><div class="appt-detail-val">${formatDate(a.appointment_date)}</div></div>
            <div class="appt-detail"><div class="appt-detail-label">Time</div><div class="appt-detail-val">${formatTime(a.appointment_time)}</div></div>
            <div class="appt-detail"><div class="appt-detail-label">Address</div><div class="appt-detail-val" style="font-size:.75rem">${escHtml(a.patient_address||'–')}</div></div>
          </div>
          <div class="appt-reason-box"><strong>Reason:</strong> ${escHtml(a.reason||'–')}${a.notes?'<br><strong>Notes:</strong> '+escHtml(a.notes):''}</div>
          <div class="appt-card-actions">
            <div class="appt-card-btns">
              ${a.status === 'pending'   ? `<button class="btn-sm btn-success-sm" onclick="doctorApptStatus(${a.id},'confirmed')"><i class="fa-solid fa-check"></i> Confirm</button>` : ''}
              ${a.status === 'confirmed' ? `<button class="btn-sm btn-primary-sm" onclick="doctorApptStatus(${a.id},'completed')"><i class="fa-solid fa-circle-check"></i> Complete</button>` : ''}
              <button class="btn-sm btn-outline-sm" onclick="doctorApptView(${a.id})"><i class="fa-solid fa-eye"></i> View</button>
              ${['pending','confirmed'].includes(a.status) ? `<button class="btn-sm btn-danger-sm" onclick="doctorApptStatus(${a.id},'cancelled')"><i class="fa-solid fa-xmark"></i> Cancel</button>` : ''}
            </div>
            <span style="font-size:.7rem;color:var(--text3)">Booked ${formatDate(a.created_at)}</span>
          </div>
        </div>
      `).join('');

      renderPagination(data);
    } catch (e) { apiUI.error(container, 'Failed to load appointments: ' + e.message); }
  }

  function renderPagination(data) {
    const el = document.getElementById('apptPagination');
    if (!el) return;
    const totalPages = data.total_pages || 1;
    if (totalPages <= 1) { el.innerHTML = ''; return; }
    let html = '';
    for (let i = 1; i <= totalPages; i++) {
      html += `<button class="btn-sm ${i === currentPage ? 'btn-primary-sm' : 'btn-outline-sm'}" onclick="doctorApptGoPage(${i})">${i}</button>`;
    }
    el.innerHTML = html;
  }
  window.doctorApptGoPage = (p) => loadAppointments(p);

  window.doctorApptStatus = async function (id, status) {
    try {
      await api.patch(`/doctor/appointments/${id}/status`, { status });
      apiUI.toast('Appointment ' + status + '.', 'success');
      loadAppointments(currentPage);
      loadStats();
    } catch (e) { apiUI.toast(e.message, 'error'); }
  };

  window.doctorApptView = function (id) {
    const a = apptsById[id];
    if (!a) return;
    setText('apptModalSpec', a.reason ? 'Consultation' : '');
    setHtml('apptModalStatusBadge', capitalize(a.status));
    const badgeEl = document.getElementById('apptModalStatusBadge');
    if (badgeEl) badgeEl.className = 'badge ' + sBadge(a.status);
    setText('apptModalPatientName', a.patient_name || '–');
    setText('apptModalPhone', a.patient_phone || '–');
    setText('apptModalAgeGender', `${a.patient_age || '–'} / ${a.patient_gender || '–'}`);
    setText('apptModalAddress', a.patient_address || '–');
    setText('apptModalDate', formatDate(a.appointment_date));
    setText('apptModalTime', formatTime(a.appointment_time));
    setText('apptModalBooked', formatDate(a.created_at));
    setText('apptModalReason', a.reason || '–');

    const actions = document.getElementById('apptModalActions');
    if (actions) {
      let btns = '';
      if (a.status === 'pending') btns += `<button class="btn-sm btn-success-sm" style="padding:8px 16px" onclick="doctorApptStatus(${a.id},'confirmed');closeApptModal()"><i class="fa-solid fa-check"></i> Confirm</button>`;
      if (a.status === 'confirmed') btns += `<button class="btn-sm btn-primary-sm" style="padding:8px 16px" onclick="doctorApptStatus(${a.id},'completed');closeApptModal()"><i class="fa-solid fa-circle-check"></i> Complete</button>`;
      if (['pending', 'confirmed'].includes(a.status)) btns += `<button class="btn-sm btn-danger-sm" style="padding:8px 16px" onclick="doctorApptStatus(${a.id},'cancelled');closeApptModal()"><i class="fa-solid fa-xmark"></i> Cancel Appt.</button>`;
      btns += `<button class="btn-sm btn-outline-sm" style="padding:8px 16px" onclick="closeApptModal()"><i class="fa-solid fa-times"></i> Close</button>`;
      actions.innerHTML = btns;
    }
    document.getElementById('apptDetailsModal')?.classList.add('active');
  };

  window.closeApptModal = closeModal;
  function closeModal() { document.getElementById('apptDetailsModal')?.classList.remove('active'); }

  function sColor(s) { return {pending:'#f59e0b',confirmed:'#0ea5e9',completed:'#10b981',cancelled:'#ef4444'}[s]||'#8b5cf6'; }
  function sBadge(s) { return {pending:'badge-pending',confirmed:'badge-confirmed',completed:'badge-completed',cancelled:'badge-cancelled'}[s]||''; }
  function capitalize(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }
  function formatDate(d) { return d ? new Date(d).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'}) : '–'; }
  function formatTime(t) { if(!t) return '–'; const [h,m]=t.split(':'); const hr=+h; return (hr>12?hr-12:hr||12)+':'+m+(hr>=12?' PM':' AM'); }
  function escHtml(s) { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }
  function setHtml(id, v) { const el = document.getElementById(id); if (el) el.innerHTML = v; }
})();
