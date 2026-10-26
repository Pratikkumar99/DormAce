import mongoose from 'mongoose';

const { Schema } = mongoose;

// All amounts below are in PAISE (integers) to avoid float errors.
const walletSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    balance: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);
export const Wallet = mongoose.model('Wallet', walletSchema);

const transactionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['topup', 'transfer_in', 'transfer_out', 'withdraw', 'withdraw_refund'], required: true },
    amount: { type: Number, required: true, min: 1 },
    balanceAfter: Number,
    status: { type: String, enum: ['pending', 'success', 'failed'], default: 'success' },
    counterparty: { type: Schema.Types.ObjectId, ref: 'User' },
    conversation: { type: Schema.Types.ObjectId, ref: 'Conversation' },
    note: { type: String, maxlength: 200 },
    group: String, // links the two legs of a transfer
    razorpayOrderId: { type: String, index: true, sparse: true },
    razorpayPaymentId: { type: String },
    upiId: String, // withdrawals
  },
  { timestamps: true }
);
transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ razorpayPaymentId: 1 }, { unique: true, sparse: true });
export const Transaction = mongoose.model('Transaction', transactionSchema);

// Ask someone to pay: either inside a chat, or in person using a short code.
const paymentRequestSchema = new Schema(
  {
    payee: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // receives money
    payer: { type: Schema.Types.ObjectId, ref: 'User' }, // fixed for chat requests, open for in-person codes
    amount: { type: Number, required: true, min: 1 }, // paise
    note: { type: String, maxlength: 140 },
    conversation: { type: Schema.Types.ObjectId, ref: 'Conversation' },
    item: { type: Schema.Types.ObjectId, ref: 'Item' },
    code: { type: String, index: true },
    status: { type: String, enum: ['pending', 'paid', 'cancelled', 'expired'], default: 'pending' },
    expiresAt: { type: Date, required: true },
    paidBy: { type: Schema.Types.ObjectId, ref: 'User' },
    paidAt: Date,
  },
  { timestamps: true }
);
paymentRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 7 * 24 * 3600 });
export const PaymentRequest = mongoose.model('PaymentRequest', paymentRequestSchema);
