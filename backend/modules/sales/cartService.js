/**
 * Shopping cart logic — pure functions operating on plain cart objects.
 * Validates: Requirements 5.1-5.6, 6.1-6.4, 7.1-7.3
 */
const AppError = require('../../utils/AppError');

/**
 * Round a number to 2 decimal places.
 */
function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Recalculate lineTotal for a cart item.
 */
function calcLineTotal(item) {
  return round2(item.unitPrice * item.quantity * (1 - item.discountPercent / 100));
}

/**
 * Add a product to the cart. Validates stock availability.
 * @param {object} cart - Current cart state
 * @param {object} product - { productId, name, price, stockQuantity }
 * @param {number} quantity - Quantity to add (must be > 0)
 * @returns {object} Updated cart
 */
function addToCart(cart, product, quantity) {
  if (!quantity || quantity <= 0) {
    throw new AppError('Quantity must be greater than zero', 400, 'VALIDATION_ERROR');
  }

  const existing = cart.items.find(i => String(i.productId) === String(product.productId));
  const currentQty = existing ? existing.quantity : 0;
  const totalQty = currentQty + quantity;

  if (totalQty > product.stockQuantity) {
    throw new AppError(
      `Insufficient stock. Available: ${product.stockQuantity}, requested: ${totalQty}`,
      400,
      'INSUFFICIENT_STOCK'
    );
  }

  if (existing) {
    existing.quantity = totalQty;
    existing.lineTotal = calcLineTotal(existing);
  } else {
    const item = {
      productId: product.productId,
      name: product.name,
      unitPrice: product.price,
      quantity,
      discountPercent: 0,
      lineTotal: round2(product.price * quantity)
    };
    cart.items.push(item);
  }

  return cart;
}

/**
 * Update the quantity of an existing cart item.
 * @param {object} cart - Current cart state
 * @param {number} productId
 * @param {number} quantity - New quantity (0 removes the item)
 * @returns {object} Updated cart
 */
function updateCartItemQuantity(cart, productId, quantity) {
  if (quantity < 0) {
    throw new AppError('Quantity cannot be negative', 400, 'VALIDATION_ERROR');
  }

  const index = cart.items.findIndex(i => String(i.productId) === String(productId));
  if (index === -1) {
    throw new AppError('Item not found in cart', 404, 'NOT_FOUND');
  }

  if (quantity === 0) {
    cart.items.splice(index, 1);
  } else {
    cart.items[index].quantity = quantity;
    cart.items[index].lineTotal = calcLineTotal(cart.items[index]);
  }

  return cart;
}

/**
 * Remove an item from the cart.
 * @param {object} cart - Current cart state
 * @param {number} productId
 * @returns {object} Updated cart
 */
function removeFromCart(cart, productId) {
  const index = cart.items.findIndex(i => String(i.productId) === String(productId));
  if (index === -1) {
    throw new AppError('Item not found in cart', 404, 'NOT_FOUND');
  }

  cart.items.splice(index, 1);
  return cart;
}

/**
 * Return a fresh empty cart.
 * @returns {object} Empty cart
 */
function clearCart() {
  return {
    items: [],
    saleDiscount: 0,
    customerId: null
  };
}

/**
 * Apply a percentage discount to a specific cart item.
 * Clamps so lineTotal never goes below 0.
 * @param {object} cart - Current cart state
 * @param {number} productId
 * @param {number} percent - Discount percentage (0-100)
 * @returns {object} Updated cart
 */
function applyItemDiscount(cart, productId, percent) {
  const item = cart.items.find(i => String(i.productId) === String(productId));
  if (!item) {
    throw new AppError('Item not found in cart', 404, 'NOT_FOUND');
  }

  // Clamp percent between 0 and 100 so lineTotal >= 0
  item.discountPercent = Math.max(0, Math.min(100, percent));
  item.lineTotal = calcLineTotal(item);

  return cart;
}

/**
 * Apply a fixed-amount discount to the entire sale.
 * Clamped to >= 0.
 * @param {object} cart - Current cart state
 * @param {number} fixedAmount
 * @returns {object} Updated cart
 */
function applySaleDiscount(cart, fixedAmount) {
  cart.saleDiscount = Math.max(0, fixedAmount);
  return cart;
}

/**
 * Calculate all totals for the cart.
 * @param {object} cart - Current cart state
 * @param {number} taxRate - Tax percentage (e.g. 16 for 16%)
 * @returns {{ subtotal, discountAmount, taxAmount, grandTotal }}
 */
function calculateTotals(cart, taxRate) {
  const subtotal = round2(cart.items.reduce((sum, item) => sum + item.lineTotal, 0));
  const discountAmount = round2(Math.min(cart.saleDiscount, subtotal));
  const postDiscountSubtotal = round2(Math.max(0, subtotal - cart.saleDiscount));
  const taxAmount = round2(postDiscountSubtotal * (taxRate / 100));
  const grandTotal = round2(postDiscountSubtotal + taxAmount);

  return { subtotal, discountAmount, taxAmount, grandTotal };
}

module.exports = {
  addToCart,
  updateCartItemQuantity,
  removeFromCart,
  clearCart,
  applyItemDiscount,
  applySaleDiscount,
  calculateTotals,
  round2,
  calcLineTotal
};
