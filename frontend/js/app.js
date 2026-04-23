/**
 * Simple page router — shows/hides page sections and updates sidebar active state.
 */
const Router = {
  current: null,

  navigate(page) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    // Show target page
    const target = document.getElementById(`page-${page}`);
    if (target) target.classList.add('active');

    // Update sidebar active link
    document.querySelectorAll('#sidebar-nav a').forEach(a => a.classList.remove('active'));
    const link = document.querySelector(`#sidebar-nav a[data-page="${page}"]`);
    if (link) link.classList.add('active');

    this.current = page;

    // Trigger page-specific load
    if (page === 'dashboard') Dashboard.load();
    if (page === 'pos') Cashier.load();
    if (page === 'products') Products.load();
    if (page === 'inventory') Inventory.load();
    if (page === 'customers') Customers.load();
    if (page === 'reports') Reports.load();
    if (page === 'users') Users.load();
    if (page === 'backup') Backup.load();
  }
};

// Boot the app
document.addEventListener('DOMContentLoaded', () => {
  // Load Paystack public key
  fetch('/api/config/paystack')
    .then(r => r.json())
    .then(d => { if (d.data && d.data.publicKey) window.__PAYSTACK_PUBLIC_KEY__ = d.data.publicKey; })
    .catch(() => {});

  Auth.init();
});
