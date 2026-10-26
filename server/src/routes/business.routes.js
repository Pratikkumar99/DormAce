import { Router } from 'express';
import * as c from '../controllers/business.controller.js';
import { requireAuth, requireVerified } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/security.js';
import { upload } from '../utils/upload.js';

const r = Router();
r.use(requireAuth, requireVerified);
const media = upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'banner', maxCount: 1 }]);

r.get('/', c.listBusinesses);
r.get('/mine', c.myBusinesses);
r.post('/', writeLimiter, media, c.createBusiness);
r.get('/:id', c.getBusiness);
r.get('/:id/stats', c.businessStats);
r.patch('/:id', writeLimiter, media, c.updateBusiness);
r.delete('/:id', c.deleteBusiness);

export default r;
