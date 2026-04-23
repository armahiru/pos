/**
 * Static test fixtures for common test scenarios.
 * Provides deterministic sample data for unit tests.
 */

const sampleUsers = [
  {
    username: 'admin1',
    password: 'Admin@123',
    fullName: 'Alice Admin',
    role: 'Admin'
  },
  {
    username: 'manager1',
    password: 'Manager@123',
    fullName: 'Bob Manager',
    role: 'Manager'
  },
  {
    username: 'cashier1',
    password: 'Cashier@123',
    fullName: 'Carol Cashier',
    role: 'Cashier'
  }
];

const sampleProducts = [
  {
    name: 'Coca-Cola 500ml',
    category: 'Beverages',
    price: 1.50,
    costPrice: 0.80,
    stockQuantity: 200,
    barcode: 'BEV001',
    supplier: 'Coca-Cola Ltd'
  },
  {
    name: 'Bread Loaf',
    category: 'Bakery',
    price: 2.00,
    costPrice: 1.20,
    stockQuantity: 50,
    barcode: 'BAK001',
    supplier: 'Local Bakery'
  },
  {
    name: 'Rice 5kg',
    category: 'Groceries',
    price: 8.99,
    costPrice: 6.50,
    stockQuantity: 100,
    barcode: 'GRO001',
    supplier: 'Rice Distributors'
  },
  {
    name: 'Laptop Stand',
    category: 'Electronics',
    price: 45.00,
    costPrice: 25.00,
    stockQuantity: 15,
    barcode: 'ELE001',
    supplier: 'Tech Supplies Inc'
  },
  {
    name: 'Notebook A5',
    category: 'Stationery',
    price: 3.50,
    costPrice: 1.50,
    stockQuantity: 0,
    barcode: 'STA001',
    supplier: 'Paper World'
  }
];

const sampleCustomers = [
  {
    name: 'John Doe',
    phone: '0712345678',
    email: 'john@example.com',
    address: '123 Main Street'
  },
  {
    name: 'Jane Smith',
    phone: '0798765432',
    email: 'jane@example.com',
    address: '456 Oak Avenue'
  }
];

const sampleCartItems = [
  {
    productId: 1,
    name: 'Coca-Cola 500ml',
    unitPrice: 1.50,
    quantity: 3,
    discountPercent: 0
  },
  {
    productId: 2,
    name: 'Bread Loaf',
    unitPrice: 2.00,
    quantity: 2,
    discountPercent: 10
  },
  {
    productId: 3,
    name: 'Rice 5kg',
    unitPrice: 8.99,
    quantity: 1,
    discountPercent: 0
  }
];

const sampleSale = {
  cashierUserId: 3,
  customerId: 1,
  items: sampleCartItems,
  subtotal: 17.09,
  discountAmount: 0.40,
  taxRate: 16,
  taxAmount: 2.67,
  grandTotal: 19.36
};

const samplePayments = {
  cash: {
    method: 'Cash',
    amountPaid: 20.00,
    transactionRef: null,
    cardLastFour: null,
    cardType: null
  },
  card: {
    method: 'Card',
    amountPaid: 19.36,
    transactionRef: null,
    cardLastFour: '4242',
    cardType: 'debit'
  },
  momo: {
    method: 'MTN_MoMo',
    amountPaid: 19.36,
    transactionRef: 'MOMO20240101001',
    cardLastFour: null,
    cardType: null
  }
};

const sampleStoreConfig = {
  storeName: 'Test POS Store',
  storeAddress: '789 Commerce Blvd, Test City',
  taxRate: 16
};

module.exports = {
  sampleUsers,
  sampleProducts,
  sampleCustomers,
  sampleCartItems,
  sampleSale,
  samplePayments,
  sampleStoreConfig
};
