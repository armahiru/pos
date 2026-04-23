/**
 * Payment processing service — MongoDB/Mongoose version.
 */
const Payment = require('../../models/Payment');
const AppError = require('../../utils/AppError');

async function processCashPayment(saleId, amountTendered, grandTotal) {
  if (amountTendered < grandTotal) {
    throw new AppError(`Insufficient amount. Required: ${grandTotal}, received: ${amountTendered}`, 400, 'PAYMENT_ERROR');
  }
  const changeDue = parseFloat((amountTendered - grandTotal).toFixed(2));

  const payment = await Payment.create({
    saleId, paymentMethod: 'Cash', amountPaid: amountTendered, changeGiven: changeDue
  });

  return {
    payment: { paymentId: payment._id, saleId, method: 'Cash', amountPaid: amountTendered, changeGiven: changeDue },
    changeDue
  };
}

async function processMTNMoMoPayment(saleId, amount, momoTransactionRef) {
  if (!momoTransactionRef) {
    throw new AppError('Transaction reference is required for MTN MoMo', 400, 'VALIDATION_ERROR');
  }
  const payment = await Payment.create({
    saleId, paymentMethod: 'MTN_MoMo', amountPaid: amount, changeGiven: 0, transactionReference: momoTransactionRef
  });
  return { paymentId: payment._id, saleId, method: 'MTN_MoMo', amountPaid: amount, changeGiven: 0, transactionReference: momoTransactionRef };
}

async function processCardPayment(saleId, amount, cardType, lastFour) {
  if (!cardType || !lastFour) {
    throw new AppError('Card type and last four digits required', 400, 'VALIDATION_ERROR');
  }
  const payment = await Payment.create({
    saleId, paymentMethod: 'Card', amountPaid: amount, changeGiven: 0, transactionReference: cardType, cardLastFour: lastFour
  });
  return { paymentId: payment._id, saleId, method: 'Card', amountPaid: amount, changeGiven: 0, cardType, cardLastFour: lastFour };
}

async function processSplitPayment(saleId, paymentEntries, grandTotal) {
  if (!paymentEntries || paymentEntries.length === 0) {
    throw new AppError('At least one payment entry is required', 400, 'VALIDATION_ERROR');
  }
  const totalPaid = paymentEntries.reduce((sum, e) => sum + e.amount, 0);
  if (totalPaid < grandTotal) {
    throw new AppError(`Combined payments (${totalPaid.toFixed(2)}) less than total (${grandTotal.toFixed(2)})`, 400, 'PAYMENT_ERROR');
  }

  const changeDue = parseFloat((totalPaid - grandTotal).toFixed(2));
  const payments = [];
  let remaining = grandTotal;

  for (const entry of paymentEntries) {
    const isLast = entry === paymentEntries[paymentEntries.length - 1];
    const payment = await Payment.create({
      saleId,
      paymentMethod: entry.method,
      amountPaid: entry.amount,
      changeGiven: isLast ? changeDue : 0,
      transactionReference: entry.transactionRef || null,
      cardLastFour: entry.cardLastFour || null
    });
    remaining = Math.max(0, parseFloat((remaining - entry.amount).toFixed(2)));
    payments.push({
      paymentId: payment._id, saleId, method: entry.method,
      amountPaid: entry.amount, changeGiven: isLast ? changeDue : 0, remainingBalance: remaining
    });
  }
  return { payments, changeDue };
}

async function getPaymentsBySale(saleId) {
  const payments = await Payment.find({ saleId }).sort({ paymentDate: 1 });
  return payments.map(p => ({
    paymentId: p._id, saleId: p.saleId, method: p.paymentMethod,
    amountPaid: p.amountPaid, changeGiven: p.changeGiven,
    transactionReference: p.transactionReference, cardLastFour: p.cardLastFour, paymentDate: p.paymentDate
  }));
}

module.exports = { processCashPayment, processMTNMoMoPayment, processCardPayment, processSplitPayment, getPaymentsBySale };
