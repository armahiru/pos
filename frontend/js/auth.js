/**
 * Auth module — login, logout, session check, role-based navigation.
 */
const Auth = {
  user: null,

  init() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.login();
      });
    }
    document.getElementById('btn-logout')?.addEventListener('click', () => this.logout());
    this.checkSession();
  },

  async login() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    errorEl.textContent = '';

    if (!username || !password) {
      errorEl.textContent = 'Please enter username and password';
      return;
    }

    try {
      const data = await API.post('/api/auth/login', { username, password });
      this.user = data.data.user;
      this.showApp();
    } catch (err) {
      errorEl.textContent = err.message || 'Login failed';
    }
  },

  async checkSession() {
    try {
      const data = await API.request('/api/auth/session', { silent: true });
      this.user = data.data.user;
      this.showApp();
    } catch {
      this.showLogin();
    }
  },

  async logout() {
    document.getElementById('logout-modal').style.display = 'flex';
  },

  closeLogoutModal() {
    document.getElementById('logout-modal').style.display = 'none';
  },

  async confirmLogout() {
    document.getElementById('logout-modal').style.display = 'none';
    try { await API.post('/api/auth/logout'); } catch {}
    this.user = null;
    this.showLogin();
  },

  showLogin() {
    document.getElementById('login-page').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
    document.getElementById('login-password').value = '';
  },

  showApp() {
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('app').style.display = 'block';

    // Update user info in topbar
    document.getElementById('user-display').textContent = `${this.user.fullName} (${this.user.role})`;

    // Build sidebar based on role
    this.buildNav();

    // Navigate to default page
    const role = this.user.role;
    if (role === 'Cashier') {
      Router.navigate('pos');
    } else {
      Router.navigate('dashboard');
    }
  },

  buildNav() {
    const nav = document.getElementById('sidebar-nav');
    const role = this.user.role;
    let html = '';

    // All roles get POS
    html += '<div class="nav-section">Sales</div>';
    const si = (d) => `<span class="nav-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg></span>`;

    // Manager & Admin get dashboard first
    if (role === 'Manager' || role === 'Admin') {
      html += '<div class="nav-section">Overview</div>';
      html += `<a href="#" data-page="dashboard">${si('<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>')} Dashboard</a>`;
    }

    // All roles get POS
    html += '<div class="nav-section">Sales</div>';
    html += `<a href="#" data-page="pos">${si('<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>')} Point of Sale</a>`;

    // Manager & Admin
    if (role === 'Manager' || role === 'Admin') {
      html += '<div class="nav-section">Management</div>';
      html += `<a href="#" data-page="products">${si('<path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>')} Products</a>`;
      html += `<a href="#" data-page="inventory">${si('<path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>')} Inventory</a>`;
      html += `<a href="#" data-page="customers">${si('<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>')} Customers</a>`;
      html += '<div class="nav-section">Reports</div>';
      html += `<a href="#" data-page="reports">${si('<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>')} Reports</a>`;
    }

    // Admin only
    if (role === 'Admin') {
      html += '<div class="nav-section">Administration</div>';
      html += `<a href="#" data-page="users">${si('<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>')} Users</a>`;
      html += `<a href="#" data-page="backup">${si('<polyline points="21 15 21 21 3 21 3 15"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>')} Backup</a>`;
    }

    nav.innerHTML = html;

    // Attach click handlers
    nav.querySelectorAll('a[data-page]').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        Router.navigate(a.dataset.page);
      });
    });
  }
};
