import mongoose from 'mongoose';
import { SEGMENT_SLUGS } from '../config/constants.js';

const { Schema } = mongoose;

const businessSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    college: { type: Schema.Types.ObjectId, ref: 'College', required: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, required: true, trim: true, maxlength: 1500 },
    segment: { type: String, enum: SEGMENT_SLUGS, required: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    logo: { type: String, default: '' },
    banner: { type: String, default: '' },
    // which hostel groups the business serves; checked against viewer's gender
    audience: { type: String, enum: ['boys', 'girls', 'both'], default: 'both' },
    hostels: [{ type: Schema.Types.ObjectId, ref: 'Hostel' }], // empty = all hostels in the college
    timings: { type: String, trim: true, maxlength: 120 },
    deliversToHostel: { type: Boolean, default: false },

    status: { type: String, enum: ['pending', 'active', 'rejected', 'suspended'], default: 'pending', index: true },
    isVerified: { type: Boolean, default: false },
    featuredUntil: Date,
    reviewNote: String,
  },
  { timestamps: true }
);

businessSchema.index({ college: 1, status: 1, segment: 1 });
businessSchema.index({ name: 'text', description: 'text' });

export default mongoose.model('Business', businessSchema);
