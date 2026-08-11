/**
 * dashboard-staff-profile.js
 * Powers dashboard-staff-profile.html
 */
(function () {
  'use strict';
  window.__expectedRole = 'staff';

  document.addEventListener('drhire:auth', async () => {
    await loadProfile();
    bindForm();
    bindPhotoUpload();
    bindResumeUpload();
  });

  async function loadProfile() {
    try {
      const data = await api.get('/staff/profile');
      const fields = {
        'prof-name':    data.full_name,
        'prof-email':   data.email,
        'prof-phone':   data.phone,
        'prof-gender':  data.gender,
        'prof-age':     data.age,
        'prof-org':     data.organization,
        'prof-address': data.address,
        'prof-city':    data.city,
        'prof-state':   data.state,
      };
      Object.entries(fields).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (el.tagName === 'INPUT' || el.tagName === 'SELECT') {
          el.value = val || '';
        } else {
          el.textContent = val || '–';
        }
      });

      if (data.photo_url) {
        const img = document.getElementById('profilePhotoPreview');
        if (img) { img.src = data.photo_url; img.style.display = 'block'; }
      }
    } catch(e) { apiUI.toast('Failed to load profile: ' + e.message, 'error'); }
  }

  function bindForm() {
    const form = document.getElementById('staffProfileForm');
    form?.addEventListener('submit', async function(e) {
      e.preventDefault();
      const btn = this.querySelector('[type=submit]');
      btn.disabled = true;
      btn.textContent = 'Saving…';
      try {
        await api.put('/staff/profile', {
          full_name:    document.getElementById('prof-name')?.value,
          phone:        document.getElementById('prof-phone')?.value,
          gender:       document.getElementById('prof-gender')?.value,
          age:          parseInt(document.getElementById('prof-age')?.value||'0') || null,
          organization: document.getElementById('prof-org')?.value,
          address:      document.getElementById('prof-address')?.value,
          city:         document.getElementById('prof-city')?.value,
          state:        document.getElementById('prof-state')?.value,
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
})();
