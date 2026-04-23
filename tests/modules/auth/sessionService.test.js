/**
 * Unit tests for sessionService - authentication and session management.
 * Validates: Requirements 1.1, 1.2, 1.3, 1.6, 1.7
 */
const { expect } = require('chai');
const { setupTestDB, teardownTestDB, cleanAllTables } = require('../../helpers/db-setup');
const { sampleUsers } = require('../../helpers/fixtures');

let sessionService;
let userService;

/**
 * Pure logic tests — no database required.
 */
describe('sessionService (pure logic)', function () {
  before(function () {
    // Import without DB dependency for pure session logic tests
    delete require.cache[require.resolve('../../../src/modules/auth/sessionService')];
    sessionService = require('../../../src/modules/auth/sessionService');
  });

  describe('createSession', function () {
    it('should store user data in req.session', function () {
      const req = { session: {} };
      const user = { userId: 1, username: 'testuser', fullName: 'Test User', role: 'Cashier' };

      sessionService.createSession(req, user);

      expect(req.session.userId).to.equal(1);
      expect(req.session.username).to.equal('testuser');
      expect(req.session.fullName).to.equal('Test User');
      expect(req.session.role).to.equal('Cashier');
      expect(req.session.lastActivity).to.be.a('number');
      expect(req.session.lastActivity).to.be.closeTo(Date.now(), 1000);
    });
  });

  describe('destroySession', function () {
    it('should call req.session.destroy', async function () {
      let destroyed = false;
      const req = {
        session: {
          userId: 1,
          destroy(cb) { destroyed = true; cb(null); }
        }
      };

      await sessionService.destroySession(req);
      expect(destroyed).to.be.true;
    });

    it('should reject if session.destroy fails', async function () {
      const req = {
        session: {
          destroy(cb) { cb(new Error('destroy failed')); }
        }
      };

      try {
        await sessionService.destroySession(req);
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err.message).to.equal('destroy failed');
      }
    });
  });

  describe('validateSession', function () {
    it('should return true for a valid, recent session', function () {
      const req = {
        session: { userId: 1, lastActivity: Date.now() }
      };
      expect(sessionService.validateSession(req)).to.be.true;
    });

    it('should return false when no session exists', function () {
      expect(sessionService.validateSession({ session: {} })).to.be.false;
      expect(sessionService.validateSession({})).to.be.false;
    });

    it('should return false when session has no userId', function () {
      const req = { session: { lastActivity: Date.now() } };
      expect(sessionService.validateSession(req)).to.be.false;
    });

    it('should return false when idle timeout exceeded', function () {
      const req = {
        session: {
          userId: 1,
          lastActivity: Date.now() - (16 * 60 * 1000) // 16 minutes ago
        }
      };
      expect(sessionService.validateSession(req)).to.be.false;
    });

    it('should return true at exactly 15-minute boundary', function () {
      const req = {
        session: {
          userId: 1,
          lastActivity: Date.now() - (15 * 60 * 1000)
        }
      };
      // Requirement 1.7: "idle for MORE than 15 minutes" — exactly 15 min is still valid
      expect(sessionService.validateSession(req)).to.be.true;
    });

    it('should return true just before timeout', function () {
      const req = {
        session: {
          userId: 1,
          lastActivity: Date.now() - (14 * 60 * 1000 + 59 * 1000) // ~14:59
        }
      };
      expect(sessionService.validateSession(req)).to.be.true;
    });
  });
});

/**
 * Database-dependent tests — require MySQL.
 */
describe('sessionService (authenticate)', function () {
  this.timeout(30000);

  before(async function () {
    let testPool;
    try {
      testPool = await setupTestDB();
    } catch (err) {
      this.skip(); // Skip if no DB available
      return;
    }
    // Replace the database pool module cache so services use the test pool
    const dbModulePath = require.resolve('../../../src/config/database');
    require.cache[dbModulePath] = {
      id: dbModulePath,
      filename: dbModulePath,
      loaded: true,
      exports: testPool
    };
    // Clear module caches so they pick up the test pool
    delete require.cache[require.resolve('../../../src/modules/auth/userService')];
    delete require.cache[require.resolve('../../../src/modules/auth/sessionService')];
    userService = require('../../../src/modules/auth/userService');
    sessionService = require('../../../src/modules/auth/sessionService');
  });

  after(async function () {
    try {
      await teardownTestDB();
    } catch (_) {
      // Ignore teardown errors if DB was never set up
    }
  });

  beforeEach(async function () {
    await cleanAllTables();
  });

  describe('authenticate', function () {
    it('should return user object on valid credentials', async function () {
      await userService.createUser(sampleUsers[2]); // cashier1
      const result = await sessionService.authenticate(sampleUsers[2].username, sampleUsers[2].password);

      expect(result).to.have.property('userId').that.is.a('number');
      expect(result.username).to.equal(sampleUsers[2].username);
      expect(result.fullName).to.equal(sampleUsers[2].fullName);
      expect(result.role).to.equal(sampleUsers[2].role);
      expect(result).to.not.have.property('passwordHash');
    });

    it('should throw AUTH_FAILED for non-existent username', async function () {
      try {
        await sessionService.authenticate('nonexistent', 'password');
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err.statusCode).to.equal(401);
        expect(err.code).to.equal('AUTH_FAILED');
        expect(err.message).to.equal('Invalid credentials');
      }
    });

    it('should throw AUTH_FAILED for wrong password', async function () {
      await userService.createUser(sampleUsers[0]);
      try {
        await sessionService.authenticate(sampleUsers[0].username, 'WrongPassword!');
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err.statusCode).to.equal(401);
        expect(err.code).to.equal('AUTH_FAILED');
        expect(err.message).to.equal('Invalid credentials');
      }
    });

    it('should not reveal whether username or password is wrong', async function () {
      await userService.createUser(sampleUsers[0]);

      let errBadUser, errBadPass;
      try {
        await sessionService.authenticate('nonexistent', sampleUsers[0].password);
      } catch (e) { errBadUser = e; }

      try {
        await sessionService.authenticate(sampleUsers[0].username, 'WrongPassword!');
      } catch (e) { errBadPass = e; }

      expect(errBadUser.message).to.equal(errBadPass.message);
      expect(errBadUser.code).to.equal(errBadPass.code);
      expect(errBadUser.statusCode).to.equal(errBadPass.statusCode);
    });

    it('should throw AUTH_FAILED for inactive user', async function () {
      const created = await userService.createUser(sampleUsers[0]);
      await userService.updateUser(created.userId, { isActive: false });

      try {
        await sessionService.authenticate(sampleUsers[0].username, sampleUsers[0].password);
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err.statusCode).to.equal(401);
        expect(err.code).to.equal('AUTH_FAILED');
      }
    });
  });
});
