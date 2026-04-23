/**
 * Global error-handling middleware.
 * Returns a consistent JSON error response format and never exposes
 * stack traces or internal details to the client.
 */
function errorHandler(err, req, res, _next) {
  // Log the full error server-side for debugging
  console.error(`[${new Date().toISOString()}] Error:`, err.message || err);

  const statusCode = err.statusCode || 500;
  const code = err.code || 'SERVER_ERROR';
  const message =
    statusCode === 500
      ? 'An internal server error occurred'
      : err.message || 'An error occurred';

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message
    }
  });
}

module.exports = errorHandler;
