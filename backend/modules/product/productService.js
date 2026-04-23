/**
 * Product CRUD service — MongoDB/Mongoose version.
 */
const Product = require('../../models/Product');
const AppError = require('../../utils/AppError');

async function createProduct(data) {
  if (!data.name || !data.name.trim()) {
    throw new AppError('Product name is required', 400, 'VALIDATION_ERROR');
  }
  if (!data.price || data.price <= 0) {
    throw new AppError('Price must be greater than 0', 400, 'VALIDATION_ERROR');
  }

  // Auto-generate barcode if not provided
  let barcode = data.barcode || null;
  if (!barcode) {
    barcode = 'POS' + Date.now().toString().slice(-9) + Math.floor(Math.random() * 100).toString().padStart(2, '0');
  }

  try {
    const product = await Product.create({
      name: data.name.trim(),
      category: data.category || '',
      price: data.price,
      costPrice: data.costPrice || data.cost_price || 0,
      stockQuantity: data.stockQuantity || data.stock_quantity || 0,
      barcode: barcode,
      imageUrl: data.imageUrl || '',
      supplier: data.supplier || '',
      isActive: true
    });
    return formatProduct(product);
  } catch (err) {
    if (err.code === 11000) {
      throw new AppError('Barcode already exists', 409, 'CONFLICT');
    }
    throw err;
  }
}

async function updateProduct(id, data) {
  const update = {};
  if (data.name !== undefined) update.name = data.name.trim();
  if (data.category !== undefined) update.category = data.category;
  if (data.price !== undefined) {
    if (data.price <= 0) throw new AppError('Price must be greater than 0', 400, 'VALIDATION_ERROR');
    update.price = data.price;
  }
  if (data.costPrice !== undefined || data.cost_price !== undefined) update.costPrice = data.costPrice || data.cost_price;
  if (data.stockQuantity !== undefined || data.stock_quantity !== undefined) update.stockQuantity = data.stockQuantity || data.stock_quantity;
  if (data.barcode !== undefined) update.barcode = data.barcode || null;
  if (data.imageUrl !== undefined) update.imageUrl = data.imageUrl;
  if (data.supplier !== undefined) update.supplier = data.supplier;

  try {
    const product = await Product.findByIdAndUpdate(id, update, { new: true });
    if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND');
    return formatProduct(product);
  } catch (err) {
    if (err.code === 11000) throw new AppError('Barcode already exists', 409, 'CONFLICT');
    throw err;
  }
}

async function deactivateProduct(id) {
  const product = await Product.findByIdAndUpdate(id, { isActive: false }, { new: true });
  if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND');
}

async function getProduct(id) {
  const product = await Product.findById(id);
  if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND');
  return formatProduct(product);
}

async function listProducts() {
  const products = await Product.find({ isActive: true });
  return products.map(formatProduct);
}

async function searchProducts(query) {
  const regex = new RegExp(query || '', 'i');
  const products = await Product.find({
    isActive: true,
    $or: [{ name: regex }, { category: regex }]
  });
  return products.map(formatProduct);
}

async function lookupBarcode(barcode) {
  const product = await Product.findOne({ barcode, isActive: true });
  return product ? formatProduct(product) : null;
}

function formatProduct(p) {
  return {
    _id: p._id,
    productId: p._id,
    name: p.name,
    category: p.category,
    price: p.price,
    costPrice: p.costPrice,
    stockQuantity: p.stockQuantity,
    barcode: p.barcode,
    imageUrl: p.imageUrl || '',
    supplier: p.supplier,
    isActive: p.isActive,
    lowStockThreshold: p.lowStockThreshold,
    createdAt: p.createdAt
  };
}

module.exports = { createProduct, updateProduct, deactivateProduct, getProduct, listProducts, searchProducts, lookupBarcode };
