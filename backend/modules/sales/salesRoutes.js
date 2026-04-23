/**
 * Sales module Express routes — MongoDB version.
 */
const express = require('express');
const router = express.Router();

const {
  addToCart, updateCartItemQuantity, removeFromCart, clearCart,
  applyItemDiscount, applySaleDiscount, calculateTotals
} = require('./cartService');
const { checkout, getSale } = require('./salesService');
const { getProduct } = require('../product/productService');
const { logEvent } = require('../logger/loggerService');
const { addLoyaltyPoints } = require('../customer/customerService');
const requireAuth = require('../../middleware/requireAuth');
const { requireRole } = require('../../middleware/requireRole');
const SystemConfig = require('../../models/SystemConfig');

function ensureCart(req) {
  if (!req.session.cart) {
    req.session.cart = { items: [], saleDiscount: 0, customerId: null };
  }
  return req.session.cart;
}

async function getTaxRate() {
  const config = await SystemConfig.findOne({ configKey: 'tax_rate' });
  return config ? parseFloat(config.configValue) : 0;
}

router.post('/api/cart/items', requireAuth, requireRole('Cashier'), async (req, res, next) => {
  try {
    const { productId, quantity } = req.body;
    const product = await getProduct(productId);
    if (!product) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } });
    if (!product.isActive) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Product is not active' } });

    const cart = ensureCart(req);
    addToCart(cart, { productId: product.productId, name: product.name, price: product.price, stockQuantity: product.stockQuantity }, Number(quantity));
    req.session.cart = cart;
    res.status(201).json({ success: true, data: { cart } });
  } catch (err) { next(err); }
});

router.put('/api/cart/items/:productId', requireAuth, requireRole('Cashier'), async (req, res, next) => {
  try {
    const cart = ensureCart(req);
    updateCartItemQuantity(cart, req.params.productId, Number(req.body.quantity));
    req.session.cart = cart;
    res.json({ success: true, data: { cart } });
  } catch (err) { next(err); }
});

router.delete('/api/cart/items/:productId', requireAuth, requireRole('Cashier'), async (req, res, next) => {
  try {
    const cart = ensureCart(req);
    removeFromCart(cart, req.params.productId);
    req.session.cart = cart;
    res.json({ success: true, data: { cart } });
  } catch (err) { next(err); }
});

router.delete('/api/cart', requireAuth, requireRole('Cashier'), async (req, res, next) => {
  try {
    req.session.cart = clearCart();
    res.json({ success: true, data: { cart: req.session.cart } });
  } catch (err) { next(err); }
});

router.post('/api/cart/discount', requireAuth, requireRole('Cashier'), async (req, res, next) => {
  try {
    const cart = ensureCart(req);
    const { productId, percent, fixedAmount } = req.body;
    if (fixedAmount !== undefined) {
      applySaleDiscount(cart, Number(fixedAmount));
    } else if (productId !== undefined && percent !== undefined) {
      applyItemDiscount(cart, productId, Number(percent));
    } else {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Provide { productId, percent } or { fixedAmount }' } });
    }
    req.session.cart = cart;
    res.json({ success: true, data: { cart } });
  } catch (err) { next(err); }
});

router.get('/api/cart', requireAuth, requireRole('Cashier'), async (req, res, next) => {
  try {
    const cart = ensureCart(req);
    const taxRate = await getTaxRate();
    const totals = calculateTotals(cart, taxRate);
    res.json({ success: true, data: { cart, totals, taxRate } });
  } catch (err) { next(err); }
});

router.post('/api/sales/checkout', requireAuth, async (req, res, next) => {
  try {
    let cart;
    const taxRate = await getTaxRate();

    // Accept cart from request body (frontend-managed) or session
    if (req.body.cart && req.body.cart.items && req.body.cart.items.length > 0) {
      // Build a proper cart from the frontend payload
      cart = { items: [], saleDiscount: req.body.cart.saleDiscount || 0, customerId: req.body.cart.customerId || null };
      for (const item of req.body.cart.items) {
        const product = await getProduct(item.productId);
        cart.items.push({
          productId: product._id || product.productId,
          name: product.name,
          unitPrice: product.price,
          quantity: item.quantity,
          discountPercent: item.discountPercent || 0,
          lineTotal: Math.round(product.price * item.quantity * (1 - (item.discountPercent || 0) / 100) * 100) / 100
        });
      }
    } else {
      cart = ensureCart(req);
    }

    if (!cart.items || cart.items.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Cart is empty' } });
    }

    const customerId = cart.customerId || null;
    const sale = await checkout(cart, taxRate, req.user.userId, customerId);

    // Process payments from body
    if (req.body.payments && req.body.payments.length > 0) {
      const { processCashPayment, processMTNMoMoPayment, processCardPayment } = require('../payment/paymentService');
      const Payment = require('../../models/Payment');
      for (const p of req.body.payments) {
        if (p.method === 'Cash') {
          await processCashPayment(sale._id || sale.saleId, p.amount, sale.grandTotal);
        } else if (p.method === 'MTN_MOMO') {
          await processMTNMoMoPayment(sale._id || sale.saleId, p.amount, p.momoRef || '');
        } else if (p.method === 'Card') {
          await processCardPayment(sale._id || sale.saleId, p.amount, p.cardType || 'Visa', p.lastFour || '');
        } else if (p.method === 'Paystack') {
          // Payment will be recorded after Paystack confirms — create a pending record
          await Payment.create({
            saleId: sale._id || sale.saleId,
            paymentMethod: 'Paystack',
            amountPaid: p.amount,
            changeGiven: 0,
            transactionReference: p.reference || 'pending'
          });
        }
      }
    }

    if (customerId) {
      try { await addLoyaltyPoints(customerId, sale.grandTotal); } catch (_) {}
    }

    logEvent('SALE_COMPLETED', req.user.userId, { saleId: sale.saleId, grandTotal: sale.grandTotal });
    req.session.cart = clearCart();
    res.status(201).json({ success: true, data: { sale } });
  } catch (err) { next(err); }
});

router.get('/api/sales/:id', requireAuth, async (req, res, next) => {
  try {
    const sale = await getSale(req.params.id);
    res.json({ success: true, data: { sale } });
  } catch (err) { next(err); }
});

module.exports = router;
