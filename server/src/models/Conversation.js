import mongoose from 'mongoose';

const { Schema } = mongoose;

const conversationSchema = new Schema(
  {
    participants: { type: [{ type: Schema.Types.ObjectId, ref: 'User' }], validate: (v) => v.length === 2 },
    pairKey: { type: String, required: true }, // "<smallerId>:<largerId>"
    contextKey: { type: String, required: true }, // item:<id> | request:<id> | business:<id> | direct
    item: { type: Schema.Types.ObjectId, ref: 'Item' },
    request: { type: Schema.Types.ObjectId, ref: 'Request' },
    business: { type: Schema.Types.ObjectId, ref: 'Business' },
    college: { type: Schema.Types.ObjectId, ref: 'College', required: true },
    lastMessage: { text: String, sender: Schema.Types.ObjectId, type: { type: String } },
    lastMessageAt: { type: Date, default: Date.now, index: true },
    unread: { type: Map, of: Number, default: {} },
  },
  { timestamps: true }
);

conversationSchema.index({ pairKey: 1, contextKey: 1 }, { unique: true });
conversationSchema.index({ participants: 1, lastMessageAt: -1 });

export default mongoose.model('Conversation', conversationSchema);
