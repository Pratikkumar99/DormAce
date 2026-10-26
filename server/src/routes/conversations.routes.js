import { Router } from 'express';
import * as c from '../controllers/conversations.controller.js';
import { requireAuth, requireVerified } from '../middleware/auth.js';
import { messageLimiter, writeLimiter } from '../middleware/security.js';

const r = Router();
r.use(requireAuth, requireVerified);

r.get('/', c.listConversations);
r.get('/unread-count', c.unreadCount);
r.post('/', writeLimiter, c.startConversation);
r.get('/:id', c.getConversation);
r.get('/:id/messages', c.getMessages);
r.post('/:id/messages', messageLimiter, c.sendMessage);
r.post('/:id/read', c.markRead);

export default r;
