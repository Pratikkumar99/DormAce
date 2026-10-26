import { Router } from 'express';
import * as c from '../controllers/admin.controller.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const r = Router();
r.use(requireAuth, requireAdmin);

r.get('/stats', c.stats);
r.get('/verifications', c.listVerifications);
r.get('/users/:id/id-card', c.getIdCard);
r.post('/users/:id/review', c.reviewUser);
r.post('/users/:id/ban', c.setBan);
r.get('/businesses', c.listBusinesses);
r.post('/businesses/:id/review', c.reviewBusiness);
r.get('/reports', c.listReports);
r.post('/reports/:id/resolve', c.resolveReport);
r.get('/withdrawals', c.listWithdrawals);
r.post('/withdrawals/:id', c.processWithdrawal);
r.get('/colleges', c.listColleges);
r.post('/colleges', c.createCollege);
r.post('/hostels', c.createHostel);
r.post('/hostels/:id/toggle', c.toggleHostel);

export default r;
