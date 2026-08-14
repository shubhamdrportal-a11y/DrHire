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

// ── Load Jobs from the real Doctors Coat API (hospital-posted jobs) ──
async function loadJobs() {
  const container = document.getElementById('jobsContainer');
  if (!container) return;
  container.innerHTML = `<div style="text-align:center;padding:60px;color:#94a3b8"><i class="fa-solid fa-spinner fa-spin fa-2x"></i><p style="margin-top:16px">Loading jobs…</p></div>`;
  try {
    const data = await api.get('/jobs?per_page=6');
    const jobs = data.data || [];
    if (!jobs.length) {
      container.innerHTML = `<div style="text-align:center;padding:60px;color:#94a3b8"><i class="fa-solid fa-briefcase fa-2x" style="opacity:.4"></i><p style="margin-top:16px">No open positions right now. Check back soon.</p></div>`;
      return;
    }
    renderJobs(container, jobs);
  } catch (e) {
    container.innerHTML = `<div style="text-align:center;padding:60px;color:#94a3b8"><i class="fa-solid fa-triangle-exclamation fa-2x" style="opacity:.5"></i><p style="margin-top:16px">Couldn't load jobs right now. Please refresh.</p></div>`;
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
// Applying for a job creates a real row in job_applications tied to the
// doctor's account, so it shows up for the hospital in their dashboard.
// That requires a logged-in Doctor account (via /pages/login.html —
// the real Doctors Coat account, not the demo popup login above).
let applyJobId = null;

async function openApplyModal(jobId, jobTitle) {
  applyJobId = jobId;
  document.getElementById('applyJobTitle').textContent = 'Apply for: ' + jobTitle;
  document.getElementById('applySuccessMsg').style.display = 'none';
  const wrap = document.getElementById('applyFormWrap');
  wrap.style.display = 'block';
  wrap.innerHTML = `<div style="text-align:center;padding:20px 0;color:#94a3b8"><i class="fa-solid fa-spinner fa-spin"></i></div>`;
  document.getElementById('applyModal').classList.add('active');
  document.body.style.overflow = 'hidden';

  let me = null;
  try { me = await api.get('/auth/me'); } catch { me = null; }

  const isPages = window.location.pathname.includes('/pages/');
  const loginUrl = isPages ? 'login.html' : 'pages/login.html';
  const registerUrl = isPages ? 'register.html' : 'pages/register.html';

  if (!me) {
    wrap.innerHTML = `
      <p style="color:#94a3b8;font-size:.9rem;margin-bottom:18px">Please login or create a Doctor account on Doctors Coat to apply for this job.</p>
      <div style="display:flex;gap:10px">
        <a href="${loginUrl}" class="form-submit" style="flex:1;text-align:center;text-decoration:none;display:block">Login</a>
        <a href="${registerUrl}" class="form-submit" style="flex:1;text-align:center;text-decoration:none;display:block;background:transparent;border:1px solid var(--primary,#0ea5e9);color:var(--primary,#0ea5e9)">Register as Doctor</a>
      </div>`;
    return;
  }

  if (me.role !== 'doctor') {
    wrap.innerHTML = `<p style="color:#94a3b8;font-size:.9rem">Only Doctor accounts can apply for jobs. You're logged in as a ${escHtmlJs(me.role)} account.</p>`;
    return;
  }

  wrap.innerHTML = `
    <form id="applyForm">
      <div class="form-group"><label>Cover letter (optional)</label>
        <textarea id="applyCoverLetter" rows="4" placeholder="A short note to the hospital…" style="width:100%;resize:vertical;background:var(--bg,#0d1117);color:inherit;border:1px solid var(--border,#30363d);border-radius:8px;padding:10px;font:inherit"></textarea>
      </div>
      <button type="submit" class="form-submit"><i class="fa-solid fa-paper-plane" style="margin-right:8px"></i>Submit Application</button>
    </form>`;

  document.getElementById('applyForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting…';
    btn.disabled = true;
    try {
      await api.post(`/doctor/jobs/${applyJobId}/apply`, {
        cover_letter: document.getElementById('applyCoverLetter').value,
      });
      wrap.style.display = 'none';
      document.getElementById('applySuccessMsg').style.display = 'block';
      setTimeout(closeModal, 3000);
    } catch (err) {
      btn.innerHTML = 'Submit Application';
      btn.disabled = false;
      alert(err.message || 'Could not submit application.');
    }
  });
}

function escHtmlJs(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

document.getElementById('modalClose')?.addEventListener('click', closeModal);
document.getElementById('applyModal')?.addEventListener('click', e => { if (e.target.id === 'applyModal') closeModal(); });

function closeModal() {
  document.getElementById('applyModal').classList.remove('active');
  document.body.style.overflow = '';
}

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

