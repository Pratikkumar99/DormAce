import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: ['item', 'request', 'user', 'business'], required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    reason: { type: String, enum: ['spam', 'scam', 'inappropriate', 'prohibited', 'harassment', 'other'], required: true },
    details: { type: String, maxlength: 500 },
    status: { type: String, enum: ['open', 'actioned', 'dismissed'], default: 'open', index: true },
  },
  { timestamps: true }
);
reportSchema.index({ reporter: 1, targetType: 1, targetId: 1 }, { unique: true });

export default mongoose.model('Report', reportSchema);
