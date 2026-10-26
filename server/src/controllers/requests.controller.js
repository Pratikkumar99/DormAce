import { z } from 'zod';
import Request from '../models/Request.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { paginate } from '../utils/helpers.js';
import { CATEGORY_SLUGS, URGENCY } from '../config/constants.js';
import { visibleFilter, canSee } from '../services/scope.js';
import { getOrCreateConversation, postMessage } from '../services/chat.js';
import { notify } from '../services/notify.js';

const createSchema = z.object({
  title: z.string().trim().min(3, 'Tell us what you need').max(100),
  description: z.string().trim().max(600).optional().default(''),
  category: z.enum(CATEGORY_SLUGS).default('other'),
  urgency: z.enum(['now', 'today', 'week']).default('today'),
  maxPrice: z.coerce.number().int().min(0).max(100000).optional(),
  visibility: z.enum(['hostel', 'college']).default('hostel'),
});

const POP = [
  { path: 'requester', select: 'name avatar' },
  { path: 'hostel', select: 'name' },
];

export const listRequests = asyncHandler(async (req, res) => {
  const q = z
    .object({
      q: z.string().trim().max(80).optional(),
      category: z.enum(CATEGORY_SLUGS).optional(),
      urgency: z.enum(['now', 'today', 'week']).optional(),
    })
    .parse(req.query);
  const { page, limit, skip } = paginate(req.query, { defaultLimit: 20 });

  // requests are person-to-person: strictly same gender group (no 'both')
  const filter = { ...visibleFilter(req.user), gender: req.user.gender, status: 'open', expiresAt: { $gt: new Date() } };
  if (q.category) filter.category = q.category;
  if (q.urgency) filter.urgency = q.urgency;
  if (q.q) filter.$text = { $search: q.q };

  const [requests, total] = await Promise.all([
    Request.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate(POP).lean(),
    Request.countDocuments(filter),
  ]);
  res.json({ success: true, requests, total, page, pages: Math.ceil(total / limit) });
});

export const myRequests = asyncHandler(async (req, res) => {
  const requests = await Request.find({ requester: req.user._id }).sort({ createdAt: -1 }).limit(50).populate('hostel', 'name').lean();
  res.json({ success: true, requests });
});

export const createRequest = asyncHandler(async (req, res) => {
  const d = createSchema.parse(req.body);
  const open = await Request.countDocuments({ requester: req.user._id, status: 'open', expiresAt: { $gt: new Date() } });
  if (open >= 5) throw new ApiError(429, 'You can have up to 5 open requests. Close one first.');
  const doc = await Request.create({
    ...d,
    requester: req.user._id,
    college: req.user.college,
    gender: req.user.gender,
    hostel: req.user.hostel,
    expiresAt: new Date(Date.now() + URGENCY[d.urgency]),
  });
  res.status(201).json({ success: true, request: doc });
});

export const setRequestStatus = asyncHandler(async (req, res) => {
  const { status } = z.object({ status: z.enum(['fulfilled', 'closed']) }).parse(req.body);
  const doc = await Request.findOneAndUpdate({ _id: req.params.id, requester: req.user._id }, { status }, { new: true });
  if (!doc) throw new ApiError(404, 'Request not found');
  res.json({ success: true, request: doc });
});

export const deleteRequest = asyncHandler(async (req, res) => {
  const doc = await Request.findOneAndDelete({ _id: req.params.id, requester: req.user._id });
  if (!doc) throw new ApiError(404, 'Request not found');
  res.json({ success: true });
});

// "I have this" -> opens a chat with the requester
export const respondToRequest = asyncHandler(async (req, res) => {
  const doc = await Request.findById(req.params.id);
  if (!doc || doc.status !== 'open' || doc.expiresAt < new Date() || doc.gender !== req.user.gender || !canSee(req.user, doc))
    throw new ApiError(404, 'Request not found or no longer open');
  if (doc.requester.equals(req.user._id)) throw new ApiError(400, "That's your own request");

  const convo = await getOrCreateConversation({ a: req.user._id, b: doc.requester, college: doc.college, request: doc._id });
  const isNew = !convo.lastMessage?.text;
  if (isNew) {
    await postMessage({ conversation: convo, sender: req.user._id, text: `Hi! I have "${doc.title}". Still need it?` });
    await Request.updateOne({ _id: doc._id }, { $inc: { responses: 1 } });
    await notify(doc.requester, { type: 'request_response', title: `${req.user.name} can help`, body: doc.title, link: `/chat/${convo._id}` });
  }
  res.json({ success: true, conversationId: convo._id });
});
