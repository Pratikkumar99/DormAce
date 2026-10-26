import crypto from 'node:crypto';

export const toPaise = (inr) => Math.round(Number(inr) * 100);
export const toInr = (paise) => paise / 100;
export const sha256 = (v) => crypto.createHash('sha256').update(String(v)).digest('hex');
export const randomOtp = () => String(crypto.randomInt(100000, 1000000));
export const randomCode = () => String(crypto.randomInt(100000, 1000000));
export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');
export const safeEqual = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};
export const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function paginate(query, { defaultLimit = 20, maxLimit = 50 } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}
