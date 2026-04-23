/**
 * Test database setup and teardown helpers.
 * Creates a separate pos_system_test database by executing the schema.sql,
 * and provides lifecycle hooks for test suites.
 */
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const TEST_DB_NAME = 'pos_system_test';

let testPool = null;

/**
 * Create a connection pool for the test database.
 */
function createTestPool() {
  return mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: TEST_DB_NAME,
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true
  });
}

/**
 * Set up the test database by reading and executing schema.sql.
 * Creates the database, applies the schema, and initialises the connection pool.
 */
async function setupTestDB() {
  // Connect without selecting a database so we can CREATE/DROP the test DB
  const rootConn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    multipleStatements: true
  });

  try {
    // Drop and recreate the test database
    await rootConn.query(`DROP DATABASE IF EXISTS \`${TEST_DB_NAME}\``);
    await rootConn.query(`CREATE DATABASE \`${TEST_DB_NAME}\``);
    await rootConn.query(`USE \`${TEST_DB_NAME}\``);

    // Read schema.sql and rewrite it to target the test database
    const schemaPath = path.join(__dirname, '..', '..', 'src', 'database', 'schema.sql');
    let schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // Replace the production database name with the test database name
    schemaSql = schemaSql.replace(/CREATE DATABASE IF NOT EXISTS pos_system;/, `CREATE DATABASE IF NOT EXISTS \`${TEST_DB_NAME}\`;`);
    schemaSql = schemaSql.replace(/USE pos_system;/, `USE \`${TEST_DB_NAME}\`;`);

    await rootConn.query(schemaSql);
  } finally {
    await rootConn.end();
  }

  // Create the pool pointing at the test database
  testPool = createTestPool();
  return testPool;
}

/**
 * Tear down the test database: close the pool and drop the database.
 */
async function teardownTestDB() {
  if (testPool) {
    await testPool.end();
    testPool = null;
  }

  const rootConn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    multipleStatements: true
  });

  try {
    await rootConn.query(`DROP DATABASE IF EXISTS \`${TEST_DB_NAME}\``);
  } finally {
    await rootConn.end();
  }
}

/**
 * Get the current test database connection pool.
 * Must call setupTestDB() first.
 */
function getTestPool() {
  if (!testPool) {
    throw new Error('Test database not initialised. Call setupTestDB() first.');
  }
  return testPool;
}

/**
 * Truncate all data tables (preserving schema) for a clean state between tests.
 * Disables FK checks temporarily so truncation order doesn't matter.
 */
async function cleanAllTables() {
  const pool = getTestPool();
  const tables = [
    'Audit_Log',
    'Inventory_Log',
    'Payments',
    'Sales_Items',
    'Sales',
    'Customers',
    'Products',
    'Users',
    'System_Config'
  ];

  await pool.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const table of tables) {
    await pool.query(`TRUNCATE TABLE \`${table}\``);
  }
  await pool.query('SET FOREIGN_KEY_CHECKS = 1');

  // Re-insert default system config
  await pool.query("INSERT INTO System_Config (Config_Key, Config_Value) VALUES ('tax_rate', '16')");
}

module.exports = {
  setupTestDB,
  teardownTestDB,
  getTestPool,
  cleanAllTables,
  TEST_DB_NAME
};
