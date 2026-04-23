/**
 * Unit tests for the audit logging service.
 * Requirements: 26.1, 26.2, 26.3, 26.4, 26.5
 */
const { expect } = require('chai');
const { setupTestDB, teardownTestDB, getTestPool, cleanAllTables } = require('../../helpers/db-setup');

let loggerService;
let testPool;

describe('LoggerService', function () {
  this.timeout(30000);

  before(async function () {
    try {
      testPool = await setupTestDB();
    } catch (err) {
      this.skip(); // Skip if no DB available
      return;
    }

    // Replace the database pool module cache so loggerService uses the test pool
    const dbModulePath = require.resolve('../../../src/config/database');
    require.cache[dbModulePath] = {
      id: dbModulePath,
      filename: dbModulePath,
      loaded: true,
      exports: testPool
    };

    delete require.cache[require.resolve('../../../src/modules/logger/loggerService')];
    loggerService = require('../../../src/modules/logger/loggerService');
  });

  after(async function () {
    delete require.cache[require.resolve('../../../src/config/database')];
    delete require.cache[require.resolve('../../../src/modules/logger/loggerService')];
    try {
      await teardownTestDB();
    } catch (_) {
      // Ignore teardown errors if DB was never set up
    }
  });

  beforeEach(async function () {
    await cleanAllTables();
    // Insert a test user for userId lookups
    await testPool.query(
      "INSERT INTO Users (Username, Password_Hash, Full_Name, Role) VALUES (?, ?, ?, ?)",
      ['testadmin', '$2b$10$fakehashfakehashfakehashfakehashfakehashfakehashfake', 'Test Admin', 'Admin']
    );
  });

  describe('logEvent', function () {
    it('should insert a log entry with string details', async function () {
      await loggerService.logEvent('LOGIN_SUCCESS', 1, 'User logged in');

      const [rows] = await testPool.query('SELECT * FROM Audit_Log');
      expect(rows).to.have.lengthOf(1);
      expect(rows[0].Event_Type).to.equal('LOGIN_SUCCESS');
      expect(rows[0].User_ID).to.equal(1);
      expect(rows[0].Details).to.equal('User logged in');
      expect(rows[0].Created_At).to.be.an.instanceOf(Date);
    });

    it('should JSON-stringify object details', async function () {
      const details = { saleId: 42, grandTotal: 99.99 };
      await loggerService.logEvent('SALE_COMPLETED', 1, details);

      const [rows] = await testPool.query('SELECT * FROM Audit_Log');
      expect(rows).to.have.lengthOf(1);
      expect(rows[0].Details).to.equal(JSON.stringify(details));
    });

    it('should allow null userId for login failure events', async function () {
      await loggerService.logEvent('LOGIN_FAILURE', null, 'Invalid credentials', 'unknownuser');

      const [rows] = await testPool.query('SELECT * FROM Audit_Log');
      expect(rows).to.have.lengthOf(1);
      expect(rows[0].User_ID).to.be.null;
      expect(rows[0].Username).to.equal('unknownuser');
    });

    it('should resolve username from userId when not provided', async function () {
      await loggerService.logEvent('PRODUCT_CREATED', 1, 'Created product X');

      const [rows] = await testPool.query('SELECT * FROM Audit_Log');
      expect(rows).to.have.lengthOf(1);
      expect(rows[0].Username).to.equal('testadmin');
    });

    it('should use provided username over lookup', async function () {
      await loggerService.logEvent('LOGIN_SUCCESS', 1, 'Logged in', 'customname');

      const [rows] = await testPool.query('SELECT * FROM Audit_Log');
      expect(rows).to.have.lengthOf(1);
      expect(rows[0].Username).to.equal('customname');
    });

    it('should not throw on database errors', async function () {
      // Log with an event type that exceeds VARCHAR(50) — should be caught silently
      const longType = 'X'.repeat(100);
      await loggerService.logEvent(longType, 1, 'test');
      // No exception means success
    });

    it('should support all defined event types', async function () {
      for (const eventType of loggerService.EVENT_TYPES) {
        await loggerService.logEvent(eventType, 1, `Testing ${eventType}`);
      }

      const [rows] = await testPool.query('SELECT * FROM Audit_Log ORDER BY Log_ID');
      expect(rows).to.have.lengthOf(loggerService.EVENT_TYPES.length);

      for (let i = 0; i < loggerService.EVENT_TYPES.length; i++) {
        expect(rows[i].Event_Type).to.equal(loggerService.EVENT_TYPES[i]);
      }
    });
  });

  describe('getAuditLogs', function () {
    beforeEach(async function () {
      await loggerService.logEvent('LOGIN_SUCCESS', 1, 'Login 1');
      await loggerService.logEvent('LOGIN_FAILURE', null, 'Bad password', 'baduser');
      await loggerService.logEvent('SALE_COMPLETED', 1, { saleId: 1, grandTotal: 50.00 });
      await loggerService.logEvent('PRODUCT_CREATED', 1, 'Created product');
    });

    it('should return all logs when no filters provided', async function () {
      const logs = await loggerService.getAuditLogs();
      expect(logs).to.have.lengthOf(4);
    });

    it('should filter by eventType', async function () {
      const logs = await loggerService.getAuditLogs({ eventType: 'LOGIN_SUCCESS' });
      expect(logs).to.have.lengthOf(1);
      expect(logs[0].Event_Type).to.equal('LOGIN_SUCCESS');
    });

    it('should filter by userId', async function () {
      const logs = await loggerService.getAuditLogs({ userId: 1 });
      expect(logs).to.have.lengthOf(3); // LOGIN_SUCCESS, SALE_COMPLETED, PRODUCT_CREATED
      logs.forEach(log => expect(log.User_ID).to.equal(1));
    });

    it('should return results ordered by Created_At descending', async function () {
      const logs = await loggerService.getAuditLogs();
      for (let i = 1; i < logs.length; i++) {
        expect(logs[i - 1].Created_At.getTime()).to.be.at.least(logs[i].Created_At.getTime());
      }
    });

    it('should return empty array when no logs match filter', async function () {
      const logs = await loggerService.getAuditLogs({ eventType: 'BACKUP_CREATED' });
      expect(logs).to.be.an('array').that.is.empty;
    });

    it('should filter by date range', async function () {
      const now = new Date();
      const past = new Date(now.getTime() - 60000);
      const future = new Date(now.getTime() + 60000);

      const logs = await loggerService.getAuditLogs({
        dateRange: { start: past, end: future }
      });
      expect(logs).to.have.lengthOf(4);
    });
  });

  describe('EVENT_TYPES', function () {
    it('should export all required event types', function () {
      const required = [
        'LOGIN_SUCCESS', 'LOGIN_FAILURE', 'SALE_COMPLETED',
        'PRODUCT_CREATED', 'PRODUCT_UPDATED', 'PRODUCT_DELETED',
        'INVENTORY_ADJUSTED', 'BACKUP_CREATED', 'BACKUP_RESTORED'
      ];
      required.forEach(type => {
        expect(loggerService.EVENT_TYPES).to.include(type);
      });
    });
  });
});
