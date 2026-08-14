// ── Job details page ────────────────────────────────────────────
(function () {
  const wrap = document.getElementById('jobDetailWrap');
  if (!wrap) return; // not on job-details.html

  function listBlock(title, items) {
    if (!items || !items.length) return '';
    return `<h2>${title}</h2><ul>${items.map(i => `<li>${i}</li>`).join('')}</ul>`;
  }

  function relatedCard(job) {
    return `<div class="job-card" onclick="window.location.href='job-details.html?id=${job.id}'">
      <div class="job-header">
        <div class="job-title">${job.title}</div>
        <span class="job-badge ${job.badge_type}">${job.badge_label}</span>
      </div>
      <div class="job-meta">
        <div class="job-meta-item"><i class="fa-solid fa-building-columns"></i> ${job.hospital}</div>
        <div class="job-meta-item"><i class="fa-solid fa-location-dot"></i> ${job.location}</div>
      </div>
      <div class="job-footer">
        <span class="salary">${job.salary}</span>
        <span style="color:var(--primary);font-size:.82rem;font-weight:700">View Details →</span>
      </div>
    </div>`;
  }

  async function init() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    document.getElementById('jdMain').innerHTML = `<div class="state-box"><i class="fa-solid fa-spinner fa-spin"></i><h3>Loading job details…</h3></div>`;

    let job = null, allJobs = [];
    try {
      if (id) job = await api.get(`/jobs/${id}`);
    } catch { job = null; }

    try {
      const listData = await api.get('/jobs?per_page=100');
      allJobs = listData.data || [];
    } catch { allJobs = job ? [job] : []; }

    if (!job && !id && allJobs.length) job = allJobs[0];

    if (!job) {
      document.getElementById('jdMain').innerHTML = `<div class="state-box state-error">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <h3>Job not found</h3>
        <p>This listing may have closed. Browse all current openings instead.</p>
        <a href="jobs.html" class="btn-primary" style="display:inline-block;margin-top:20px">Browse Jobs</a>
      </div>`;
      document.getElementById('jdSide').innerHTML = '';
      document.getElementById('jdTitleBar').innerHTML = '';
      return;
    }

    document.title = `${job.title} at ${job.hospital} – Doctors Coat`;
    document.getElementById('jdTitleBar').innerHTML = `
      <div>
        <span class="job-badge ${job.badge_type}" style="margin-bottom:12px;display:inline-block">${job.badge_label}</span>
        <h1>${job.title}</h1>
        <div class="job-meta">
          <div class="job-meta-item"><i class="fa-solid fa-building-columns"></i> ${job.hospital}</div>
          <div class="job-meta-item"><i class="fa-solid fa-location-dot"></i> ${job.location}</div>
          <div class="job-meta-item"><i class="fa-solid fa-stethoscope"></i> ${job.specialization}</div>
        </div>
      </div>
      <button class="btn-primary" style="padding:14px 32px" onclick="openApplyModal('${job.id}','${job.title}')"><i class="fa-solid fa-paper-plane" style="margin-right:8px"></i>Apply Now</button>
    `;

    document.getElementById('jdMain').innerHTML = `
      <h2>Job Description</h2>
      <p style="color:var(--muted);line-height:1.8">${job.description || 'No additional description provided for this role.'}</p>
      ${listBlock('Requirements', job.requirements)}
      ${listBlock('Benefits', job.benefits)}
    `;

    document.getElementById('jdSide').innerHTML = `
      <div class="job-detail-card">
        <h4>Job Overview</h4>
        <div class="job-detail-row"><span>Salary</span><span>${job.salary}</span></div>
        <div class="job-detail-row"><span>Experience</span><span>${job.experience}</span></div>
        <div class="job-detail-row"><span>Qualification</span><span>${job.qualification}</span></div>
        <div class="job-detail-row"><span>Job Type</span><span>${job.type}</span></div>
        <div class="job-detail-row"><span>Posted</span><span>${job.created_at ? new Date(job.created_at).toLocaleDateString('en-IN') : 'Recently'}</span></div>
      </div>
      <button class="btn-primary" style="width:100%;padding:14px" onclick="openApplyModal('${job.id}','${job.title}')">Apply for this Role</button>
    `;

    const related = allJobs.filter(j => j.id !== job.id && j.specialization === job.specialization).slice(0, 3);
    const fallbackRelated = related.length ? related : allJobs.filter(j => j.id !== job.id).slice(0, 3);
    document.getElementById('relatedJobsGrid').innerHTML = fallbackRelated.map(relatedCard).join('');
  }

  init();
})();
