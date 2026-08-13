/**
 * dashboard-hospital-doctors.js
 * Powers dashboard-hospital-doctors.html
 */
(function () {
  'use strict';
  window.__expectedRole = 'hospital';

  let allDoctors = [];
  let searchDebounce = null;

  document.addEventListener('drhire:auth', () => {
    loadDoctors();
    bindEvents();
  });

  function bindEvents() {
    document.getElementById('doctorSearchInput')?.addEventListener('input', function () {
      clearTimeout(searchDebounce);
      const val = this.value;
      searchDebounce = setTimeout(() => loadDoctors(val.trim()), 350);
    });

    document.getElementById('addDoctorBtn')?.addEventListener('click', () => {
      document.getElementById('addDoctorForm').reset();
      document.getElementById('addDoctorModal').classList.add('active');
    });
    document.getElementById('closeAddDoctorModal')?.addEventListener('click', () => {
      document.getElementById('addDoctorModal').classList.remove('active');
    });
    document.getElementById('closeDoctorProfileModal')?.addEventListener('click', () => {
      document.getElementById('doctorProfileModal').classList.remove('active');
    });

    document.getElementById('addDoctorForm')?.addEventListener('submit', async function (e) {
      e.preventDefault();
      const email = document.getElementById('addDoctorEmail').value.trim();
      const btn = this.querySelector('button[type="submit"]');
      btn.disabled = true;
      try {
        await api.post('/hospital/doctors', { email });
        apiUI.toast('Doctor added to your roster.', 'success');
        document.getElementById('addDoctorModal').classList.remove('active');
        loadDoctors();
      } catch (err) {
        apiUI.toast(err.message, 'error');
      } finally {
        btn.disabled = false;
      }
    });
  }

  async function loadDoctors(search = '') {
    const grid = document.getElementById('doctorsGrid');
    apiUI.loading(grid);
    try {
      const qs = search ? `?search=${encodeURIComponent(search)}` : '';
      const data = await api.get(`/hospital/doctors${qs}`);
      allDoctors = data.data || [];
      renderStats(allDoctors);
      renderGrid(allDoctors);
    } catch (e) {
      apiUI.error(grid, 'Failed to load doctors.');
    }
  }

  function renderStats(doctors) {
    document.getElementById('statTotalDoctors').textContent = doctors.length;
    document.getElementById('statOnDutyDoctors').textContent = doctors.filter(d => d.is_available == 1).length;
    document.getElementById('statOffDutyDoctors').textContent = doctors.filter(d => d.is_available != 1).length;
    document.getElementById('statDeptsCount').textContent = new Set(doctors.map(d => d.specialization).filter(Boolean)).size;
    document.getElementById('doctorsSubtitle').textContent = `${doctors.length} doctor${doctors.length === 1 ? '' : 's'} on your roster`;
  }

  function renderGrid(doctors) {
    const grid = document.getElementById('doctorsGrid');
    if (!doctors.length) {
      apiUI.empty(grid, 'No doctors on your roster yet. Add one, or hire via a job application.', 'fa-user-doctor');
      return;
    }
    grid.innerHTML = doctors.map(d => `
      <div class="doctor-card">
        <div class="doctor-card-top">
          <div class="doctor-avatar" style="background:linear-gradient(135deg,#0ea5e9,#06b6d4)">${initials(d.full_name)}</div>
          <div class="doctor-card-info">
            <div class="doctor-name">${escHtml(d.full_name)}</div>
            <div class="doctor-spec">${escHtml(d.specialization || 'General')}</div>
            <div class="doctor-meta"><i class="fa-solid fa-briefcase-medical" style="color:var(--accent);margin-right:4px"></i>${d.experience_years ? d.experience_years + ' yrs exp' : 'Exp N/A'} · ${escHtml(d.qualification || '')}</div>
          </div>
          <span class="badge ${d.is_available == 1 ? 'badge-active' : 'badge-inactive'}">${d.is_available == 1 ? 'On Duty' : 'Off Duty'}</span>
        </div>
        <div style="display:flex;gap:8px;padding-top:12px;border-top:1px solid var(--border)">
          <button class="btn-sm btn-outline-sm" style="flex:1" onclick="viewDoctorProfile(${d.id})"><i class="fa-solid fa-eye"></i> View Profile</button>
          ${d.roster_status ? `<button class="btn-sm btn-danger-sm" onclick="removeDoctor(${d.id})" title="Remove from roster"><i class="fa-solid fa-user-slash"></i></button>` : ''}
        </div>
      </div>
    `).join('');
  }

  window.viewDoctorProfile = function (id) {
    const d = allDoctors.find(x => x.id === id);
    if (!d) return;
    document.getElementById('doctorProfileBody').innerHTML = `
      <div style="display:flex;flex-direction:column;gap:10px">
        <div style="display:flex;align-items:center;gap:12px">
          <div class="doctor-avatar" style="background:linear-gradient(135deg,#0ea5e9,#06b6d4)">${initials(d.full_name)}</div>
          <div><div style="font-weight:700;font-size:1rem">${escHtml(d.full_name)}</div><div style="color:var(--text3);font-size:.8rem">${escHtml(d.email)}</div></div>
        </div>
        <div><strong>Specialization:</strong> ${escHtml(d.specialization || '–')}</div>
        <div><strong>Qualification:</strong> ${escHtml(d.qualification || '–')}</div>
        <div><strong>Experience:</strong> ${d.experience_years ? d.experience_years + ' years' : '–'}</div>
        <div><strong>Phone:</strong> ${escHtml(d.phone || '–')}</div>
        <div><strong>Status:</strong> <span class="badge ${d.is_available == 1 ? 'badge-active' : 'badge-inactive'}">${d.is_available == 1 ? 'On Duty' : 'Off Duty'}</span></div>
      </div>`;
    document.getElementById('doctorProfileModal').classList.add('active');
  };

  window.removeDoctor = async function (id) {
    if (!confirm('Remove this doctor from your directly-added roster? (Doctors hired via a job application will still appear.)')) return;
    try {
      await api.delete(`/hospital/doctors/${id}`);
      apiUI.toast('Doctor removed from roster.', 'success');
      loadDoctors();
    } catch (e) {
      apiUI.toast(e.message, 'error');
    }
  };

  function initials(s) { return (s || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase(); }
  function escHtml(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
})();
