/**
 * Customer module Express routes.
 * Validates: Requirements 15.1, 15.3, 15.4, 16.2
 */
const express = require('express');
const router = express.Router();

const {
  createCustomer,
  updateCustomer,
  getCustomer,
  searchCustomers,
  addLoyaltyPoints,
  redeemLoyaltyPoints
} = require('./customerService');
const requireAuth = require('../../middleware/requireAuth');
const { requireRole } = require('../../middleware/requireRole');

// POST /api/customers — create customer (Cashier, Manager, Admin)
router.post('/api/customers', requireAuth, requireRole('Cashier'), async (req, res, next) => {
  try {
    const customer = await createCustomer(req.body);
    res.status(201).json({ success: true, data: { customer } });
  } catch (err) {
    next(err);
  }
});

// PUT /api/customers/:id — update customer (Manager, Admin)
router.put('/api/customers/:id', requireAuth, requireRole('Manager'), async (req, res, next) => {
  try {
    const customer = await updateCustomer(req.params.id, req.body);
    res.json({ success: true, data: { customer } });
  } catch (err) {
    next(err);
  }
});

// GET /api/customers — search customers (All authenticated)
router.get('/api/customers', requireAuth, async (req, res, next) => {
  try {
    const customers = await searchCustomers(req.query.q || '');
    res.json({ success: true, data: { customers } });
  } catch (err) {
    next(err);
  }
});

// GET /api/customers/:id — get customer details (All authenticated)
router.get('/api/customers/:id', requireAuth, async (req, res, next) => {
  try {
    const customer = await getCustomer(req.params.id);
    res.json({ success: true, data: { customer } });
  } catch (err) {
    next(err);
  }
});

// POST /api/customers/:id/loyalty/redeem — redeem loyalty points (Cashier, Manager)
router.post('/api/customers/:id/loyalty/redeem', requireAuth, requireRole('Cashier'), async (req, res, next) => {
  try {
    const { points } = req.body;

    if (!points || points <= 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Points must be a positive number' }
      });
    }

    const newBalance = await redeemLoyaltyPoints(req.params.id, points);
    res.json({ success: true, data: { loyaltyPoints: newBalance } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
