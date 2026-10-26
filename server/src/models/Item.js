import mongoose from 'mongoose';
import { CATEGORY_SLUGS, CONDITIONS } from '../config/constants.js';

const { Schema } = mongoose;

const itemSchema = new Schema(
  {
    seller: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    business: { type: Schema.Types.ObjectId, ref: 'Business', index: true },
    // Scope fields are copied from the seller on the server; clients can't set them.
    college: { type: Schema.Types.ObjectId, ref: 'College', required: true },
    // 'both' is only ever set by the server for business listings whose audience is both hostel groups
    gender: { type: String, enum: ['boys', 'girls', 'both'], required: true },
    hostel: { type: Schema.Types.ObjectId, ref: 'Hostel', required: true },
    // hostel = only the seller's hostel; college = every hostel of the same college & gender
    visibility: { type: String, enum: ['hostel', 'college'], default: 'college' },

    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    price: { type: Number, required: true, min: 0, max: 1000000 }, // INR
    negotiable: { type: Boolean, default: false },
    category: { type: String, enum: CATEGORY_SLUGS, required: true },
    subcategory: { type: String, trim: true },
    condition: { type: String, enum: CONDITIONS, default: 'good' },
    images: [{ type: String }],
    status: { type: String, enum: ['available', 'reserved', 'sold', 'removed', 'flagged'], default: 'available' },
    views: { type: Number, default: 0 },
  },
  { timestamps: true }
);

itemSchema.index({ college: 1, gender: 1, status: 1, category: 1, createdAt: -1 });
itemSchema.index({ college: 1, gender: 1, hostel: 1, status: 1, createdAt: -1 });
itemSchema.index({ title: 'text', description: 'text' }, { weights: { title: 5, description: 1 } });

export default mongoose.model('Item', itemSchema);
