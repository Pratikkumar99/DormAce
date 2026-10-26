import { z } from 'zod';
import Report from '../models/Report.js';
import Item from '../models/Item.js';
import Request from '../models/Request.js';
import Business from '../models/Business.js';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const schema = z.object({
  targetType: z.enum(['item', 'request', 'user', 'business']),
  targetId: z.string().regex(/^[a-f\d]{24}$/i),
  reason: z.enum(['spam', 'scam', 'inappropriate', 'prohibited', 'harassment', 'other']),
  details: z.string().trim().max(500).optional(),
});
const MODELS = { item: Item, request: Request, user: User, business: Business };

export const createReport = asyncHandler(async (req, res) => {
  const d = schema.parse(req.body);
  const target = await MODELS[d.targetType].findById(d.targetId).select('_id');
  if (!target) throw new ApiError(404, 'Nothing to report');
  if (d.targetType === 'user' && String(target._id) === String(req.user._id)) throw new ApiError(400, "You can't report yourself");
  try {
    await Report.create({ ...d, reporter: req.user._id });
  } catch (e) {
    if (e.code === 11000) return res.json({ success: true }); // already reported
    throw e;
  }
  // community safety valve: 3 different reporters auto-hide a listing until an admin reviews it
  if (d.targetType === 'item') {
    const n = await Report.countDocuments({ targetType: 'item', targetId: d.targetId, status: 'open' });
    if (n >= 3) await Item.updateOne({ _id: d.targetId, status: { $in: ['available', 'reserved'] } }, { status: 'flagged' });
  }
  res.status(201).json({ success: true });
});
