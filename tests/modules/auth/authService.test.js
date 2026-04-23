/**
 * Unit tests for authService - password hashing and verification.
 * Validates: Requirements 1.4
 */
const { expect } = require('chai');
const { hashPassword, verifyPassword } = require('../../../src/modules/auth/authService');

describe('authService', () => {
  describe('hashPassword', () => {
    it('should return a bcrypt hash that differs from the plaintext', async () => {
      const plaintext = 'MySecret@123';
      const hash = await hashPassword(plaintext);

      expect(hash).to.be.a('string');
      expect(hash).to.not.equal(plaintext);
      // bcrypt hashes start with $2b$ (or $2a$)
      expect(hash).to.match(/^\$2[ab]\$/);
    });

    it('should produce different hashes for the same plaintext (unique salts)', async () => {
      const plaintext = 'SamePassword';
      const hash1 = await hashPassword(plaintext);
      const hash2 = await hashPassword(plaintext);

      expect(hash1).to.not.equal(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should return true when plaintext matches the hash', async () => {
      const plaintext = 'CorrectPassword1';
      const hash = await hashPassword(plaintext);

      const result = await verifyPassword(plaintext, hash);
      expect(result).to.be.true;
    });

    it('should return false when plaintext does not match the hash', async () => {
      const plaintext = 'CorrectPassword1';
      const hash = await hashPassword(plaintext);

      const result = await verifyPassword('WrongPassword', hash);
      expect(result).to.be.false;
    });

    it('should handle empty string passwords', async () => {
      const plaintext = '';
      const hash = await hashPassword(plaintext);

      expect(await verifyPassword('', hash)).to.be.true;
      expect(await verifyPassword('notempty', hash)).to.be.false;
    });
  });
});
