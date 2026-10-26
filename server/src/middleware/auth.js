import User from '../models/User.js';
import { verifyAccess } from '../utils/tokens.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization;
  const token = req.cookies?.da_at || (header?.startsWith('Bearer ') ? header.slice(7) : null);
  if (!token) throw new ApiError(401, 'Please sign in', 'UNAUTHENTICATED');

  let payload;
  try {
    payload = verifyAccess(token);
  } catch {
    throw new ApiError(401, 'Session expired', 'TOKEN_EXPIRED');
  }

  const user = await User.findById(payload.sub);
  if (!user) throw new ApiError(401, 'Account not found', 'UNAUTHENTICATED');
  if (user.isBanned) throw new ApiError(403, 'This account has been suspended', 'BANNED');
  req.user = user;
  next();
});

// Email confirmed AND college ID card approved by an admin.
export const requireVerified = (req, _res, next) => {
  const u = req.user;
  if (!u.emailVerified) return next(new ApiError(403, 'Please verify your email first', 'EMAIL_NOT_VERIFIED'));
  if (u.verification.status !== 'approved')
    return next(new ApiError(403, 'Your college ID is awaiting verification', 'ID_NOT_VERIFIED'));
  next();
};

export const requireAdmin = (req, _res, next) =>
  req.user?.role === 'admin' ? next() : next(new ApiError(403, 'Admins only', 'FORBIDDEN'));

// The ONLY place visibility scope is derived. Always from the authenticated user's DB record, never from client input.
export const scopeOf = (user) => ({ college: user.college, gender: user.gender });
