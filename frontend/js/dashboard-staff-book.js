/**
 * dashboard-staff-book.js
 * Powers dashboard-staff-book.html
 */
(function () {
  'use strict';
  window.__expectedRole = 'staff';

  let currentPage = 1;
  let currentFilters = { specialization: '', city: '', search: '' };
  let selectedDoctorId = null;

  document.addEventListener('drhire:auth', () => {
    loadDoctors();
    bindFilters();
    bindBookingModal();
  });

  function bindFilters() {
    const search = document.getElementById('docSearchInput');
    const spec = document.getElementById('docSpecFilter');
    const loc = document.getElementById('docLocFilter');
    const btn = document.getElementById('docFilterBtn');

    btn?.addEventListener('click', () => {
      currentFilters.search = search?.value.trim() || '';
      currentFilters.specialization = spec?.value || '';
      currentFilters.city = loc?.value || '';
      currentPage = 1;
      loadDoctors();
    });
    search?.addEventListener('keydown', e => { if (e.key === 'Enter') btn?.click(); });
  }

  async function loadDoctors() {
    const container = document.getElementById('doctorsGridContainer');
    if (!container) return;
    apiUI.loading(container);

    const params = new URLSearchParams({ page: currentPage, per_page: 12, ...Object.fromEntries(Object.entries(currentFilters).filter(([,v])=>v)) });

    try {
      const data = await api.get('/staff/doctors?' + params);
      const docs = data.data || [];

      if (!docs.length) { apiUI.empty(container, 'No doctors found.', 'fa-user-doctor'); return; }

      container.innerHTML = `<div class="jobs-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">
        ${docs.map(d => docCard(d)).join('')}
      </div>`;

      renderPagination('docsPagination', data.page, data.total_pages, p => { currentPage = p; loadDoctors(); });
    } catch(e) { apiUI.error(container, 'Failed to load doctors: ' + e.message); }
  }

  function docCard(d) {
    return `
      <div class="dash-card" style="padding:16px;text-align:center">
        <img src="${d.photo_url || '../assets/default-avatar.png'}" alt="Photo" style="width:70px;height:70px;border-radius:50%;object-fit:cover;margin:0 auto 10px;border:3px solid var(--border)">
        <div style="font-weight:700;font-size:1.05rem;color:var(--text)">${escHtml(d.full_name)}</div>
        <div style="font-size:.85rem;color:var(--accent);margin:2px 0 8px">${escHtml(d.specialization)}</div>
        <div style="font-size:.78rem;color:var(--text3);margin-bottom:14px"><i class="fa-solid fa-location-dot" style="margin-right:4px"></i>${escHtml(d.city || 'Location N/A')}</div>
        <button class="btn-sm btn-primary" style="width:100%;border-radius:8px" onclick="openBookingModal(${d.user_id}, '${escHtml(d.full_name).replace(/'/g,"\\'").replace(/"/g,'&quot;')}')">
          <i class="fa-solid fa-calendar-plus"></i> Book Appointment
        </button>
      </div>`;
  }

  window.openBookingModal = function(doctorId, doctorName) {
    selectedDoctorId = doctorId;
    document.getElementById('bookingModalTitle').textContent = `Book with ${doctorName}`;
    document.getElementById('bookingForm').reset();
    document.getElementById('bookingModal').classList.add('active');

    // Auto-fill patient details from current profile
    const p = window.__currentProfile;
    if (p) {
      document.getElementById('patientName').value = p.full_name || '';
      document.getElementById('patientPhone').value = p.phone || '';
    }
  };

  function bindBookingModal() {
    document.getElementById('closeBookingModal')?.addEventListener('click', () => {
      document.getElementById('bookingModal').classList.remove('active');
    });

    document.getElementById('bookingForm')?.addEventListener('submit', async function(e) {
      e.preventDefault();
      const btn = this.querySelector('button[type="submit"]');

      const data = {
        doctor_id: selectedDoctorId,
        patient_name: document.getElementById('patientName').value,
        patient_phone: document.getElementById('patientPhone').value,
        patient_gender: document.getElementById('patientGender').value,
        patient_age: parseInt(document.getElementById('patientAge').value) || null,
        appointment_date: document.getElementById('apptDate').value,
        appointment_time: document.getElementById('apptTime').value,
        reason: document.getElementById('apptReason').value,
      };

      btn.disabled = true; btn.textContent = 'Booking...';
      try {
        await api.post('/staff/appointments', data);
        apiUI.toast('Appointment booked successfully!', 'success');
        document.getElementById('bookingModal').classList.remove('active');
      } catch(err) {
        apiUI.toast(err.message, 'error');
      } finally {
        btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-calendar-check"></i> Confirm Booking';
      }
    });
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
})();
