import { z } from 'zod';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Item from '../models/Item.js';
import Business from '../models/Business.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { canSee } from '../services/scope.js';
import { getOrCreateConversation, postMessage } from '../services/chat.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i);

const startSchema = z
  .object({ itemId: objectId.optional(), businessId: objectId.optional(), message: z.string().trim().max(2000).optional() })
  .refine((v) => v.itemId || v.businessId, 'Nothing to chat about');

export const startConversation = asyncHandler(async (req, res) => {
  const d = startSchema.parse(req.body);
  const me = req.user;
  let other, ctx;

  if (d.itemId) {
    const item = await Item.findById(d.itemId);
    if (!item || ['removed', 'flagged'].includes(item.status) || !canSee(me, item)) throw new ApiError(404, 'Listing not found');
    other = item.seller;
    ctx = { item: item._id, college: item.college };
  } else {
    const biz = await Business.findOne({ _id: d.businessId, status: 'active', college: me.college });
    if (!biz || (biz.audience !== 'both' && biz.audience !== me.gender)) throw new ApiError(404, 'Business not found');
    other = biz.owner;
    ctx = { business: biz._id, college: biz.college };
  }
  if (String(other) === String(me._id)) throw new ApiError(400, "You can't message yourself");

  const convo = await getOrCreateConversation({ a: me._id, b: other, ...ctx });
  if (d.message) await postMessage({ conversation: convo, sender: me._id, text: d.message });
  res.json({ success: true, conversationId: convo._id });
});

export const listConversations = asyncHandler(async (req, res) => {
  const me = String(req.user._id);
  const convos = await Conversation.find({ participants: req.user._id, 'lastMessage.text': { $exists: true } })
    .sort({ lastMessageAt: -1 })
    .limit(100)
    .populate('participants', 'name avatar')
    .populate('item', 'title images price status')
    .populate('request', 'title status')
    .populate('business', 'name logo')
    .lean();

  const out = convos.map((c) => ({
    _id: c._id,
    other: c.participants.find((p) => String(p._id) !== me),
    item: c.item,
    request: c.request,
    business: c.business,
    lastMessage: c.lastMessage,
    lastMessageAt: c.lastMessageAt,
    unread: Number(c.unread?.[me] || 0),
  }));
  res.json({ success: true, conversations: out });
});

async function loadConvo(id, user) {
  const c = await Conversation.findOne({ _id: id, participants: user._id });
  if (!c) throw new ApiError(404, 'Conversation not found');
  return c;
}

export const getConversation = asyncHandler(async (req, res) => {
  const c = await loadConvo(req.params.id, req.user);
  await c.populate([
    { path: 'participants', select: 'name avatar' },
    { path: 'item', select: 'title images price status seller' },
    { path: 'request', select: 'title status' },
    { path: 'business', select: 'name logo' },
  ]);
  const me = String(req.user._id);
  const obj = c.toObject();
  res.json({
    success: true,
    conversation: { ...obj, other: obj.participants.find((p) => String(p._id) !== me), unread: undefined, participants: undefined },
  });
});

export const getMessages = asyncHandler(async (req, res) => {
  const c = await loadConvo(req.params.id, req.user);
  const before = req.query.before ? new Date(req.query.before) : new Date();
  const limit = Math.min(50, parseInt(req.query.limit, 10) || 30);
  const msgs = await Message.find({ conversation: c._id, createdAt: { $lt: before } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('paymentRequest', 'amount note status code payee payer expiresAt')
    .lean();
  res.json({ success: true, messages: msgs.reverse(), hasMore: msgs.length === limit });
});

export const sendMessage = asyncHandler(async (req, res) => {
  const { text } = z.object({ text: z.string().trim().min(1).max(2000) }).parse(req.body);
  const c = await loadConvo(req.params.id, req.user);
  const message = await postMessage({ conversation: c, sender: req.user._id, text });
  res.status(201).json({ success: true, message });
});

export const markRead = asyncHandler(async (req, res) => {
  await Conversation.updateOne({ _id: req.params.id, participants: req.user._id }, { $set: { [`unread.${req.user._id}`]: 0 } });
  res.json({ success: true });
});

export const unreadCount = asyncHandler(async (req, res) => {
  const me = String(req.user._id);
  const convos = await Conversation.find({ participants: req.user._id, [`unread.${me}`]: { $gt: 0 } }).select('unread').lean();
  res.json({ success: true, count: convos.reduce((n, c) => n + Number(c.unread?.[me] || 0), 0) });
});
