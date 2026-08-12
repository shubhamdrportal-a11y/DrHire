/**
 * dashboard-doctor-patients.js — powers dashboard-doctor-patients.html
 */
(function () {
  'use strict';
  window.__expectedRole = 'doctor';

  let currentPage = 1;
  let patientsById = {};

  document.addEventListener('drhire:auth', () => {
    loadPatients(1);

    document.getElementById('patientSearchBtn')?.addEventListener('click', () => loadPatients(1));
    document.getElementById('patientSearch')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') loadPatients(1);
    });

    document.getElementById('patientDetailsClose')?.addEventListener('click', closeModal);
    document.getElementById('patientDetailsClose2')?.addEventListener('click', closeModal);
  });

  async function loadPatients(page) {
    currentPage = page;
    const body = document.getElementById('patientsTableBody');
    const search = document.getElementById('patientSearch')?.value.trim() || '';
    if (!body) return;
    body.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px"><i class="fa-solid fa-spinner fa-spin" style="color:var(--accent)"></i></td></tr>`;

    try {
      const qs = new URLSearchParams({ page, per_page: 10 });
      if (search) qs.set('search', search);
      const data = await api.get(`/doctor/patients?${qs.toString()}`);
      const patients = data.data || [];

      patientsById = {};
      patients.forEach(p => { patientsById[p.patient_id] = p; });

      setText('pat-total', data.total ?? patients.length);
      setText('patientsSubtitle', `${data.total ?? patients.length} patient(s) in your records`);

      if (!patients.length) {
        body.innerHTML = `<tr><td colspan="7"><div style="text-align:center;padding:40px;color:var(--text3)"><i class="fa-solid fa-user-slash fa-2x" style="opacity:.3;margin-bottom:10px"></i><p>No patients found.</p></div></td></tr>`;
        renderPagination(data);
        return;
      }

      body.innerHTML = patients.map(p => {
        const initials = (p.patient_name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
        return `
        <tr>
          <td><div class="user-cell"><div class="ua ua-blue">${initials}</div><div><div class="td-name">${escHtml(p.patient_name)}</div><div class="td-sub">${escHtml(p.patient_phone || '')}</div></div></div></td>
          <td>${p.patient_age || '–'} / ${p.patient_gender || '–'}</td>
          <td>${escHtml(truncate(p.conditions, 40))}</td>
          <td>${p.last_visit ? formatDate(p.last_visit) : '–'}</td>
          <td style="font-weight:700;color:var(--text)">${p.appointment_count}</td>
          <td><span class="badge ${statusBadge(p.last_status)}">${capitalize(p.last_status || '')}</span></td>
          <td><button class="btn-sm btn-outline-sm" onclick="doctorPatientView(${p.patient_id})"><i class="fa-solid fa-eye"></i> View</button></td>
        </tr>`;
      }).join('');

      renderPagination(data);
    } catch (e) {
      body.innerHTML = `<tr><td colspan="7"><div style="text-align:center;padding:40px;color:var(--danger)">Failed to load patients.</div></td></tr>`;
    }
  }

  function renderPagination(data) {
    const el = document.getElementById('patientsPagination');
    if (!el) return;
    const totalPages = data.total_pages || 1;
    if (totalPages <= 1) { el.innerHTML = ''; return; }
    let html = '';
    for (let i = 1; i <= totalPages; i++) {
      html += `<button class="btn-sm ${i === currentPage ? 'btn-primary-sm' : 'btn-outline-sm'}" onclick="doctorPatientsGoPage(${i})">${i}</button>`;
    }
    el.innerHTML = html;
  }

  window.doctorPatientsGoPage = (p) => loadPatients(p);

  window.doctorPatientView = function (id) {
    const p = patientsById[id];
    if (!p) return;
    setText('pmName', p.patient_name);
    setText('pmPhone', p.patient_phone || '–');
    setText('pmAgeGender', `${p.patient_age || '–'} / ${p.patient_gender || '–'}`);
    setText('pmVisits', p.appointment_count);
    setText('pmConditions', p.conditions || '–');
    document.getElementById('patientDetailsModal')?.classList.add('active');
  };

  function closeModal() {
    document.getElementById('patientDetailsModal')?.classList.remove('active');
  }

  function statusBadge(s) { return { pending: 'badge-pending', confirmed: 'badge-active', completed: 'badge-completed', cancelled: 'badge-inactive' }[s] || ''; }
  function capitalize(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }
  function truncate(s, n) { if (!s) return '–'; return s.length > n ? s.slice(0, n) + '…' : s; }
  function formatDate(d) { const dt = new Date(d); return isNaN(dt) ? d : dt.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }); }
  function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
  function escHtml(s) { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
})();
