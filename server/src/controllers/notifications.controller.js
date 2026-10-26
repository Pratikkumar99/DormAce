import Notification from '../models/Notification.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const [notifications, unread] = await Promise.all([
    Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50).lean(),
    Notification.countDocuments({ user: req.user._id, read: false }),
  ]);
  res.json({ success: true, notifications, unread });
});

export const markRead = asyncHandler(async (req, res) => {
  const filter = { user: req.user._id, read: false };
  if (req.params.id) filter._id = req.params.id;
  await Notification.updateMany(filter, { read: true });
  res.json({ success: true });
});
