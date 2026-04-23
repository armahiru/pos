/**
 * Custom application error with HTTP status code and error code.
 * Used across all modules for consistent error handling.
 */
class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

module.exports = AppError;
