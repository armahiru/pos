/**
 * Report engine service — MongoDB/Mongoose version.
 */
const Sale = require('../../models/Sale');
const Payment = require('../../models/Payment');
const Product = require('../../models/Product');
const InventoryLog = require('../../models/InventoryLog');
const { Parser } = require('json2csv');

async function dailySalesReport(startDate, endDate) {
  const end = endDate || startDate;
  const start = new Date(startDate);
  const finish = new Date(end);
  finish.setHours(23, 59, 59, 999);

  const sales = await Sale.find({ saleDate: { $gte: start, $lte: finish } });

  const totalTransactions = sales.length;
  const totalRevenue = sales.reduce((s, sale) => s + sale.grandTotal, 0);
  const totalTax = sales.reduce((s, sale) => s + sale.taxAmount, 0);
  const totalDiscounts = sales.reduce((s, sale) => s + sale.discountAmount, 0);

  const saleIds = sales.map(s => s._id);
  const payments = await Payment.find({ saleId: { $in: saleIds } });

  const breakdown = {};
  payments.forEach(p => {
    breakdown[p.paymentMethod] = (breakdown[p.paymentMethod] || 0) + p.amountPaid;
  });

  return {
    startDate, endDate: end, totalTransactions,
    totalRevenue: parseFloat(totalRevenue.toFixed(2)),
    totalTax: parseFloat(totalTax.toFixed(2)),
    totalDiscounts: parseFloat(totalDiscounts.toFixed(2)),
    paymentBreakdown: Object.entries(breakdown).map(([method, total]) => ({ method, total: parseFloat(total.toFixed(2)) }))
  };
}

async function productSalesReport(startDate, endDate, category) {
  const start = new Date(startDate);
  const finish = new Date(endDate);
  finish.setHours(23, 59, 59, 999);

  const sales = await Sale.find({ saleDate: { $gte: start, $lte: finish } });
  const productMap = {};

  for (const sale of sales) {
    for (const item of sale.items) {
      const key = item.productId.toString();
      if (!productMap[key]) {
        productMap[key] = { productId: item.productId, name: item.name, totalQuantity: 0, totalRevenue: 0 };
      }
      productMap[key].totalQuantity += item.quantity;
      productMap[key].totalRevenue += item.lineTotal;
    }
  }

  let results = Object.values(productMap);

  if (category) {
    const products = await Product.find({ category });
    const catIds = new Set(products.map(p => p._id.toString()));
    results = results.filter(r => catIds.has(r.productId.toString()));
    results.forEach(r => { r.category = category; });
  }

  results.sort((a, b) => b.totalQuantity - a.totalQuantity);
  return results.map(r => ({ ...r, totalRevenue: parseFloat(r.totalRevenue.toFixed(2)) }));
}

async function cashierPerformanceReport(startDate, endDate) {
  const start = new Date(startDate);
  const finish = new Date(endDate);
  finish.setHours(23, 59, 59, 999);

  const sales = await Sale.find({ saleDate: { $gte: start, $lte: finish } }).populate('cashierUserId', 'fullName');
  const cashierMap = {};

  for (const sale of sales) {
    const key = sale.cashierUserId._id.toString();
    if (!cashierMap[key]) {
      cashierMap[key] = { userId: sale.cashierUserId._id, fullName: sale.cashierUserId.fullName, transactionCount: 0, totalRevenue: 0 };
    }
    cashierMap[key].transactionCount++;
    cashierMap[key].totalRevenue += sale.grandTotal;
  }

  return Object.values(cashierMap).map(c => ({
    ...c,
    totalRevenue: parseFloat(c.totalRevenue.toFixed(2)),
    averageTransactionValue: c.transactionCount > 0 ? parseFloat((c.totalRevenue / c.transactionCount).toFixed(2)) : 0
  })).sort((a, b) => b.totalRevenue - a.totalRevenue);
}

async function profitReport(startDate, endDate) {
  const start = new Date(startDate);
  const finish = new Date(endDate);
  finish.setHours(23, 59, 59, 999);

  const sales = await Sale.find({ saleDate: { $gte: start, $lte: finish } });
  let totalRevenue = 0;
  let totalCost = 0;
  const categoryMap = {};

  for (const sale of sales) {
    totalRevenue += sale.grandTotal;
    for (const item of sale.items) {
      const product = await Product.findById(item.productId);
      const cost = product ? product.costPrice * item.quantity : 0;
      totalCost += cost;

      const cat = product ? product.category : 'Unknown';
      if (!categoryMap[cat]) categoryMap[cat] = { category: cat, revenue: 0, cost: 0 };
      categoryMap[cat].revenue += item.lineTotal;
      categoryMap[cat].cost += cost;
    }
  }

  return {
    startDate, endDate,
    totalRevenue: parseFloat(totalRevenue.toFixed(2)),
    totalCost: parseFloat(totalCost.toFixed(2)),
    grossProfit: parseFloat((totalRevenue - totalCost).toFixed(2)),
    byCategory: Object.values(categoryMap).map(c => ({
      ...c, revenue: parseFloat(c.revenue.toFixed(2)), cost: parseFloat(c.cost.toFixed(2)),
      profit: parseFloat((c.revenue - c.cost).toFixed(2))
    }))
  };
}

async function inventoryReport(category) {
  const query = { isActive: true };
  if (category) query.category = category;

  const products = await Product.find(query).sort({ stockQuantity: 1 });
  return products.map(p => ({
    productId: p._id, name: p.name, category: p.category,
    stockQuantity: p.stockQuantity, price: p.price, costPrice: p.costPrice,
    lowStock: p.stockQuantity <= p.lowStockThreshold, lastRestocked: null
  }));
}

function exportToCSV(data, columns) {
  if (!data || data.length === 0) return columns.join(',') + '\n';
  const parser = new Parser({ fields: columns });
  return parser.parse(data);
}

module.exports = { dailySalesReport, productSalesReport, cashierPerformanceReport, profitReport, inventoryReport, exportToCSV };
