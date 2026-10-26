import crypto from "node:crypto";
import mongoose from "mongoose";
import { z } from "zod";
import { env } from "../config/env.js";
import { WALLET } from "../config/constants.js";
import { Wallet, Transaction, PaymentRequest } from "../models/Wallet.js";
import Conversation from "../models/Conversation.js";
import Business from "../models/Business.js";
import User from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { paginate, toPaise, toInr, randomCode } from "../utils/helpers.js";
import {
  razorpay,
  verifyCheckoutSignature,
  verifyWebhookSignature,
} from "../services/razorpay.js";
import { postMessage } from "../services/chat.js";
import { notify } from "../services/notify.js";

const objectId = z.string().regex(/^[a-f\d]{24}$/i);
const inr = (min, max) => z.coerce.number().int().min(min).max(max);

async function inTransaction(fn) {
  const session = await mongoose.startSession();
  try {
    let out;
    await session.withTransaction(async () => {
      out = await fn(session);
    });
    return out;
  } finally {
    await session.endSession();
  }
}

const getWallet = (userId) =>
  Wallet.findOneAndUpdate(
    { user: userId },
    { $setOnInsert: { balance: 0 } },
    { upsert: true, new: true },
  );

// ─── balance & history ───────────────────────────────────────────────────────
export const getMyWallet = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query, { defaultLimit: 20 });
  const wallet = await getWallet(req.user._id);
  const [transactions, total] = await Promise.all([
    Transaction.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("counterparty", "name avatar")
      .lean(),
    Transaction.countDocuments({ user: req.user._id }),
  ]);
  res.json({
    success: true,
    balance: wallet.balance, // paise
    limits: WALLET,
    razorpayEnabled: !!razorpay,
    transactions,
    total,
    pages: Math.ceil(total / limit),
  });
});




// ─── top-up via Razorpay ─────────────────────────────────────────────────────
// export const createTopupOrder = asyncHandler(async (req, res) => {
//   if (!razorpay)
//     throw new ApiError(503, "Payments are not configured yet", "PAYMENTS_OFF");
//   const { amount } = z
//     .object({ amount: inr(WALLET.MIN_TOPUP, WALLET.MAX_TOPUP) })
//     .parse(req.body);
//   const wallet = await getWallet(req.user._id);
//   if (wallet.balance + toPaise(amount) > toPaise(WALLET.MAX_BALANCE))
//     throw new ApiError(
//       400,
//       `Wallet balance can't exceed ₹${WALLET.MAX_BALANCE}`,
//     );

//   const order = await razorpay.orders.create({
//     amount: toPaise(amount),
//     currency: "INR",
//     receipt: `w_${String(req.user._id).slice(-8)}_${Date.now()}`,
//     notes: { userId: String(req.user._id), purpose: "wallet_topup" },
//   });
//   await Transaction.create({
//     user: req.user._id,
//     type: "topup",
//     amount: order.amount,
//     status: "pending",
//     razorpayOrderId: order.id,
//     note: "Wallet top-up",
//   });
//   res.json({
//     success: true,
//     orderId: order.id,
//     amount: order.amount,
//     currency: order.currency,
//     keyId: env.RAZORPAY_KEY_ID,
//   });
// });
export const createTopupOrder = asyncHandler(async (req, res) => {
  const { amount } = z
    .object({
      amount: inr(WALLET.MIN_TOPUP, WALLET.MAX_TOPUP),
    })
    .parse(req.body);

  const wallet = await getWallet(req.user._id);
  const amountPaise = toPaise(amount);

  if (wallet.balance + amountPaise > toPaise(WALLET.MAX_BALANCE)) {
    throw new ApiError(
      400,
      `Wallet balance can't exceed ₹${WALLET.MAX_BALANCE}`
    );
  }

  // DEMO BYPASS: add test money directly
  if (process.env.DEMO_WALLET_ENABLED === "true") {
    wallet.balance += amountPaise;
    await wallet.save();

    await Transaction.create({
      user: req.user._id,
      type: "topup",
      amount: amountPaise,
      balanceAfter: wallet.balance,
      status: "success",
      note: "DEMO TOP-UP - NOT REAL MONEY",
    });

    return res.json({
      success: true,
      mode: "demo",
      message: "Demo money added successfully",
      balance: wallet.balance,
    });
  }

  // REAL RAZORPAY PAYMENT: original flow remains unchanged
  if (!razorpay) {
    throw new ApiError(
      503,
      "Payments are not configured yet",
      "PAYMENTS_OFF"
    );
  }

  const order = await razorpay.orders.create({
    amount: amountPaise,
    currency: "INR",
    receipt: `w_${String(req.user._id).slice(-8)}_${Date.now()}`,
    notes: {
      userId: String(req.user._id),
      purpose: "wallet_topup",
    },
  });

  await Transaction.create({
    user: req.user._id,
    type: "topup",
    amount: order.amount,
    status: "pending",
    razorpayOrderId: order.id,
    note: "Wallet top-up",
  });

  res.json({
    success: true,
    mode: "razorpay",
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: env.RAZORPAY_KEY_ID,
  });
});


// Idempotent: flips pending->success exactly once, then credits. Used by both the client callback and the webhook.
async function settleTopup({ orderId, paymentId, expectPaise }) {
  return inTransaction(async (session) => {
    const tx = await Transaction.findOneAndUpdate(
      { razorpayOrderId: orderId, type: "topup", status: "pending" },
      { status: "success", razorpayPaymentId: paymentId },
      { new: true, session },
    );
    if (!tx) return null; // already settled (or unknown order)
    if (expectPaise && tx.amount !== expectPaise)
      throw new ApiError(400, "Amount mismatch");
    const w = await Wallet.findOneAndUpdate(
      { user: tx.user },
      { $inc: { balance: tx.amount } },
      { new: true, upsert: true, session },
    );
    tx.balanceAfter = w.balance;
    await tx.save({ session });
    return tx;
  });
}

export const verifyTopup = asyncHandler(async (req, res) => {
  const d = z
    .object({
      razorpay_order_id: z.string(),
      razorpay_payment_id: z.string(),
      razorpay_signature: z.string(),
    })
    .parse(req.body);
  if (
    !verifyCheckoutSignature(
      d.razorpay_order_id,
      d.razorpay_payment_id,
      d.razorpay_signature,
    )
  )
    throw new ApiError(400, "Payment signature mismatch");
  const mine = await Transaction.findOne({
    razorpayOrderId: d.razorpay_order_id,
    user: req.user._id,
    type: "topup",
  });
  if (!mine) throw new ApiError(404, "Order not found");

  const tx = await settleTopup({
    orderId: d.razorpay_order_id,
    paymentId: d.razorpay_payment_id,
  });
  if (tx)
    await notify(req.user._id, {
      type: "wallet",
      title: "Wallet topped up",
      body: `₹${toInr(tx.amount)} added`,
      link: "/wallet",
    });
  const wallet = await getWallet(req.user._id);
  res.json({ success: true, balance: wallet.balance });
});

// Server-to-server safety net (user closes the tab before the callback). Mounted with express.raw().
export const razorpayWebhook = asyncHandler(async (req, res) => {
  const raw = req.body; // Buffer
  if (!verifyWebhookSignature(raw, req.headers["x-razorpay-signature"]))
    return res.status(400).json({ success: false });
  const event = JSON.parse(raw.toString("utf8"));
  if (["payment.captured", "order.paid"].includes(event.event)) {
    const p = event.payload?.payment?.entity;
    if (p?.order_id) {
      const tx = await settleTopup({
        orderId: p.order_id,
        paymentId: p.id,
        expectPaise: p.amount,
      });
      if (tx)
        await notify(tx.user, {
          type: "wallet",
          title: "Wallet topped up",
          body: `₹${toInr(tx.amount)} added`,
          link: "/wallet",
        });
    }
  }
  res.json({ success: true });
});

// ─── person-to-person movement of money ──────────────────────────────────────
async function canTransact(payer, payeeId) {
  const payee = await User.findById(payeeId).select(
    "college gender emailVerified verification isBanned",
  );
  if (
    !payee ||
    payee.isBanned ||
    payee.verification.status !== "approved" ||
    !payee.emailVerified
  )
    return false;
  if (!payee.college.equals(payer.college)) return false;
  if (payee.gender === payer.gender) return true;
  // cross-gender is only allowed to approved businesses whose audience includes the payer
  return !!(await Business.exists({
    owner: payee._id,
    status: "active",
    college: payer.college,
    audience: { $in: [payer.gender, "both"] },
  }));
}

async function move({ from, to, amount, conversation, note, session }) {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const spent = await Transaction.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(from),
        type: "transfer_out",
        createdAt: { $gte: since },
      },
    },
    { $group: { _id: null, t: { $sum: "$amount" } } },
  ]).session(session);
  if ((spent[0]?.t || 0) + amount > toPaise(WALLET.DAILY_TRANSFER_LIMIT))
    throw new ApiError(
      400,
      `Daily transfer limit of ₹${WALLET.DAILY_TRANSFER_LIMIT} reached`,
    );

  const debited = await Wallet.findOneAndUpdate(
    { user: from, balance: { $gte: amount } },
    { $inc: { balance: -amount } },
    { new: true, session },
  );
  if (!debited)
    throw new ApiError(
      400,
      "Insufficient wallet balance",
      "INSUFFICIENT_FUNDS",
    );
  const credited = await Wallet.findOneAndUpdate(
    { user: to },
    { $inc: { balance: amount } },
    { new: true, upsert: true, session },
  );

  const group = crypto.randomUUID();
  await Transaction.create(
    [
      {
        user: from,
        type: "transfer_out",
        amount,
        balanceAfter: debited.balance,
        counterparty: to,
        conversation,
        note,
        group,
      },
      {
        user: to,
        type: "transfer_in",
        amount,
        balanceAfter: credited.balance,
        counterparty: from,
        conversation,
        note,
        group,
      },
    ],
    { session, ordered: true },
  );
  return debited.balance;
}

async function loadConvo(id, user) {
  const c = await Conversation.findOne({ _id: id, participants: user._id });
  if (!c) throw new ApiError(404, "Conversation not found");
  const other = c.participants.find((p) => String(p) !== String(user._id));
  return { c, other };
}

// Pay the other person directly from chat
export const transfer = asyncHandler(async (req, res) => {
  const d = z
    .object({
      conversationId: objectId,
      amount: inr(1, WALLET.DAILY_TRANSFER_LIMIT),
      note: z.string().trim().max(140).optional(),
    })
    .parse(req.body);
  const { c, other } = await loadConvo(d.conversationId, req.user);
  if (!(await canTransact(req.user, other)))
    throw new ApiError(403, "You can't send money to this user");

  const balance = await inTransaction((session) =>
    move({
      from: req.user._id,
      to: other,
      amount: toPaise(d.amount),
      conversation: c._id,
      note: d.note,
      session,
    }),
  );
  await postMessage({
    conversation: c,
    sender: req.user._id,
    type: "payment",
    text: d.note || "",
    amount: d.amount,
  });
  await notify(other, {
    type: "wallet",
    title: `${req.user.name} sent you ₹${d.amount}`,
    body: d.note,
    link: `/chat/${c._id}`,
  });
  res.json({ success: true, balance });
});

// Ask for money — in chat (fixed payer) or in person (short code, any nearby user can pay)
export const createPaymentRequest = asyncHandler(async (req, res) => {
  const d = z
    .object({
      amount: inr(1, WALLET.DAILY_TRANSFER_LIMIT),
      note: z.string().trim().max(140).optional(),
      conversationId: objectId.optional(),
      itemId: objectId.optional(),
    })
    .parse(req.body);

  let payer,
    convo = null;
  if (d.conversationId) {
    const r = await loadConvo(d.conversationId, req.user);
    convo = r.c;
    payer = r.other;
    if (
      !(await canTransact(
        {
          college: req.user.college,
          gender: (await User.findById(payer).select("gender")).gender,
        },
        req.user._id,
      ))
    )
      throw new ApiError(403, "This user can't pay you");
  }

  const doc = await PaymentRequest.create({
    payee: req.user._id,
    payer,
    amount: toPaise(d.amount),
    note: d.note,
    conversation: convo?._id,
    item: d.itemId,
    code: convo ? undefined : randomCode(),
    expiresAt: new Date(Date.now() + (convo ? 24 * 3600e3 : 15 * 60e3)),
  });
  if (convo)
    await postMessage({
      conversation: convo,
      sender: req.user._id,
      type: "payment_request",
      text: d.note || "",
      paymentRequest: doc._id,
    });
  res.status(201).json({ success: true, request: doc });
});

async function settleRequest(prId, payerUser, { code } = {}) {
  const result = await inTransaction(async (session) => {
    const filter = {
      _id: prId,
      status: "pending",
      expiresAt: { $gt: new Date() },
    };
    const pr = await PaymentRequest.findOneAndUpdate(
      filter,
      { status: "paid", paidBy: payerUser._id, paidAt: new Date() },
      { new: true, session },
    );
    if (!pr)
      throw new ApiError(
        409,
        "This payment request is expired or already paid",
      );
    if (String(pr.payee) === String(payerUser._id))
      throw new ApiError(400, "You can't pay yourself");
    if (pr.payer && String(pr.payer) !== String(payerUser._id))
      throw new ApiError(403, "This request is for someone else");
    if (!(await canTransact(payerUser, pr.payee)))
      throw new ApiError(403, "You can't pay this user");
    const balance = await move({
      from: payerUser._id,
      to: pr.payee,
      amount: pr.amount,
      conversation: pr.conversation,
      note: pr.note || (code ? "In-person payment" : undefined),
      session,
    });
    return { pr, balance };
  });
  const { pr } = result;
  if (pr.conversation) {
    const c = await Conversation.findById(pr.conversation);
    if (c)
      await postMessage({
        conversation: c,
        sender: payerUser._id,
        type: "payment",
        text: pr.note || "",
        amount: toInr(pr.amount),
      });
  }
  await notify(pr.payee, {
    type: "wallet",
    title: `${payerUser.name} paid ₹${toInr(pr.amount)}`,
    body: pr.note,
    link: "/wallet",
  });
  return result;
}

export const payRequest = asyncHandler(async (req, res) => {
  const { balance } = await settleRequest(req.params.id, req.user);
  res.json({ success: true, balance });
});

// In person: payee shows a 6-digit code, payer types it in
export const lookupCode = asyncHandler(async (req, res) => {
  const { code } = z
    .object({ code: z.string().regex(/^\d{6}$/) })
    .parse(req.query);
  const pr = await PaymentRequest.findOne({
    code,
    status: "pending",
    expiresAt: { $gt: new Date() },
    payee: { $ne: req.user._id },
  }).populate("payee", "name avatar college gender");
  if (!pr || !(await canTransact(req.user, pr.payee._id)))
    throw new ApiError(404, "Code not found or expired");
  res.json({
    success: true,
    request: {
      _id: pr._id,
      amount: pr.amount,
      note: pr.note,
      payee: { name: pr.payee.name, avatar: pr.payee.avatar },
    },
  });
});

export const payByCode = asyncHandler(async (req, res) => {
  const { code } = z
    .object({ code: z.string().regex(/^\d{6}$/) })
    .parse(req.body);
  const pr = await PaymentRequest.findOne({
    code,
    status: "pending",
    expiresAt: { $gt: new Date() },
  }).select("_id");
  if (!pr) throw new ApiError(404, "Code not found or expired");
  const { balance } = await settleRequest(pr._id, req.user, { code });
  res.json({ success: true, balance });
});

export const cancelRequest = asyncHandler(async (req, res) => {
  const pr = await PaymentRequest.findOneAndUpdate(
    { _id: req.params.id, payee: req.user._id, status: "pending" },
    { status: "cancelled" },
  );
  if (!pr) throw new ApiError(404, "Request not found");
  res.json({ success: true });
});

// ─── cash-out (processed manually by an admin; swap for RazorpayX Payouts when you're ready) ───
export const requestWithdrawal = asyncHandler(async (req, res) => {
  const d = z
    .object({
      amount: inr(WALLET.MIN_WITHDRAW, WALLET.MAX_BALANCE),
      upiId: z
        .string()
        .trim()
        .regex(/^[\w.\-]{2,}@[a-zA-Z]{2,}$/, "Enter a valid UPI ID"),
    })
    .parse(req.body);
  const paise = toPaise(d.amount);
  const balance = await inTransaction(async (session) => {
    const w = await Wallet.findOneAndUpdate(
      { user: req.user._id, balance: { $gte: paise } },
      { $inc: { balance: -paise } },
      { new: true, session },
    );
    if (!w)
      throw new ApiError(
        400,
        "Insufficient wallet balance",
        "INSUFFICIENT_FUNDS",
      );
    await Transaction.create(
      [
        {
          user: req.user._id,
          type: "withdraw",
          amount: paise,
          balanceAfter: w.balance,
          status: "pending",
          upiId: d.upiId,
          note: "Withdrawal to UPI",
        },
      ],
      { session },
    );
    return w.balance;
  });
  res.status(201).json({ success: true, balance });
});
