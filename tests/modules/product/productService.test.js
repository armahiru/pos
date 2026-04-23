/**
 * Unit tests for productService CRUD operations.
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
 */
const { expect } = require('chai');
const { setupTestDB, teardownTestDB, getTestPool, cleanAllTables } = require('../../helpers/db-setup');
const { sampleProducts } = require('../../helpers/fixtures');

// We need to override the pool used by productService with the test pool.
let productService;
let pool;

describe('productService', function () {
  this.timeout(30000);

  before(async function () {
    pool = await setupTestDB();
    // Override the database module cache so productService uses the test pool
    require.cache[require.resolve('../../../src/config/database')] = { exports: pool };
    // Clear cached productService so it picks up the test pool
    delete require.cache[require.resolve('../../../src/modules/product/productService')];
    productService = require('../../../src/modules/product/productService');
  });

  after(async function () {
    await teardownTestDB();
    // Restore original database module
    delete require.cache[require.resolve('../../../src/config/database')];
    delete require.cache[require.resolve('../../../src/modules/product/productService')];
  });

  beforeEach(async function () {
    await cleanAllTables();
  });

  describe('createProduct', function () {
    it('should create a product with all fields and auto-generate Product_ID', async function () {
      const data = sampleProducts[0];
      const product = await productService.createProduct(data);

      expect(product).to.have.property('productId').that.is.a('number');
      expect(product.name).to.equal(data.name);
      expect(product.category).to.equal(data.category);
      expect(product.price).to.equal(data.price);
      expect(product.costPrice).to.equal(data.costPrice);
      expect(product.stockQuantity).to.equal(data.stockQuantity);
      expect(product.barcode).to.equal(data.barcode);
      expect(product.supplier).to.equal(data.supplier);
      expect(product.isActive).to.be.true;
    });

    it('should create a product with minimal fields (name and price)', async function () {
      const product = await productService.createProduct({ name: 'Simple Item', price: 5.99 });

      expect(product.productId).to.be.a('number');
      expect(product.name).to.equal('Simple Item');
      expect(product.price).to.equal(5.99);
      expect(product.costPrice).to.equal(0);
      expect(product.stockQuantity).to.equal(0);
      expect(product.barcode).to.be.null;
      expect(product.supplier).to.be.null;
      expect(product.isActive).to.be.true;
    });

    it('should reject empty product name', async function () {
      try {
        await productService.createProduct({ name: '', price: 5.00 });
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err.statusCode).to.equal(400);
        expect(err.code).to.equal('VALIDATION_ERROR');
      }
    });

    it('should reject missing product name', async function () {
      try {
        await productService.createProduct({ price: 5.00 });
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err.statusCode).to.equal(400);
        expect(err.code).to.equal('VALIDATION_ERROR');
      }
    });

    it('should reject zero price', async function () {
      try {
        await productService.createProduct({ name: 'Free Item', price: 0 });
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err.statusCode).to.equal(400);
        expect(err.code).to.equal('VALIDATION_ERROR');
      }
    });

    it('should reject negative price', async function () {
      try {
        await productService.createProduct({ name: 'Bad Item', price: -5 });
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err.statusCode).to.equal(400);
        expect(err.code).to.equal('VALIDATION_ERROR');
      }
    });

    it('should reject duplicate barcode among active products', async function () {
      await productService.createProduct({ name: 'Item A', price: 10, barcode: 'DUP001' });
      try {
        await productService.createProduct({ name: 'Item B', price: 20, barcode: 'DUP001' });
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err.statusCode).to.equal(409);
        expect(err.code).to.equal('CONFLICT');
      }
    });

    it('should allow same barcode if first product is deactivated', async function () {
      const p1 = await productService.createProduct({ name: 'Item A', price: 10, barcode: 'REUSE01' });
      await productService.deactivateProduct(p1.productId);
      const p2 = await productService.createProduct({ name: 'Item B', price: 20, barcode: 'REUSE01' });
      expect(p2.barcode).to.equal('REUSE01');
    });

    it('should allow multiple products with no barcode', async function () {
      const p1 = await productService.createProduct({ name: 'No Barcode 1', price: 5 });
      const p2 = await productService.createProduct({ name: 'No Barcode 2', price: 10 });
      expect(p1.barcode).to.be.null;
      expect(p2.barcode).to.be.null;
    });
  });

  describe('updateProduct', function () {
    it('should update product fields', async function () {
      const created = await productService.createProduct(sampleProducts[0]);
      const updated = await productService.updateProduct(created.productId, {
        name: 'Updated Name',
        price: 99.99
      });

      expect(updated.name).to.equal('Updated Name');
      expect(updated.price).to.equal(99.99);
      expect(updated.category).to.equal(created.category);
    });

    it('should reject update with empty name', async function () {
      const created = await productService.createProduct(sampleProducts[0]);
      try {
        await productService.updateProduct(created.productId, { name: '  ' });
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err.statusCode).to.equal(400);
        expect(err.code).to.equal('VALIDATION_ERROR');
      }
    });

    it('should reject update with non-positive price', async function () {
      const created = await productService.createProduct(sampleProducts[0]);
      try {
        await productService.updateProduct(created.productId, { price: 0 });
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err.statusCode).to.equal(400);
        expect(err.code).to.equal('VALIDATION_ERROR');
      }
    });

    it('should reject update for non-existent product', async function () {
      try {
        await productService.updateProduct(99999, { name: 'Ghost' });
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err.statusCode).to.equal(404);
        expect(err.code).to.equal('NOT_FOUND');
      }
    });

    it('should reject duplicate barcode on update', async function () {
      await productService.createProduct({ name: 'A', price: 10, barcode: 'UPD001' });
      const b = await productService.createProduct({ name: 'B', price: 20, barcode: 'UPD002' });
      try {
        await productService.updateProduct(b.productId, { barcode: 'UPD001' });
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err.statusCode).to.equal(409);
        expect(err.code).to.equal('CONFLICT');
      }
    });

    it('should allow updating barcode to same value', async function () {
      const p = await productService.createProduct({ name: 'Same', price: 10, barcode: 'SAME01' });
      const updated = await productService.updateProduct(p.productId, { barcode: 'SAME01' });
      expect(updated.barcode).to.equal('SAME01');
    });

    it('should reject update with no fields', async function () {
      const created = await productService.createProduct(sampleProducts[0]);
      try {
        await productService.updateProduct(created.productId, {});
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err.statusCode).to.equal(400);
        expect(err.code).to.equal('VALIDATION_ERROR');
      }
    });
  });

  describe('deactivateProduct', function () {
    it('should soft-delete a product by setting Is_Active to false', async function () {
      const created = await productService.createProduct(sampleProducts[0]);
      await productService.deactivateProduct(created.productId);

      const product = await productService.getProduct(created.productId);
      expect(product).to.not.be.null;
      expect(product.isActive).to.be.false;
    });

    it('should reject deactivation of non-existent product', async function () {
      try {
        await productService.deactivateProduct(99999);
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err.statusCode).to.equal(404);
        expect(err.code).to.equal('NOT_FOUND');
      }
    });

    it('should reject deactivation of already deactivated product', async function () {
      const created = await productService.createProduct(sampleProducts[0]);
      await productService.deactivateProduct(created.productId);
      try {
        await productService.deactivateProduct(created.productId);
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err.statusCode).to.equal(404);
        expect(err.code).to.equal('NOT_FOUND');
      }
    });
  });

  describe('getProduct', function () {
    it('should return a product by ID', async function () {
      const created = await productService.createProduct(sampleProducts[0]);
      const product = await productService.getProduct(created.productId);

      expect(product).to.not.be.null;
      expect(product.productId).to.equal(created.productId);
      expect(product.name).to.equal(sampleProducts[0].name);
    });

    it('should return null for non-existent product', async function () {
      const product = await productService.getProduct(99999);
      expect(product).to.be.null;
    });
  });

  describe('searchProducts', function () {
    it('should find products by name', async function () {
      await productService.createProduct({ name: 'Apple Juice', category: 'Beverages', price: 3.50 });
      await productService.createProduct({ name: 'Orange Juice', category: 'Beverages', price: 4.00 });
      await productService.createProduct({ name: 'Bread', category: 'Bakery', price: 2.00 });

      const results = await productService.searchProducts('Juice');
      expect(results).to.have.lengthOf(2);
      expect(results.every(p => p.name.includes('Juice'))).to.be.true;
    });

    it('should find products by category', async function () {
      await productService.createProduct({ name: 'Croissant', category: 'Bakery', price: 2.50 });
      await productService.createProduct({ name: 'Baguette', category: 'Bakery', price: 3.00 });
      await productService.createProduct({ name: 'Milk', category: 'Dairy', price: 1.50 });

      const results = await productService.searchProducts('Bakery');
      expect(results).to.have.lengthOf(2);
      expect(results.every(p => p.category === 'Bakery')).to.be.true;
    });

    it('should return only active products', async function () {
      const p1 = await productService.createProduct({ name: 'Active Widget', category: 'Widgets', price: 5.00 });
      const p2 = await productService.createProduct({ name: 'Inactive Widget', category: 'Widgets', price: 6.00 });
      await productService.deactivateProduct(p2.productId);

      const results = await productService.searchProducts('Widget');
      expect(results).to.have.lengthOf(1);
      expect(results[0].productId).to.equal(p1.productId);
      expect(results[0].isActive).to.be.true;
    });

    it('should return empty array for empty query', async function () {
      await productService.createProduct({ name: 'Something', price: 5.00 });
      const results = await productService.searchProducts('');
      expect(results).to.be.an('array').that.is.empty;
    });

    it('should return empty array for no matches', async function () {
      await productService.createProduct({ name: 'Apple', price: 1.00 });
      const results = await productService.searchProducts('Zebra');
      expect(results).to.be.an('array').that.is.empty;
    });
  });

  describe('lookupBarcode', function () {
    it('should find an active product by barcode', async function () {
      const created = await productService.createProduct({ name: 'Scanned Item', price: 9.99, barcode: 'BC12345' });
      const result = await productService.lookupBarcode('BC12345');

      expect(result).to.not.be.null;
      expect(result.productId).to.equal(created.productId);
      expect(result.name).to.equal('Scanned Item');
      expect(result.barcode).to.equal('BC12345');
    });

    it('should return null for non-existent barcode', async function () {
      const result = await productService.lookupBarcode('NONEXISTENT');
      expect(result).to.be.null;
    });

    it('should return null for inactive product barcode', async function () {
      const created = await productService.createProduct({ name: 'Old Item', price: 5.00, barcode: 'OLD001' });
      await productService.deactivateProduct(created.productId);

      const result = await productService.lookupBarcode('OLD001');
      expect(result).to.be.null;
    });

    it('should return null for empty barcode', async function () {
      const result = await productService.lookupBarcode('');
      expect(result).to.be.null;
    });

    it('should return null for null barcode', async function () {
      const result = await productService.lookupBarcode(null);
      expect(result).to.be.null;
    });
  });

  describe('listProducts', function () {
    it('should return all active products', async function () {
      await productService.createProduct(sampleProducts[0]);
      await productService.createProduct(sampleProducts[1]);
      const p3 = await productService.createProduct(sampleProducts[2]);
      await productService.deactivateProduct(p3.productId);

      const products = await productService.listProducts();
      expect(products).to.have.lengthOf(2);
      expect(products.every(p => p.isActive)).to.be.true;
    });

    it('should return empty array when no active products', async function () {
      const products = await productService.listProducts();
      expect(products).to.be.an('array').that.is.empty;
    });
  });
});
