import Notification from '../models/Notification.js';
import { emitToUser } from './socket.js';

export async function notify(userId, { type = 'system', title, body, link }) {
  try {
    const n = await Notification.create({ user: userId, type, title, body, link });
    emitToUser(userId, 'notification', n);
    return n;
  } catch (e) {
    console.error('notify failed', e.message);
  }
}
