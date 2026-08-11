// ── Auth State ───────────────────────────────────────────────────
let currentUser = null;
let pendingApplyJobId = null;
let pendingApplyJobTitle = null;

db.auth.onAuthStateChange((_event, session) => {
  currentUser = session?.user || null;
  updateNavAuth();
  if (currentUser && pendingApplyJobId) {
    const jId = pendingApplyJobId;
    const jTitle = pendingApplyJobTitle;
    pendingApplyJobId = null;
    pendingApplyJobTitle = null;
    setTimeout(() => {
      openApplyModal(jId, jTitle);
    }, 400);
  }
});

function updateNavAuth() {
  const loginBtn = document.getElementById('navLoginBtn');
  const registerBtn = document.getElementById('navRegisterBtn');
  const userInfo = document.getElementById('navUserInfo');
  const viewAllBtn = document.getElementById('viewAllJobsBtn');
  
  const mobileLoginBtn = document.getElementById('mobileLoginBtn');
  const mobileUserInfo = document.getElementById('mobileUserInfo');
  const mobileUserEmail = document.getElementById('mobileUserEmail');

  if (currentUser) {
    if (loginBtn) loginBtn.style.display = 'none';
    if (registerBtn) registerBtn.style.display = 'none';
    if (userInfo) userInfo.style.display = 'flex';
    const userEmailEl = document.getElementById('navUserEmail');
    if (userEmailEl && currentUser.email) userEmailEl.textContent = currentUser.email.split('@')[0];
    if (viewAllBtn && viewAllBtn.closest('.view-all')) viewAllBtn.closest('.view-all').style.display = 'none';

    if (mobileLoginBtn) mobileLoginBtn.style.display = 'none';
    if (mobileUserInfo) mobileUserInfo.style.display = 'flex';
    if (mobileUserEmail && currentUser.email) mobileUserEmail.textContent = currentUser.email.split('@')[0];
  } else {
    if (loginBtn) loginBtn.style.display = '';
    if (registerBtn) registerBtn.style.display = '';
    if (userInfo) userInfo.style.display = 'none';
    if (viewAllBtn && viewAllBtn.closest('.view-all')) viewAllBtn.closest('.view-all').style.display = '';

    if (mobileLoginBtn) mobileLoginBtn.style.display = 'block';
    if (mobileUserInfo) mobileUserInfo.style.display = 'none';
  }
}

// ── Load Jobs from Supabase ──────────────────────────────────────
const STATIC_JOBS = [
  { id: 's1', title: 'Cardiologist', hospital: 'Apollo Hospitals', location: 'New Delhi', experience: '5–10 Years', qualification: 'MD Cardiology / DM', salary: '₹3–5 LPA', badge_type: 'badge-urgent', badge_label: 'Urgent' },
  { id: 's2', title: 'MBBS Doctor (General)', hospital: 'Fortis Healthcare', location: 'Jaipur', experience: '0–3 Years', qualification: 'MBBS', salary: '₹80K–1.2 LPA', badge_type: 'badge-new', badge_label: 'New' },
  { id: 's3', title: 'Radiologist', hospital: 'Medanta Hospital', location: 'Mumbai', experience: '3–7 Years', qualification: 'MD Radiology', salary: '₹2–3.5 LPA', badge_type: 'badge-full', badge_label: 'Full-Time' },
  { id: 's4', title: 'Paediatrician', hospital: 'Max Super Speciality', location: 'Bangalore', experience: '4–8 Years', qualification: 'MD Paediatrics', salary: '₹1.8–2.8 LPA', badge_type: 'badge-full', badge_label: 'Full-Time' },
  { id: 's5', title: 'Orthopaedic Surgeon', hospital: 'Manipal Hospitals', location: 'Hyderabad', experience: '6–12 Years', qualification: 'MS Orthopaedics', salary: '₹4–7 LPA', badge_type: 'badge-urgent', badge_label: 'Urgent' },
  { id: 's6', title: 'Gynaecologist', hospital: 'AIIMS Referral', location: 'Lucknow', experience: '3–6 Years', qualification: 'MD / MS OBG', salary: '₹2–3 LPA', badge_type: 'badge-new', badge_label: 'New' },
];

async function loadJobs() {
  const container = document.getElementById('jobsContainer');
  if (!container) return;
  container.innerHTML = `<div style="text-align:center;padding:60px;color:#94a3b8"><i class="fa-solid fa-spinner fa-spin fa-2x"></i><p style="margin-top:16px">Loading jobs…</p></div>`;
  try {
    const { data, error } = await db.from('job_listings').select('*').eq('is_active', true).order('created_at', { ascending: false });
    renderJobs(container, (!error && data && data.length > 0) ? data : STATIC_JOBS);
  } catch {
    renderJobs(container, STATIC_JOBS);
  }
}

function jobCardHTML(job) {
  return `<div class="job-card">
    <div class="job-header">
      <div class="job-title">${job.title}</div>
      <span class="job-badge ${job.badge_type}">${job.badge_label}</span>
    </div>
    <div class="job-meta">
      <div class="job-meta-item"><i class="fa-solid fa-building-columns"></i> ${job.hospital}</div>
      <div class="job-meta-item"><i class="fa-solid fa-location-dot"></i> ${job.location}</div>
      <div class="job-meta-item"><i class="fa-solid fa-briefcase"></i> ${job.experience}</div>
      <div class="job-meta-item"><i class="fa-solid fa-graduation-cap"></i> ${job.qualification}</div>
    </div>
    <div class="job-footer">
      <span class="salary">${job.salary}</span>
      <button class="apply-btn" onclick="openApplyModal('${job.id}','${job.title}')">Apply Now</button>
    </div>
  </div>`;
}

function renderJobs(container, jobs) {
  container.innerHTML = `<div class="jobs-grid">${jobs.map(jobCardHTML).join('')}</div>`;
  applyCardAnimations();
}

// ── Apply Modal ──────────────────────────────────────────────────
let applyJobId = null;

function openApplyModal(jobId, jobTitle) {
  if (!currentUser) {
    pendingApplyJobId = jobId;
    pendingApplyJobTitle = jobTitle;
    openAuthModal('login');
    return;
  }
  applyJobId = jobId;
  document.getElementById('applyJobTitle').textContent = 'Apply for: ' + jobTitle;
  document.getElementById('applyFormWrap').style.display = 'block';
  document.getElementById('applySuccessMsg').style.display = 'none';
  const form = document.getElementById('applyForm');
  form.reset();
  if (currentUser) document.getElementById('applyEmail').value = currentUser.email;
  document.getElementById('applyModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

document.getElementById('modalClose')?.addEventListener('click', closeModal);
document.getElementById('applyModal')?.addEventListener('click', e => { if (e.target.id === 'applyModal') closeModal(); });

function closeModal() {
  document.getElementById('applyModal').classList.remove('active');
  document.body.style.overflow = '';
}

document.getElementById('applyForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting…';
  btn.disabled = true;

  const isStatic = String(applyJobId).startsWith('s');
  const { error } = await db.from('job_applications').insert({
    job_id: isStatic ? null : applyJobId,
    user_id: currentUser?.id || null,
    name: document.getElementById('applyName').value,
    email: document.getElementById('applyEmail').value,
    phone: document.getElementById('applyPhone').value,
    specialization: document.getElementById('applySpec').value,
  });

  btn.innerHTML = 'Submit Application'; btn.disabled = false;
  if (error) {
    alert('Submission error: ' + error.message);
  } else {
    document.getElementById('applyFormWrap').style.display = 'none';
    document.getElementById('applySuccessMsg').style.display = 'block';
    setTimeout(closeModal, 3000);
  }
});

// ── Auth Modal ───────────────────────────────────────────────────
const authModal = document.getElementById('authModal');

document.getElementById('navLoginBtn')?.addEventListener('click', () => openAuthModal('login'));
document.getElementById('authModalClose')?.addEventListener('click', closeAuthModal);
authModal?.addEventListener('click', e => { if (e.target === authModal) closeAuthModal(); });

function openAuthModal(tab = 'login') {
  authModal.classList.add('active');
  document.body.style.overflow = 'hidden';
  switchTab(tab);
  clearAuthMsgs();
}
function closeAuthModal() {
  authModal.classList.remove('active');
  document.body.style.overflow = '';
}
function switchTab(tab) {
  document.getElementById('loginForm').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('registerForm').style.display = tab === 'register' ? 'block' : 'none';
  document.getElementById('tabLogin').classList.toggle('active-tab', tab === 'login');
  document.getElementById('tabRegister').classList.toggle('active-tab', tab === 'register');
}
function clearAuthMsgs() {
  ['loginMsg', 'registerMsg'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = ''; });
}

document.getElementById('tabLogin')?.addEventListener('click', () => switchTab('login'));
document.getElementById('tabRegister')?.addEventListener('click', () => switchTab('register'));
document.getElementById('goToRegister')?.addEventListener('click', () => switchTab('register'));
document.getElementById('goToLogin')?.addEventListener('click', () => switchTab('login'));

// Login submit
document.getElementById('loginFormEl')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  const msg = document.getElementById('loginMsg');
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Logging in…'; btn.disabled = true;
  const { error } = await db.auth.signInWithPassword({
    email: document.getElementById('loginEmail').value,
    password: document.getElementById('loginPassword').value,
  });
  btn.innerHTML = 'Login'; btn.disabled = false;
  if (error) { msg.textContent = error.message; msg.style.color = '#ef4444'; }
  else { closeAuthModal(); }
});

// Register submit
document.getElementById('registerFormEl')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  const msg = document.getElementById('registerMsg');
  const pass = document.getElementById('regPassword').value;
  const confirm = document.getElementById('regConfirm').value;
  if (pass !== confirm) { msg.textContent = 'Passwords do not match.'; msg.style.color = '#ef4444'; return; }
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Registering…'; btn.disabled = true;
  const { error } = await db.auth.signUp({
    email: document.getElementById('regEmail').value,
    password: pass,
    options: { data: { full_name: document.getElementById('regName').value } }
  });
  btn.innerHTML = 'Create Account'; btn.disabled = false;
  if (error) { msg.textContent = error.message; msg.style.color = '#ef4444'; }
  else { msg.textContent = '✅ Check your email to confirm registration!'; msg.style.color = '#10b981'; }
});

// Logout
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
  await db.auth.signOut();
});

// ── Contact Form → Supabase ──────────────────────────────────────
document.getElementById('contactForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('.form-submit');
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending…'; btn.disabled = true;
  const { error } = await db.from('contact_submissions').insert({
    name: document.getElementById('fullName').value,
    email: document.getElementById('email').value,
    phone: document.getElementById('phone').value,
    role: document.getElementById('role').value,
    specialization: document.getElementById('specialization').value,
    message: document.getElementById('message').value,
  });
  btn.innerHTML = '<i class="fa-solid fa-paper-plane" style="margin-right:8px"></i>Send Message'; btn.disabled = false;
  if (error) { alert('Error: ' + error.message); }
  else {
    e.target.reset();
    const s = document.getElementById('formSuccess');
    s.style.display = 'block';
    setTimeout(() => s.style.display = 'none', 6000);
  }
});

// ── Mobile Nav ───────────────────────────────────────────────────
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
const mobileOverlay = document.getElementById('mobileOverlay');

hamburger?.addEventListener('click', () => {
  mobileMenu.classList.toggle('open');
  mobileOverlay.classList.toggle('open');
});
mobileOverlay?.addEventListener('click', closeMobileMenu);
function closeMobileMenu() {
  mobileMenu.classList.remove('open');
  mobileOverlay.classList.remove('open');
}

const mobileLoginBtn = document.getElementById('mobileLoginBtn');
if (mobileLoginBtn) {
  mobileLoginBtn.addEventListener('click', () => {
    closeMobileMenu();
    openAuthModal('login');
  });
}

const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');
if (mobileLogoutBtn) {
  mobileLogoutBtn.addEventListener('click', async () => {
    closeMobileMenu();
    await db.auth.signOut();
  });
}

// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(a => {
  const href = a.getAttribute('href');
  if (!href || href.length < 2) return;
  a.addEventListener('click', e => {
    let t;
    try { t = document.querySelector(href); } catch { t = null; }
    if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth' }); closeMobileMenu(); }
  });
});

// Nav shadow on scroll
window.addEventListener('scroll', () => {
  const navEl = document.querySelector('nav');
  if (navEl) navEl.style.boxShadow = window.scrollY > 50 ? '0 8px 32px rgba(0,0,0,.4)' : 'none';
});

// ── Intersection Observer (card fade-in) ─────────────────────────
function applyCardAnimations() {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.style.opacity = '1'; e.target.style.transform = 'none'; io.unobserve(e.target); } });
  }, { threshold: 0.1 });
  document.querySelectorAll('.service-card,.why-card,.job-card,.testi-card').forEach(el => {
    el.style.opacity = '0'; el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity .5s ease, transform .5s ease';
    io.observe(el);
  });
}
applyCardAnimations();

// ── Counter Animation ────────────────────────────────────────────
function animateCounters() {
  document.querySelectorAll('[data-count]').forEach(el => {
    const target = parseInt(el.dataset.count), suffix = el.dataset.suffix || '';
    let count = 0, step = Math.ceil(target / 60);
    const iv = setInterval(() => { count = Math.min(count + step, target); el.textContent = count + suffix; if (count >= target) clearInterval(iv); }, 25);
  });
}
const statsObs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { animateCounters(); statsObs.disconnect(); } });
}, { threshold: 0.5 });
const heroStats = document.querySelector('.hero-stats');
if (heroStats) statsObs.observe(heroStats);

// ── Init ─────────────────────────────────────────────────────────
loadJobs();
db.auth.getSession().then(({ data }) => { currentUser = data.session?.user || null; updateNavAuth(); });

// ── Theme Toggle ─────────────────────────────────────────────────
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');

function applyTheme(isDark) {
  if (isDark) {
    document.body.classList.remove('light-mode');
    themeIcon.className = 'fa-solid fa-sun';
    themeToggle.title = 'Switch to Light Mode';
  } else {
    document.body.classList.add('light-mode');
    themeIcon.className = 'fa-solid fa-moon';
    themeToggle.title = 'Switch to Dark Mode';
  }
  localStorage.setItem('dc-theme', isDark ? 'dark' : 'light');
}

// Load saved preference
const savedTheme = localStorage.getItem('dc-theme');
applyTheme(savedTheme !== 'light'); // default dark

themeToggle?.addEventListener('click', () => {
  const isCurrentlyDark = !document.body.classList.contains('light-mode');
  applyTheme(!isCurrentlyDark);
});

