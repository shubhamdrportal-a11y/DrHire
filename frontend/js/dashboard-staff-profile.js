/**
 * dashboard-staff-profile.js
 * Powers dashboard-staff-profile.html
 */
(function () {
  'use strict';
  window.__expectedRole = 'staff';

  document.addEventListener('drhire:auth', async () => {
    await loadProfile();
    await loadFiles();
    bindForm();
    bindPhotoUpload();
    bindResumeUpload();
    updateNavBadge();
  });

  async function updateNavBadge() {
    try {
      const data = await api.get('/staff/stats');
      const total = data.applications?.total ?? 0;
      document.querySelectorAll('.nav-badge').forEach(b => { b.textContent = total; });
    } catch (e) { /* non-critical */ }
  }

  async function loadProfile() {
    try {
      const data = await api.get('/staff/profile');
      const fields = {
        'prof-name':    data.full_name,
        'prof-email':   data.email,
        'prof-phone':   data.phone,
        'prof-org':     data.organization,
        'prof-address': data.address,
        'prof-city':    data.city,
        'prof-state':   data.state,
        'prof-bio':     data.bio,
      };
      Object.entries(fields).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
          el.value = val || '';
        } else {
          el.textContent = val || '–';
        }
      });
    } catch(e) { apiUI.toast('Failed to load profile: ' + e.message, 'error'); }
  }

  // Show the most recently uploaded photo/resume, if any (files persist
  // in the `files` table even though the profile record doesn't store
  // a permanent link back to them).
  async function loadFiles() {
    try {
      const data = await api.get('/files');
      const files = data.data || data || [];
      const latestPhoto  = files.find(f => f.category === 'profile_photo');
      const latestResume = files.find(f => f.category === 'resume');

      if (latestPhoto) {
        const preview = document.getElementById('profilePhotoPreview');
        const url = await api.fileUrl(latestPhoto.id);
        if (url && preview) { preview.src = url; preview.style.display = 'block'; }
      }
      if (latestResume) {
        const nameEl = document.getElementById('resumeFileName');
        if (nameEl) nameEl.textContent = latestResume.original_filename;
      }
    } catch (e) { /* no files uploaded yet — non-critical */ }
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
          organization: document.getElementById('prof-org')?.value,
          address:      document.getElementById('prof-address')?.value,
          city:         document.getElementById('prof-city')?.value,
          state:        document.getElementById('prof-state')?.value,
          bio:          document.getElementById('prof-bio')?.value,
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
