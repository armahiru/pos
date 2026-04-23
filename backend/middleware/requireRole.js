/**
 * Role-based access control middleware.
 * Enforces a role hierarchy: Cashier (1) < Manager (2) < Admin (3).
 * Must be used AFTER requireAuth (expects req.user to be set).
 * Validates: Requirements 1.5, 2.3, 2.4, 2.5
 */

const ROLE_LEVELS = {
  Cashier: 1,
  Manager: 2,
  Admin: 3
};

/**
 * Returns middleware that checks the authenticated user's role
 * against the minimum required role level.
 *
 * @param {string} minimumRole - 'Cashier', 'Manager', or 'Admin'
 * @returns {Function} Express middleware
 */
function requireRole(minimumRole) {
  const requiredLevel = ROLE_LEVELS[minimumRole];

  if (requiredLevel === undefined) {
    throw new Error(`Invalid role: ${minimumRole}. Must be one of: ${Object.keys(ROLE_LEVELS).join(', ')}`);
  }

  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_FAILED', message: 'Authentication required' }
      });
    }

    const userLevel = ROLE_LEVELS[req.user.role];

    if (userLevel === undefined) {
      return res.status(403).json({
        success: false,
        error: { code: 'ACCESS_DENIED', message: 'Invalid user role' }
      });
    }

    if (userLevel < requiredLevel) {
      return res.status(403).json({
        success: false,
        error: { code: 'ACCESS_DENIED', message: `This action requires ${minimumRole} role or higher` }
      });
    }

    next();
  };
}

module.exports = { requireRole, ROLE_LEVELS };
