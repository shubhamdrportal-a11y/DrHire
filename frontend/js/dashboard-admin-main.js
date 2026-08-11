/**
 * dashboard-admin-main.js
 * Powers dashboard-admin.html — stats, recent activity, quick actions.
 */

(function () {
  'use strict';
  window.__expectedRole = 'admin';

  document.addEventListener('drhire:auth', async () => {
    await loadStats();
    await loadRecentActivity();
  });

  async function loadStats() {
    const container = document.getElementById('adminStatsRow');
    if (!container) return;

    try {
      const data = await api.get('/admin/stats');

      // Update all stat cards
      const map = {
        'stat-total-users':    data.users,
        'stat-total-doctors':  data.doctors,
        'stat-hospitals':      data.hospitals,
        'stat-active-jobs':    data.active_jobs,
        'stat-appointments':   data.appointments,
        'stat-applications':   data.applications,
        'stat-pending':        data.pending_users,
      };
      Object.entries(map).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) animateCount(el, parseInt(val) || 0);
      });

      // Growth badge
      const growthEl = document.getElementById('stat-monthly-growth');
      if (growthEl && data.monthly_growth) {
        const pct = data.monthly_growth.percent;
        growthEl.textContent = (pct >= 0 ? '↑' : '↓') + Math.abs(pct) + '% this month';
        growthEl.style.color = pct >= 0 ? 'var(--success)' : 'var(--danger)';
      }

    } catch (err) {
      console.error('Failed to load admin stats:', err.message);
    }
  }

  async function loadRecentActivity() {
    const tbody = document.getElementById('activityTbody');
    if (!tbody) return;

    apiUI.loading(tbody.closest('.dash-card') || tbody);

    try {
      const data = await api.get('/admin/audit-logs?limit=10');
      const logs  = data.data || [];

      if (!logs.length) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text3);padding:30px">No activity yet.</td></tr>';
        return;
      }

      tbody.innerHTML = logs.map(log => `
        <tr>
          <td>
            <div class="user-cell">
              <div class="ua ua-blue">${(log.actor_name || 'SYS')[0].toUpperCase()}</div>
              <div><div class="td-name">${escHtml(log.actor_name || 'System')}</div>
              <div class="td-sub">${escHtml(log.action.replace(/_/g, ' '))}</div></div>
            </div>
          </td>
          <td>${escHtml(log.entity_type || '–')}</td>
          <td>${formatDate(log.created_at)}</td>
          <td><span class="badge badge-active" style="font-size:.68rem">${escHtml(log.action)}</span></td>
        </tr>
      `).join('');

    } catch (err) {
      if (tbody) tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--danger);padding:20px">Failed to load activity.</td></tr>';
    }
  }

  function animateCount(el, target) {
    let current = 0;
    const step  = Math.ceil(target / 40);
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = current.toLocaleString('en-IN');
      if (current >= target) clearInterval(timer);
    }, 25);
  }

  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function formatDate(dateStr) {
    if (!dateStr) return '–';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
         + ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  }
})();
