/**
 * Dashboard — real-time business overview with charts.
 */
const Dashboard = {
  charts: [],

  async load() {
    try {
      const data = await API.get('/api/dashboard');
      this.render(data.data);
    } catch (err) {
      Toast.show('Failed to load dashboard: ' + err.message, 'error');
    }
  },

  destroyCharts() {
    this.charts.forEach(c => c.destroy());
    this.charts = [];
  },

  render(d) {
    this.destroyCharts();

    // Date
    document.getElementById('dash-date').textContent = new Date().toLocaleDateString('en', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    // Stat cards
    document.getElementById('dash-stats').innerHTML = `
      <div class="stat-card">
        <div class="stat-label">Today's Revenue</div>
        <div class="stat-value" style="color:#10b981">GH₵ ${d.today.revenue.toLocaleString()}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Transactions Today</div>
        <div class="stat-value">${d.today.transactions}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Weekly Revenue</div>
        <div class="stat-value">GH₵ ${d.week.revenue.toLocaleString()}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Products</div>
        <div class="stat-value">${d.counts.products}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Customers</div>
        <div class="stat-value">${d.counts.customers}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Tax Collected Today</div>
        <div class="stat-value">GH₵ ${d.today.tax.toLocaleString()}</div>
      </div>
    `;

    // Revenue chart (line/area)
    const revCtx = document.getElementById('dash-revenue-chart');
    const gradient = revCtx.getContext('2d').createLinearGradient(0, 0, 0, 250);
    gradient.addColorStop(0, 'rgba(132,204,22,0.3)');
    gradient.addColorStop(1, 'rgba(132,204,22,0.02)');

    this.charts.push(new Chart(revCtx, {
      type: 'line',
      data: {
        labels: d.dailyRevenue.map(r => r.label),
        datasets: [{
          label: 'Revenue (GH₵)',
          data: d.dailyRevenue.map(r => r.revenue),
          borderColor: '#84cc16',
          backgroundColor: gradient,
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#84cc16',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7
        }]
      },
      options: {
        responsive: true,
        animation: { duration: 800, easing: 'easeOutQuart' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(24,24,27,0.9)',
            titleFont: { family: 'Inter', weight: '700' },
            bodyFont: { family: 'Inter' },
            padding: 12,
            cornerRadius: 10,
            callbacks: {
              label: (ctx) => `GH₵ ${ctx.parsed.y.toLocaleString()}`
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 11, weight: '500' } }, border: { display: false } },
          y: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { family: 'Inter', size: 11 }, callback: v => 'GH₵ ' + v }, border: { display: false } }
        }
      }
    }));

    // Payment methods doughnut
    const payCtx = document.getElementById('dash-payment-chart');
    const methods = Object.keys(d.paymentMethods);
    const methodColors = { Cash: '#10b981', MTN_MOMO: '#f59e0b', Card: '#3b82f6', Unknown: '#a1a1aa' };

    if (methods.length > 0) {
      this.charts.push(new Chart(payCtx, {
        type: 'doughnut',
        data: {
          labels: methods.map(m => m === 'MTN_MOMO' ? 'MTN MoMo' : m),
          datasets: [{
            data: methods.map(m => d.paymentMethods[m]),
            backgroundColor: methods.map(m => methodColors[m] || '#7c3aed'),
            borderWidth: 0,
            hoverOffset: 10,
            spacing: 3,
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          cutout: '68%',
          animation: { duration: 800 },
          plugins: {
            legend: { position: 'bottom', labels: { font: { family: 'Inter', size: 12, weight: '600' }, padding: 16, usePointStyle: true, pointStyle: 'circle' } },
            tooltip: { backgroundColor: 'rgba(24,24,27,0.9)', padding: 12, cornerRadius: 10 }
          }
        }
      }));
    } else {
      payCtx.parentElement.querySelector('h3').insertAdjacentHTML('afterend', '<p style="color:var(--text-3);font-size:0.85rem;padding:2rem 0;text-align:center">No payments today</p>');
    }

    // Top products table
    const topEl = document.getElementById('dash-top-products');
    if (d.topProducts.length === 0) {
      topEl.innerHTML = '<tr><td colspan="3" class="text-center" style="color:var(--text-3)">No sales data yet</td></tr>';
    } else {
      topEl.innerHTML = d.topProducts.map((p, i) => `
        <tr>
          <td style="font-weight:600"><span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:6px;background:${i < 3 ? 'linear-gradient(135deg,#84cc16,#65a30d)' : 'var(--bg)'};color:${i < 3 ? '#fff' : 'var(--text-3)'};font-size:0.7rem;font-weight:700;margin-right:0.5rem">${i + 1}</span>${p.name}</td>
          <td class="text-right">${p.qty}</td>
          <td class="text-right">GH₵ ${p.revenue.toLocaleString()}</td>
        </tr>
      `).join('');
    }

    // Recent sales table
    const recentEl = document.getElementById('dash-recent-sales');
    if (d.recentSales.length === 0) {
      recentEl.innerHTML = '<tr><td colspan="3" class="text-center" style="color:var(--text-3)">No transactions yet</td></tr>';
    } else {
      recentEl.innerHTML = d.recentSales.map(s => `
        <tr>
          <td>${new Date(s.date).toLocaleString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
          <td class="text-right">${s.items} item${s.items !== 1 ? 's' : ''}</td>
          <td class="text-right" style="font-weight:600">GH₵ ${s.grandTotal.toLocaleString()}</td>
        </tr>
      `).join('');
    }

    // Low stock alerts
    const lowEl = document.getElementById('dash-low-stock');
    const lowCard = document.getElementById('dash-low-stock-card');
    if (d.lowStock.length > 0) {
      lowCard.style.display = 'block';
      lowEl.innerHTML = d.lowStock.map(p => `
        <tr>
          <td style="font-weight:600">${p.name}</td>
          <td class="text-right"><span class="badge badge-danger">${p.stockQuantity}</span></td>
          <td class="text-right">${p.lowStockThreshold}</td>
        </tr>
      `).join('');
    } else {
      lowCard.style.display = 'none';
    }
  }
};
