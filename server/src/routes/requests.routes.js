import { Router } from 'express';
import * as c from '../controllers/requests.controller.js';
import { requireAuth, requireVerified } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/security.js';

const r = Router();
r.use(requireAuth, requireVerified);

r.get('/', c.listRequests);
r.get('/mine', c.myRequests);
r.post('/', writeLimiter, c.createRequest);
r.post('/:id/respond', writeLimiter, c.respondToRequest);
r.patch('/:id/status', c.setRequestStatus);
r.delete('/:id', c.deleteRequest);

export default r;
