/**
 * Inventory module Express routes.
 * Validates: Requirements 12.3, 13.2, 26.4
 */
const express = require('express');
const router = express.Router();

const { adjustStock, getLowStockAlerts } = require('./inventoryService');
const { logEvent } = require('../logger/loggerService');
const requireAuth = require('../../middleware/requireAuth');
const { requireRole } = require('../../middleware/requireRole');
const Product = require('../../models/Product');

// POST /api/inventory/adjust — manual stock adjustment (Manager, Admin)
router.post('/api/inventory/adjust', requireAuth, requireRole('Manager'), async (req, res, next) => {
  try {
    const { productId, quantity, reason } = req.body;

    if (!productId || quantity === undefined || quantity === null) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'productId and quantity are required' }
      });
    }

    const logEntry = await adjustStock(productId, Number(quantity), reason, req.user.userId);
    logEvent('INVENTORY_ADJUSTED', req.user.userId, {
      productId: logEntry.productId,
      quantityChanged: logEntry.quantityChanged,
      reason: logEntry.reason
    });

    res.json({ success: true, data: { logEntry } });
  } catch (err) {
    next(err);
  }
});

// GET /api/inventory/alerts — get low-stock alerts (Manager, Admin)
router.get('/api/inventory/alerts', requireAuth, requireRole('Manager'), async (req, res, next) => {
  try {
    const alerts = await getLowStockAlerts();
    res.json({ success: true, data: { alerts } });
  } catch (err) {
    next(err);
  }
});

// PUT /api/products/:id/threshold — set low-stock threshold (Manager, Admin)
router.put('/api/products/:id/threshold', requireAuth, requireRole('Manager'), async (req, res, next) => {
  try {
    const productId = req.params.id;
    const { threshold } = req.body;

    if (threshold === undefined || threshold === null || !Number.isInteger(Number(threshold)) || Number(threshold) < 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'threshold must be a non-negative integer' }
      });
    }

    const product = await Product.findOneAndUpdate(
      { _id: productId, isActive: true },
      { lowStockThreshold: Number(threshold) },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Product not found' }
      });
    }

    res.json({ success: true, data: { productId, threshold: Number(threshold) } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
