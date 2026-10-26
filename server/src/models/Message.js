import mongoose from 'mongoose';

const { Schema } = mongoose;

const messageSchema = new Schema(
  {
    conversation: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['text', 'payment_request', 'payment', 'system'], default: 'text' },
    text: { type: String, trim: true, maxlength: 2000, default: '' },
    paymentRequest: { type: Schema.Types.ObjectId, ref: 'PaymentRequest' },
    amount: Number, // INR, for 'payment' messages
  },
  { timestamps: true }
);

messageSchema.index({ conversation: 1, createdAt: -1 });

export default mongoose.model('Message', messageSchema);
