/**
 * dashboard-doctor-profile.js — powers dashboard-doctor-profile.html
 */
(function () {
  'use strict';
  window.__expectedRole = 'doctor';

  document.addEventListener('drhire:auth', async () => {
    await loadProfile();
    bindForm();
    bindPhotoUpload();
    bindResumeUpload();
    bindAvailability();
  });

  async function loadProfile() {
    try {
      const data = await api.get('/doctor/profile');
      const fields = {
        'prof-full-name':   data.full_name,
        'prof-phone':       data.phone,
        'prof-spec':        data.specialization,
        'prof-qual':        data.qualification,
        'prof-exp':         data.experience_years,
        'prof-license':     data.license_no,
        'prof-address':     data.clinic_address,
        'prof-city':        data.city,
        'prof-state':       data.state,
        'prof-bio':         data.bio,
        'prof-email':       data.email,
      };
      Object.entries(fields).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
          el.value = val || '';
        } else {
          el.textContent = val || '–';
        }
      });

      // Availability toggle
      const avail = document.getElementById('prof-available');
      if (avail) avail.checked = data.is_available == 1;

      // Profile photo
      if (data.photo_url) {
        const img = document.getElementById('profilePhotoPreview');
        if (img) { img.src = data.photo_url; img.style.display = 'block'; }
      }
    } catch(e) { apiUI.toast('Failed to load profile: ' + e.message, 'error'); }
  }

  function bindForm() {
    const form = document.getElementById('doctorProfileForm');
    form?.addEventListener('submit', async function(e) {
      e.preventDefault();
      const btn = this.querySelector('[type=submit]');
      btn.disabled = true;
      btn.textContent = 'Saving…';
      try {
        await api.put('/doctor/profile', {
          full_name:       document.getElementById('prof-full-name')?.value,
          phone:           document.getElementById('prof-phone')?.value,
          specialization:  document.getElementById('prof-spec')?.value,
          qualification:   document.getElementById('prof-qual')?.value,
          experience_years:parseInt(document.getElementById('prof-exp')?.value||'0'),
          license_no:      document.getElementById('prof-license')?.value,
          clinic_address:  document.getElementById('prof-address')?.value,
          city:            document.getElementById('prof-city')?.value,
          state:           document.getElementById('prof-state')?.value,
          bio:             document.getElementById('prof-bio')?.value,
          is_available:    document.getElementById('prof-available')?.checked ? 1 : 0,
        });
        apiUI.toast('Profile updated successfully!', 'success');
      } catch(e) { apiUI.toast(e.message, 'error'); }
      finally { btn.disabled = false; btn.textContent = 'Save Changes'; }
    });
  }

  function bindPhotoUpload() {
    const input = document.getElementById('photoUploadInput');
    const preview = document.getElementById('profilePhotoPreview');
    input?.addEventListener('change', async function() {
      if (!this.files?.[0]) return;
      try {
        const result = await api.upload('profile_photo', this.files[0]);
        if (result.file_id && preview) {
          // Get signed URL
          const urlData = await api.fileUrl(result.file_id);
          if (urlData && preview) { preview.src = urlData; preview.style.display = 'block'; }
        }
        apiUI.toast('Photo uploaded!', 'success');
      } catch(e) { apiUI.toast('Photo upload failed: ' + e.message, 'error'); }
    });
  }

  function bindResumeUpload() {
    const input = document.getElementById('resumeUploadInput');
    input?.addEventListener('change', async function() {
      if (!this.files?.[0]) return;
      try {
        await api.upload('resume', this.files[0]);
        apiUI.toast('Resume uploaded!', 'success');
        const nameEl = document.getElementById('resumeFileName');
        if (nameEl) nameEl.textContent = this.files[0].name;
      } catch(e) { apiUI.toast('Resume upload failed: ' + e.message, 'error'); }
    });
  }

  async function bindAvailability() {
    const container = document.getElementById('availabilityContainer');
    if (!container) return;
    try {
      const data = await api.get('/doctor/availability');
      // Pre-fill availability UI if it exists
    } catch {}

    const saveBtn = document.getElementById('saveAvailabilityBtn');
    saveBtn?.addEventListener('click', async () => {
      const slots = [];
      document.querySelectorAll('[data-avail-slot]').forEach(row => {
        const day   = parseInt(row.dataset.day);
        const start = row.querySelector('.avail-start')?.value;
        const end   = row.querySelector('.avail-end')?.value;
        const active = row.querySelector('.avail-active')?.checked;
        if (start && end) slots.push({ day_of_week: day, start_time: start, end_time: end, is_active: active ? 1 : 0 });
      });
      try {
        await api.put('/doctor/availability', { slots });
        apiUI.toast('Availability saved!', 'success');
      } catch(e) { apiUI.toast(e.message, 'error'); }
    });
  }
})();
