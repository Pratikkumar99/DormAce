import { z } from 'zod';
import Item from '../models/Item.js';
import Hostel from '../models/Hostel.js';
import Business from '../models/Business.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { paginate } from '../utils/helpers.js';
import { savePublicImage, removePublic } from '../utils/storage.js';
import { CATEGORIES, CATEGORY_SLUGS, CONDITIONS } from '../config/constants.js';
import { visibleFilter, canSee } from '../services/scope.js';
import { notifyMatchingRequests } from '../services/matching.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i);
const bool = z.union([z.boolean(), z.enum(['true', 'false'])]).transform((v) => v === true || v === 'true');

const itemBase = z.object({
  title: z.string().trim().min(3, 'Title is too short').max(120),
  description: z.string().trim().min(10, 'Add a short description').max(2000),
  price: z.coerce.number().int().min(0).max(1_000_000),
  negotiable: bool.optional().default(false),
  category: z.enum(CATEGORY_SLUGS),
  subcategory: z.string().trim().max(60).optional(),
  condition: z.enum(CONDITIONS).default('good'),
  visibility: z.enum(['hostel', 'college']).default('college'),
  businessId: objectId.optional().or(z.literal('')),
});

function checkSub(category, sub) {
  if (!sub) return;
  const cat = CATEGORIES.find((c) => c.slug === category);
  if (!cat?.sub.includes(sub)) throw new ApiError(400, 'Invalid subcategory');
}

const POP = [
  { path: 'seller', select: 'name avatar createdAt' },
  { path: 'hostel', select: 'name' },
  { path: 'business', select: 'name logo isVerified segment' },
];

export const listItems = asyncHandler(async (req, res) => {
  const q = z
    .object({
      q: z.string().trim().max(80).optional(),
      category: z.enum(CATEGORY_SLUGS).optional(),
      subcategory: z.string().trim().max(60).optional(),
      condition: z.enum(CONDITIONS).optional(),
      hostel: objectId.optional(),
      business: objectId.optional(),
      minPrice: z.coerce.number().min(0).optional(),
      maxPrice: z.coerce.number().min(0).optional(),
      sort: z.enum(['new', 'price_asc', 'price_desc', 'relevance']).default('new'),
      businessOnly: bool.optional(),
      peerOnly: bool.optional(),
    })
    .parse(req.query);
  const { page, limit, skip } = paginate(req.query, { defaultLimit: 24 });

  const filter = { ...visibleFilter(req.user), status: { $in: ['available', 'reserved'] } };
  if (q.category) filter.category = q.category;
  if (q.subcategory) filter.subcategory = q.subcategory;
  if (q.condition) filter.condition = q.condition;
  if (q.business) filter.business = q.business;
  if (q.businessOnly) filter.business = { $exists: true, $ne: null };
  if (q.peerOnly) filter.business = { $exists: false };
  if (q.minPrice != null || q.maxPrice != null)
    filter.price = { ...(q.minPrice != null && { $gte: q.minPrice }), ...(q.maxPrice != null && { $lte: q.maxPrice }) };
  if (q.hostel) {
    const h = await Hostel.findOne({ _id: q.hostel, college: req.user.college, gender: req.user.gender }).select('_id');
    if (!h) return res.json({ success: true, items: [], total: 0, page, pages: 0 });
    filter.hostel = h._id;
  }

  let cursor;
  if (q.q) {
    filter.$text = { $search: q.q };
    cursor = Item.find(filter, { score: { $meta: 'textScore' } });
  } else cursor = Item.find(filter);

  const sort =
    q.sort === 'price_asc' ? { price: 1 } : q.sort === 'price_desc' ? { price: -1 } : q.q && q.sort === 'relevance' ? { score: { $meta: 'textScore' } } : { createdAt: -1 };

  const [items, total] = await Promise.all([
    cursor.sort(sort).skip(skip).limit(limit).populate(POP).lean(),
    Item.countDocuments(filter),
  ]);
  res.json({ success: true, items, total, page, pages: Math.ceil(total / limit) });
});

export const myItems = asyncHandler(async (req, res) => {
  const items = await Item.find({ seller: req.user._id, status: { $ne: 'removed' } })
    .sort({ createdAt: -1 })
    .populate('hostel', 'name')
    .populate('business', 'name')
    .lean();
  res.json({ success: true, items });
});

export const getItem = asyncHandler(async (req, res) => {
  const item = await Item.findById(req.params.id).populate(POP);
  const isOwner = item && item.seller._id.equals(req.user._id);
  // 404 (not 403) so outsiders can't even confirm a listing exists
  if (!item || item.status === 'removed' || (!isOwner && (!canSee(req.user, item) || item.status === 'flagged')))
    throw new ApiError(404, 'Listing not found');
  if (!isOwner) await Item.updateOne({ _id: item._id }, { $inc: { views: 1 } });
  res.json({ success: true, item });
});

export const createItem = asyncHandler(async (req, res) => {
  const d = itemBase.parse(req.body);
  checkSub(d.category, d.subcategory);
  if (!req.files?.length) throw new ApiError(400, 'Add at least one photo');
  if (req.files.length > 5) throw new ApiError(400, 'Maximum 5 photos');

  let business = null;
  let gender = req.user.gender;
  if (d.businessId) {
    business = await Business.findOne({ _id: d.businessId, owner: req.user._id, status: 'active' });
    if (!business) throw new ApiError(403, 'Your business must be approved before listing');
    gender = business.audience; // boys | girls | both
  }

  const images = await Promise.all(req.files.map((f) => savePublicImage(f.buffer, 'items')));
  const item = await Item.create({
    seller: req.user._id,
    business: business?._id,
    college: req.user.college,
    gender,
    hostel: req.user.hostel,
    visibility: business ? 'college' : d.visibility,
    title: d.title,
    description: d.description,
    price: d.price,
    negotiable: d.negotiable,
    category: d.category,
    subcategory: d.subcategory,
    condition: d.condition,
    images,
  });
  notifyMatchingRequests(item);
  res.status(201).json({ success: true, item });
});

export const updateItem = asyncHandler(async (req, res) => {
  const item = await Item.findOne({ _id: req.params.id, seller: req.user._id, status: { $ne: 'removed' } });
  if (!item) throw new ApiError(404, 'Listing not found');

  const d = itemBase
    .omit({ businessId: true })
    .extend({ status: z.enum(['available', 'reserved', 'sold']).optional() })
    .partial()
    .parse(req.body);
  checkSub(d.category || item.category, d.subcategory);

  let keep = item.images;
  if (req.body.keepImages !== undefined) {
    const wanted = JSON.parse(req.body.keepImages || '[]');
    keep = item.images.filter((u) => wanted.includes(u));
  }
  const added = await Promise.all((req.files || []).map((f) => savePublicImage(f.buffer, 'items')));
  const images = [...keep, ...added];
  if (images.length < 1 || images.length > 5) throw new ApiError(400, 'A listing needs 1 to 5 photos');
  const removed = item.images.filter((u) => !images.includes(u));

  Object.assign(item, d, { images });
  if (item.business) item.visibility = 'college';
  await item.save();
  await Promise.all(removed.map(removePublic));
  res.json({ success: true, item });
});

export const setItemStatus = asyncHandler(async (req, res) => {
  const { status } = z.object({ status: z.enum(['available', 'reserved', 'sold']) }).parse(req.body);
  const item = await Item.findOneAndUpdate({ _id: req.params.id, seller: req.user._id, status: { $nin: ['removed', 'flagged'] } }, { status }, { new: true });
  if (!item) throw new ApiError(404, 'Listing not found');
  res.json({ success: true, item });
});

export const deleteItem = asyncHandler(async (req, res) => {
  const item = await Item.findOneAndUpdate({ _id: req.params.id, seller: req.user._id }, { status: 'removed' });
  if (!item) throw new ApiError(404, 'Listing not found');
  await Promise.all(item.images.map(removePublic));
  res.json({ success: true });
});
