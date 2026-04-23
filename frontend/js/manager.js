/**
 * Manager module — products, inventory, customers, reports.
 */
const Products = {
  async load() {
    Loading.show('products-table-body');
    try {
      const data = await API.get('/api/products');
      this.render(data.data.products);
    } catch (err) {
      Toast.show('Failed to load products: ' + err.message, 'error');
    }
  },

  render(products) {
    const el = document.getElementById('products-table-body');
    if (!el) return;
    el.innerHTML = products.map(p => `
      <tr>
        <td>${Cashier.esc(p.name)}</td>
        <td>${p.category || '-'}</td>
        <td style="font-family:monospace;font-size:0.8rem">${p.barcode || '-'}</td>
        <td class="text-right">${p.price.toLocaleString()}</td>
        <td class="text-right">${p.costPrice ? p.costPrice.toLocaleString() : '-'}</td>
        <td class="text-right">${p.stockQuantity}</td>
        <td>
          <div style="display:flex;gap:0.3rem;flex-wrap:wrap">
            <button class="btn btn-sm btn-outline" onclick="Products.showEdit('${p._id}')">Edit</button>
            <button class="btn btn-sm btn-outline" onclick="Products.printBarcode('${p._id}')" title="Print Barcode">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="2" height="16"/><rect x="6" y="4" width="1" height="16"/><rect x="9" y="4" width="2" height="16"/><rect x="14" y="4" width="1" height="16"/><rect x="17" y="4" width="3" height="16"/><rect x="22" y="4" width="1" height="16"/></svg>
            </button>
            <button class="btn btn-sm btn-danger" onclick="Products.deactivate('${p._id}')">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  showCreate() {
    document.getElementById('product-modal-title').textContent = 'Add Product';
    document.getElementById('product-form').reset();
    document.getElementById('product-id').value = '';
    document.getElementById('product-image-preview').style.display = 'none';
    document.getElementById('product-modal').style.display = 'flex';
  },

  async showEdit(id) {
    try {
      const data = await API.get(`/api/products/${id}`);
      const p = data.data.product;
      document.getElementById('product-modal-title').textContent = 'Edit Product';
      document.getElementById('product-id').value = p._id;
      document.getElementById('product-name').value = p.name;
      document.getElementById('product-category').value = p.category || '';
      document.getElementById('product-barcode').value = p.barcode || '';
      document.getElementById('product-price').value = p.price;
      document.getElementById('product-cost').value = p.costPrice || '';
      document.getElementById('product-stock').value = p.stockQuantity;
      document.getElementById('product-image').value = '';
      const preview = document.getElementById('product-image-preview');
      if (p.imageUrl) { preview.src = p.imageUrl; preview.style.display = 'block'; }
      else { preview.style.display = 'none'; }
      document.getElementById('product-modal').style.display = 'flex';
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  },

  closeModal() {
    document.getElementById('product-modal').style.display = 'none';
  },

  async save() {
    const id = document.getElementById('product-id').value;
    const body = {
      name: document.getElementById('product-name').value.trim(),
      category: document.getElementById('product-category').value.trim(),
      barcode: document.getElementById('product-barcode').value.trim(),
      price: parseFloat(document.getElementById('product-price').value),
      costPrice: parseFloat(document.getElementById('product-cost').value) || 0,
      stockQuantity: parseInt(document.getElementById('product-stock').value) || 0
    };

    // Handle image upload
    const imageFile = document.getElementById('product-image').files[0];
    if (imageFile) {
      const formData = new FormData();
      formData.append('image', imageFile);
      try {
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData, credentials: 'same-origin' });
        const uploadData = await uploadRes.json();
        if (uploadData.success) body.imageUrl = uploadData.data.imageUrl;
      } catch (err) {
        Toast.show('Image upload failed', 'error');
      }
    }

    try {
      if (id) {
        await API.put(`/api/products/${id}`, body);
        Toast.show('Product updated');
      } else {
        await API.post('/api/products', body);
        Toast.show('Product created');
      }
      this.closeModal();
      this.load();
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  },

  async printBarcode(id) {
    try {
      const data = await API.get(`/api/products/${id}`);
      const p = data.data.product;
      if (!p.barcode) { Toast.show('No barcode for this product', 'warning'); return; }

      document.getElementById('barcode-product-name').textContent = p.name;
      document.getElementById('barcode-product-price').textContent = `GH₵ ${p.price.toLocaleString()}`;

      try {
        JsBarcode('#barcode-svg', p.barcode, {
          format: 'CODE128',
          width: 2,
          height: 60,
          displayValue: true,
          fontSize: 14,
          font: 'Inter',
          margin: 10
        });
      } catch {
        document.getElementById('barcode-svg').innerHTML = '';
        Toast.show('Could not render barcode', 'error');
        return;
      }

      document.getElementById('barcode-modal').style.display = 'flex';
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  },

  doPrintBarcode() {
    const preview = document.getElementById('barcode-preview');
    const win = window.open('', '_blank', 'width=400,height=300');
    win.document.write(`
      <html><head><title>Barcode</title>
      <style>body{display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;font-family:sans-serif}
      .label{text-align:center;padding:10px}
      .name{font-weight:700;font-size:14px;margin-top:6px}
      .price{font-size:12px;color:#666}</style></head>
      <body><div class="label">${preview.innerHTML}</div></body></html>
    `);
    win.document.close();
    win.onload = () => { win.print(); };
  },

  deactivate(id) {
    PinGuard.require(async () => {
      try {
        await API.del(`/api/products/${id}`);
        Toast.show('Product deactivated');
        Products.load();
      } catch (err) {
        Toast.show(err.message, 'error');
      }
    });
  }
};

const Inventory = {
  async load() {
    try {
      const data = await API.get('/api/inventory/alerts');
      this.render(data.data.alerts);
    } catch (err) {
      Toast.show('Failed to load inventory: ' + err.message, 'error');
    }
  },

  render(alerts) {
    const el = document.getElementById('inventory-alerts-body');
    if (!el) return;
    if (alerts.length === 0) {
      el.innerHTML = '<tr><td colspan="4" class="text-center">No low-stock alerts</td></tr>';
      return;
    }
    el.innerHTML = alerts.map(a => `
      <tr>
        <td>${Cashier.esc(a.productName || a.name)}</td>
        <td class="text-right">${a.currentStock !== undefined ? a.currentStock : a.stockQuantity}</td>
        <td class="text-right">${a.threshold !== undefined ? a.threshold : a.lowStockThreshold}</td>
        <td><span class="badge badge-danger">Low Stock</span></td>
      </tr>
    `).join('');
  },

  showAdjust() {
    document.getElementById('adjust-modal').style.display = 'flex';
    document.getElementById('adjust-form').reset();
    // Load products into dropdown
    API.get('/api/products').then(data => {
      const select = document.getElementById('adjust-product-id');
      select.innerHTML = '<option value="">Select a product...</option>' +
        data.data.products.map(p => `<option value="${p._id}">${p.name} (Stock: ${p.stockQuantity})</option>`).join('');
    }).catch(() => {});
  },

  closeAdjust() {
    document.getElementById('adjust-modal').style.display = 'none';
  },

  async saveAdjust() {
    const productId = document.getElementById('adjust-product-id').value.trim();
    const quantity = parseInt(document.getElementById('adjust-quantity').value);
    const reason = document.getElementById('adjust-reason').value.trim();

    if (!productId || isNaN(quantity)) {
      Toast.show('Product ID and quantity are required', 'warning');
      return;
    }

    try {
      await API.post('/api/inventory/adjust', { productId, quantity, reason });
      Toast.show('Stock adjusted');
      this.closeAdjust();
      this.load();
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  }
};

const Customers = {
  async load() {
    try {
      const data = await API.get('/api/customers');
      this.render(data.data.customers);
    } catch (err) {
      Toast.show('Failed to load customers: ' + err.message, 'error');
    }
  },

  render(customers) {
    const el = document.getElementById('customers-table-body');
    if (!el) return;
    el.innerHTML = customers.map(c => `
      <tr>
        <td>${Cashier.esc(c.name)}</td>
        <td>${c.phone || '-'}</td>
        <td>${c.email || '-'}</td>
        <td class="text-right">${c.loyaltyPoints || 0}</td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="Customers.showEdit('${c._id}')">Edit</button>
        </td>
      </tr>
    `).join('');
  },

  showCreate() {
    document.getElementById('customer-modal-title').textContent = 'Add Customer';
    document.getElementById('customer-form').reset();
    document.getElementById('customer-id').value = '';
    document.getElementById('customer-modal').style.display = 'flex';
  },

  async showEdit(id) {
    try {
      const data = await API.get(`/api/customers/${id}`);
      const c = data.data.customer;
      document.getElementById('customer-modal-title').textContent = 'Edit Customer';
      document.getElementById('customer-id').value = c._id;
      document.getElementById('customer-name').value = c.name;
      document.getElementById('customer-phone').value = c.phone || '';
      document.getElementById('customer-email').value = c.email || '';
      document.getElementById('customer-modal').style.display = 'flex';
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  },

  closeModal() {
    document.getElementById('customer-modal').style.display = 'none';
  },

  async save() {
    const id = document.getElementById('customer-id').value;
    const body = {
      name: document.getElementById('customer-name').value.trim(),
      phone: document.getElementById('customer-phone').value.trim(),
      email: document.getElementById('customer-email').value.trim()
    };

    try {
      if (id) {
        await API.put(`/api/customers/${id}`, body);
        Toast.show('Customer updated');
      } else {
        await API.post('/api/customers', body);
        Toast.show('Customer created');
      }
      this.closeModal();
      this.load();
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  }
};

const Reports = {
  charts: [],

  async load() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('report-start').value = today;
    document.getElementById('report-end').value = today;
  },

  destroyCharts() {
    this.charts.forEach(c => c.destroy());
    this.charts = [];
    document.getElementById('report-charts').innerHTML = '';
  },

  createChartCard(title, width) {
    const wrap = document.createElement('div');
    wrap.className = 'card';
    wrap.style.flex = width || '1 1 45%';
    wrap.style.minWidth = '300px';
    wrap.innerHTML = `<h3>${title}</h3><canvas></canvas>`;
    document.getElementById('report-charts').appendChild(wrap);
    return wrap.querySelector('canvas');
  },

  chartColors: {
    purple: { bg: 'rgba(124,58,237,0.12)', border: '#7c3aed', solid: '#7c3aed' },
    cyan: { bg: 'rgba(6,182,212,0.12)', border: '#06b6d4', solid: '#06b6d4' },
    green: { bg: 'rgba(16,185,129,0.12)', border: '#10b981', solid: '#10b981' },
    red: { bg: 'rgba(239,68,68,0.12)', border: '#ef4444', solid: '#ef4444' },
    amber: { bg: 'rgba(245,158,11,0.12)', border: '#f59e0b', solid: '#f59e0b' },
    blue: { bg: 'rgba(59,130,246,0.12)', border: '#3b82f6', solid: '#3b82f6' },
    pink: { bg: 'rgba(236,72,153,0.12)', border: '#ec4899', solid: '#ec4899' },
    lime: { bg: 'rgba(132,204,22,0.12)', border: '#84cc16', solid: '#84cc16' },
  },

  makeGradient(ctx, color1, color2) {
    const g = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
    g.addColorStop(0, color1);
    g.addColorStop(1, color2);
    return g;
  },

  defaultOpts(extra = {}) {
    return {
      responsive: true,
      maintainAspectRatio: true,
      animation: { duration: 800, easing: 'easeOutQuart' },
      plugins: {
        legend: {
          labels: {
            font: { family: 'Inter', size: 12, weight: '600' },
            padding: 16,
            usePointStyle: true,
            pointStyle: 'rectRounded',
            pointStyleWidth: 14
          }
        },
        tooltip: {
          backgroundColor: 'rgba(24,24,27,0.9)',
          titleFont: { family: 'Inter', size: 13, weight: '700' },
          bodyFont: { family: 'Inter', size: 12 },
          padding: 12,
          cornerRadius: 10,
          displayColors: true,
          boxPadding: 4
        },
        ...extra
      },
      scales: extra.noScales ? undefined : {
        x: {
          grid: { display: false },
          ticks: { font: { family: 'Inter', size: 11, weight: '500' }, color: '#71717a' },
          border: { display: false }
        },
        y: {
          grid: { color: 'rgba(0,0,0,0.04)', drawBorder: false },
          ticks: { font: { family: 'Inter', size: 11, weight: '500' }, color: '#71717a', padding: 8 },
          border: { display: false }
        }
      }
    };
  },

  async generate() {
    const type = document.getElementById('report-type').value;
    const start = document.getElementById('report-start').value;
    const end = document.getElementById('report-end').value;
    const container = document.getElementById('report-results');

    if (!start) { Toast.show('Start date is required', 'warning'); return; }

    this.destroyCharts();

    try {
      let url = `/api/reports/${type}?startDate=${start}`;
      if (end) url += `&endDate=${end}`;
      const data = await API.get(url);
      this.renderReport(type, data.data);
    } catch (err) {
      container.innerHTML = `<p style="color:var(--danger)">${err.message}</p>`;
    }
  },

  renderReport(type, data) {
    const container = document.getElementById('report-results');
    const c = this.chartColors;

    if (type === 'daily-sales') {
      const r = data.report;
      container.innerHTML = `
        <div class="stats-grid">
          <div class="stat-card"><div class="stat-label">Transactions</div><div class="stat-value">${r.totalTransactions}</div></div>
          <div class="stat-card"><div class="stat-label">Revenue</div><div class="stat-value">GH₵ ${Number(r.totalRevenue).toLocaleString()}</div></div>
          <div class="stat-card"><div class="stat-label">Tax</div><div class="stat-value">GH₵ ${Number(r.totalTax).toLocaleString()}</div></div>
          <div class="stat-card"><div class="stat-label">Discounts</div><div class="stat-value">GH₵ ${Number(r.totalDiscounts).toLocaleString()}</div></div>
        </div>`;

      // Doughnut chart for revenue breakdown
      const canvas1 = this.createChartCard('Revenue Breakdown', '1 1 40%');
      this.charts.push(new Chart(canvas1, {
        type: 'doughnut',
        data: {
          labels: ['Net Revenue', 'Tax', 'Discounts'],
          datasets: [{
            data: [Number(r.totalRevenue) - Number(r.totalTax), Number(r.totalTax), Number(r.totalDiscounts)],
            backgroundColor: [c.green.solid, c.cyan.solid, c.amber.solid],
            borderWidth: 0,
            hoverOffset: 12,
            spacing: 3,
            borderRadius: 4
          }]
        },
        options: {
          ...this.defaultOpts({ noScales: true }),
          cutout: '70%',
          scales: undefined,
          plugins: {
            ...this.defaultOpts().plugins,
            legend: { position: 'bottom', labels: { font: { family: 'Inter', size: 12, weight: '600' }, padding: 20, usePointStyle: true, pointStyle: 'circle' } }
          }
        }
      }));

      // Bar chart with gradient fills
      const canvas2 = this.createChartCard('Sales Summary', '1 1 55%');
      const ctx2 = canvas2.getContext('2d');
      this.charts.push(new Chart(canvas2, {
        type: 'bar',
        data: {
          labels: ['Revenue', 'Tax', 'Discounts'],
          datasets: [{
            label: 'Amount (GH₵)',
            data: [Number(r.totalRevenue), Number(r.totalTax), Number(r.totalDiscounts)],
            backgroundColor: [
              this.makeGradient(ctx2, 'rgba(124,58,237,0.7)', 'rgba(124,58,237,0.1)'),
              this.makeGradient(ctx2, 'rgba(6,182,212,0.7)', 'rgba(6,182,212,0.1)'),
              this.makeGradient(ctx2, 'rgba(245,158,11,0.7)', 'rgba(245,158,11,0.1)')
            ],
            borderColor: [c.purple.border, c.cyan.border, c.amber.border],
            borderWidth: 2,
            borderRadius: 10,
            barPercentage: 0.55
          }]
        },
        options: this.defaultOpts()
      }));

    } else if (type === 'product-sales') {
      const rows = data.report;
      container.innerHTML = `<div class="card table-wrap"><table>
        <thead><tr><th>Product</th><th>Category</th><th class="text-right">Qty Sold</th><th class="text-right">Revenue</th></tr></thead>
        <tbody>${rows.map(r => `<tr><td>${r.name}</td><td>${r.category || '-'}</td><td class="text-right">${r.totalQuantity}</td><td class="text-right">${Number(r.totalRevenue).toLocaleString()}</td></tr>`).join('')}</tbody>
      </table></div>`;

      if (rows.length > 0) {
        const colors = [c.purple, c.cyan, c.green, c.amber, c.red, c.blue, c.pink, c.lime];
        // Horizontal bar for product revenue with gradients
        const canvas1 = this.createChartCard('Revenue by Product', '1 1 55%');
        const ctx1 = canvas1.getContext('2d');
        this.charts.push(new Chart(canvas1, {
          type: 'bar',
          data: {
            labels: rows.map(r => r.name),
            datasets: [{
              label: 'Revenue (GH₵)',
              data: rows.map(r => Number(r.totalRevenue)),
              backgroundColor: rows.map((_, i) => {
                const col = colors[i % colors.length];
                return this.makeGradient(ctx1, col.solid + 'cc', col.solid + '22');
              }),
              borderColor: rows.map((_, i) => colors[i % colors.length].border),
              borderWidth: 2,
              borderRadius: 10,
              barPercentage: 0.6
            }]
          },
          options: { ...this.defaultOpts(), indexAxis: 'y' }
        }));

        // Modern doughnut for quantity distribution
        const canvas2 = this.createChartCard('Quantity Distribution', '1 1 40%');
        this.charts.push(new Chart(canvas2, {
          type: 'doughnut',
          data: {
            labels: rows.map(r => r.name),
            datasets: [{
              data: rows.map(r => r.totalQuantity),
              backgroundColor: rows.map((_, i) => colors[i % colors.length].solid),
              borderWidth: 0,
              hoverOffset: 10,
              spacing: 3,
              borderRadius: 4
            }]
          },
          options: {
            ...this.defaultOpts({ noScales: true }),
            cutout: '65%',
            scales: undefined,
            plugins: {
              ...this.defaultOpts().plugins,
              legend: { position: 'bottom', labels: { font: { family: 'Inter', size: 11, weight: '600' }, padding: 14, usePointStyle: true, pointStyle: 'circle' } }
            }
          }
        }));
      }

    } else if (type === 'cashier-performance') {
      const rows = Array.isArray(data.report) ? data.report : [];
      container.innerHTML = `<div class="card table-wrap"><table>
        <thead><tr><th>Cashier</th><th class="text-right">Transactions</th><th class="text-right">Revenue</th><th class="text-right">Avg Value</th></tr></thead>
        <tbody>${rows.map(r => `<tr><td>${r.fullName || r.userId}</td><td class="text-right">${r.transactionCount}</td><td class="text-right">${Number(r.totalRevenue).toLocaleString()}</td><td class="text-right">${Number(r.averageTransactionValue || 0).toLocaleString()}</td></tr>`).join('')}</tbody>
      </table></div>`;

      if (rows.length > 0) {
        const canvas = this.createChartCard('Cashier Revenue Comparison', '1 1 100%');
        const ctxC = canvas.getContext('2d');
        this.charts.push(new Chart(canvas, {
          type: 'bar',
          data: {
            labels: rows.map(r => r.fullName || r.userId),
            datasets: [
              {
                label: 'Revenue',
                data: rows.map(r => Number(r.totalRevenue)),
                backgroundColor: this.makeGradient(ctxC, 'rgba(124,58,237,0.7)', 'rgba(124,58,237,0.1)'),
                borderColor: c.purple.border,
                borderWidth: 2,
                borderRadius: 10
              },
              {
                label: 'Transactions',
                data: rows.map(r => r.transactionCount),
                backgroundColor: this.makeGradient(ctxC, 'rgba(6,182,212,0.7)', 'rgba(6,182,212,0.1)'),
                borderColor: c.cyan.border,
                borderWidth: 2,
                borderRadius: 10
              }
            ]
          },
          options: this.defaultOpts()
        }));
      }

    } else if (type === 'profit') {
      const r = data.report;
      container.innerHTML = `
        <div class="stats-grid">
          <div class="stat-card"><div class="stat-label">Total Revenue</div><div class="stat-value">GH₵ ${Number(r.totalRevenue || 0).toLocaleString()}</div></div>
          <div class="stat-card"><div class="stat-label">Total Cost</div><div class="stat-value">GH₵ ${Number(r.totalCost || 0).toLocaleString()}</div></div>
          <div class="stat-card"><div class="stat-label">Gross Profit</div><div class="stat-value">GH₵ ${Number(r.grossProfit || 0).toLocaleString()}</div></div>
        </div>`;

      if (r.byCategory && r.byCategory.length > 0) {
        const cats = r.byCategory;
        const canvas = this.createChartCard('Profit by Category', '1 1 100%');
        const ctxP = canvas.getContext('2d');
        this.charts.push(new Chart(canvas, {
          type: 'bar',
          data: {
            labels: cats.map(c => c.category || 'Uncategorized'),
            datasets: [
              {
                label: 'Revenue',
                data: cats.map(c => Number(c.revenue)),
                backgroundColor: this.makeGradient(ctxP, 'rgba(124,58,237,0.7)', 'rgba(124,58,237,0.1)'),
                borderColor: c.purple.border,
                borderWidth: 2,
                borderRadius: 8
              },
              {
                label: 'Cost',
                data: cats.map(c => Number(c.cost)),
                backgroundColor: this.makeGradient(ctxP, 'rgba(239,68,68,0.7)', 'rgba(239,68,68,0.1)'),
                borderColor: c.red.border,
                borderWidth: 2,
                borderRadius: 8
              },
              {
                label: 'Profit',
                data: cats.map(c => Number(c.profit)),
                backgroundColor: this.makeGradient(ctxP, 'rgba(16,185,129,0.7)', 'rgba(16,185,129,0.1)'),
                borderColor: c.green.border,
                borderWidth: 2,
                borderRadius: 8
              }
            ]
          },
          options: this.defaultOpts()
        }));
      }

    } else if (type === 'inventory') {
      const rows = data.report;
      container.innerHTML = `<div class="card table-wrap"><table>
        <thead><tr><th>Product</th><th>Category</th><th class="text-right">Stock</th><th class="text-right">Price</th><th>Status</th></tr></thead>
        <tbody>${rows.map(r => `<tr><td>${r.name}</td><td>${r.category || '-'}</td><td class="text-right">${r.stockQuantity}</td><td class="text-right">${Number(r.price).toLocaleString()}</td><td>${r.lowStock ? '<span class="badge badge-danger">Low</span>' : '<span class="badge badge-success">OK</span>'}</td></tr>`).join('')}</tbody>
      </table></div>`;

      if (rows.length > 0) {
        const colors = [c.purple, c.cyan, c.green, c.amber, c.red, c.blue, c.pink, c.lime];
        const canvas = this.createChartCard('Stock Levels', '1 1 100%');
        const ctxS = canvas.getContext('2d');
        this.charts.push(new Chart(canvas, {
          type: 'bar',
          data: {
            labels: rows.map(r => r.name),
            datasets: [{
              label: 'Stock Quantity',
              data: rows.map(r => r.stockQuantity),
              backgroundColor: rows.map((r, i) => {
                const col = r.lowStock ? c.red : colors[i % colors.length];
                return this.makeGradient(ctxS, col.solid + 'bb', col.solid + '22');
              }),
              borderColor: rows.map((r, i) => r.lowStock ? c.red.border : colors[i % colors.length].border),
              borderWidth: 2,
              borderRadius: 10,
              barPercentage: 0.55
            }]
          },
          options: this.defaultOpts()
        }));
      }
    } else {
      container.innerHTML = `<pre style="font-size:0.85rem;padding:1rem;background:var(--surface-2);border-radius:var(--radius)">${JSON.stringify(data, null, 2)}</pre>`;
    }
  },

  exportCSV() {
    const type = document.getElementById('report-type').value;
    const start = document.getElementById('report-start').value;
    const end = document.getElementById('report-end').value;
    if (!start) { Toast.show('Start date is required', 'warning'); return; }
    let url = `/api/reports/${type}?startDate=${start}&format=csv`;
    if (end) url += `&endDate=${end}`;
    window.open(url, '_blank');
  }
};
