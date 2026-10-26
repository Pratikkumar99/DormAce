import mongoose from 'mongoose';
import { CATEGORY_SLUGS } from '../config/constants.js';

const { Schema } = mongoose;

// "I need Maggi right now" style short-lived asks
const requestSchema = new Schema(
  {
    requester: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    college: { type: Schema.Types.ObjectId, ref: 'College', required: true },
    gender: { type: String, enum: ['boys', 'girls'], required: true },
    hostel: { type: Schema.Types.ObjectId, ref: 'Hostel', required: true },
    visibility: { type: String, enum: ['hostel', 'college'], default: 'hostel' },

    title: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 600, default: '' },
    category: { type: String, enum: CATEGORY_SLUGS, default: 'other' },
    urgency: { type: String, enum: ['now', 'today', 'week'], default: 'today' },
    maxPrice: { type: Number, min: 0, max: 100000 },
    status: { type: String, enum: ['open', 'fulfilled', 'closed'], default: 'open' },
    expiresAt: { type: Date, required: true },
    responses: { type: Number, default: 0 },
  },
  { timestamps: true }
);

requestSchema.index({ college: 1, gender: 1, status: 1, expiresAt: 1, createdAt: -1 });
requestSchema.index({ title: 'text', description: 'text' });
// auto-clean 30 days after expiry
requestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 30 * 24 * 3600 });

export default mongoose.model('Request', requestSchema);
