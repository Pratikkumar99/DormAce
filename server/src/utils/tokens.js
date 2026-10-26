import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { env, isProd } from '../config/env.js';

const ACCESS_TTL_MS = 15 * 60 * 1000;
const REFRESH_TTL_MS = 30 * 24 * 3600 * 1000;

export const signAccess = (user) =>
  jwt.sign({ sub: String(user._id), role: user.role }, env.JWT_ACCESS_SECRET, { expiresIn: '15m' });

export function signRefresh(user) {
  const jti = crypto.randomUUID();
  const token = jwt.sign({ sub: String(user._id), jti }, env.JWT_REFRESH_SECRET, { expiresIn: '30d' });
  return { token, jti, expiresAt: new Date(Date.now() + REFRESH_TTL_MS) };
}

export const verifyAccess = (t) => jwt.verify(t, env.JWT_ACCESS_SECRET);
export const verifyRefresh = (t) => jwt.verify(t, env.JWT_REFRESH_SECRET);

const base = () => ({
  httpOnly: true,
  secure: isProd || env.COOKIE_SAMESITE === 'none',
  sameSite: env.COOKIE_SAMESITE,
  domain: env.COOKIE_DOMAIN,
});

export function setAuthCookies(res, access, refresh) {
  res.cookie('da_at', access, { ...base(), path: '/', maxAge: ACCESS_TTL_MS });
  res.cookie('da_rt', refresh, { ...base(), path: '/api/auth', maxAge: REFRESH_TTL_MS });
}

export function clearAuthCookies(res) {
  res.clearCookie('da_at', { ...base(), path: '/' });
  res.clearCookie('da_rt', { ...base(), path: '/api/auth' });
}
