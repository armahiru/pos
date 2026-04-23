/**
 * Smoke tests for test helpers: generators and fixtures.
 * Validates that arbitraries produce data matching expected constraints.
 */
const { expect } = require('chai');
const fc = require('fast-check');
const {
  arbitraryProduct,
  arbitraryUser,
  arbitraryCustomer,
  arbitraryCartItem,
  arbitraryCart,
  arbitrarySaleTransaction,
  arbitraryPayment,
  arbitraryDiscount,
  arbitraryDateRange
} = require('./generators');
const fixtures = require('./fixtures');

describe('Test Helpers - Generators', function () {
  it('arbitraryProduct generates valid products', function () {
    fc.assert(
      fc.property(arbitraryProduct(), (product) => {
        expect(product.name).to.be.a('string').with.length.greaterThan(0);
        expect(product.price).to.be.a('number').greaterThan(0);
        expect(product.costPrice).to.be.a('number').at.least(0);
        expect(product.stockQuantity).to.be.a('number').at.least(0);
      }),
      { numRuns: 50 }
    );
  });

  it('arbitraryUser generates valid users', function () {
    fc.assert(
      fc.property(arbitraryUser(), (user) => {
        expect(user.username).to.be.a('string').with.length.greaterThan(0);
        expect(user.password).to.be.a('string').with.length.at.least(6);
        expect(user.fullName).to.be.a('string').with.length.greaterThan(0);
        expect(['Admin', 'Manager', 'Cashier']).to.include(user.role);
      }),
      { numRuns: 50 }
    );
  });

  it('arbitraryCustomer generates valid customers', function () {
    fc.assert(
      fc.property(arbitraryCustomer(), (customer) => {
        expect(customer.name).to.be.a('string').with.length.greaterThan(0);
        expect(customer.phone).to.match(/^0[0-9]{9}$/);
        expect(customer.email).to.match(/^[a-z]+@[a-z]+\.[a-z]+$/);
      }),
      { numRuns: 50 }
    );
  });

  it('arbitraryCartItem generates valid cart items', function () {
    fc.assert(
      fc.property(arbitraryCartItem(), (item) => {
        expect(item.productId).to.be.a('number').at.least(1);
        expect(item.unitPrice).to.be.a('number').greaterThan(0);
        expect(item.quantity).to.be.a('number').at.least(1);
        expect(item.discountPercent).to.be.a('number').at.least(0).and.at.most(100);
      }),
      { numRuns: 50 }
    );
  });

  it('arbitraryCart generates valid carts', function () {
    fc.assert(
      fc.property(arbitraryCart(), (cart) => {
        expect(cart.items).to.be.an('array');
        expect(cart.saleDiscount).to.be.a('number').at.least(0);
      }),
      { numRuns: 50 }
    );
  });

  it('arbitraryPayment generates valid payments', function () {
    fc.assert(
      fc.property(arbitraryPayment(), (payment) => {
        expect(['Cash', 'Card', 'MTN_MoMo']).to.include(payment.method);
        expect(payment.amountPaid).to.be.a('number').greaterThan(0);
        if (payment.method === 'Card') {
          expect(payment.cardLastFour).to.match(/^[0-9]{4}$/);
          expect(['debit', 'credit']).to.include(payment.cardType);
        }
        if (payment.method === 'MTN_MoMo') {
          expect(payment.transactionRef).to.match(/^MOMO[0-9]+$/);
        }
      }),
      { numRuns: 50 }
    );
  });

  it('arbitrarySaleTransaction generates valid transactions', function () {
    fc.assert(
      fc.property(arbitrarySaleTransaction(), (txn) => {
        expect(txn.saleId).to.be.a('number').at.least(1);
        expect(txn.cashierUserId).to.be.a('number').at.least(1);
        expect(txn.items).to.be.an('array').with.length.at.least(1);
        expect(txn.subtotal).to.be.a('number').greaterThan(0);
        expect(txn.grandTotal).to.be.a('number').greaterThan(0);
        expect(txn.payments).to.be.an('array').with.length.at.least(1);
        expect(txn.saleDate).to.be.an.instanceOf(Date);
      }),
      { numRuns: 50 }
    );
  });

  it('arbitraryDiscount generates valid discounts', function () {
    fc.assert(
      fc.property(arbitraryDiscount(), (discount) => {
        expect(['percent', 'fixed']).to.include(discount.type);
        expect(discount.value).to.be.a('number').at.least(0);
        if (discount.type === 'percent') {
          expect(discount.value).to.be.at.most(100);
        }
      }),
      { numRuns: 50 }
    );
  });

  it('arbitraryDateRange generates start <= end', function () {
    fc.assert(
      fc.property(arbitraryDateRange(), (range) => {
        expect(range.startDate).to.be.an.instanceOf(Date);
        expect(range.endDate).to.be.an.instanceOf(Date);
        expect(range.startDate.getTime()).to.be.at.most(range.endDate.getTime());
      }),
      { numRuns: 50 }
    );
  });
});

describe('Test Helpers - Fixtures', function () {
  it('exports sample users with required fields', function () {
    expect(fixtures.sampleUsers).to.be.an('array').with.length.at.least(3);
    for (const user of fixtures.sampleUsers) {
      expect(user).to.have.all.keys('username', 'password', 'fullName', 'role');
    }
  });

  it('exports sample products with required fields', function () {
    expect(fixtures.sampleProducts).to.be.an('array').with.length.at.least(1);
    for (const product of fixtures.sampleProducts) {
      expect(product.name).to.be.a('string');
      expect(product.price).to.be.a('number').greaterThan(0);
    }
  });

  it('exports sample customers with required fields', function () {
    expect(fixtures.sampleCustomers).to.be.an('array').with.length.at.least(1);
    for (const customer of fixtures.sampleCustomers) {
      expect(customer).to.have.all.keys('name', 'phone', 'email', 'address');
    }
  });

  it('exports sample payments for each method', function () {
    expect(fixtures.samplePayments).to.have.all.keys('cash', 'card', 'momo');
    expect(fixtures.samplePayments.cash.method).to.equal('Cash');
    expect(fixtures.samplePayments.card.method).to.equal('Card');
    expect(fixtures.samplePayments.momo.method).to.equal('MTN_MoMo');
  });
});
