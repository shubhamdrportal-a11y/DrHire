// ── Jobs listing page ───────────────────────────────────────────
(function () {
  const grid = document.getElementById('jobsListGrid');
  const resultsCount = document.getElementById('resultsCount');
  const searchInput = document.getElementById('jobSearch');
  const specSelect = document.getElementById('jobSpecFilter');
  const locSelect = document.getElementById('jobLocFilter');
  const typeSelect = document.getElementById('jobTypeFilter');
  const resetBtn = document.getElementById('jobFilterReset');
  const pageSize = 6;
  let currentPage = 1;
  let allJobs = [];

  if (!grid) return; // not on jobs.html

  function populateFilterOptions(jobs) {
    const specs = [...new Set(jobs.map(j => j.specialization))].sort();
    const locs = [...new Set(jobs.map(j => j.location))].sort();
    specs.forEach(s => specSelect.insertAdjacentHTML('beforeend', `<option value="${s}">${s}</option>`));
    locs.forEach(l => locSelect.insertAdjacentHTML('beforeend', `<option value="${l}">${l}</option>`));
  }

  function jobCard(job) {
    return `<div class="job-card" onclick="if(!event.target.closest('.apply-btn')) window.location.href='job-details.html?id=${job.id}'">
      <div class="job-header">
        <div class="job-title">${job.title}</div>
        <span class="job-badge ${job.badge_type}">${job.badge_label}</span>
      </div>
      <div class="job-meta">
        <div class="job-meta-item"><i class="fa-solid fa-building-columns"></i> ${job.hospital}</div>
        <div class="job-meta-item"><i class="fa-solid fa-location-dot"></i> ${job.location}</div>
        <div class="job-meta-item"><i class="fa-solid fa-stethoscope"></i> ${job.specialization}</div>
        <div class="job-meta-item"><i class="fa-solid fa-briefcase"></i> ${job.experience} • ${job.type}</div>
      </div>
      <div class="job-footer">
        <span class="salary">${job.salary}</span>
        <button class="apply-btn" onclick="event.stopPropagation();openApplyModal('${job.id}','${job.title}')">Apply Now</button>
      </div>
    </div>`;
  }

  function getFiltered() {
    const q = (searchInput.value || '').toLowerCase().trim();
    const spec = specSelect.value;
    const loc = locSelect.value;
    const type = typeSelect.value;
    return allJobs.filter(j => {
      const matchesQ = !q || j.title.toLowerCase().includes(q) || j.hospital.toLowerCase().includes(q) || j.specialization.toLowerCase().includes(q);
      const matchesSpec = !spec || j.specialization === spec;
      const matchesLoc = !loc || j.location === loc;
      const matchesType = !type || j.type === type;
      return matchesQ && matchesSpec && matchesLoc && matchesType;
    });
  }

  function render() {
    const filtered = getFiltered();
    resultsCount.textContent = `${filtered.length} job${filtered.length === 1 ? '' : 's'} found`;

    if (filtered.length === 0) {
      grid.innerHTML = `<div class="state-box state-error" style="grid-column:1/-1">
        <i class="fa-solid fa-magnifying-glass"></i>
        <h3>No jobs match your filters</h3>
        <p>Try adjusting your search, specialization, or location.</p>
      </div>`;
      document.getElementById('jobsPagination').innerHTML = '';
      return;
    }

    const totalPages = Math.ceil(filtered.length / pageSize);
    currentPage = Math.min(currentPage, totalPages) || 1;
    const start = (currentPage - 1) * pageSize;
    const pageItems = filtered.slice(start, start + pageSize);

    grid.innerHTML = pageItems.map(jobCard).join('');
    renderPagination(totalPages);
  }

  function renderPagination(totalPages) {
    const pager = document.getElementById('jobsPagination');
    if (totalPages <= 1) { pager.innerHTML = ''; return; }
    let html = `<button ${currentPage === 1 ? 'disabled' : ''} id="pagerPrev"><i class="fa-solid fa-chevron-left"></i></button>`;
    for (let i = 1; i <= totalPages; i++) {
      html += `<button class="${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
    html += `<button ${currentPage === totalPages ? 'disabled' : ''} id="pagerNext"><i class="fa-solid fa-chevron-right"></i></button>`;
    pager.innerHTML = html;

    pager.querySelectorAll('button[data-page]').forEach(b => b.addEventListener('click', () => { currentPage = parseInt(b.dataset.page); render(); window.scrollTo({ top: grid.offsetTop - 120, behavior: 'smooth' }); }));
    document.getElementById('pagerPrev')?.addEventListener('click', () => { currentPage--; render(); });
    document.getElementById('pagerNext')?.addEventListener('click', () => { currentPage++; render(); });
  }

  async function init() {
    grid.innerHTML = `<div class="state-box" style="grid-column:1/-1"><i class="fa-solid fa-spinner fa-spin"></i><h3>Loading open positions…</h3></div>`;
    try {
      const data = await api.get('/jobs?per_page=100');
      allJobs = data.data || [];
    } catch {
      grid.innerHTML = `<div class="state-box state-error" style="grid-column:1/-1">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <h3>Couldn't load jobs</h3>
        <p>Please refresh the page and try again.</p>
      </div>`;
      document.getElementById('jobsPagination').innerHTML = '';
      return;
    }

    if (!allJobs.length) {
      grid.innerHTML = `<div class="state-box" style="grid-column:1/-1">
        <i class="fa-solid fa-briefcase"></i>
        <h3>No open positions right now</h3>
        <p>Hospitals haven't posted any active jobs yet. Check back soon.</p>
      </div>`;
      document.getElementById('jobsPagination').innerHTML = '';
      return;
    }

    populateFilterOptions(allJobs);

    // Pre-fill from query string (?specialization=Cardiology)
    const params = new URLSearchParams(window.location.search);
    if (params.get('specialization')) specSelect.value = params.get('specialization');
    if (params.get('q')) searchInput.value = params.get('q');

    render();
  }

  [searchInput, specSelect, locSelect, typeSelect].forEach(el => el.addEventListener('input', () => { currentPage = 1; render(); }));
  resetBtn.addEventListener('click', () => {
    searchInput.value = ''; specSelect.value = ''; locSelect.value = ''; typeSelect.value = '';
    currentPage = 1; render();
  });

  init();
})();
