export class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || 'ERROR';
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (err, req, res, _next) => {
  err.statusCode = err.statusCode || 500;
  err.code = err.code || 'INTERNAL_ERROR';

  console.error(`[${err.statusCode}] ${req.method} ${req.originalUrl}:`, err.message);
  if (process.env.NODE_ENV === 'development' || err.statusCode >= 500) {
    console.error(err);
  }

  if (err.name === 'ValidationError') {
    err.statusCode = 400;
    err.code = 'VALIDATION_ERROR';
    err.message = Object.values(err.errors).map((e) => e.message).join(', ');
  }

  if (err.code === 11000) {
    err.statusCode = 409;
    err.code = 'DUPLICATE';
    const field = Object.keys(err.keyValue)[0];
    err.message = `${field} already exists`;
  }

  if (err.name === 'CastError') {
    err.statusCode = 400;
    err.code = 'INVALID_ID';
    err.message = 'Invalid resource ID';
  }

  if (err.name === 'JsonWebTokenError') {
    err.statusCode = 401;
    err.code = 'INVALID_TOKEN';
    err.message = 'Invalid token';
  }

  res.status(err.statusCode).json({
    success: false,
    code: err.code,
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
