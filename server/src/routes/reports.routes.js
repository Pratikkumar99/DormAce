import { Router } from 'express';
import { createReport } from '../controllers/reports.controller.js';
import { requireAuth, requireVerified } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/security.js';

const r = Router();
r.post('/', requireAuth, requireVerified, writeLimiter, createReport);
export default r;
