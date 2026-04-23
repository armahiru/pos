/**
 * Unit tests for requireAuth middleware.
 * Validates: Requirements 1.5, 1.7
 */
const { expect } = require('chai');
const { SESSION_TIMEOUT_MS } = require('../../src/modules/auth/sessionService');

// We test the middleware in isolation with mock req/res objects
let requireAuth;

describe('requireAuth middleware', function () {
  before(function () {
    // Clear cache to ensure fresh import
    delete require.cache[require.resolve('../../src/middleware/requireAuth')];
    requireAuth = require('../../src/middleware/requireAuth');
  });

  function mockRes() {
    const res = {
      _status: null,
      _json: null,
      status(code) { res._status = code; return res; },
      json(data) { res._json = data; return res; }
    };
    return res;
  }

  it('should return 401 AUTH_FAILED when no session exists', async function () {
    const req = { session: {} };
    const res = mockRes();
    let nextCalled = false;

    await requireAuth(req, res, () => { nextCalled = true; });

    expect(res._status).to.equal(401);
    expect(res._json.success).to.be.false;
    expect(res._json.error.code).to.equal('AUTH_FAILED');
    expect(nextCalled).to.be.false;
  });

  it('should return 401 SESSION_EXPIRED when idle timeout exceeded', async function () {
    const req = {
      session: {
        userId: 1,
        username: 'test',
        fullName: 'Test',
        role: 'Cashier',
        lastActivity: Date.now() - (16 * 60 * 1000), // 16 minutes ago
        destroy(cb) { cb(null); }
      }
    };
    const res = mockRes();
    let nextCalled = false;

    await requireAuth(req, res, () => { nextCalled = true; });

    expect(res._status).to.equal(401);
    expect(res._json.error.code).to.equal('SESSION_EXPIRED');
    expect(nextCalled).to.be.false;
  });

  it('should call next() and attach req.user for valid session', async function () {
    const req = {
      session: {
        userId: 5,
        username: 'cashier1',
        fullName: 'Carol Cashier',
        role: 'Cashier',
        lastActivity: Date.now()
      }
    };
    const res = mockRes();
    let nextCalled = false;

    await requireAuth(req, res, () => { nextCalled = true; });

    expect(nextCalled).to.be.true;
    expect(req.user).to.deep.include({
      userId: 5,
      username: 'cashier1',
      fullName: 'Carol Cashier',
      role: 'Cashier'
    });
  });

  it('should update lastActivity on valid request', async function () {
    const oldActivity = Date.now() - (5 * 60 * 1000); // 5 minutes ago
    const req = {
      session: {
        userId: 1,
        username: 'test',
        fullName: 'Test',
        role: 'Admin',
        lastActivity: oldActivity
      }
    };
    const res = mockRes();

    await requireAuth(req, res, () => {});

    expect(req.session.lastActivity).to.be.greaterThan(oldActivity);
    expect(req.session.lastActivity).to.be.closeTo(Date.now(), 1000);
  });

  it('should handle session destroy failure gracefully on expiry', async function () {
    const req = {
      session: {
        userId: 1,
        username: 'test',
        fullName: 'Test',
        role: 'Cashier',
        lastActivity: Date.now() - (SESSION_TIMEOUT_MS + 1000),
        destroy(cb) { cb(new Error('destroy failed')); }
      }
    };
    const res = mockRes();

    await requireAuth(req, res, () => {});

    // Should still return SESSION_EXPIRED even if destroy fails
    expect(res._status).to.equal(401);
    expect(res._json.error.code).to.equal('SESSION_EXPIRED');
  });
});
