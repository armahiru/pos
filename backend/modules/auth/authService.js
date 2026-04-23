/**
 * Authentication service utilities.
 * Provides password hashing and verification using bcrypt.
 */
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

/**
 * Hash a plaintext password using bcrypt.
 * @param {string} plaintext - The plaintext password to hash.
 * @returns {Promise<string>} The bcrypt hash string.
 */
async function hashPassword(plaintext) {
  return bcrypt.hash(plaintext, SALT_ROUNDS);
}

/**
 * Verify a plaintext password against a bcrypt hash.
 * @param {string} plaintext - The plaintext password to check.
 * @param {string} hash - The bcrypt hash to compare against.
 * @returns {Promise<boolean>} True if the password matches the hash.
 */
async function verifyPassword(plaintext, hash) {
  return bcrypt.compare(plaintext, hash);
}

module.exports = {
  hashPassword,
  verifyPassword
};
