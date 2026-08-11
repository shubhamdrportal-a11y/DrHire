/**
 * api.js
 * Reusable fetch wrapper for all DRHire frontend → PHP API calls.
 *
 * Usage:
 *   const data = await api.get('/doctor/profile');
 *   await api.post('/auth/login', { email, password });
 *   await api.put('/doctor/profile', { full_name: 'Dr. Smith' });
 */

(function () {
  'use strict';

  // Detect API base: same origin /api in production, env override in dev
  const API_BASE = window.DRHIRE_API_BASE || '/api';

  /**
   * Core fetch wrapper.
   * Returns parsed JSON or throws an Error with the server's error message.
   */
  async function request(method, endpoint, body = null, isFormData = false) {
    const url = API_BASE + endpoint;

    const options = {
      method,
      credentials: 'include', // include session cookie
      headers: {},
    };

    if (body !== null) {
      if (isFormData) {
        // Let the browser set Content-Type with boundary for multipart
        options.body = body;
      } else {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
      }
    }

    let response;
    try {
      response = await fetch(url, options);
    } catch (networkError) {
      throw new Error('Network error. Please check your connection and try again.');
    }

    // Auto-redirect to login on 401
    if (response.status === 401) {
      // Avoid redirect loop on login page
      if (!window.location.pathname.includes('login')) {
        const isPages = window.location.pathname.includes('/pages/');
        window.location.href = isPages ? 'login.html' : '/pages/login.html';
      }
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || err.error || 'Unauthorized.');
    }

    // Parse JSON (may be empty on 204)
    let data;
    if (response.status === 204) {
      return null;
    }

    try {
      data = await response.json();
    } catch {
      throw new Error('Invalid response from server.');
    }

    if (!response.ok) {
      throw new Error(data.message || data.error || `Request failed (${response.status}).`);
    }

    return data;
  }

  /**
   * Upload a file with FormData.
   * @param {string} category  - profile_photo | resume | hospital_logo | document
   * @param {File}   file      - File object from <input type="file">
   */
  async function uploadFile(category, file) {
    const formData = new FormData();
    formData.append('category', category);
    formData.append('file', file);
    return request('POST', '/files/upload', formData, true);
  }

  /**
   * Get a signed download URL for a file.
   * @param {number} fileId
   */
  async function getFileUrl(fileId) {
    const data = await request('GET', `/files/${fileId}/download`);
    return data.url || null;
  }

  // ── Public API ────────────────────────────────────────────────

  window.api = {
    get:    (endpoint)        => request('GET',    endpoint),
    post:   (endpoint, body)  => request('POST',   endpoint, body),
    put:    (endpoint, body)  => request('PUT',    endpoint, body),
    patch:  (endpoint, body)  => request('PATCH',  endpoint, body),
    delete: (endpoint, body)  => request('DELETE', endpoint, body ?? null),
    upload: uploadFile,
    fileUrl: getFileUrl,
  };

  // ── UI Utilities ──────────────────────────────────────────────

  /**
   * Show a loading spinner in a container.
   */
  window.apiUI = {
    loading(container, message = 'Loading…') {
      if (!container) return;
      container.innerHTML = `
        <div style="text-align:center;padding:60px 20px;color:var(--text3,#64748b)">
          <i class="fa-solid fa-spinner fa-spin fa-2x" style="color:var(--accent,#0ea5e9)"></i>
          <p style="margin-top:16px;font-size:.85rem">${message}</p>
        </div>`;
    },

    empty(container, message = 'No data found.', icon = 'fa-inbox') {
      if (!container) return;
      container.innerHTML = `
        <div style="text-align:center;padding:60px 20px;color:var(--text3,#64748b)">
          <i class="fa-solid ${icon} fa-3x" style="opacity:.3;margin-bottom:16px"></i>
          <p style="font-size:.9rem">${message}</p>
        </div>`;
    },

    error(container, message = 'Something went wrong. Please refresh.') {
      if (!container) return;
      container.innerHTML = `
        <div style="text-align:center;padding:60px 20px;color:var(--danger,#ef4444)">
          <i class="fa-solid fa-triangle-exclamation fa-2x" style="margin-bottom:12px"></i>
          <p style="font-size:.85rem">${message}</p>
        </div>`;
    },

    toast(message, type = 'success', duration = 3500) {
      const colors = {
        success: { bg: '#10b981', icon: 'fa-circle-check' },
        error:   { bg: '#ef4444', icon: 'fa-circle-xmark' },
        info:    { bg: '#0ea5e9', icon: 'fa-circle-info' },
        warning: { bg: '#f59e0b', icon: 'fa-triangle-exclamation' },
      };
      const style = colors[type] || colors.info;

      const toast = document.createElement('div');
      toast.style.cssText = `
        position:fixed;bottom:24px;right:24px;z-index:9999;
        background:${style.bg};color:#fff;border-radius:10px;
        padding:12px 20px;font-size:.85rem;font-weight:600;
        display:flex;align-items:center;gap:10px;
        box-shadow:0 8px 32px rgba(0,0,0,.4);
        animation:toastIn .3s ease;max-width:360px;
      `;
      toast.innerHTML = `<i class="fa-solid ${style.icon}"></i><span>${message}</span>`;

      if (!document.getElementById('_toastStyle')) {
        const s = document.createElement('style');
        s.id = '_toastStyle';
        s.textContent = '@keyframes toastIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}';
        document.head.appendChild(s);
      }

      document.body.appendChild(toast);
      setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity .3s'; setTimeout(() => toast.remove(), 300); }, duration);
    },
  };
})();
