/**
 * Unit tests for userService - User CRUD operations.
 * Validates: Requirements 2.1, 2.2, 2.6
 */
const { expect } = require('chai');
const { setupTestDB, teardownTestDB, getTestPool, cleanAllTables } = require('../../helpers/db-setup');
const { sampleUsers } = require('../../helpers/fixtures');

// We need to override the pool used by userService with the test pool.
// We'll do this by replacing the cached module for database.js.
let userService;

describe('userService', function () {
  this.timeout(30000);

  before(async function () {
    const testPool = await setupTestDB();
    // Replace the database pool module cache so userService uses the test pool
    const dbModulePath = require.resolve('../../../src/config/database');
    require.cache[dbModulePath] = {
      id: dbModulePath,
      filename: dbModulePath,
      loaded: true,
      exports: testPool
    };
    // Clear userService cache so it picks up the new pool
    delete require.cache[require.resolve('../../../src/modules/auth/userService')];
    userService = require('../../../src/modules/auth/userService');
  });

  after(async function () {
    await teardownTestDB();
  });

  beforeEach(async function () {
    await cleanAllTables();
  });

  describe('createUser', function () {
    it('should create a user and return user object without password hash', async function () {
      const data = sampleUsers[0];
      const user = await userService.createUser(data);

      expect(user).to.have.property('userId').that.is.a('number');
      expect(user.username).to.equal(data.username);
      expect(user.fullName).to.equal(data.fullName);
      expect(user.role).to.equal(data.role);
      expect(user.isActive).to.be.true;
      expect(user).to.not.have.property('passwordHash');
      expect(user).to.not.have.property('password');
    });

    it('should reject when username is missing', async function () {
      try {
        await userService.createUser({ password: 'pass123', fullName: 'Test', role: 'Cashier' });
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err.statusCode).to.equal(400);
        expect(err.code).to.equal('VALIDATION_ERROR');
      }
    });

    it('should reject when password is missing', async function () {
      try {
        await userService.createUser({ username: 'testuser', fullName: 'Test', role: 'Cashier' });
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err.statusCode).to.equal(400);
        expect(err.code).to.equal('VALIDATION_ERROR');
      }
    });

    it('should reject when fullName is missing', async function () {
      try {
        await userService.createUser({ username: 'testuser', password: 'pass123', role: 'Cashier' });
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err.statusCode).to.equal(400);
        expect(err.code).to.equal('VALIDATION_ERROR');
      }
    });

    it('should reject when role is missing', async function () {
      try {
        await userService.createUser({ username: 'testuser', password: 'pass123', fullName: 'Test' });
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err.statusCode).to.equal(400);
        expect(err.code).to.equal('VALIDATION_ERROR');
      }
    });

    it('should reject invalid role', async function () {
      try {
        await userService.createUser({ username: 'testuser', password: 'pass123', fullName: 'Test', role: 'SuperAdmin' });
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err.statusCode).to.equal(400);
        expect(err.code).to.equal('VALIDATION_ERROR');
      }
    });

    it('should reject duplicate username', async function () {
      await userService.createUser(sampleUsers[0]);
      try {
        await userService.createUser({ ...sampleUsers[0], fullName: 'Different Name' });
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err.statusCode).to.equal(409);
        expect(err.code).to.equal('CONFLICT');
      }
    });

    it('should hash the password (not store plaintext)', async function () {
      const data = sampleUsers[0];
      const user = await userService.createUser(data);
      // Fetch from DB directly to verify hash
      const dbUser = await userService.getUserByUsername(data.username);
      expect(dbUser.passwordHash).to.not.equal(data.password);
      expect(dbUser.passwordHash).to.match(/^\$2[ab]\$/);
    });
  });

  describe('updateUser', function () {
    it('should update user fields and return updated user', async function () {
      const created = await userService.createUser(sampleUsers[0]);
      const updated = await userService.updateUser(created.userId, { fullName: 'Updated Name', role: 'Manager' });

      expect(updated.fullName).to.equal('Updated Name');
      expect(updated.role).to.equal('Manager');
      expect(updated.username).to.equal(sampleUsers[0].username);
    });

    it('should reject when user not found', async function () {
      try {
        await userService.updateUser(99999, { fullName: 'Ghost' });
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err.statusCode).to.equal(404);
        expect(err.code).to.equal('NOT_FOUND');
      }
    });

    it('should reject invalid role on update', async function () {
      const created = await userService.createUser(sampleUsers[0]);
      try {
        await userService.updateUser(created.userId, { role: 'InvalidRole' });
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err.statusCode).to.equal(400);
        expect(err.code).to.equal('VALIDATION_ERROR');
      }
    });

    it('should deactivate a user', async function () {
      const created = await userService.createUser(sampleUsers[0]);
      const updated = await userService.updateUser(created.userId, { isActive: false });
      expect(updated.isActive).to.be.false;
    });

    it('should reject duplicate username on update', async function () {
      await userService.createUser(sampleUsers[0]);
      const second = await userService.createUser(sampleUsers[1]);
      try {
        await userService.updateUser(second.userId, { username: sampleUsers[0].username });
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err.statusCode).to.equal(409);
        expect(err.code).to.equal('CONFLICT');
      }
    });
  });

  describe('listUsers', function () {
    it('should return all users without password hashes', async function () {
      await userService.createUser(sampleUsers[0]);
      await userService.createUser(sampleUsers[1]);

      const users = await userService.listUsers();
      expect(users).to.have.length(2);
      for (const user of users) {
        expect(user).to.have.property('userId');
        expect(user).to.have.property('username');
        expect(user).to.have.property('fullName');
        expect(user).to.have.property('role');
        expect(user).to.not.have.property('passwordHash');
        expect(user).to.not.have.property('Password_Hash');
      }
    });

    it('should return empty array when no users exist', async function () {
      const users = await userService.listUsers();
      expect(users).to.be.an('array').with.length(0);
    });
  });

  describe('getUserById', function () {
    it('should return user by ID without password hash', async function () {
      const created = await userService.createUser(sampleUsers[0]);
      const user = await userService.getUserById(created.userId);

      expect(user).to.not.be.null;
      expect(user.userId).to.equal(created.userId);
      expect(user.username).to.equal(sampleUsers[0].username);
      expect(user).to.not.have.property('passwordHash');
    });

    it('should return null for non-existent ID', async function () {
      const user = await userService.getUserById(99999);
      expect(user).to.be.null;
    });
  });

  describe('getUserByUsername', function () {
    it('should return user with password hash for auth', async function () {
      await userService.createUser(sampleUsers[0]);
      const user = await userService.getUserByUsername(sampleUsers[0].username);

      expect(user).to.not.be.null;
      expect(user.username).to.equal(sampleUsers[0].username);
      expect(user).to.have.property('passwordHash').that.is.a('string');
      expect(user.passwordHash).to.match(/^\$2[ab]\$/);
    });

    it('should return null for non-existent username', async function () {
      const user = await userService.getUserByUsername('nonexistent');
      expect(user).to.be.null;
    });
  });
});
