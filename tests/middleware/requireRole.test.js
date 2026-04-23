/**
 * Unit tests for requireRole middleware.
 * Validates: Requirements 1.5, 2.3, 2.4, 2.5
 */
const { expect } = require('chai');
const { requireRole, ROLE_LEVELS } = require('../../src/middleware/requireRole');

describe('requireRole middleware', function () {
  function mockRes() {
    const res = {
      _status: null,
      _json: null,
      status(code) { res._status = code; return res; },
      json(data) { res._json = data; return res; }
    };
    return res;
  }

  function mockReq(role) {
    return { user: { userId: 1, username: 'test', fullName: 'Test User', role } };
  }

  // --- Role hierarchy ---

  describe('ROLE_LEVELS', function () {
    it('should define Cashier < Manager < Admin', function () {
      expect(ROLE_LEVELS.Cashier).to.be.lessThan(ROLE_LEVELS.Manager);
      expect(ROLE_LEVELS.Manager).to.be.lessThan(ROLE_LEVELS.Admin);
    });
  });

  // --- Factory validation ---

  describe('factory function', function () {
    it('should throw for an invalid minimum role', function () {
      expect(() => requireRole('SuperAdmin')).to.throw('Invalid role');
    });

    it('should return a function for valid roles', function () {
      expect(requireRole('Cashier')).to.be.a('function');
      expect(requireRole('Manager')).to.be.a('function');
      expect(requireRole('Admin')).to.be.a('function');
    });
  });

  // --- Access granted scenarios ---

  describe('access granted', function () {
    it('should allow Cashier when minimum role is Cashier', function () {
      const mw = requireRole('Cashier');
      const req = mockReq('Cashier');
      const res = mockRes();
      let nextCalled = false;

      mw(req, res, () => { nextCalled = true; });

      expect(nextCalled).to.be.true;
      expect(res._status).to.be.null;
    });

    it('should allow Manager when minimum role is Cashier', function () {
      const mw = requireRole('Cashier');
      const req = mockReq('Manager');
      const res = mockRes();
      let nextCalled = false;

      mw(req, res, () => { nextCalled = true; });

      expect(nextCalled).to.be.true;
    });

    it('should allow Admin when minimum role is Cashier', function () {
      const mw = requireRole('Cashier');
      const req = mockReq('Admin');
      const res = mockRes();
      let nextCalled = false;

      mw(req, res, () => { nextCalled = true; });

      expect(nextCalled).to.be.true;
    });

    it('should allow Manager when minimum role is Manager', function () {
      const mw = requireRole('Manager');
      const req = mockReq('Manager');
      const res = mockRes();
      let nextCalled = false;

      mw(req, res, () => { nextCalled = true; });

      expect(nextCalled).to.be.true;
    });

    it('should allow Admin when minimum role is Manager', function () {
      const mw = requireRole('Manager');
      const req = mockReq('Admin');
      const res = mockRes();
      let nextCalled = false;

      mw(req, res, () => { nextCalled = true; });

      expect(nextCalled).to.be.true;
    });

    it('should allow Admin when minimum role is Admin', function () {
      const mw = requireRole('Admin');
      const req = mockReq('Admin');
      const res = mockRes();
      let nextCalled = false;

      mw(req, res, () => { nextCalled = true; });

      expect(nextCalled).to.be.true;
    });
  });

  // --- Access denied scenarios ---

  describe('access denied', function () {
    it('should deny Cashier when minimum role is Manager', function () {
      const mw = requireRole('Manager');
      const req = mockReq('Cashier');
      const res = mockRes();
      let nextCalled = false;

      mw(req, res, () => { nextCalled = true; });

      expect(nextCalled).to.be.false;
      expect(res._status).to.equal(403);
      expect(res._json.success).to.be.false;
      expect(res._json.error.code).to.equal('ACCESS_DENIED');
    });

    it('should deny Cashier when minimum role is Admin', function () {
      const mw = requireRole('Admin');
      const req = mockReq('Cashier');
      const res = mockRes();
      let nextCalled = false;

      mw(req, res, () => { nextCalled = true; });

      expect(nextCalled).to.be.false;
      expect(res._status).to.equal(403);
    });

    it('should deny Manager when minimum role is Admin', function () {
      const mw = requireRole('Admin');
      const req = mockReq('Manager');
      const res = mockRes();
      let nextCalled = false;

      mw(req, res, () => { nextCalled = true; });

      expect(nextCalled).to.be.false;
      expect(res._status).to.equal(403);
      expect(res._json.error.code).to.equal('ACCESS_DENIED');
    });
  });

  // --- Edge cases ---

  describe('edge cases', function () {
    it('should return 401 when req.user is missing', function () {
      const mw = requireRole('Cashier');
      const req = {};
      const res = mockRes();
      let nextCalled = false;

      mw(req, res, () => { nextCalled = true; });

      expect(nextCalled).to.be.false;
      expect(res._status).to.equal(401);
      expect(res._json.error.code).to.equal('AUTH_FAILED');
    });

    it('should return 401 when req.user.role is missing', function () {
      const mw = requireRole('Cashier');
      const req = { user: { userId: 1 } };
      const res = mockRes();
      let nextCalled = false;

      mw(req, res, () => { nextCalled = true; });

      expect(nextCalled).to.be.false;
      expect(res._status).to.equal(401);
    });

    it('should return 403 for an unrecognized user role', function () {
      const mw = requireRole('Cashier');
      const req = mockReq('Intern');
      const res = mockRes();
      let nextCalled = false;

      mw(req, res, () => { nextCalled = true; });

      expect(nextCalled).to.be.false;
      expect(res._status).to.equal(403);
      expect(res._json.error.code).to.equal('ACCESS_DENIED');
    });
  });
});
