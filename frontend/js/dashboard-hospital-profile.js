/**
 * dashboard-hospital-profile.js
 * Powers dashboard-hospital-profile.html
 */
(function () {
  'use strict';
  window.__expectedRole = 'hospital';

  document.addEventListener('drhire:auth', async () => {
    await loadProfile();
    bindForm();
    bindPhotoUpload();
  });

  async function loadProfile() {
    try {
      const data = await api.get('/hospital/profile');
      const fields = {
        'prof-name':        data.hospital_name,
        'prof-email':       data.email,
        'prof-phone':       data.contact_phone,
        'prof-reg':         data.registration_no,
        'prof-address':     data.address,
        'prof-city':        data.city,
        'prof-state':       data.state,
        'prof-website':     data.website,
        'prof-desc':        data.description,
      };
      Object.entries(fields).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
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
    const form = document.getElementById('hospitalProfileForm');
    form?.addEventListener('submit', async function(e) {
      e.preventDefault();
      const btn = this.querySelector('[type=submit]');
      btn.disabled = true;
      btn.textContent = 'Saving…';
      try {
        await api.put('/hospital/profile', {
          hospital_name:   document.getElementById('prof-name')?.value,
          contact_phone:   document.getElementById('prof-phone')?.value,
          registration_no: document.getElementById('prof-reg')?.value,
          address:         document.getElementById('prof-address')?.value,
          city:            document.getElementById('prof-city')?.value,
          state:           document.getElementById('prof-state')?.value,
          website:         document.getElementById('prof-website')?.value,
          description:     document.getElementById('prof-desc')?.value,
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
        const result = await api.upload('hospital_logo', this.files[0]);
        if (result.file_id && preview) {
          const urlData = await api.fileUrl(result.file_id);
          if (urlData && preview) { preview.src = urlData; preview.style.display = 'block'; }
        }
        apiUI.toast('Logo uploaded!', 'success');
      } catch(e) { apiUI.toast('Logo upload failed: ' + e.message, 'error'); }
    });
  }
})();
