import rateLimit from 'express-rate-limit';
import { ApiError } from '../utils/ApiError.js';

const limiter = (windowMs, limit, message) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, _res, next) => next(new ApiError(429, message, 'RATE_LIMITED')),
  });

export const apiLimiter = limiter(60_000, 300, 'Too many requests, slow down');
export const authLimiter = limiter(15 * 60_000, 30, 'Too many attempts, try again in a few minutes');
export const otpLimiter = limiter(10 * 60_000, 8, 'Too many code requests, try again later');
export const writeLimiter = limiter(60_000, 40, 'You are doing that too fast');
export const messageLimiter = limiter(60_000, 60, 'Sending messages too quickly');

// CSRF defence in depth (on top of SameSite cookies + strict CORS): browsers can't add a custom
// header cross-site without a CORS preflight, which we only allow for our own client origin.
export function requireCustomHeader(req, _res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.originalUrl.startsWith('/api/wallet/webhook')) return next(); // verified via HMAC instead
  if (req.headers['x-requested-with'] !== 'dormace') return next(new ApiError(403, 'Invalid request origin', 'CSRF'));
  next();
}
