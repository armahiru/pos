/**
 * Payment module Express routes.
 * Validates: Requirements 9.1, 10.1, 11.1
 */
const express = require('express');
const router = express.Router();

const {
  processCashPayment,
  processMTNMoMoPayment,
  processCardPayment,
  processSplitPayment,
  getPaymentsBySale
} = require('./paymentService');
const requireAuth = require('../../middleware/requireAuth');
const { requireRole } = require('../../middleware/requireRole');

// POST /api/payments — record a single payment (Cashier, Manager)
router.post('/api/payments', requireAuth, requireRole('Cashier'), async (req, res, next) => {
  try {
    const { saleId, method, amountTendered, amount, grandTotal, transactionRef, cardType, cardLastFour } = req.body;

    if (!saleId || !method) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'saleId and method are required' }
      });
    }

    let result;

    switch (method) {
      case 'Cash':
        result = await processCashPayment(saleId, amountTendered, grandTotal);
        break;
      case 'MTN_MoMo':
        result = await processMTNMoMoPayment(saleId, amount, transactionRef);
        break;
      case 'Card':
        result = await processCardPayment(saleId, amount, cardType, cardLastFour);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: `Invalid payment method: ${method}. Use Cash, Card, or MTN_MoMo` }
        });
    }

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// POST /api/payments/split — split payment across multiple methods (Cashier, Manager)
router.post('/api/payments/split', requireAuth, requireRole('Cashier'), async (req, res, next) => {
  try {
    const { saleId, payments, grandTotal } = req.body;

    if (!saleId || !payments || !grandTotal) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'saleId, payments array, and grandTotal are required' }
      });
    }

    const result = await processSplitPayment(saleId, payments, grandTotal);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/payments/sale/:saleId — get all payments for a sale (All authenticated)
router.get('/api/payments/sale/:saleId', requireAuth, async (req, res, next) => {
  try {
    const payments = await getPaymentsBySale(req.params.saleId);
    res.json({ success: true, data: { payments } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
