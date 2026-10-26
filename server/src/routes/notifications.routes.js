import { Router } from 'express';
import * as c from '../controllers/notifications.controller.js';
import { requireAuth } from '../middleware/auth.js';

const r = Router();
r.use(requireAuth);
r.get('/', c.list);
r.post('/read', c.markRead);
r.post('/:id/read', c.markRead);
export default r;
