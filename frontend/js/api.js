/**
 * API utility — wraps fetch with JSON handling, auth error detection, and toast notifications.
 */

/** Loading indicator helper */
const Loading = {
  show(el) {
    if (typeof el === 'string') el = document.getElementById(el);
    if (el) el.innerHTML = '<div class="loading"><div class="spinner"></div> Loading...</div>';
  }
};

const API = {
  /**
   * Make an authenticated API call.
   * @param {string} url
   * @param {object} options - fetch options
   * @returns {Promise<object>} parsed JSON response
   */
  async request(url, options = {}) {
    const silent = options.silent;
    delete options.silent;

    const defaults = {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin'
    };
    const config = { ...defaults, ...options };
    if (options.body && typeof options.body === 'object') {
      config.body = JSON.stringify(options.body);
    }

    const res = await fetch(url, config);

    // Session expired or not authenticated — redirect to login
    if (res.status === 401) {
      if (!silent && Auth.user) {
        Toast.show('Session expired. Please log in again.', 'error');
        setTimeout(() => Auth.logout(), 1000);
      }
      throw new Error('Unauthorized');
    }

    const data = await res.json();

    if (!res.ok || !data.success) {
      const msg = (data.error && data.error.message) || data.message || 'Request failed';
      throw new Error(msg);
    }

    return data;
  },

  get(url) { return this.request(url); },
  post(url, body) { return this.request(url, { method: 'POST', body }); },
  put(url, body) { return this.request(url, { method: 'PUT', body }); },
  del(url) { return this.request(url, { method: 'DELETE' }); }
};

/**
 * Toast notification system.
 */
const Toast = {
  container: null,

  init() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },

  show(message, type = 'success', duration = 3000) {
    this.init();
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    this.container.appendChild(el);
    setTimeout(() => el.remove(), duration);
  }
};


/**
 * PinGuard — requires admin PIN before destructive actions.
 */
const PinGuard = {
  _callback: null,

  require(callback) {
    this._callback = callback;
    document.getElementById('pin-input').value = '';
    document.getElementById('pin-error').textContent = '';
    document.getElementById('pin-modal').style.display = 'flex';
    setTimeout(() => document.getElementById('pin-input').focus(), 100);

    // Allow Enter key to submit
    document.getElementById('pin-input').onkeydown = (e) => {
      if (e.key === 'Enter') this.verify();
    };
  },

  close() {
    document.getElementById('pin-modal').style.display = 'none';
    this._callback = null;
  },

  async verify() {
    const pin = document.getElementById('pin-input').value;
    if (!pin) {
      document.getElementById('pin-error').textContent = 'Please enter the PIN';
      return;
    }

    try {
      await API.post('/api/verify-pin', { pin });
      const cb = this._callback;
      this.close();
      if (cb) cb();
    } catch (err) {
      document.getElementById('pin-error').textContent = 'Incorrect PIN. Try again.';
      document.getElementById('pin-input').value = '';
      document.getElementById('pin-input').focus();
    }
  }
};
