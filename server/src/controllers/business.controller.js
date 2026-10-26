import { z } from 'zod';
import Business from '../models/Business.js';
import Item from '../models/Item.js';
import Conversation from '../models/Conversation.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { paginate } from '../utils/helpers.js';
import { savePublicImage, removePublic } from '../utils/storage.js';
import { SEGMENT_SLUGS } from '../config/constants.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i);
const bool = z.union([z.boolean(), z.enum(['true', 'false'])]).transform((v) => v === true || v === 'true');
const hostelsField = z
  .union([z.array(objectId), z.string()])
  .optional()
  .transform((v) => (typeof v === 'string' ? (v ? JSON.parse(v) : []) : v || []))
  .pipe(z.array(objectId).max(30));

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().min(20, 'Describe your business in at least 20 characters').max(1500),
  segment: z.enum(SEGMENT_SLUGS),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number').optional().or(z.literal('')),
  email: z.string().trim().email().optional().or(z.literal('')),
  audience: z.enum(['boys', 'girls', 'both']).default('both'),
  hostels: hostelsField,
  timings: z.string().trim().max(120).optional(),
  deliversToHostel: bool.optional().default(false),
});

const files = (req, name) => req.files?.[name]?.[0];

export const createBusiness = asyncHandler(async (req, res) => {
  const d = schema.parse(req.body);
  if ((await Business.countDocuments({ owner: req.user._id, status: { $ne: 'rejected' } })) >= 3)
    throw new ApiError(400, 'You can register up to 3 businesses');
  const logo = files(req, 'logo') ? await savePublicImage(files(req, 'logo').buffer, 'businesses', { width: 500 }) : '';
  const banner = files(req, 'banner') ? await savePublicImage(files(req, 'banner').buffer, 'businesses', { width: 1400 }) : '';
  const biz = await Business.create({ ...d, owner: req.user._id, college: req.user.college, logo, banner });
  res.status(201).json({ success: true, business: biz });
});

export const listBusinesses = asyncHandler(async (req, res) => {
  const q = z
    .object({ q: z.string().trim().max(80).optional(), segment: z.enum(SEGMENT_SLUGS).optional(), hostel: objectId.optional() })
    .parse(req.query);
  const { page, limit, skip } = paginate(req.query, { defaultLimit: 20 });

  const filter = { college: req.user.college, status: 'active', audience: { $in: [req.user.gender, 'both'] } };
  if (q.segment) filter.segment = q.segment;
  if (q.q) filter.$text = { $search: q.q };
  if (q.hostel) filter.$and = [{ $or: [{ hostels: { $size: 0 } }, { hostels: q.hostel }] }];

  const [businesses, total] = await Promise.all([
    Business.find(filter).select('-reviewNote').sort({ featuredUntil: -1, isVerified: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
    Business.countDocuments(filter),
  ]);
  const now = Date.now();
  res.json({
    success: true,
    businesses: businesses.map((b) => ({ ...b, featured: !!b.featuredUntil && new Date(b.featuredUntil).getTime() > now })),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
});

export const myBusinesses = asyncHandler(async (req, res) => {
  const businesses = await Business.find({ owner: req.user._id }).sort({ createdAt: -1 }).lean();
  res.json({ success: true, businesses });
});

export const getBusiness = asyncHandler(async (req, res) => {
  const biz = await Business.findById(req.params.id).populate('hostels', 'name').populate('owner', 'name avatar').lean();
  const isOwner = biz && String(biz.owner._id) === String(req.user._id);
  const visible = biz && biz.status === 'active' && String(biz.college) === String(req.user.college) && (biz.audience === 'both' || biz.audience === req.user.gender);
  if (!biz || (!isOwner && !visible)) throw new ApiError(404, 'Business not found');
  if (!isOwner) delete biz.reviewNote;
  res.json({ success: true, business: biz, isOwner });
});

export const updateBusiness = asyncHandler(async (req, res) => {
  const biz = await Business.findOne({ _id: req.params.id, owner: req.user._id });
  if (!biz) throw new ApiError(404, 'Business not found');
  const d = schema.partial().parse(req.body);

  const oldLogo = biz.logo, oldBanner = biz.banner;
  if (files(req, 'logo')) biz.logo = await savePublicImage(files(req, 'logo').buffer, 'businesses', { width: 500 });
  if (files(req, 'banner')) biz.banner = await savePublicImage(files(req, 'banner').buffer, 'businesses', { width: 1400 });

  const sensitive = (d.name && d.name !== biz.name) || (d.segment && d.segment !== biz.segment);
  Object.assign(biz, d);
  if (sensitive && biz.status === 'active') {
    biz.status = 'pending'; // name/segment changes need re-approval so approved listings can't be repurposed
    biz.isVerified = false;
  }
  await biz.save();
  if (files(req, 'logo')) await removePublic(oldLogo);
  if (files(req, 'banner')) await removePublic(oldBanner);
  res.json({ success: true, business: biz });
});

export const deleteBusiness = asyncHandler(async (req, res) => {
  const biz = await Business.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
  if (!biz) throw new ApiError(404, 'Business not found');
  await Item.updateMany({ business: biz._id }, { status: 'removed' });
  await Promise.all([removePublic(biz.logo), removePublic(biz.banner)]);
  res.json({ success: true });
});

export const businessStats = asyncHandler(async (req, res) => {
  const biz = await Business.findOne({ _id: req.params.id, owner: req.user._id });
  if (!biz) throw new ApiError(404, 'Business not found');
  const [items, active, views, chats] = await Promise.all([
    Item.countDocuments({ business: biz._id, status: { $ne: 'removed' } }),
    Item.countDocuments({ business: biz._id, status: 'available' }),
    Item.aggregate([{ $match: { business: biz._id, status: { $ne: 'removed' } } }, { $group: { _id: null, v: { $sum: '$views' } } }]),
    Conversation.countDocuments({ business: biz._id }),
  ]);
  res.json({ success: true, stats: { items, active, views: views[0]?.v || 0, chats } });
});
