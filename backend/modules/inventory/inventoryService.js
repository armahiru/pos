/**
 * Inventory management service — MongoDB/Mongoose version.
 */
const Product = require('../../models/Product');
const InventoryLog = require('../../models/InventoryLog');
const AppError = require('../../utils/AppError');

async function deductStock(productId, quantity) {
  const product = await Product.findById(productId);
  if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND');
  if (product.stockQuantity < quantity) {
    throw new AppError(`Insufficient stock. Available: ${product.stockQuantity}`, 400, 'INSUFFICIENT_STOCK');
  }
  product.stockQuantity -= quantity;
  await product.save();
}

async function adjustStock(productId, quantity, reason, userId) {
  const product = await Product.findById(productId);
  if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND');

  const newQty = product.stockQuantity + quantity;
  if (newQty < 0) {
    throw new AppError('Stock cannot go below zero', 400, 'VALIDATION_ERROR');
  }

  product.stockQuantity = newQty;
  await product.save();

  const log = await InventoryLog.create({
    productId,
    adjustmentType: quantity > 0 ? 'Restock' : 'Manual',
    quantityChanged: quantity,
    reason: reason || '',
    userId
  });

  return {
    logId: log._id,
    productId,
    adjustmentType: log.adjustmentType,
    quantityChanged: quantity,
    reason,
    newStockQuantity: product.stockQuantity
  };
}

async function checkLowStock(productId) {
  const product = await Product.findById(productId);
  if (!product || !product.isActive) return null;
  if (product.stockQuantity <= product.lowStockThreshold) {
    return {
      productId: product._id,
      productName: product.name,
      currentStock: product.stockQuantity,
      threshold: product.lowStockThreshold
    };
  }
  return null;
}

async function getLowStockAlerts() {
  const products = await Product.find({ isActive: true });
  return products
    .filter(p => p.stockQuantity <= p.lowStockThreshold)
    .map(p => ({
      productId: p._id,
      productName: p.name,
      currentStock: p.stockQuantity,
      threshold: p.lowStockThreshold
    }));
}

async function setThreshold(productId, threshold) {
  const product = await Product.findByIdAndUpdate(productId, { lowStockThreshold: threshold }, { new: true });
  if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND');
  return { productId: product._id, lowStockThreshold: product.lowStockThreshold };
}

module.exports = { deductStock, adjustStock, checkLowStock, getLowStockAlerts, setThreshold };
