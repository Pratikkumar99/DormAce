import mongoose from 'mongoose';

const hostelSchema = new mongoose.Schema(
  {
    college: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true, index: true },
    name: { type: String, required: true, trim: true },
    gender: { type: String, enum: ['boys', 'girls'], required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
hostelSchema.index({ college: 1, name: 1 }, { unique: true });

export default mongoose.model('Hostel', hostelSchema);
