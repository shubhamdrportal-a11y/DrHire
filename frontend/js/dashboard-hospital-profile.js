/**
 * dashboard-hospital-profile.js
 * Powers dashboard-hospital-profile.html
 */
(function () {
  'use strict';
  window.__expectedRole = 'hospital';
  let lastProfileData = {};

  document.addEventListener('drhire:auth', async () => {
    await loadProfile();
    await loadHeaderStats();
    bindForm();
    bindPhotoUpload();
  });

  async function loadProfile() {
    try {
      const data = await api.get('/hospital/profile');
      applyProfile(data);
    } catch (e) {
      // No profile row yet — leave the form blank so the hospital can create one.
    }
    try {
      const settings = await api.get('/settings');
      const logoId = settings.data?.hospital_logo_file_id;
      if (logoId) {
        const url = await api.fileUrl(logoId);
        if (url) showLogo(url);
      }
    } catch (e) { /* no logo saved yet */ }
  }

  function applyProfile(data) {
    lastProfileData = data;
    const fields = {
      'prof-name':    data.hospital_name,
      'prof-email':   data.email,
      'prof-phone':   data.contact_phone,
      'prof-reg':     data.registration_no,
      'prof-address': data.address,
      'prof-city':    data.city,
      'prof-state':   data.state,
      'prof-website': data.website,
      'prof-desc':    data.about,
      'prof-type':    data.type,
      'prof-beds':    data.bed_count,
    };
    Object.entries(fields).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.value = val ?? '';
    });

    document.getElementById('hospHeaderName').textContent = data.hospital_name || 'Hospital';
    document.getElementById('hospHeaderType').textContent = data.type || 'Hospital';
    document.getElementById('hospHeaderLocation').textContent = [data.city, data.state].filter(Boolean).join(', ') || 'Location not set';
    document.getElementById('hospStatBeds').textContent = data.bed_count || 0;
    document.getElementById('hospVerifiedBadge').textContent = data.status === 'active' ? 'Active' : capitalize(data.status || 'pending');

    updateCompletion(data);
  }

  async function loadHeaderStats() {
    try {
      const [doctors, jobs] = await Promise.all([
        api.get('/hospital/doctors'),
        api.get('/hospital/jobs?status=active&per_page=1'),
      ]);
      document.getElementById('hospStatDoctors').textContent = (doctors.data || []).length;
      document.getElementById('hospStatJobs').textContent = jobs.total ?? 0;
    } catch (e) { /* non-critical */ }
  }

  function updateCompletion(data) {
    const checks = [
      ['Hospital Name', !!data.hospital_name],
      ['Contact Phone', !!data.contact_phone],
      ['Address', !!data.address && !!data.city && !!data.state],
      ['Registration No.', !!data.registration_no],
      ['About', !!data.about],
      ['Hospital Logo', document.getElementById('profilePhotoPreview').style.display === 'block'],
    ];
    const done = checks.filter(c => c[1]).length;
    const pct = Math.round((done / checks.length) * 100);
    document.getElementById('completionPct').textContent = pct + '%';
    document.getElementById('completionBreakdown').innerHTML = checks.map(([label, ok]) => `
      <div class="prog-row"><div class="prog-header"><span class="prog-label">${label}</span><span class="prog-val" style="color:${ok ? 'var(--success)' : 'var(--warning)'}">${ok ? 'Complete' : 'Missing'}</span></div><div class="prog-bar"><div class="prog-fill" style="width:${ok ? 100 : 0}%;background:${ok ? 'var(--success)' : 'var(--warning)'}"></div></div></div>
    `).join('');
  }

  function bindForm() {
    const form = document.getElementById('hospitalProfileForm');
    form?.addEventListener('submit', async function (e) {
      e.preventDefault();
      const btn = this.querySelector('[type=submit]');
      btn.disabled = true;
      const original = btn.innerHTML;
      btn.innerHTML = 'Saving…';
      try {
        const payload = {
          hospital_name:   document.getElementById('prof-name')?.value,
          contact_phone:   document.getElementById('prof-phone')?.value,
          registration_no: document.getElementById('prof-reg')?.value,
          address:         document.getElementById('prof-address')?.value,
          city:            document.getElementById('prof-city')?.value,
          state:           document.getElementById('prof-state')?.value,
          website:         document.getElementById('prof-website')?.value,
          about:           document.getElementById('prof-desc')?.value,
          type:            document.getElementById('prof-type')?.value,
          bed_count:       parseInt(document.getElementById('prof-beds')?.value) || 0,
        };
        await api.put('/hospital/profile', payload);
        apiUI.toast('Profile updated successfully!', 'success');
        // Reload from the server to confirm persistence, not just optimistic UI.
        const fresh = await api.get('/hospital/profile');
        applyProfile(fresh);
      } catch (e) {
        apiUI.toast(e.message, 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = original;
      }
    });
  }

  function bindPhotoUpload() {
    const input = document.getElementById('photoUploadInput');
    input?.addEventListener('change', async function () {
      if (!this.files?.[0]) return;
      try {
        const result = await api.upload('hospital_logo', this.files[0]);
        if (result.file_id) {
          await api.put('/settings', { hospital_logo_file_id: String(result.file_id) });
          const url = await api.fileUrl(result.file_id);
          if (url) showLogo(url);
          updateCompletion(lastProfileData);
        }
        apiUI.toast('Logo uploaded!', 'success');
      } catch (e) {
        apiUI.toast('Logo upload failed: ' + e.message, 'error');
      }
    });
  }

  function showLogo(url) {
    const img = document.getElementById('profilePhotoPreview');
    const placeholder = document.getElementById('hospLogoPlaceholder');
    const headerLogo = document.getElementById('hospLogoLarge');
    if (img) { img.src = url; img.style.display = 'block'; }
    if (placeholder) placeholder.style.display = 'none';
    if (headerLogo) headerLogo.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;border-radius:14px" />`;
  }

  function capitalize(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }
})();
