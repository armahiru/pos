/**
 * Cashier POS interface — product search, cart management, checkout.
 */
const Cashier = {
  cart: { items: [], saleDiscount: 0, customerId: null },
  products: [],
  taxRate: 0,
  customer: null,
  activeCategory: 'All',

  load() {
    this.loadTaxRate();
    this.loadProducts();
    this.renderCart();
    this.bindEvents();
  },

  async loadTaxRate() {
    try {
      const data = await API.get('/api/cart');
      this.taxRate = data.data.taxRate || 0;
    } catch {
      this.taxRate = 0;
    }
  },

  bindEvents() {
    const searchInput = document.getElementById('pos-search-input');
    if (searchInput && !searchInput._bound) {
      searchInput._bound = true;
      searchInput.addEventListener('input', () => this.filterProducts(searchInput.value));
      searchInput.addEventListener('keydown', (e) => {
        // Barcode scanner typically sends Enter after scan
        if (e.key === 'Enter') {
          e.preventDefault();
          this.handleBarcode(searchInput.value.trim());
          searchInput.value = '';
        }
      });
    }

    const clearBtn = document.getElementById('btn-clear-cart');
    if (clearBtn && !clearBtn._bound) {
      clearBtn._bound = true;
      clearBtn.addEventListener('click', () => {
        this.cart = { items: [], saleDiscount: 0, customerId: null };
        this.customer = null;
        this.renderCart();
      });
    }

    const checkoutBtn = document.getElementById('btn-checkout');
    if (checkoutBtn && !checkoutBtn._bound) {
      checkoutBtn._bound = true;
      checkoutBtn.addEventListener('click', () => this.showCheckoutModal());
    }

    const discountBtn = document.getElementById('btn-sale-discount');
    if (discountBtn && !discountBtn._bound) {
      discountBtn._bound = true;
      discountBtn.addEventListener('click', () => this.showSaleDiscountModal());
    }

    const customerBtn = document.getElementById('btn-link-customer');
    if (customerBtn && !customerBtn._bound) {
      customerBtn._bound = true;
      customerBtn.addEventListener('click', () => this.showCustomerModal());
    }
  },

  async loadProducts() {
    try {
      const data = await API.get('/api/products');
      this.products = data.data.products;
      this.renderCategories();
      this.renderProducts(this.getFilteredProducts());
    } catch (err) {
      Toast.show('Failed to load products: ' + err.message, 'error');
    }
  },

  getFilteredProducts() {
    if (this.activeCategory === 'All') return this.products;
    return this.products.filter(p => (p.category || 'Uncategorized') === this.activeCategory);
  },

  renderCategories() {
    const tabs = document.getElementById('category-tabs');
    if (!tabs) return;
    const cats = ['All', ...new Set(this.products.map(p => p.category || 'Uncategorized').filter(Boolean))];
    tabs.innerHTML = cats.map(c =>
      `<button class="cat-tab${c === this.activeCategory ? ' active' : ''}" onclick="Cashier.selectCategory('${this.esc(c)}')">${this.esc(c)}</button>`
    ).join('');
  },

  selectCategory(cat) {
    this.activeCategory = cat;
    this.renderCategories();
    this.renderProducts(this.getFilteredProducts());
  },

  renderProducts(products) {
    const grid = document.getElementById('product-grid');
    if (!grid) return;
    if (products.length === 0) {
      grid.innerHTML = '<p style="padding:1.5rem;color:var(--text-3);text-align:center">No products in this category</p>';
      return;
    }
    grid.innerHTML = products.map(p => `
      <div class="product-card">
        ${p.imageUrl
          ? `<img class="p-image" src="${p.imageUrl}" alt="${this.esc(p.name)}" />`
          : `<div class="p-placeholder">${this.esc(p.name.charAt(0))}</div>`
        }
        <div class="p-name">${this.esc(p.name)}</div>
        <div class="p-price">GH₵ ${p.price.toLocaleString()}</div>
        <div class="p-stock">Stock: ${p.stockQuantity}</div>
        <button class="p-add-btn" onclick="event.stopPropagation(); Cashier.showQtyModal('${p._id}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add to Cart
        </button>
      </div>
    `).join('');
  },

  filterProducts(query) {
    let filtered = this.getFilteredProducts();
    if (query) {
      const q = query.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(q) || (p.category && p.category.toLowerCase().includes(q))
      );
    }
    this.renderProducts(filtered);
  },

  async handleBarcode(code) {
    if (!code) return;
    try {
      const data = await API.get(`/api/products/barcode/${encodeURIComponent(code)}`);
      this.addToCart(data.data.product._id);
    } catch (err) {
      Toast.show('Product not found for barcode: ' + code, 'error');
    }
  },

  // Quantity modal
  _qtyProductId: null,

  showQtyModal(productId) {
    const product = this.products.find(p => p._id === productId);
    if (!product) return;
    this._qtyProductId = productId;

    const container = document.getElementById('qty-modal-product');
    container.innerHTML = `
      ${product.imageUrl
        ? `<img class="qty-modal-img" src="${product.imageUrl}" alt="${this.esc(product.name)}" />`
        : `<div class="qty-modal-placeholder">${this.esc(product.name.charAt(0))}</div>`
      }
      <div style="font-weight:700;font-size:1.05rem;color:var(--text)">${this.esc(product.name)}</div>
      <div style="font-size:0.85rem;color:var(--text-3)">GH₵ ${product.price.toLocaleString()} each &middot; Stock: ${product.stockQuantity}</div>
    `;

    document.getElementById('qty-modal-input').value = 1;
    document.getElementById('qty-modal-input').max = product.stockQuantity;
    this.updateQtyModalTotal();
    document.getElementById('qty-modal').style.display = 'flex';
    document.getElementById('qty-modal-input').focus();
    document.getElementById('qty-modal-input').select();

    // Update total on input change
    document.getElementById('qty-modal-input').oninput = () => this.updateQtyModalTotal();
  },

  updateQtyModalTotal() {
    const product = this.products.find(p => p._id === this._qtyProductId);
    if (!product) return;
    const qty = parseInt(document.getElementById('qty-modal-input').value) || 0;
    const total = qty * product.price;
    document.getElementById('qty-modal-total').innerHTML = `Total: <span style="background:linear-gradient(135deg,#84cc16,#22c55e);-webkit-background-clip:text;-webkit-text-fill-color:transparent">GH₵ ${total.toLocaleString()}</span>`;
  },

  qtyModalAdjust(delta) {
    const input = document.getElementById('qty-modal-input');
    const product = this.products.find(p => p._id === this._qtyProductId);
    let val = (parseInt(input.value) || 0) + delta;
    if (val < 1) val = 1;
    if (product && val > product.stockQuantity) val = product.stockQuantity;
    input.value = val;
    this.updateQtyModalTotal();
  },

  closeQtyModal() {
    document.getElementById('qty-modal').style.display = 'none';
    this._qtyProductId = null;
  },

  confirmAddToCart() {
    const qty = parseInt(document.getElementById('qty-modal-input').value) || 1;
    if (this._qtyProductId) {
      this.addToCart(this._qtyProductId, qty);
    }
    this.closeQtyModal();
  },

  addToCart(productId, quantity) {
    quantity = quantity || 1;
    const product = this.products.find(p => p._id === productId);
    if (!product) return;

    const existing = this.cart.items.find(i => i.productId === productId);
    const currentQty = existing ? existing.quantity : 0;
    const totalQty = currentQty + quantity;

    if (totalQty > product.stockQuantity) {
      Toast.show('Insufficient stock', 'warning');
      return;
    }

    if (existing) {
      existing.quantity = totalQty;
      existing.lineTotal = this.calcLine(existing);
    } else {
      this.cart.items.push({
        productId: product._id,
        name: product.name,
        unitPrice: product.price,
        quantity: quantity,
        discountPercent: 0,
        lineTotal: product.price * quantity
      });
    }
    this.renderCart();
  },

  calcLine(item) {
    return Math.round(item.unitPrice * item.quantity * (1 - item.discountPercent / 100) * 100) / 100;
  },

  updateQty(productId, qty) {
    qty = parseInt(qty);
    if (isNaN(qty) || qty < 0) return;
    const item = this.cart.items.find(i => i.productId === productId);
    if (!item) return;

    if (qty === 0) {
      this.cart.items = this.cart.items.filter(i => i.productId !== productId);
    } else {
      const product = this.products.find(p => p._id === productId);
      if (product && qty > product.stockQuantity) {
        Toast.show('Insufficient stock', 'warning');
        return;
      }
      item.quantity = qty;
      item.lineTotal = this.calcLine(item);
    }
    this.renderCart();
  },

  removeItem(productId) {
    this.cart.items = this.cart.items.filter(i => i.productId !== productId);
    this.renderCart();
  },

  applyItemDiscount(productId) {
    const pct = prompt('Enter discount % for this item (0-100):');
    if (pct === null) return;
    const val = Math.max(0, Math.min(100, parseFloat(pct) || 0));
    const item = this.cart.items.find(i => i.productId === productId);
    if (item) {
      item.discountPercent = val;
      item.lineTotal = this.calcLine(item);
      this.renderCart();
    }
  },

  getTotals() {
    const subtotal = this.cart.items.reduce((s, i) => s + i.lineTotal, 0);
    const discountAmount = Math.min(this.cart.saleDiscount, subtotal);
    const afterDiscount = Math.max(0, subtotal - discountAmount);
    const taxAmount = Math.round(afterDiscount * (this.taxRate / 100) * 100) / 100;
    const grandTotal = Math.round((afterDiscount + taxAmount) * 100) / 100;
    return { subtotal, discountAmount, taxAmount, grandTotal };
  },

  renderCart() {
    const itemsEl = document.getElementById('cart-items');
    const totalsEl = document.getElementById('cart-totals');
    const customerEl = document.getElementById('cart-customer');
    if (!itemsEl) return;

    if (this.cart.items.length === 0) {
      itemsEl.innerHTML = `<div class="empty-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
        <h4>Cart is empty</h4>
        <p>Click "Add to Cart" on any product to start a sale</p>
      </div>`;
    } else {
      itemsEl.innerHTML = this.cart.items.map(i => `
        <div class="cart-item">
          <span class="ci-name">${this.esc(i.name)}${i.discountPercent > 0 ? ` <span class="badge badge-warning">-${i.discountPercent}%</span>` : ''}</span>
          <input class="ci-qty" type="number" min="0" value="${i.quantity}"
            onchange="Cashier.updateQty('${i.productId}', this.value)" />
          <span class="ci-total">${i.lineTotal.toLocaleString()}</span>
          <button class="ci-remove" onclick="Cashier.applyItemDiscount('${i.productId}')" title="Discount">%</button>
          <button class="ci-remove" onclick="Cashier.removeItem('${i.productId}')" title="Remove">&times;</button>
        </div>
      `).join('');
    }

    const t = this.getTotals();
    totalsEl.innerHTML = `
      <div class="row"><span>Subtotal</span><span>GH₵ ${t.subtotal.toLocaleString()}</span></div>
      ${t.discountAmount > 0 ? `<div class="row"><span>Discount</span><span>-GH₵ ${t.discountAmount.toLocaleString()}</span></div>` : ''}
      <div class="row"><span>Tax (${this.taxRate}%)</span><span>GH₵ ${t.taxAmount.toLocaleString()}</span></div>
      <div class="row grand-total"><span>Total</span><span>GH₵ ${t.grandTotal.toLocaleString()}</span></div>
    `;

    if (customerEl) {
      customerEl.textContent = this.customer ? `Customer: ${this.customer.name} (${this.customer.loyaltyPoints} pts)` : '';
    }
  },

  showSaleDiscountModal() {
    document.getElementById('sale-discount-input').value = this.cart.saleDiscount || '';
    document.getElementById('sale-discount-modal').style.display = 'flex';
    setTimeout(() => document.getElementById('sale-discount-input').focus(), 100);
  },

  closeSaleDiscount() {
    document.getElementById('sale-discount-modal').style.display = 'none';
  },

  confirmSaleDiscount() {
    const val = parseFloat(document.getElementById('sale-discount-input').value) || 0;
    this.cart.saleDiscount = Math.max(0, val);
    this.renderCart();
    this.closeSaleDiscount();
    if (val > 0) Toast.show(`Discount of GH₵ ${val.toLocaleString()} applied`);
  },

  showCustomerModal() {
    document.getElementById('customer-phone-input').value = '';
    document.getElementById('customer-lookup-modal').style.display = 'flex';
    setTimeout(() => document.getElementById('customer-phone-input').focus(), 100);
  },

  closeCustomerLookup() {
    document.getElementById('customer-lookup-modal').style.display = 'none';
  },

  confirmCustomerLookup() {
    const phone = document.getElementById('customer-phone-input').value.trim();
    if (!phone) { Toast.show('Enter a phone number', 'warning'); return; }
    API.get(`/api/customers?search=${encodeURIComponent(phone)}`).then(data => {
      const customers = data.data.customers;
      if (customers.length === 0) {
        Toast.show('Customer not found', 'warning');
        return;
      }
      this.customer = customers[0];
      this.cart.customerId = customers[0]._id;
      this.renderCart();
      this.closeCustomerLookup();
      Toast.show(`Linked: ${customers[0].name}`);
    }).catch(err => Toast.show(err.message, 'error'));
  },

  showCheckoutModal() {
    if (this.cart.items.length === 0) {
      Toast.show('Cart is empty', 'warning');
      return;
    }
    const t = this.getTotals();
    const modal = document.getElementById('checkout-modal');
    document.getElementById('checkout-total').textContent = 'GH₵ ' + t.grandTotal.toLocaleString();
    document.getElementById('payment-method').value = 'Cash';
    document.getElementById('payment-amount').value = '';
    document.getElementById('payment-ref').value = '';
    document.getElementById('payment-ref-group').style.display = 'none';
    document.getElementById('paystack-email-group').style.display = 'none';
    document.getElementById('payment-amount-group').style.display = 'block';
    document.getElementById('checkout-change').textContent = '';
    modal.style.display = 'flex';

    document.getElementById('payment-method').onchange = (e) => {
      const method = e.target.value;
      const refGroup = document.getElementById('payment-ref-group');
      const qrSection = document.getElementById('momo-qr-section');
      const amountGroup = document.getElementById('payment-amount-group');

      qrSection.style.display = 'none';
      refGroup.style.display = 'none';
      amountGroup.style.display = 'block';

      if (method === 'MTN_MOMO') {
        refGroup.style.display = 'block';
        refGroup.querySelector('label').textContent = 'MoMo Transaction Ref';
        this.generateMoMoQR(t.grandTotal);
      } else if (method === 'Card') {
        refGroup.style.display = 'block';
        refGroup.querySelector('label').textContent = 'Card Last 4 Digits';
      }
    };
  },

  async generateMoMoQR(amount) {
    const qrSection = document.getElementById('momo-qr-section');
    const qrContainer = document.getElementById('momo-qr-code');
    const qrDetails = document.getElementById('momo-qr-details');

    try {
      const config = await API.get('/api/config/momo');
      const { momoNumber, momoName } = config.data;

      if (!momoNumber) {
        qrSection.style.display = 'none';
        return;
      }

      // Show a clear payment instruction card instead of broken USSD QR
      qrContainer.innerHTML = `
        <div style="padding:1rem 1.5rem;background:linear-gradient(135deg,#fff7ed,#ffedd5);border-radius:12px;border:2px solid #fb923c;text-align:center;min-width:220px">
          <div style="font-size:2rem;margin-bottom:0.25rem">📱</div>
          <div style="font-size:0.75rem;color:#9a3412;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.5rem">MTN MoMo Payment</div>
          <div style="font-size:1.6rem;font-weight:800;color:#c2410c;letter-spacing:0.05em;margin-bottom:0.25rem">${momoNumber}</div>
          <div style="font-size:0.8rem;color:#7c2d12;margin-bottom:0.75rem">${momoName}</div>
          <div style="background:#fff;border-radius:8px;padding:0.5rem;margin-bottom:0.75rem">
            <div style="font-size:0.7rem;color:#6b7280">Amount to send</div>
            <div style="font-size:1.3rem;font-weight:700;color:#15803d">GH₵ ${amount.toLocaleString()}</div>
          </div>
          <div style="font-size:0.72rem;color:#92400e;line-height:1.4">
            Dial <strong>*170#</strong> → Send Money → MoMo User<br/>
            or use the MTN MoMo app
          </div>
        </div>
      `;
      qrDetails.textContent = 'Enter the MoMo transaction reference below after payment';
      qrSection.style.display = 'block';
    } catch {
      qrSection.style.display = 'none';
    }
  },

  closeCheckoutModal() {
    document.getElementById('checkout-modal').style.display = 'none';
    document.getElementById('momo-qr-section').style.display = 'none';
  },

  async processCheckout() {
    const method = document.getElementById('payment-method').value;
    const t = this.getTotals();
    const amount = parseFloat(document.getElementById('payment-amount').value);
    const ref = document.getElementById('payment-ref').value.trim();

    if (isNaN(amount) || amount <= 0) {
      Toast.show('Enter a valid amount', 'warning');
      return;
    }

    if (method === 'Cash' && amount < t.grandTotal) {
      Toast.show('Amount is less than total', 'warning');
      return;
    }

    const cartPayload = {
      items: this.cart.items.map(i => ({
        productId: i.productId,
        quantity: i.quantity,
        discountPercent: i.discountPercent
      })),
      saleDiscount: this.cart.saleDiscount,
      customerId: this.cart.customerId
    };

    const payment = { method, amount };
    if (method === 'MTN_MOMO') payment.momoRef = ref;
    if (method === 'Card') {
      payment.cardType = 'Visa';
      payment.lastFour = ref;
    }

    try {
      const saleData = await API.post('/api/sales/checkout', {
        cart: cartPayload,
        payments: [payment]
      });

      const saleId = saleData.data.sale._id || saleData.data.sale.saleId;

      if (method === 'Cash') {
        const change = Math.round((amount - t.grandTotal) * 100) / 100;
        document.getElementById('checkout-change').textContent = `Change: GH₵ ${change.toLocaleString()}`;
      }

      Toast.show('Sale completed');
      this.closeCheckoutModal();
      this.showReceipt(saleId);
      this.cart = { items: [], saleDiscount: 0, customerId: null };
      this.customer = null;
      this.renderCart();
      this.loadProducts();
    } catch (err) {
      Toast.show('Checkout failed: ' + err.message, 'error');
    }
  },

  async showReceipt(saleId) {
    try {
      const data = await API.get(`/api/receipts/${saleId}`);
      const receipt = data.data.receipt;
      const modal = document.getElementById('receipt-modal');
      document.getElementById('receipt-content').textContent = receipt;
      modal.style.display = 'flex';
    } catch (err) {
      Toast.show('Could not load receipt', 'error');
    }
  },

  closeReceiptModal() {
    document.getElementById('receipt-modal').style.display = 'none';
  },

  printReceipt() {
    const content = document.getElementById('receipt-content').textContent;
    const win = window.open('', '_blank');
    win.document.write(`<pre style="font-family:monospace;font-size:12px">${content}</pre>`);
    win.print();
  },

  esc(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }
};
