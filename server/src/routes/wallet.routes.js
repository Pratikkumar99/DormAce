import { Router } from 'express';
import * as c from '../controllers/wallet.controller.js';
import { requireAuth, requireVerified } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/security.js';

const r = Router();
r.use(requireAuth, requireVerified);

r.get('/', c.getMyWallet);
r.post('/topup/order', writeLimiter, c.createTopupOrder);
r.post('/topup/verify', writeLimiter, c.verifyTopup);
r.post('/transfer', writeLimiter, c.transfer);
r.post('/requests', writeLimiter, c.createPaymentRequest);
r.post('/requests/:id/pay', writeLimiter, c.payRequest);
r.post('/requests/:id/cancel', c.cancelRequest);
r.get('/code', c.lookupCode);
r.post('/pay-code', writeLimiter, c.payByCode);
r.post('/withdraw', writeLimiter, c.requestWithdrawal);

export default r;
