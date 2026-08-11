// ── Standalone Login / Register pages ───────────────────────────
// Reuses the same Supabase client (window.db) as the auth modal in script.js.
(function () {
  // Redirect already-logged-in users back home
  db.auth.getSession().then(({ data }) => {
    if (data.session?.user) {
      const stayParam = new URLSearchParams(window.location.search).get('stay');
      if (!stayParam) window.location.href = '../index.html';
    }
  });

  function togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    const icon = btn.querySelector('i');
    if (input.type === 'password') {
      input.type = 'text'; icon.className = 'fa-solid fa-eye-slash';
    } else {
      input.type = 'password'; icon.className = 'fa-solid fa-eye';
    }
  }
  document.querySelectorAll('.password-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => togglePassword(btn.dataset.target, btn));
  });

  // ── LOGIN PAGE ──
  const loginForm = document.getElementById('standaloneLoginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = loginForm.querySelector('button[type=submit]');
      const msg = document.getElementById('standaloneLoginMsg');
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Logging in…'; btn.disabled = true;
      const { error } = await db.auth.signInWithPassword({
        email: document.getElementById('slEmail').value,
        password: document.getElementById('slPassword').value,
      });
      btn.innerHTML = 'Login'; btn.disabled = false;
      if (error) { msg.textContent = error.message; msg.style.color = '#ef4444'; }
      else { window.location.href = '../index.html'; }
    });
  }

  // ── REGISTER PAGE ──
  const registerForm = document.getElementById('standaloneRegisterForm');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = registerForm.querySelector('button[type=submit]');
      const msg = document.getElementById('standaloneRegisterMsg');
      const pass = document.getElementById('srPassword').value;
      const confirm = document.getElementById('srConfirm').value;
      if (pass !== confirm) { msg.textContent = 'Passwords do not match.'; msg.style.color = '#ef4444'; return; }
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating account…'; btn.disabled = true;
      const { error } = await db.auth.signUp({
        email: document.getElementById('srEmail').value,
        password: pass,
        options: { data: { full_name: document.getElementById('srName').value } }
      });
      btn.innerHTML = 'Create Account'; btn.disabled = false;
      if (error) { msg.textContent = error.message; msg.style.color = '#ef4444'; }
      else { msg.textContent = '✅ Check your email to confirm registration!'; msg.style.color = '#10b981'; }
    });
  }
})();
