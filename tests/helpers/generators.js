/**
 * fast-check arbitraries for property-based testing.
 * Each generator produces valid data that respects the database constraints.
 */
const fc = require('fast-check');

/**
 * Helper: generate a non-empty trimmed string of a given max length.
 */
function nonEmptyString(maxLength = 50) {
  return fc.string({ minLength: 1, maxLength }).filter(s => s.trim().length > 0).map(s => s.trim());
}

/**
 * Helper: positive decimal rounded to 2 decimal places.
 */
function positiveDecimal(max = 99999) {
  return fc.double({ min: 0.01, max, noNaN: true, noDefaultInfinity: true })
    .map(v => Math.round(v * 100) / 100)
    .filter(v => v > 0);
}

/**
 * Helper: non-negative decimal rounded to 2 decimal places.
 */
function nonNegativeDecimal(max = 99999) {
  return fc.double({ min: 0, max, noNaN: true, noDefaultInfinity: true })
    .map(v => Math.round(v * 100) / 100);
}

/**
 * arbitraryProduct(): generates product data matching the Products table schema.
 * { name, category, price, costPrice, stockQuantity, barcode, supplier }
 */
function arbitraryProduct() {
  return fc.record({
    name: nonEmptyString(100),
    category: fc.option(nonEmptyString(50), { nil: undefined }),
    price: positiveDecimal(9999.99),
    costPrice: nonNegativeDecimal(9999.99),
    stockQuantity: fc.integer({ min: 0, max: 10000 }),
    barcode: fc.option(
      fc.stringMatching(/^[A-Za-z0-9]{6,20}$/),
      { nil: undefined }
    ),
    supplier: fc.option(nonEmptyString(100), { nil: undefined })
  });
}

/**
 * arbitraryUser(): generates user data matching the Users table schema.
 * { username, password, fullName, role }
 */
function arbitraryUser() {
  return fc.record({
    username: fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{2,29}$/),
    password: fc.string({ minLength: 6, maxLength: 50 }).filter(s => s.trim().length >= 6),
    fullName: nonEmptyString(100),
    role: fc.constantFrom('Admin', 'Manager', 'Cashier')
  });
}

/**
 * arbitraryCustomer(): generates customer data matching the Customers table schema.
 * { name, phone, email, address }
 */
function arbitraryCustomer() {
  return fc.record({
    name: nonEmptyString(100),
    phone: fc.stringMatching(/^0[0-9]{9}$/),
    email: fc.stringMatching(/^[a-z]{3,10}@[a-z]{3,8}\.[a-z]{2,4}$/),
    address: fc.option(nonEmptyString(200), { nil: undefined })
  });
}

/**
 * arbitraryCartItem(): generates a single cart item.
 * { productId, name, unitPrice, quantity, discountPercent }
 */
function arbitraryCartItem() {
  return fc.record({
    productId: fc.integer({ min: 1, max: 100000 }),
    name: nonEmptyString(100),
    unitPrice: positiveDecimal(9999.99),
    quantity: fc.integer({ min: 1, max: 100 }),
    discountPercent: fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true })
      .map(v => Math.round(v * 100) / 100)
  });
}

/**
 * arbitraryCart(): generates a shopping cart with items.
 * { items: CartItem[], saleDiscount, customerId }
 */
function arbitraryCart() {
  return fc.record({
    items: fc.array(arbitraryCartItem(), { minLength: 0, maxLength: 10 }),
    saleDiscount: nonNegativeDecimal(500),
    customerId: fc.option(fc.integer({ min: 1, max: 100000 }), { nil: null })
  });
}

/**
 * arbitrarySaleTransaction(): generates complete sale transaction data.
 */
function arbitrarySaleTransaction() {
  return fc.record({
    saleId: fc.integer({ min: 1, max: 100000 }),
    cashierUserId: fc.integer({ min: 1, max: 1000 }),
    customerId: fc.option(fc.integer({ min: 1, max: 100000 }), { nil: null }),
    saleDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
    items: fc.array(arbitraryCartItem(), { minLength: 1, maxLength: 10 }),
    subtotal: positiveDecimal(99999),
    discountAmount: nonNegativeDecimal(5000),
    taxRate: fc.double({ min: 0, max: 30, noNaN: true, noDefaultInfinity: true })
      .map(v => Math.round(v * 100) / 100),
    taxAmount: nonNegativeDecimal(99999),
    grandTotal: positiveDecimal(99999),
    payments: fc.array(arbitraryPayment(), { minLength: 1, maxLength: 3 })
  });
}

/**
 * arbitraryPayment(): generates payment data.
 * { method, amountPaid, transactionRef, cardLastFour, cardType }
 */
function arbitraryPayment() {
  return fc.oneof(
    // Cash payment
    fc.record({
      method: fc.constant('Cash'),
      amountPaid: positiveDecimal(99999),
      transactionRef: fc.constant(null),
      cardLastFour: fc.constant(null),
      cardType: fc.constant(null)
    }),
    // Card payment
    fc.record({
      method: fc.constant('Card'),
      amountPaid: positiveDecimal(99999),
      transactionRef: fc.constant(null),
      cardLastFour: fc.stringMatching(/^[0-9]{4}$/),
      cardType: fc.constantFrom('debit', 'credit')
    }),
    // MTN MoMo payment
    fc.record({
      method: fc.constant('MTN_MoMo'),
      amountPaid: positiveDecimal(99999),
      transactionRef: fc.stringMatching(/^MOMO[0-9]{8,16}$/),
      cardLastFour: fc.constant(null),
      cardType: fc.constant(null)
    })
  );
}

/**
 * arbitraryDiscount(): generates a discount descriptor.
 * { type: 'percent'|'fixed', value }
 */
function arbitraryDiscount() {
  return fc.oneof(
    fc.record({
      type: fc.constant('percent'),
      value: fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true })
        .map(v => Math.round(v * 100) / 100)
    }),
    fc.record({
      type: fc.constant('fixed'),
      value: nonNegativeDecimal(5000)
    })
  );
}

/**
 * arbitraryDateRange(): generates { startDate, endDate } where start <= end.
 */
function arbitraryDateRange() {
  return fc
    .tuple(
      fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
      fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
    )
    .map(([a, b]) => {
      const [start, end] = a <= b ? [a, b] : [b, a];
      return { startDate: start, endDate: end };
    });
}

module.exports = {
  nonEmptyString,
  positiveDecimal,
  nonNegativeDecimal,
  arbitraryProduct,
  arbitraryUser,
  arbitraryCustomer,
  arbitraryCartItem,
  arbitraryCart,
  arbitrarySaleTransaction,
  arbitraryPayment,
  arbitraryDiscount,
  arbitraryDateRange
};
