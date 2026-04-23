/**
 * Report module Express routes.
 * Validates: Requirements 19.1, 20.1, 21.1, 22.1, 14.1
 */
const express = require('express');
const router = express.Router();

const {
  dailySalesReport,
  productSalesReport,
  cashierPerformanceReport,
  profitReport,
  inventoryReport,
  exportToCSV
} = require('./reportService');
const requireAuth = require('../../middleware/requireAuth');
const { requireRole } = require('../../middleware/requireRole');

// GET /api/reports/daily-sales?startDate=&endDate=&format=csv
router.get('/api/reports/daily-sales', requireAuth, requireRole('Manager'), async (req, res, next) => {
  try {
    const { startDate, endDate, format } = req.query;
    if (!startDate) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'startDate is required' } });
    }
    const report = await dailySalesReport(startDate, endDate);

    if (format === 'csv') {
      const csv = exportToCSV([report], ['startDate', 'endDate', 'totalTransactions', 'totalRevenue', 'totalTax', 'totalDiscounts']);
      res.setHeader('Content-Type', 'text/csv');
      return res.send(csv);
    }
    res.json({ success: true, data: { report } });
  } catch (err) { next(err); }
});

// GET /api/reports/product-sales?startDate=&endDate=&category=&format=csv
router.get('/api/reports/product-sales', requireAuth, requireRole('Manager'), async (req, res, next) => {
  try {
    const { startDate, endDate, category, format } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'startDate and endDate are required' } });
    }
    const report = await productSalesReport(startDate, endDate, category);

    if (format === 'csv') {
      const csv = exportToCSV(report, ['productId', 'name', 'category', 'totalQuantity', 'totalRevenue']);
      res.setHeader('Content-Type', 'text/csv');
      return res.send(csv);
    }
    res.json({ success: true, data: { report } });
  } catch (err) { next(err); }
});

// GET /api/reports/cashier-performance?startDate=&endDate=&format=csv
router.get('/api/reports/cashier-performance', requireAuth, requireRole('Manager'), async (req, res, next) => {
  try {
    const { startDate, endDate, format } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'startDate and endDate are required' } });
    }
    const report = await cashierPerformanceReport(startDate, endDate);

    if (format === 'csv') {
      const csv = exportToCSV(report, ['userId', 'fullName', 'transactionCount', 'totalRevenue', 'averageTransactionValue']);
      res.setHeader('Content-Type', 'text/csv');
      return res.send(csv);
    }
    res.json({ success: true, data: { report } });
  } catch (err) { next(err); }
});

// GET /api/reports/profit?startDate=&endDate=&format=csv
router.get('/api/reports/profit', requireAuth, requireRole('Manager'), async (req, res, next) => {
  try {
    const { startDate, endDate, format } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'startDate and endDate are required' } });
    }
    const report = await profitReport(startDate, endDate);

    if (format === 'csv') {
      const csv = exportToCSV(report.byCategory, ['category', 'revenue', 'cost', 'profit']);
      res.setHeader('Content-Type', 'text/csv');
      return res.send(csv);
    }
    res.json({ success: true, data: { report } });
  } catch (err) { next(err); }
});

// GET /api/reports/inventory?category=&format=csv
router.get('/api/reports/inventory', requireAuth, requireRole('Manager'), async (req, res, next) => {
  try {
    const { category, format } = req.query;
    const report = await inventoryReport(category);

    if (format === 'csv') {
      const csv = exportToCSV(report, ['productId', 'name', 'category', 'stockQuantity', 'price', 'costPrice', 'lowStock', 'lastRestocked']);
      res.setHeader('Content-Type', 'text/csv');
      return res.send(csv);
    }
    res.json({ success: true, data: { report } });
  } catch (err) { next(err); }
});

module.exports = router;
