/**
 * Session management and authentication service.
 * Validates: Requirements 1.1, 1.2, 1.6, 1.7
 */
const { getUserByUsername } = require('./userService');
const { verifyPassword } = require('./authService');
const AppError = require('../../utils/AppError');

const SESSION_TIMEOUT_MS = 8 * 60 * 60 * 1000; // 8 hours

/**
 * Authenticate a user with username and password.
 * @param {string} username
 * @param {string} password
 * @returns {Promise<object>} The user record (without password hash)
 * @throws {AppError} 401 AUTH_FAILED on invalid credentials or inactive user
 */
async function authenticate(username, password) {
  const user = await getUserByUsername(username);

  if (!user) {
    throw new AppError('Invalid credentials', 401, 'AUTH_FAILED');
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    throw new AppError('Invalid credentials', 401, 'AUTH_FAILED');
  }

  if (!user.isActive) {
    throw new AppError('Invalid credentials', 401, 'AUTH_FAILED');
  }

  return {
    userId: user.userId,
    username: user.username,
    fullName: user.fullName,
    role: user.role
  };
}

/**
 * Store user data in the express session.
 * @param {object} req - Express request object
 * @param {object} user - { userId, username, fullName, role }
 */
function createSession(req, user) {
  req.session.userId = user.userId;
  req.session.username = user.username;
  req.session.fullName = user.fullName;
  req.session.role = user.role;
  req.session.lastActivity = Date.now();
}

/**
 * Destroy the current session.
 * @param {object} req - Express request object
 * @returns {Promise<void>}
 */
function destroySession(req) {
  return new Promise((resolve, reject) => {
    req.session.destroy((err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

/**
 * Validate the current session and check idle timeout.
 * @param {object} req - Express request object
 * @returns {boolean} true if session is valid
 */
function validateSession(req) {
  if (!req.session || !req.session.userId) {
    return false;
  }

  const now = Date.now();
  const lastActivity = req.session.lastActivity || 0;

  if (now - lastActivity > SESSION_TIMEOUT_MS) {
    return false;
  }

  return true;
}

module.exports = {
  authenticate,
  createSession,
  destroySession,
  validateSession,
  SESSION_TIMEOUT_MS
};
