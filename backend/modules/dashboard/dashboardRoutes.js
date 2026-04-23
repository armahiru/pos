/**
 * Dashboard API — aggregated stats for the homepage.
 */
const express = require('express');
const router = express.Router();
const Sale = require('../../models/Sale');
const Product = require('../../models/Product');
const Customer = require('../../models/Customer');
const Payment = require('../../models/Payment');
const requireAuth = require('../../middleware/requireAuth');

router.get('/api/dashboard', requireAuth, async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Today's sales
    const todaySales = await Sale.find({ saleDate: { $gte: today, $lt: tomorrow } });
    const todayRevenue = todaySales.reduce((s, sale) => s + sale.grandTotal, 0);
    const todayTransactions = todaySales.length;
    const todayTax = todaySales.reduce((s, sale) => s + sale.taxAmount, 0);

    // This week (last 7 days)
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 6);
    const weekSales = await Sale.find({ saleDate: { $gte: weekAgo, $lt: tomorrow } });
    const weekRevenue = weekSales.reduce((s, sale) => s + sale.grandTotal, 0);

    // Daily revenue for last 7 days (for chart)
    const dailyRevenue = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const daySales = weekSales.filter(s => s.saleDate >= d && s.saleDate < next);
      dailyRevenue.push({
        date: d.toISOString().split('T')[0],
        label: d.toLocaleDateString('en', { weekday: 'short' }),
        revenue: daySales.reduce((s, sale) => s + sale.grandTotal, 0),
        transactions: daySales.length
      });
    }

    // Top selling products (by quantity, last 30 days)
    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 30);
    const monthSales = await Sale.find({ saleDate: { $gte: monthAgo } });
    const productMap = {};
    monthSales.forEach(sale => {
      sale.items.forEach(item => {
        if (!productMap[item.name]) productMap[item.name] = { name: item.name, qty: 0, revenue: 0 };
        productMap[item.name].qty += item.quantity;
        productMap[item.name].revenue += item.lineTotal;
      });
    });
    const topProducts = Object.values(productMap).sort((a, b) => b.qty - a.qty).slice(0, 5);

    // Low stock alerts
    const lowStock = await Product.find({
      isActive: true,
      $expr: { $lte: ['$stockQuantity', '$lowStockThreshold'] }
    }).select('name stockQuantity lowStockThreshold').limit(5);

    // Recent transactions (last 5)
    const recentSales = await Sale.find().sort({ saleDate: -1 }).limit(5);
    const recent = recentSales.map(s => ({
      _id: s._id,
      date: s.saleDate,
      items: s.items.length,
      grandTotal: s.grandTotal
    }));

    // Payment method breakdown (today)
    const todayPayments = await Payment.find({
      paymentDate: { $gte: today, $lt: tomorrow }
    });
    const methodBreakdown = {};
    todayPayments.forEach(p => {
      const m = p.paymentMethod || 'Unknown';
      if (!methodBreakdown[m]) methodBreakdown[m] = 0;
      methodBreakdown[m] += p.amountPaid;
    });

    // Total counts
    const totalProducts = await Product.countDocuments({ isActive: true });
    const totalCustomers = await Customer.countDocuments();

    res.json({
      success: true,
      data: {
        today: { revenue: todayRevenue, transactions: todayTransactions, tax: todayTax },
        week: { revenue: weekRevenue },
        dailyRevenue,
        topProducts,
        lowStock,
        recentSales: recent,
        paymentMethods: methodBreakdown,
        counts: { products: totalProducts, customers: totalCustomers }
      }
    });
  } catch (err) { next(err); }
});

module.exports = router;
