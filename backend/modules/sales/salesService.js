/**
 * Sales transaction service — MongoDB/Mongoose version.
 */
const Sale = require('../../models/Sale');
const Payment = require('../../models/Payment');
const { calculateTotals } = require('./cartService');
const { deductStock } = require('../inventory/inventoryService');
const AppError = require('../../utils/AppError');

async function checkout(cart, taxRate, cashierUserId, customerId = null) {
  if (!cart.items || cart.items.length === 0) {
    throw new AppError('Cart is empty', 400, 'VALIDATION_ERROR');
  }

  const { subtotal, discountAmount, taxAmount, grandTotal } = calculateTotals(cart, taxRate);

  // Deduct stock for each item
  for (const item of cart.items) {
    await deductStock(item.productId, item.quantity);
  }

  const sale = await Sale.create({
    cashierUserId,
    customerId: customerId || null,
    saleDate: new Date(),
    items: cart.items.map(i => ({
      productId: i.productId,
      name: i.name,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      discountPercent: i.discountPercent,
      lineTotal: i.lineTotal
    })),
    subtotal,
    discountAmount,
    taxRate,
    taxAmount,
    grandTotal
  });

  return {
    _id: sale._id,
    saleId: sale._id,
    cashierUserId,
    customerId,
    saleDate: sale.saleDate,
    items: sale.items,
    subtotal,
    discountAmount,
    taxRate,
    taxAmount,
    grandTotal
  };
}

async function getSale(saleId) {
  const sale = await Sale.findById(saleId);
  if (!sale) throw new AppError('Sale not found', 404, 'NOT_FOUND');

  const payments = await Payment.find({ saleId: sale._id }).sort({ paymentDate: 1 });

  return {
    saleId: sale._id,
    cashierUserId: sale.cashierUserId,
    customerId: sale.customerId,
    saleDate: sale.saleDate,
    subtotal: sale.subtotal,
    discountAmount: sale.discountAmount,
    taxRate: sale.taxRate,
    taxAmount: sale.taxAmount,
    grandTotal: sale.grandTotal,
    items: sale.items.map(i => ({
      productId: i.productId,
      name: i.name,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      discountPercent: i.discountPercent,
      lineTotal: i.lineTotal
    })),
    payments: payments.map(p => ({
      paymentId: p._id,
      method: p.paymentMethod,
      amountPaid: p.amountPaid,
      changeGiven: p.changeGiven,
      transactionReference: p.transactionReference,
      cardLastFour: p.cardLastFour,
      paymentDate: p.paymentDate
    }))
  };
}

module.exports = { checkout, getSale };
