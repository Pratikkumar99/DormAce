import { ZodError } from 'zod';
import multer from 'multer';
import { isProd } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export const notFound = (req, _res, next) => next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  let status = err.status || 500;
  let message = err.message || 'Something went wrong';
  let code = err.code;
  let details = err.details;

  if (err instanceof ZodError) {
    status = 400;
    code = 'VALIDATION';
    message = err.issues[0]?.message || 'Invalid input';
    details = err.flatten().fieldErrors;
  } else if (err instanceof multer.MulterError) {
    status = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'Each image must be under 5 MB' : 'Invalid upload';
  } else if (err.name === 'CastError') {
    status = 404;
    message = 'Not found';
  } else if (err.code === 11000) {
    status = 409;
    message = 'This record already exists';
  } else if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors)[0]?.message || 'Invalid input';
  }

  if (status >= 500) {
    console.error(err);
    if (isProd) message = 'Something went wrong';
  }
  res.status(status).json({ success: false, message, code, details });
}
