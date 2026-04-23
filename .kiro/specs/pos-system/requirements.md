# Requirements Document

## Introduction

This document defines the requirements for a comprehensive Point of Sale (POS) System designed for student projects. The POS System enables retail businesses to process sales transactions, manage inventory, handle payments, track customers, and generate reports. The system follows a three-tier architecture (Presentation Layer, Application Layer, Data Layer) and supports multiple technology stacks for educational flexibility.

## Glossary

- **POS_System**: The complete Point of Sale application encompassing all modules described in this document
- **Cashier_Interface**: The front-end user interface used by cashiers to process sales transactions
- **Admin_Interface**: The front-end user interface used by administrators and managers to configure the system
- **Product_Manager**: The module responsible for creating, reading, updating, and deleting product records
- **Inventory_Manager**: The module responsible for tracking stock levels and generating stock alerts
- **Sales_Processor**: The module responsible for creating and processing sale transactions
- **Payment_Processor**: The module responsible for handling payment methods and recording payment transactions
- **Customer_Manager**: The module responsible for managing customer records and loyalty points
- **Auth_Module**: The module responsible for user authentication and role-based access control
- **Receipt_Generator**: The module responsible for creating and formatting sale receipts
- **Report_Engine**: The module responsible for generating sales, inventory, and performance reports
- **Backup_Manager**: The module responsible for database backup, restore, and data export operations
- **Shopping_Cart**: A temporary collection of items selected by a customer during a sale transaction
- **Sale_Transaction**: A completed purchase event containing items, totals, tax, discounts, and payment information
- **Loyalty_Points**: Points accumulated by a customer based on purchase history, redeemable for discounts

## Requirements

### Requirement 1: User Authentication

**User Story:** As a system user, I want to log in with my credentials, so that I can access the POS System according to my assigned role.

#### Acceptance Criteria

1. WHEN a user submits a username and password, THE Auth_Module SHALL validate the credentials against stored user records
2. WHEN valid credentials are provided, THE Auth_Module SHALL create an authenticated session and direct the user to the appropriate interface based on the user role (Admin, Manager, or Cashier)
3. WHEN invalid credentials are provided, THE Auth_Module SHALL display an error message indicating authentication failure without revealing which field is incorrect
4. THE Auth_Module SHALL store passwords using a one-way cryptographic hash algorithm (e.g., bcrypt or argon2)
5. WHILE a user session is active, THE Auth_Module SHALL enforce role-based access control restricting functionality to the permissions assigned to that role
6. WHEN a user selects logout, THE Auth_Module SHALL terminate the active session and return to the login screen
7. IF a user session remains idle for more than 15 minutes, THEN THE Auth_Module SHALL automatically terminate the session and require re-authentication

### Requirement 2: Role-Based Access Control

**User Story:** As an administrator, I want to manage user accounts and assign roles, so that each user has appropriate access to system functions.

#### Acceptance Criteria

1. THE Admin_Interface SHALL support three user roles: Admin, Manager, and Cashier
2. WHEN an Admin creates a new user account, THE Auth_Module SHALL require a username, password, full name, and role assignment
3. WHILE a user has the Cashier role, THE POS_System SHALL restrict access to sales processing, receipt viewing, and customer lookup functions only
4. WHILE a user has the Manager role, THE POS_System SHALL grant access to sales processing, inventory management, customer management, and report viewing functions
5. WHILE a user has the Admin role, THE POS_System SHALL grant access to all system functions including user management, system configuration, and backup operations
6. WHEN an Admin updates a user role, THE Auth_Module SHALL apply the new permissions on the next login of that user

### Requirement 3: Product Management

**User Story:** As a manager, I want to add, edit, and delete products, so that the product catalog remains accurate and up to date.

#### Acceptance Criteria

1. WHEN a manager submits a new product form, THE Product_Manager SHALL create a product record with Product ID, Name, Category, Price, Stock Quantity, Barcode, and Supplier fields
2. THE Product_Manager SHALL auto-generate a unique Product ID for each new product
3. WHEN a manager edits a product record, THE Product_Manager SHALL update the corresponding fields and persist the changes to the database
4. WHEN a manager deletes a product, THE Product_Manager SHALL mark the product as inactive rather than removing the record, preserving historical sale references
5. THE Product_Manager SHALL enforce that Product Name is non-empty and Price is a positive numeric value
6. WHEN a manager assigns a barcode to a product, THE Product_Manager SHALL validate that the barcode is unique across all active products
7. THE Product_Manager SHALL support product categorization allowing each product to belong to exactly one category

### Requirement 4: Product Search and Barcode Lookup

**User Story:** As a cashier, I want to search for products by name or scan a barcode, so that I can quickly add items to a sale.

#### Acceptance Criteria

1. WHEN a cashier enters text in the product search field, THE Cashier_Interface SHALL display matching active products filtered by name or category within 500 milliseconds
2. WHEN a barcode value is entered or scanned, THE Cashier_Interface SHALL look up the corresponding product and display its name, price, and available stock
3. IF a barcode does not match any active product, THEN THE Cashier_Interface SHALL display a message indicating the product was not found
4. WHEN a matching product is selected from search results, THE Cashier_Interface SHALL add one unit of that product to the Shopping_Cart

### Requirement 5: Shopping Cart Management

**User Story:** As a cashier, I want to manage items in the shopping cart, so that I can accurately build a customer order before checkout.

#### Acceptance Criteria

1. WHEN a product is added to the Shopping_Cart, THE Sales_Processor SHALL display the product name, unit price, quantity, and line total
2. WHEN a cashier adjusts the quantity of a cart item, THE Sales_Processor SHALL recalculate the line total and the cart subtotal
3. WHEN a cashier removes an item from the Shopping_Cart, THE Sales_Processor SHALL remove the item and recalculate the cart subtotal
4. THE Sales_Processor SHALL prevent adding a product quantity that exceeds the available stock for that product
5. THE Sales_Processor SHALL display a running subtotal, applicable tax amount, applicable discount amount, and grand total for the Shopping_Cart
6. WHEN a cashier clears the Shopping_Cart, THE Sales_Processor SHALL remove all items and reset totals to zero

### Requirement 6: Discount Application

**User Story:** As a cashier, I want to apply discounts to individual items or the entire sale, so that promotional pricing and customer discounts are reflected accurately.

#### Acceptance Criteria

1. WHEN a cashier applies a percentage discount to a cart item, THE Sales_Processor SHALL reduce the line total by the specified percentage and recalculate the cart grand total
2. WHEN a cashier applies a fixed-amount discount to the entire sale, THE Sales_Processor SHALL subtract the discount amount from the subtotal before tax calculation
3. THE Sales_Processor SHALL prevent a discount from reducing any line total or grand total below zero
4. THE Sales_Processor SHALL display the discount amount as a separate line item in the Shopping_Cart summary

### Requirement 7: Tax Calculation

**User Story:** As a business owner, I want taxes to be calculated automatically on sales, so that tax obligations are accurately tracked.

#### Acceptance Criteria

1. THE Sales_Processor SHALL calculate tax as a configurable percentage applied to the post-discount subtotal
2. WHEN the tax rate is updated in system configuration, THE Sales_Processor SHALL apply the new rate to all subsequent transactions
3. THE Sales_Processor SHALL display the tax amount as a separate line in the Shopping_Cart summary and on the receipt
4. THE Sales_Processor SHALL store the tax rate applied with each Sale_Transaction for historical accuracy

### Requirement 8: Sales Transaction Processing

**User Story:** As a cashier, I want to complete a sale transaction, so that the purchase is recorded and inventory is updated.

#### Acceptance Criteria

1. WHEN a cashier initiates checkout, THE Sales_Processor SHALL create a Sale_Transaction record containing a unique Sale ID, timestamp, cashier user ID, list of items with quantities and prices, discount amount, tax amount, and grand total
2. WHEN a Sale_Transaction is completed, THE Sales_Processor SHALL persist the transaction and all associated Sale_Items to the database
3. WHEN a Sale_Transaction is completed, THE Inventory_Manager SHALL deduct the sold quantity of each item from the corresponding product stock
4. IF a payment is not completed, THEN THE Sales_Processor SHALL retain the Shopping_Cart contents and not record the Sale_Transaction
5. THE Sales_Processor SHALL assign a sequential, unique Sale ID to each transaction

### Requirement 9: Payment Processing - Cash

**User Story:** As a cashier, I want to process cash payments, so that customers can pay with physical currency.

#### Acceptance Criteria

1. WHEN a cashier selects cash payment and enters the amount tendered, THE Payment_Processor SHALL calculate and display the change due
2. THE Payment_Processor SHALL prevent completing a cash payment when the amount tendered is less than the grand total
3. WHEN a cash payment is confirmed, THE Payment_Processor SHALL record the payment with method "Cash", amount tendered, and change given

### Requirement 10: Payment Processing - Mobile Money and Card

**User Story:** As a cashier, I want to process mobile money and card payments, so that customers have multiple payment options.

#### Acceptance Criteria

1. WHEN a cashier selects mobile money payment, THE Payment_Processor SHALL record the transaction reference number and the amount paid
2. WHEN a cashier selects card payment, THE Payment_Processor SHALL record the card type (debit or credit), last four digits of the card number, and the amount paid
3. WHEN a non-cash payment is confirmed, THE Payment_Processor SHALL record the payment with the corresponding payment method and transaction details

### Requirement 11: Split Payment

**User Story:** As a cashier, I want to split a payment across multiple methods, so that customers can pay using a combination of cash, card, and mobile money.

#### Acceptance Criteria

1. WHEN a cashier selects split payment, THE Payment_Processor SHALL allow adding multiple payment entries with different methods until the combined total equals or exceeds the grand total
2. THE Payment_Processor SHALL display the remaining balance after each partial payment is recorded
3. WHEN the combined payments equal or exceed the grand total, THE Payment_Processor SHALL complete the transaction and calculate any change due
4. THE Payment_Processor SHALL store each partial payment as a separate payment record linked to the same Sale_Transaction

### Requirement 12: Inventory Tracking

**User Story:** As a manager, I want real-time inventory tracking, so that I know current stock levels at all times.

#### Acceptance Criteria

1. THE Inventory_Manager SHALL maintain a current stock quantity for each product, updated after every sale and manual adjustment
2. WHEN a sale is completed, THE Inventory_Manager SHALL deduct the sold quantity from the product stock within the same database transaction as the sale record
3. WHEN a manager performs a manual stock adjustment, THE Inventory_Manager SHALL update the stock quantity and record the adjustment reason, adjusted quantity, and the user who performed the adjustment
4. THE Inventory_Manager SHALL prevent stock quantities from becoming negative

### Requirement 13: Low Stock Alerts

**User Story:** As a manager, I want to receive alerts when product stock falls below a threshold, so that I can reorder products before they run out.

#### Acceptance Criteria

1. THE Inventory_Manager SHALL allow a configurable low-stock threshold for each product
2. WHEN a product stock quantity falls at or below the configured threshold after a sale or adjustment, THE Inventory_Manager SHALL generate a low-stock alert visible on the Admin_Interface and Manager dashboard
3. THE Inventory_Manager SHALL include the product name, current stock quantity, and threshold value in each low-stock alert

### Requirement 14: Inventory Reports

**User Story:** As a manager, I want to view inventory reports, so that I can make informed restocking decisions.

#### Acceptance Criteria

1. WHEN a manager requests an inventory report, THE Report_Engine SHALL generate a report listing all products with current stock quantities, low-stock status, and last restocked date
2. THE Report_Engine SHALL support filtering the inventory report by product category
3. THE Report_Engine SHALL support exporting the inventory report in CSV format

### Requirement 15: Customer Management

**User Story:** As a manager, I want to manage customer records, so that I can track customer information and purchase history.

#### Acceptance Criteria

1. WHEN a manager or cashier creates a new customer record, THE Customer_Manager SHALL store Customer ID, Name, Phone, Email, Address, and Loyalty Points (initialized to zero)
2. THE Customer_Manager SHALL auto-generate a unique Customer ID for each new customer
3. WHEN a manager edits a customer record, THE Customer_Manager SHALL update the corresponding fields and persist the changes
4. WHEN a cashier searches for a customer by name or phone number, THE Customer_Manager SHALL return matching customer records within 500 milliseconds
5. THE Customer_Manager SHALL enforce that Phone and Email fields are unique across all customer records

### Requirement 16: Customer Loyalty Points

**User Story:** As a business owner, I want to reward repeat customers with loyalty points, so that customer retention is improved.

#### Acceptance Criteria

1. WHEN a Sale_Transaction is linked to a customer, THE Customer_Manager SHALL add loyalty points equal to the integer floor of the grand total (e.g., a $25.75 sale earns 25 points)
2. WHEN a cashier applies loyalty points as a discount, THE Customer_Manager SHALL deduct the redeemed points from the customer balance
3. THE Customer_Manager SHALL prevent redeeming more loyalty points than the customer currently holds
4. THE Customer_Manager SHALL display the customer current loyalty point balance when a customer is linked to a sale

### Requirement 17: Receipt Generation

**User Story:** As a cashier, I want to generate a receipt after each sale, so that the customer has a record of the transaction.

#### Acceptance Criteria

1. WHEN a Sale_Transaction is completed, THE Receipt_Generator SHALL produce a receipt containing: store name, store address, date and time, Sale ID, cashier name, list of items with name, quantity, unit price, and line total, subtotal, discount amount, tax amount, grand total, payment method, and amount tendered with change (for cash payments)
2. THE Receipt_Generator SHALL format the receipt for display in a preview window before printing
3. WHEN a cashier confirms the receipt preview, THE Receipt_Generator SHALL send the receipt to the configured output (printer or file)
4. THE Receipt_Generator SHALL support saving the receipt as a PDF file

### Requirement 18: Receipt Formatting Round-Trip

**User Story:** As a developer, I want receipt formatting to be verifiable through round-trip conversion, so that receipt data integrity is maintained.

#### Acceptance Criteria

1. THE Receipt_Generator SHALL format Sale_Transaction data into a structured receipt text format
2. THE Receipt_Generator SHALL support parsing a formatted receipt text back into structured Sale_Transaction data
3. FOR ALL valid Sale_Transaction records, formatting then parsing SHALL produce a data structure equivalent to the original Sale_Transaction data (round-trip property)

### Requirement 19: Daily Sales Report

**User Story:** As a manager, I want to view daily sales reports, so that I can monitor business performance.

#### Acceptance Criteria

1. WHEN a manager requests a daily sales report for a specific date, THE Report_Engine SHALL generate a report containing total number of transactions, total revenue, total tax collected, total discounts applied, and a breakdown by payment method
2. WHEN a manager requests a sales report for a date range, THE Report_Engine SHALL aggregate the data across all dates in the range
3. THE Report_Engine SHALL support exporting sales reports in CSV format

### Requirement 20: Product Sales Report

**User Story:** As a manager, I want to see which products sell the most, so that I can optimize inventory and promotions.

#### Acceptance Criteria

1. WHEN a manager requests a product sales report for a date range, THE Report_Engine SHALL list each product sold with total quantity sold and total revenue generated, sorted by quantity descending
2. THE Report_Engine SHALL support filtering the product sales report by product category
3. THE Report_Engine SHALL support exporting the product sales report in CSV format

### Requirement 21: Cashier Performance Report

**User Story:** As a manager, I want to view cashier performance reports, so that I can evaluate staff productivity.

#### Acceptance Criteria

1. WHEN a manager requests a cashier performance report for a date range, THE Report_Engine SHALL list each cashier with total number of transactions processed, total revenue processed, and average transaction value
2. THE Report_Engine SHALL support exporting the cashier performance report in CSV format

### Requirement 22: Profit Report

**User Story:** As a business owner, I want to view profit reports, so that I can understand business profitability.

#### Acceptance Criteria

1. WHEN a manager requests a profit report for a date range, THE Report_Engine SHALL calculate total revenue, total cost (based on product cost price), and gross profit for the period
2. THE Report_Engine SHALL display profit breakdown by product category
3. THE Report_Engine SHALL support exporting the profit report in CSV format

### Requirement 23: Database Backup

**User Story:** As an administrator, I want to back up the database, so that data can be recovered in case of failure.

#### Acceptance Criteria

1. WHEN an admin initiates a manual backup, THE Backup_Manager SHALL create a complete database backup file with a timestamped filename
2. THE Backup_Manager SHALL store backup files in a configurable backup directory
3. WHEN a backup completes successfully, THE Backup_Manager SHALL display a confirmation message with the backup file path and size
4. IF a backup operation fails, THEN THE Backup_Manager SHALL display an error message describing the failure reason

### Requirement 24: Database Restore

**User Story:** As an administrator, I want to restore the database from a backup, so that I can recover from data loss.

#### Acceptance Criteria

1. WHEN an admin selects a backup file for restore, THE Backup_Manager SHALL display a confirmation prompt warning that the current data will be overwritten
2. WHEN the admin confirms the restore, THE Backup_Manager SHALL replace the current database with the backup data
3. WHEN a restore completes successfully, THE Backup_Manager SHALL display a confirmation message and require all active users to re-authenticate
4. IF a restore operation fails, THEN THE Backup_Manager SHALL roll back to the pre-restore state and display an error message

### Requirement 25: Data Export

**User Story:** As an administrator, I want to export data tables, so that data can be used in external tools for analysis.

#### Acceptance Criteria

1. WHEN an admin selects a data table for export, THE Backup_Manager SHALL export the table contents in CSV format
2. THE Backup_Manager SHALL support exporting the following tables: Products, Sales, Sales_Items, Customers, Inventory, Payments, and Users (excluding password hashes)
3. THE Backup_Manager SHALL include column headers in the first row of each exported CSV file

### Requirement 26: Transaction Logging

**User Story:** As an administrator, I want all significant system actions to be logged, so that I can audit system usage and troubleshoot issues.

#### Acceptance Criteria

1. THE POS_System SHALL log each user login attempt (successful and failed) with timestamp, username, and result
2. THE POS_System SHALL log each Sale_Transaction completion with timestamp, Sale ID, cashier user ID, and grand total
3. THE POS_System SHALL log each product creation, update, and deletion with timestamp, user ID, and affected Product ID
4. THE POS_System SHALL log each inventory adjustment with timestamp, user ID, Product ID, and adjustment details
5. THE POS_System SHALL store log entries in a dedicated audit log table that is append-only and not editable by any user role

### Requirement 27: Database Schema

**User Story:** As a developer, I want a well-defined database schema, so that data is stored consistently and relationships are maintained.

#### Acceptance Criteria

1. THE POS_System SHALL maintain a Users table with fields: User_ID (primary key), Username (unique), Password_Hash, Full_Name, Role, Created_At, and Is_Active
2. THE POS_System SHALL maintain a Products table with fields: Product_ID (primary key), Name, Category, Price, Cost_Price, Stock_Quantity, Barcode (unique), Supplier, Is_Active, and Created_At
3. THE POS_System SHALL maintain a Sales table with fields: Sale_ID (primary key), Cashier_User_ID (foreign key to Users), Customer_ID (nullable foreign key to Customers), Sale_Date, Subtotal, Discount_Amount, Tax_Rate, Tax_Amount, Grand_Total
4. THE POS_System SHALL maintain a Sales_Items table with fields: Sale_Item_ID (primary key), Sale_ID (foreign key to Sales), Product_ID (foreign key to Products), Quantity, Unit_Price, Discount_Percent, Line_Total
5. THE POS_System SHALL maintain a Customers table with fields: Customer_ID (primary key), Name, Phone (unique), Email (unique), Address, Loyalty_Points, Created_At
6. THE POS_System SHALL maintain a Payments table with fields: Payment_ID (primary key), Sale_ID (foreign key to Sales), Payment_Method, Amount_Paid, Change_Given, Transaction_Reference, Card_Last_Four, Payment_Date
7. THE POS_System SHALL maintain an Inventory_Log table with fields: Log_ID (primary key), Product_ID (foreign key to Products), Adjustment_Type, Quantity_Changed, Reason, User_ID (foreign key to Users), Created_At
8. THE POS_System SHALL enforce referential integrity through foreign key constraints across all related tables

### Requirement 28: Hardware Integration (Optional)

**User Story:** As a business owner, I want the POS system to support barcode scanners and receipt printers, so that checkout is faster and more efficient.

#### Acceptance Criteria

1. WHERE barcode scanner hardware is connected, THE Cashier_Interface SHALL accept barcode input from the scanner and trigger a product lookup automatically
2. WHERE a receipt printer is configured, THE Receipt_Generator SHALL send formatted receipt data to the printer upon cashier confirmation
3. WHERE hardware is not available, THE POS_System SHALL operate using manual keyboard input and on-screen receipt display as fallback
