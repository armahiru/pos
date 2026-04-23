# Implementation Plan: POS System

## Overview

Modular implementation of a web-based POS system using Node.js/Express backend, MySQL database, and vanilla HTML/CSS/JS frontend. Each module is built and tested independently, starting with foundational infrastructure and progressing through business logic to the frontend layer.

## Tasks

- [x] 1. Project setup and infrastructure
  - [x] 1.1 Initialize Node.js project with Express, install dependencies (express, express-session, bcrypt, mysql2, json2csv, pdfkit, mocha, chai, fast-check)
    - Create `package.json`, `.env.example`, `src/app.js` entry point, and Express server configuration
    - Set up global error-handling middleware with consistent JSON error response format
    - Create `src/config/database.js` for MySQL connection pool
    - Create `src/middleware/errorHandler.js` for global error middleware
    - _Requirements: 27_

  - [x] 1.2 Create MySQL database schema with all tables, foreign keys, and constraints
    - Create `src/database/schema.sql` with Users, Products, Sales, Sales_Items, Customers, Payments, Inventory_Log, Audit_Log, and System_Config tables
    - Enforce all foreign key constraints, unique constraints, CHECK constraints (e.g., stock >= 0, price > 0)
    - Insert default System_Config row for tax_rate
    - Create `src/database/seed.sql` with a default Admin user (hashed password)
    - _Requirements: 27.1, 27.2, 27.3, 27.4, 27.5, 27.6, 27.7, 27.8_

  - [ ]* 1.3 Write property test for referential integrity enforcement
    - **Property 33: Referential integrity enforcement**
    - **Validates: Requirements 27.8**

  - [x] 1.4 Set up test infrastructure
    - Create `tests/helpers/db-setup.js` for test database creation/teardown
    - Create `tests/helpers/generators.js` with fast-check arbitraries (arbitraryProduct, arbitraryUser, arbitraryCustomer, arbitraryCartItem, arbitraryCart, arbitrarySaleTransaction, arbitraryPayment, arbitraryDiscount, arbitraryDateRange)
    - Create `tests/helpers/fixtures.js` with static test data
    - Configure Mocha test runner in `package.json`
    - _Requirements: 27_

- [x] 2. Checkpoint - Verify project setup
  - Ensure database schema creates successfully, test infrastructure runs, ask the user if questions arise.

- [x] 3. Auth module
  - [x] 3.1 Implement password hashing and verification utilities
    - Create `src/modules/auth/authService.js` with `hashPassword(plaintext)` and `verifyPassword(plaintext, hash)` using bcrypt
    - _Requirements: 1.4_

  - [ ]* 3.2 Write property test for password hashing
    - **Property 1: Password hash is non-reversible and verifiable**
    - **Validates: Requirements 1.4**

  - [x] 3.3 Implement user CRUD operations
    - Create `src/modules/auth/userService.js` with `createUser(data)`, `updateUser(id, data)`, `listUsers()`
    - Validate required fields: username, password, full_name, role
    - Enforce unique username constraint
    - _Requirements: 2.1, 2.2, 2.6_

  - [ ]* 3.4 Write property test for user creation validation
    - **Property 5: User creation requires all mandatory fields**
    - **Validates: Requirements 2.2**

  - [x] 3.5 Implement session management and authentication
    - Create `src/modules/auth/sessionService.js` with `createSession(userId)`, `destroySession(sessionToken)`, `validateSession(sessionToken)`
    - Implement 15-minute idle timeout check
    - Create `src/middleware/requireAuth.js` middleware
    - _Requirements: 1.1, 1.2, 1.6, 1.7_

  - [ ]* 3.6 Write property test for authentication correctness
    - **Property 2: Authentication correctness**
    - **Validates: Requirements 1.1, 1.3**

  - [ ]* 3.7 Write property test for session expiry
    - **Property 3: Session expiry after idle timeout**
    - **Validates: Requirements 1.7**

  - [x] 3.8 Implement role-based access control middleware
    - Create `src/middleware/requireRole.js` with role hierarchy: Cashier < Manager < Admin
    - Define allowed endpoints per role
    - _Requirements: 1.5, 2.3, 2.4, 2.5_

  - [ ]* 3.9 Write property test for RBAC enforcement
    - **Property 4: Role-based access control enforcement**
    - **Validates: Requirements 1.5, 2.3, 2.4, 2.5**

  - [x] 3.10 Create Auth module Express routes
    - Create `src/modules/auth/authRoutes.js` with POST `/api/auth/login`, POST `/api/auth/logout`, GET `/api/auth/session`, POST `/api/users`, PUT `/api/users/:id`, GET `/api/users`
    - Wire routes into main Express app
    - _Requirements: 1.1, 1.2, 1.6, 2.1, 2.2_

  - [ ]* 3.11 Write unit tests for Auth module
    - Test login success/failure, session creation/expiry, user CRUD, role enforcement
    - _Requirements: 1.1, 1.3, 1.5, 1.7, 2.2, 2.3, 2.4, 2.5_

- [x] 4. Transaction Logger module
  - [x] 4.1 Implement audit logging service
    - Create `src/modules/logger/loggerService.js` with `logEvent(eventType, userId, details)`
    - Support event types: LOGIN_SUCCESS, LOGIN_FAILURE, SALE_COMPLETED, PRODUCT_CREATED, PRODUCT_UPDATED, PRODUCT_DELETED, INVENTORY_ADJUSTED, BACKUP_CREATED, BACKUP_RESTORED
    - Insert into append-only Audit_Log table
    - _Requirements: 26.1, 26.2, 26.3, 26.4, 26.5_

  - [ ]* 4.2 Write property test for audit log completeness
    - **Property 32: Audit log completeness**
    - **Validates: Requirements 26.1, 26.2, 26.3, 26.4, 26.5**

  - [x] 4.3 Integrate logger into Auth module
    - Add login success/failure logging to auth service
    - _Requirements: 26.1_

- [x] 5. Checkpoint - Verify auth and logging
  - Ensure auth login/logout, user CRUD, RBAC, session timeout, and audit logging all work. Ask the user if questions arise.

- [x] 6. Product Management module
  - [x] 6.1 Implement product CRUD service
    - Create `src/modules/product/productService.js` with `createProduct(data)`, `updateProduct(id, data)`, `deactivateProduct(id)`, `getProduct(id)`
    - Auto-generate Product_ID, validate name non-empty, price > 0, barcode unique across active products
    - Soft-delete sets Is_Active = false
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [ ]* 6.2 Write property test for product validation constraints
    - **Property 6: Product validation constraints**
    - **Validates: Requirements 3.5, 3.6**

  - [ ]* 6.3 Write property test for product soft-delete
    - **Property 7: Product soft-delete preserves records**
    - **Validates: Requirements 3.4**

  - [x] 6.4 Implement product search and barcode lookup
    - Add `searchProducts(query)` and `lookupBarcode(barcode)` to productService
    - Search by name or category, return only active products
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ]* 6.5 Write property test for product search
    - **Property 8: Product search returns only active matches**
    - **Validates: Requirements 4.1**

  - [ ]* 6.6 Write property test for barcode lookup round-trip
    - **Property 9: Barcode lookup round-trip**
    - **Validates: Requirements 4.2, 4.3**

  - [x] 6.7 Create Product module Express routes
    - Create `src/modules/product/productRoutes.js` with GET/POST/PUT/DELETE endpoints
    - Apply requireAuth and requireRole middleware
    - Integrate audit logging for product create/update/delete
    - _Requirements: 3.1, 3.3, 3.4, 4.1, 4.2, 26.3_

  - [ ]* 6.8 Write unit tests for Product module
    - Test CRUD operations, validation errors, soft-delete, search, barcode lookup
    - _Requirements: 3.1, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3_

- [x] 7. Inventory Management module
  - [x] 7.1 Implement inventory service
    - Create `src/modules/inventory/inventoryService.js` with `deductStock(productId, quantity)`, `adjustStock(productId, quantity, reason, userId)`, `checkLowStock(productId)`, `getLowStockAlerts()`
    - Prevent negative stock quantities
    - Log adjustments to Inventory_Log table
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [ ]* 7.2 Write property test for inventory adjustment logging
    - **Property 19: Inventory adjustment logging**
    - **Validates: Requirements 12.3**

  - [x] 7.3 Implement low-stock alert system
    - Add configurable threshold per product, `setThreshold(productId, threshold)`
    - Generate alerts when stock <= threshold after sale or adjustment
    - _Requirements: 13.1, 13.2, 13.3_

  - [ ]* 7.4 Write property test for low-stock alert generation
    - **Property 20: Low-stock alert generation**
    - **Validates: Requirements 13.1, 13.2, 13.3**

  - [x] 7.5 Create Inventory module Express routes
    - Create `src/modules/inventory/inventoryRoutes.js` with POST `/api/inventory/adjust`, GET `/api/inventory/alerts`, PUT `/api/products/:id/threshold`
    - Apply requireAuth and requireRole middleware
    - Integrate audit logging for inventory adjustments
    - _Requirements: 12.3, 13.2, 26.4_

  - [ ]* 7.6 Write unit tests for Inventory module
    - Test stock deduction, negative stock prevention, manual adjustment, low-stock alerts
    - _Requirements: 12.1, 12.3, 12.4, 13.1, 13.2, 13.3_

- [x] 8. Checkpoint - Verify product and inventory modules
  - Ensure product CRUD, search, barcode lookup, inventory tracking, and low-stock alerts all work. Ask the user if questions arise.

- [x] 9. Sales Processor module
  - [x] 9.1 Implement shopping cart logic
    - Create `src/modules/sales/cartService.js` with `addToCart(cart, productId, quantity)`, `updateCartItemQuantity(cart, productId, quantity)`, `removeFromCart(cart, productId)`, `clearCart()`
    - Validate stock availability before adding items
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6_

  - [x] 9.2 Implement discount and tax calculation
    - Add `applyItemDiscount(cart, productId, percent)`, `applySaleDiscount(cart, fixedAmount)`, `calculateTotals(cart, taxRate)` to cartService
    - Clamp discounts so no line total or grand total goes below zero
    - Calculate tax on post-discount subtotal
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3_

  - [ ]* 9.3 Write property test for cart totals calculation invariant
    - **Property 10: Cart totals calculation invariant**
    - **Validates: Requirements 5.2, 5.5, 6.1, 6.2, 6.3, 7.1**

  - [ ]* 9.4 Write property test for cart item removal
    - **Property 11: Cart item removal decreases count**
    - **Validates: Requirements 5.3**

  - [ ]* 9.5 Write property test for cart clear
    - **Property 12: Cart clear resets to empty state**
    - **Validates: Requirements 5.6**

  - [ ]* 9.6 Write property test for stock over-sell prevention
    - **Property 13: Stock quantity prevents over-selling**
    - **Validates: Requirements 5.4, 12.4**

  - [x] 9.7 Implement checkout and sale transaction creation
    - Create `src/modules/sales/salesService.js` with `checkout(cart, payments, cashierUserId, customerId?)`
    - Create Sale_Transaction record with unique Sale ID, timestamp, items, totals
    - Wrap sale record + inventory deduction in a database transaction
    - Store tax rate with each transaction
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 7.4_

  - [ ]* 9.8 Write property test for sale transaction completeness
    - **Property 14: Sale transaction completeness**
    - **Validates: Requirements 8.1, 8.5, 7.4**

  - [ ]* 9.9 Write property test for sale inventory deduction
    - **Property 15: Sale completion deducts inventory**
    - **Validates: Requirements 8.3, 12.2**

  - [x] 9.10 Create Sales module Express routes
    - Create `src/modules/sales/salesRoutes.js` with cart endpoints and POST `/api/sales/checkout`, GET `/api/sales/:id`
    - Apply requireAuth and requireRole middleware
    - Integrate audit logging for sale completion
    - _Requirements: 8.1, 8.2, 26.2_

  - [ ]* 9.11 Write unit tests for Sales module
    - Test cart operations, discount clamping, tax calculation, checkout flow, stock validation
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 6.1, 6.2, 6.3, 7.1, 8.1, 8.3_

- [x] 10. Payment Processor module
  - [x] 10.1 Implement cash payment processing
    - Create `src/modules/payment/paymentService.js` with `processCashPayment(saleId, amountTendered, grandTotal)`
    - Calculate change due, reject if tendered < total
    - _Requirements: 9.1, 9.2, 9.3_

  - [ ]* 10.2 Write property test for cash payment change calculation
    - **Property 16: Cash payment change calculation**
    - **Validates: Requirements 9.1, 9.2**

  - [x] 10.3 Implement MTN MoMo and card payment processing
    - Add `processMTNMoMoPayment(saleId, amount, momoTransactionRef)` and `processCardPayment(saleId, amount, cardType, lastFour)` to paymentService
    - Record payment method, transaction reference, card details
    - _Requirements: 10.1, 10.2, 10.3_

  - [ ]* 10.4 Write property test for non-cash payment recording
    - **Property 17: Non-cash payment recording**
    - **Validates: Requirements 10.1, 10.2, 10.3**

  - [x] 10.5 Implement split payment processing
    - Add `processSplitPayment(saleId, paymentEntries[], grandTotal)` to paymentService
    - Track remaining balance, validate combined total >= grand total, calculate change
    - Store each partial payment as separate record linked to same Sale_Transaction
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [ ]* 10.6 Write property test for split payment balance invariant
    - **Property 18: Split payment balance invariant**
    - **Validates: Requirements 11.1, 11.2, 11.3, 11.4**

  - [x] 10.7 Create Payment module Express routes
    - Create `src/modules/payment/paymentRoutes.js` with POST `/api/payments`, GET `/api/payments/sale/:saleId`
    - Apply requireAuth and requireRole middleware
    - _Requirements: 9.1, 10.1, 11.1_

  - [ ]* 10.8 Write unit tests for Payment module
    - Test cash change calculation, rejection on insufficient amount, MoMo recording, card recording, split payment flow
    - _Requirements: 9.1, 9.2, 10.1, 10.2, 11.1, 11.2, 11.3_

- [x] 11. Checkpoint - Verify sales and payment modules
  - Ensure cart operations, checkout, cash/MoMo/card/split payments all work end-to-end. Ask the user if questions arise.

- [x] 12. Customer Management module
  - [x] 12.1 Implement customer CRUD and search
    - Create `src/modules/customer/customerService.js` with `createCustomer(data)`, `updateCustomer(id, data)`, `searchCustomers(query)`, `getCustomer(id)`
    - Auto-generate Customer_ID, validate phone/email uniqueness
    - Search by name or phone
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

  - [ ]* 12.2 Write property test for customer uniqueness constraints
    - **Property 23: Customer uniqueness constraints**
    - **Validates: Requirements 15.5**

  - [x] 12.3 Implement loyalty points system
    - Add `addLoyaltyPoints(customerId, grandTotal)` and `redeemLoyaltyPoints(customerId, points)` to customerService
    - Points earned = Math.floor(grandTotal), prevent over-redemption
    - _Requirements: 16.1, 16.2, 16.3, 16.4_

  - [ ]* 12.4 Write property test for loyalty points calculation
    - **Property 21: Loyalty points calculation**
    - **Validates: Requirements 16.1**

  - [ ]* 12.5 Write property test for loyalty points redemption
    - **Property 22: Loyalty points redemption**
    - **Validates: Requirements 16.2, 16.3**

  - [x] 12.6 Create Customer module Express routes
    - Create `src/modules/customer/customerRoutes.js` with POST/PUT/GET endpoints and POST `/api/customers/:id/loyalty/redeem`
    - Apply requireAuth and requireRole middleware
    - _Requirements: 15.1, 15.3, 15.4, 16.2_

  - [ ]* 12.7 Write unit tests for Customer module
    - Test CRUD, uniqueness validation, loyalty point earning/redemption, search
    - _Requirements: 15.1, 15.4, 15.5, 16.1, 16.2, 16.3_

- [x] 13. Receipt Generator module
  - [x] 13.1 Implement receipt formatting and parsing
    - Create `src/modules/receipt/receiptService.js` with `formatReceipt(saleTransaction, storeConfig)` and `parseReceipt(receiptText)`
    - Include all required fields: store name, address, date/time, Sale ID, cashier, items, subtotal, discount, tax, grand total, payment info
    - _Requirements: 17.1, 18.1, 18.2, 18.3_

  - [ ]* 13.2 Write property test for receipt formatting round-trip
    - **Property 24: Receipt formatting round-trip**
    - **Validates: Requirements 18.1, 18.2, 18.3**

  - [ ]* 13.3 Write property test for receipt required fields
    - **Property 25: Receipt contains all required fields**
    - **Validates: Requirements 17.1**

  - [x] 13.4 Implement PDF receipt generation
    - Add `generatePDF(receiptText)` using pdfkit to produce PDF buffer
    - _Requirements: 17.4_

  - [x] 13.5 Create Receipt module Express routes
    - Create `src/modules/receipt/receiptRoutes.js` with GET `/api/receipts/:saleId` and GET `/api/receipts/:saleId/pdf`
    - _Requirements: 17.2, 17.3, 17.4_

  - [ ]* 13.6 Write unit tests for Receipt module
    - Test receipt content, formatting, PDF generation, round-trip parsing
    - _Requirements: 17.1, 17.4, 18.3_

- [x] 14. Report Engine module
  - [x] 14.1 Implement daily sales report
    - Create `src/modules/report/reportService.js` with `dailySalesReport(date | dateRange)`
    - Calculate total transactions, revenue, tax, discounts, payment method breakdown
    - _Requirements: 19.1, 19.2_

  - [ ]* 14.2 Write property test for daily sales report aggregation
    - **Property 26: Daily sales report aggregation correctness**
    - **Validates: Requirements 19.1, 19.2**

  - [x] 14.3 Implement product sales report
    - Add `productSalesReport(dateRange, category?)` to reportService
    - List products with total quantity and revenue, sorted by quantity descending, filterable by category
    - _Requirements: 20.1, 20.2_

  - [ ]* 14.4 Write property test for product sales report
    - **Property 27: Product sales report sorting and aggregation**
    - **Validates: Requirements 20.1, 20.2**

  - [x] 14.5 Implement cashier performance and profit reports
    - Add `cashierPerformanceReport(dateRange)` and `profitReport(dateRange)` to reportService
    - Cashier report: transaction count, revenue, average value per cashier
    - Profit report: revenue, cost, gross profit, breakdown by category
    - _Requirements: 21.1, 22.1, 22.2_

  - [ ]* 14.6 Write property test for cashier performance report
    - **Property 28: Cashier performance report correctness**
    - **Validates: Requirements 21.1**

  - [ ]* 14.7 Write property test for profit report
    - **Property 29: Profit report correctness**
    - **Validates: Requirements 22.1, 22.2**

  - [x] 14.8 Implement inventory report and CSV export
    - Add `inventoryReport(category?)` and `exportToCSV(reportData, columns)` to reportService
    - Inventory report: all products with stock, low-stock status, last restocked date, filterable by category
    - CSV export for all report types
    - _Requirements: 14.1, 14.2, 14.3, 19.3, 20.3, 21.2, 22.3_

  - [ ]* 14.9 Write property test for CSV export round-trip
    - **Property 30: CSV export round-trip**
    - **Validates: Requirements 14.3, 19.3, 20.3, 21.2, 22.3**

  - [x] 14.10 Create Report module Express routes
    - Create `src/modules/report/reportRoutes.js` with GET endpoints for daily-sales, product-sales, cashier-performance, profit, and inventory reports
    - Support query params for date range, category filter, and CSV export format
    - Apply requireAuth and requireRole middleware (Manager, Admin)
    - _Requirements: 19.1, 20.1, 21.1, 22.1, 14.1_

  - [ ]* 14.11 Write unit tests for Report module
    - Test each report type with known data, verify aggregation, sorting, filtering, CSV output
    - _Requirements: 19.1, 20.1, 21.1, 22.1, 14.1, 14.2_

- [x] 15. Checkpoint - Verify customer, receipt, and report modules
  - Ensure customer management, loyalty points, receipt generation, and all report types work correctly. Ask the user if questions arise.

- [x] 16. Backup Manager module
  - [x] 16.1 Implement database backup and restore
    - Create `src/modules/backup/backupService.js` with `createBackup(backupDir)` and `restoreBackup(filePath)`
    - Backup: timestamped mysqldump file, return file path and size
    - Restore: replace current DB, invalidate all sessions, rollback on failure
    - _Requirements: 23.1, 23.2, 23.3, 23.4, 24.1, 24.2, 24.3, 24.4_

  - [ ]* 16.2 Write property test for backup and restore round-trip
    - **Property 34: Backup and restore round-trip**
    - **Validates: Requirements 24.2, 24.3**

  - [x] 16.3 Implement data table export
    - Add `exportTable(tableName)` to backupService
    - Export Products, Sales, Sales_Items, Customers, Inventory, Payments, Users (excluding Password_Hash) as CSV with column headers
    - _Requirements: 25.1, 25.2, 25.3_

  - [ ]* 16.4 Write property test for data export excluding sensitive fields
    - **Property 31: Data export excludes sensitive fields**
    - **Validates: Requirements 25.2**

  - [x] 16.5 Create Backup module Express routes
    - Create `src/modules/backup/backupRoutes.js` with POST `/api/backup`, POST `/api/backup/restore`, GET `/api/export/:table`
    - Apply requireAuth and requireRole middleware (Admin only)
    - Integrate audit logging for backup/restore operations
    - _Requirements: 23.1, 24.1, 25.1, 26.5_

  - [ ]* 16.6 Write unit tests for Backup module
    - Test backup creation, restore flow, session invalidation, table export, sensitive field exclusion
    - _Requirements: 23.1, 23.3, 24.2, 24.3, 25.1, 25.2_

- [x] 17. Checkpoint - Verify backup module
  - Ensure backup, restore, and data export all work correctly. Ask the user if questions arise.

- [x] 18. Wire all backend modules together
  - [x] 18.1 Register all module routes in main Express app
    - Update `src/app.js` to mount all route modules: auth, product, inventory, sales, payment, customer, receipt, report, backup
    - Ensure middleware ordering: JSON body parser → session middleware → route handlers → error handler
    - _Requirements: 1.1, 3.1, 8.1, 9.1, 12.1, 15.1, 17.1, 19.1, 23.1_

  - [x] 18.2 Integrate cross-module flows
    - Wire checkout to trigger: inventory deduction, loyalty points (if customer linked), receipt generation, audit logging
    - Wire product delete to check for active cart references
    - _Requirements: 8.3, 16.1, 17.1, 26.2_

- [ ] 19. Frontend - Login and layout
  - [ ] 19.1 Create base HTML layout and CSS styles
    - Create `public/index.html` with login page, `public/css/styles.css` with responsive layout
    - Create `public/js/api.js` utility for making authenticated API calls
    - _Requirements: 1.1, 1.2_

  - [ ] 19.2 Implement login/logout UI
    - Create `public/js/auth.js` with login form submission, session management, logout button, role-based navigation
    - Redirect to appropriate interface based on role after login
    - _Requirements: 1.1, 1.2, 1.3, 1.6_

- [ ] 20. Frontend - Cashier interface
  - [ ] 20.1 Implement product search and barcode input UI
    - Create `public/js/cashier.js` with product search field, barcode input, search results display
    - Support keyboard barcode scanner input
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 28.1, 28.3_

  - [ ] 20.2 Implement shopping cart UI
    - Build cart display with item list, quantity adjustment, item removal, clear cart button
    - Show running subtotal, discount, tax, and grand total
    - _Requirements: 5.1, 5.2, 5.3, 5.5, 5.6, 6.4_

  - [ ] 20.3 Implement discount application UI
    - Add controls for item-level percentage discount and sale-level fixed discount
    - _Requirements: 6.1, 6.2_

  - [ ] 20.4 Implement payment and checkout UI
    - Build payment selection (Cash, Card, MTN MoMo), amount input, split payment flow
    - Show change due for cash, remaining balance for split payments
    - Customer lookup and linking to sale
    - _Requirements: 9.1, 10.1, 10.2, 11.1, 11.2, 16.4_

  - [ ] 20.5 Implement receipt preview and print UI
    - Display receipt preview after checkout, print/save as PDF buttons
    - _Requirements: 17.1, 17.2, 17.3, 17.4_

- [ ] 21. Frontend - Admin and Manager interfaces
  - [ ] 21.1 Implement user management UI (Admin)
    - Create `public/js/admin.js` with user list, create user form, edit user/role form
    - _Requirements: 2.1, 2.2, 2.6_

  - [ ] 21.2 Implement product management UI (Manager)
    - Create `public/js/manager.js` with product list, create/edit product forms, soft-delete button
    - _Requirements: 3.1, 3.3, 3.4_

  - [ ] 21.3 Implement inventory management UI (Manager)
    - Build inventory view with stock levels, manual adjustment form, low-stock alerts dashboard
    - _Requirements: 12.1, 12.3, 13.2_

  - [ ] 21.4 Implement customer management UI (Manager)
    - Build customer list, create/edit forms, loyalty points display
    - _Requirements: 15.1, 15.3, 16.4_

  - [ ] 21.5 Implement reports UI (Manager)
    - Build report pages for daily sales, product sales, cashier performance, profit, and inventory reports
    - Add date range pickers, category filters, CSV export buttons
    - _Requirements: 19.1, 20.1, 20.2, 21.1, 22.1, 14.1, 14.2_

  - [ ] 21.6 Implement backup and data export UI (Admin)
    - Build backup/restore page with backup button, file selection for restore, confirmation dialog
    - Build data export page with table selection and download
    - _Requirements: 23.1, 23.3, 24.1, 25.1_

- [ ] 22. Final checkpoint - Full system verification
  - Ensure all modules are wired together, all backend routes respond correctly, frontend interfaces function for all roles, and all tests pass. Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each module is self-contained and can be built/tested independently
- Build order: infrastructure → auth → logger → product → inventory → sales → payment → customer → receipt → reports → backup → frontend
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Checkpoints ensure incremental validation between module groups
