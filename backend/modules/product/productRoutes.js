/**
 * Product module Express routes.
 * Validates: Requirements 3.1, 3.3, 3.4, 4.1, 4.2, 26.3
 */
const express = require('express');
const router = express.Router();

const {
  createProduct,
  updateProduct,
  deactivateProduct,
  getProduct,
  listProducts,
  searchProducts,
  lookupBarcode
} = require('./productService');
const { logEvent } = require('../logger/loggerService');
const requireAuth = require('../../middleware/requireAuth');
const { requireRole } = require('../../middleware/requireRole');

// GET /api/products — list or search products (All authenticated roles)
router.get('/api/products', requireAuth, async (req, res, next) => {
  try {
    const { search } = req.query;
    const products = search ? await searchProducts(search) : await listProducts();
    res.json({ success: true, data: { products } });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/barcode/:code — lookup by barcode (All authenticated roles)
// NOTE: This must be defined BEFORE /api/products/:id to avoid "barcode" matching as :id
router.get('/api/products/barcode/:code', requireAuth, async (req, res, next) => {
  try {
    const product = await lookupBarcode(req.params.code);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Product not found for this barcode' }
      });
    }
    res.json({ success: true, data: { product } });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:id — get product by ID (All authenticated roles)
router.get('/api/products/:id', requireAuth, async (req, res, next) => {
  try {
    const product = await getProduct(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Product not found' }
      });
    }
    res.json({ success: true, data: { product } });
  } catch (err) {
    next(err);
  }
});

// POST /api/products — create product (Manager, Admin)
router.post('/api/products', requireAuth, requireRole('Manager'), async (req, res, next) => {
  try {
    const product = await createProduct(req.body);
    logEvent('PRODUCT_CREATED', req.user.userId, { productId: product.productId, name: product.name });
    res.status(201).json({ success: true, data: { product } });
  } catch (err) {
    next(err);
  }
});

// PUT /api/products/:id — update product (Manager, Admin)
router.put('/api/products/:id', requireAuth, requireRole('Manager'), async (req, res, next) => {
  try {
    const product = await updateProduct(req.params.id, req.body);
    logEvent('PRODUCT_UPDATED', req.user.userId, { productId: product.productId, name: product.name });
    res.json({ success: true, data: { product } });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/products/:id — soft-delete product (Manager, Admin)
router.delete('/api/products/:id', requireAuth, requireRole('Manager'), async (req, res, next) => {
  try {
    const id = req.params.id;
    await deactivateProduct(id);
    logEvent('PRODUCT_DELETED', req.user.userId, { productId: id });
    res.json({ success: true, message: 'Product deactivated' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
