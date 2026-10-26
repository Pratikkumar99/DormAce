import { Readable } from 'node:stream';
import mongoose from 'mongoose';
import { z } from 'zod';
import User from '../models/User.js';
import College from '../models/College.js';
import Hostel from '../models/Hostel.js';
import Business from '../models/Business.js';
import Item from '../models/Item.js';
import Request from '../models/Request.js';
import Report from '../models/Report.js';
import { Wallet, Transaction } from '../models/Wallet.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { paginate } from '../utils/helpers.js';
import { privateDownloadUrl } from '../utils/storage.js';
import { notify } from '../services/notify.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i);

export const stats = asyncHandler(async (_req, res) => {
  const [users, pendingIds, items, openRequests, pendingBiz, openReports, pendingWithdrawals] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ 'verification.status': 'pending', emailVerified: true }),
    Item.countDocuments({ status: 'available' }),
    Request.countDocuments({ status: 'open', expiresAt: { $gt: new Date() } }),
    Business.countDocuments({ status: 'pending' }),
    Report.countDocuments({ status: 'open' }),
    Transaction.countDocuments({ type: 'withdraw', status: 'pending' }),
  ]);
  res.json({ success: true, stats: { users, pendingIds, items, openRequests, pendingBiz, openReports, pendingWithdrawals } });
});

// ─── ID verification ─────────────────────────────────────────────────────────
export const listVerifications = asyncHandler(async (req, res) => {
  const status = z.enum(['pending', 'approved', 'rejected']).default('pending').parse(req.query.status);
  const { page, limit, skip } = paginate(req.query);
  const filter = { 'verification.status': status };
  const [users, total] = await Promise.all([
    User.find(filter).sort({ 'verification.submittedAt': 1 }).skip(skip).limit(limit).populate('college', 'name').populate('hostel', 'name gender').lean(),
    User.countDocuments(filter),
  ]);
  res.json({
    success: true,
    total,
    users: users.map((u) => ({
      id: u._id, name: u.name, email: u.email, phone: u.phone, gender: u.gender, college: u.college, hostel: u.hostel,
      roomNumber: u.roomNumber, rollNumber: u.rollNumber, emailVerified: u.emailVerified, isBanned: u.isBanned,
      verification: { status: u.verification.status, submittedAt: u.verification.submittedAt, rejectionReason: u.verification.rejectionReason },
    })),
  });
});

// Private ID card: fetched server-side from Cloudinary (authenticated type) and streamed to admins only.
export const getIdCard = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('+verification.idCardFile');
  if (!user?.verification?.idCardFile) throw new ApiError(404, 'No ID card on file');
  const upstream = await fetch(privateDownloadUrl(user.verification.idCardFile));
  if (!upstream.ok || !upstream.body) throw new ApiError(404, 'File missing');
  res.set({ 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex', 'Content-Type': 'image/jpeg' });
  Readable.fromWeb(upstream.body).pipe(res);
});

export const reviewUser = asyncHandler(async (req, res) => {
  const d = z
    .object({ action: z.enum(['approve', 'reject']), reason: z.string().trim().max(200).optional(), gender: z.enum(['boys', 'girls']).optional(), hostelId: objectId.optional() })
    .parse(req.body);
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');

  if (d.action === 'approve') {
    // admin can correct a wrong gender/hostel after eyeballing the ID card
    const gender = d.gender || user.gender;
    const hostel = await Hostel.findById(d.hostelId || user.hostel);
    if (!hostel || !hostel.college.equals(user.college) || hostel.gender !== gender) throw new ApiError(400, 'Hostel must belong to the same college and gender');
    user.gender = gender;
    user.hostel = hostel._id;
    user.verification.status = 'approved';
    user.verification.rejectionReason = undefined;
  } else {
    if (!d.reason) throw new ApiError(400, 'Give a reason so the student can fix it');
    user.verification.status = 'rejected';
    user.verification.rejectionReason = d.reason;
  }
  user.verification.reviewedBy = req.user._id;
  user.verification.reviewedAt = new Date();
  await user.save();
  await notify(user._id, {
    type: 'verification',
    title: d.action === 'approve' ? "You're verified 🎉" : 'ID verification needs attention',
    body: d.action === 'approve' ? 'You can now buy, sell and chat.' : d.reason,
    link: d.action === 'approve' ? '/' : '/verification',
  });
  res.json({ success: true });
});

export const setBan = asyncHandler(async (req, res) => {
  const { banned } = z.object({ banned: z.boolean() }).parse(req.body);
  const user = await User.findById(req.params.id);
  if (!user || user.role === 'admin') throw new ApiError(400, 'Cannot change this user');
  user.isBanned = banned;
  if (banned) user.refreshTokens = [];
  await user.save();
  if (banned) await Item.updateMany({ seller: user._id, status: { $in: ['available', 'reserved'] } }, { status: 'removed' });
  res.json({ success: true });
});

// ─── businesses ──────────────────────────────────────────────────────────────
export const listBusinesses = asyncHandler(async (req, res) => {
  const status = z.enum(['pending', 'active', 'rejected', 'suspended']).default('pending').parse(req.query.status);
  const businesses = await Business.find({ status }).sort({ createdAt: 1 }).limit(100).populate('owner', 'name email phone').populate('college', 'name').lean();
  res.json({ success: true, businesses });
});

export const reviewBusiness = asyncHandler(async (req, res) => {
  const d = z
    .object({ action: z.enum(['approve', 'reject', 'suspend']), note: z.string().trim().max(300).optional(), verified: z.boolean().optional(), featureDays: z.number().int().min(0).max(365).optional() })
    .parse(req.body);
  const biz = await Business.findById(req.params.id);
  if (!biz) throw new ApiError(404, 'Business not found');
  biz.status = { approve: 'active', reject: 'rejected', suspend: 'suspended' }[d.action];
  biz.reviewNote = d.note;
  if (d.verified !== undefined) biz.isVerified = d.verified;
  if (d.featureDays !== undefined) biz.featuredUntil = d.featureDays ? new Date(Date.now() + d.featureDays * 86400e3) : undefined;
  await biz.save();
  await notify(biz.owner, {
    type: 'business',
    title: `${biz.name}: ${biz.status}`,
    body: d.note || (biz.status === 'active' ? 'Your business is live on DormAce.' : undefined),
    link: '/business',
  });
  res.json({ success: true });
});

// ─── reports ─────────────────────────────────────────────────────────────────
export const listReports = asyncHandler(async (req, res) => {
  const reports = await Report.find({ status: 'open' }).sort({ createdAt: 1 }).limit(100).populate('reporter', 'name').lean();
  const models = { item: Item, request: Request, user: User, business: Business };
  const withTarget = await Promise.all(
    reports.map(async (r) => {
      const t = await models[r.targetType].findById(r.targetId).select('title name status').lean();
      return { ...r, target: t ? { title: t.title || t.name, status: t.status } : null };
    })
  );
  res.json({ success: true, reports: withTarget });
});

export const resolveReport = asyncHandler(async (req, res) => {
  const { action } = z.object({ action: z.enum(['dismiss', 'remove']) }).parse(req.body);
  const rep = await Report.findById(req.params.id);
  if (!rep) throw new ApiError(404, 'Report not found');
  if (action === 'remove') {
    if (rep.targetType === 'item') await Item.updateOne({ _id: rep.targetId }, { status: 'removed' });
    if (rep.targetType === 'request') await Request.updateOne({ _id: rep.targetId }, { status: 'closed' });
    if (rep.targetType === 'business') await Business.updateOne({ _id: rep.targetId }, { status: 'suspended' });
    if (rep.targetType === 'user') await User.updateOne({ _id: rep.targetId, role: { $ne: 'admin' } }, { isBanned: true, refreshTokens: [] });
  } else if (rep.targetType === 'item') {
    await Item.updateOne({ _id: rep.targetId, status: 'flagged' }, { status: 'available' });
  }
  await Report.updateMany({ targetType: rep.targetType, targetId: rep.targetId, status: 'open' }, { status: action === 'remove' ? 'actioned' : 'dismissed' });
  res.json({ success: true });
});

// ─── withdrawals ─────────────────────────────────────────────────────────────
export const listWithdrawals = asyncHandler(async (_req, res) => {
  const withdrawals = await Transaction.find({ type: 'withdraw', status: 'pending' }).sort({ createdAt: 1 }).limit(100).populate('user', 'name email phone').lean();
  res.json({ success: true, withdrawals });
});

export const processWithdrawal = asyncHandler(async (req, res) => {
  const { action } = z.object({ action: z.enum(['paid', 'reject']) }).parse(req.body);
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const tx = await Transaction.findOneAndUpdate({ _id: req.params.id, type: 'withdraw', status: 'pending' }, { status: action === 'paid' ? 'success' : 'failed' }, { new: true, session });
      if (!tx) throw new ApiError(404, 'Withdrawal not found or already processed');
      if (action === 'reject') {
        const w = await Wallet.findOneAndUpdate({ user: tx.user }, { $inc: { balance: tx.amount } }, { new: true, session });
        await Transaction.create([{ user: tx.user, type: 'withdraw_refund', amount: tx.amount, balanceAfter: w.balance, note: 'Withdrawal rejected' }], { session });
      }
    });
  } finally {
    await session.endSession();
  }
  res.json({ success: true });
});

// ─── colleges & hostels ──────────────────────────────────────────────────────
export const listColleges = asyncHandler(async (_req, res) => {
  const [colleges, hostels] = await Promise.all([College.find().sort('name').lean(), Hostel.find().sort('name').lean()]);
  res.json({ success: true, colleges: colleges.map((c) => ({ ...c, hostels: hostels.filter((h) => String(h.college) === String(c._id)) })) });
});

export const createCollege = asyncHandler(async (req, res) => {
  const d = z
    .object({ name: z.string().trim().min(2), code: z.string().trim().min(2).max(12), city: z.string().trim().optional(), emailDomains: z.array(z.string().trim().toLowerCase()).default([]) })
    .parse(req.body);
  const college = await College.create(d);
  res.status(201).json({ success: true, college });
});

export const createHostel = asyncHandler(async (req, res) => {
  const d = z.object({ college: objectId, name: z.string().trim().min(2), gender: z.enum(['boys', 'girls']) }).parse(req.body);
  if (!(await College.exists({ _id: d.college }))) throw new ApiError(404, 'College not found');
  const hostel = await Hostel.create(d);
  res.status(201).json({ success: true, hostel });
});

export const toggleHostel = asyncHandler(async (req, res) => {
  const h = await Hostel.findById(req.params.id);
  if (!h) throw new ApiError(404, 'Hostel not found');
  h.isActive = !h.isActive;
  await h.save();
  res.json({ success: true, hostel: h });
});
