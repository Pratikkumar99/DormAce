import { Router } from 'express';
import * as c from '../controllers/items.controller.js';
import { requireAuth, requireVerified } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/security.js';
import { upload } from '../utils/upload.js';

const r = Router();
r.use(requireAuth, requireVerified);

r.get('/', c.listItems);
r.get('/mine', c.myItems);
r.get('/:id', c.getItem);
r.post('/', writeLimiter, upload.array('images', 5), c.createItem);
r.patch('/:id', writeLimiter, upload.array('images', 5), c.updateItem);
r.patch('/:id/status', c.setItemStatus);
r.delete('/:id', c.deleteItem);

export default r;
