/**
 * Authentication middleware.
 * Checks for a valid, non-expired session and attaches user info to req.user.
 * Validates: Requirements 1.5, 1.7
 */
const { validateSession, destroySession, SESSION_TIMEOUT_MS } = require('../modules/auth/sessionService');

/**
 * Middleware that requires an authenticated session.
 * - Rejects with 401 AUTH_FAILED if no session exists
 * - Rejects with 401 SESSION_EXPIRED if idle timeout exceeded
 * - Updates lastActivity and attaches req.user on success
 */
async function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      success: false,
      error: { code: 'AUTH_FAILED', message: 'Authentication required' }
    });
  }

  const now = Date.now();
  const lastActivity = req.session.lastActivity || 0;

  if (now - lastActivity > SESSION_TIMEOUT_MS) {
    try {
      await destroySession(req);
    } catch (_) {
      // Session destruction failed — still return expired
    }
    return res.status(401).json({
      success: false,
      error: { code: 'SESSION_EXPIRED', message: 'Session has expired due to inactivity' }
    });
  }

  // Session is valid — update activity timestamp and attach user info
  req.session.lastActivity = Date.now();
  req.user = {
    userId: req.session.userId,
    username: req.session.username,
    fullName: req.session.fullName,
    role: req.session.role
  };

  next();
}

module.exports = requireAuth;
