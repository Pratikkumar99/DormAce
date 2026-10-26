import mongoose from 'mongoose';

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    phone: { type: String, required: true, trim: true },
    // gender / college / hostel are set at registration, verified against the ID card by an admin,
    // and are NEVER accepted from the client after that. They drive all visibility scoping.
    gender: { type: String, enum: ['boys', 'girls'], required: true, index: true },
    college: { type: Schema.Types.ObjectId, ref: 'College', required: true, index: true },
    hostel: { type: Schema.Types.ObjectId, ref: 'Hostel', required: true, index: true },
    roomNumber: { type: String, required: true, trim: true, maxlength: 20 },
    rollNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
    avatar: { type: String, default: '' },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },

    emailVerified: { type: Boolean, default: false },
    emailOtp: {
      type: new Schema({ hash: String, expiresAt: Date, attempts: { type: Number, default: 0 } }, { _id: false }),
      select: false,
    },

    verification: {
      status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
      idCardFile: { type: String, select: false }, // private storage key, never served statically
      submittedAt: { type: Date, default: Date.now },
      reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      reviewedAt: Date,
      rejectionReason: String,
    },

    passwordReset: {
      type: new Schema({ hash: String, expiresAt: Date }, { _id: false }),
      select: false,
    },
    refreshTokens: {
      type: [{ jti: String, expiresAt: Date, userAgent: String, createdAt: { type: Date, default: Date.now }, _id: false }],
      select: false,
      default: [],
    },
    loginAttempts: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, select: false },

    isBanned: { type: Boolean, default: false },
    lastSeenAt: Date,
  },
  { timestamps: true }
);

// one roll number per college
userSchema.index({ college: 1, rollNumber: 1 }, { unique: true });

userSchema.methods.toPublic = function () {
  return {
    id: this._id,
    name: this.name,
    avatar: this.avatar,
    gender: this.gender,
    hostel: this.hostel,
    createdAt: this.createdAt,
  };
};

export default mongoose.model('User', userSchema);
