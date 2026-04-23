/**
 * Receipt module Express routes — MongoDB version.
 */
const express = require('express');
const router = express.Router();

const { formatReceipt, generatePDF } = require('./receiptService');
const { getSale } = require('../sales/salesService');
const User = require('../../models/User');
const Customer = require('../../models/Customer');
const requireAuth = require('../../middleware/requireAuth');

const STORE_CONFIG = { storeName: 'POS Store', storeAddress: '123 Main Street' };

async function buildReceiptData(saleId) {
  const sale = await getSale(saleId);

  const user = await User.findById(sale.cashierUserId);
  sale.cashierName = user ? user.fullName : 'N/A';

  if (sale.customerId) {
    const customer = await Customer.findById(sale.customerId);
    sale.customerName = customer ? customer.name : null;
  }

  return sale;
}

router.get('/api/receipts/:saleId', requireAuth, async (req, res, next) => {
  try {
    const sale = await buildReceiptData(req.params.saleId);
    const receiptText = formatReceipt(sale, STORE_CONFIG);
    res.json({ success: true, data: { receipt: receiptText } });
  } catch (err) { next(err); }
});

router.get('/api/receipts/:saleId/pdf', requireAuth, async (req, res, next) => {
  try {
    const sale = await buildReceiptData(req.params.saleId);
    const receiptText = formatReceipt(sale, STORE_CONFIG);
    const pdfBuffer = await generatePDF(receiptText);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=receipt-${sale.saleId}.pdf`);
    res.send(pdfBuffer);
  } catch (err) { next(err); }
});

module.exports = router;
