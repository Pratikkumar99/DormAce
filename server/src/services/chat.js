import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import { emitToUser } from './socket.js';
import { notify } from './notify.js';

export async function getOrCreateConversation({ a, b, college, item, request, business }) {
  const [x, y] = [String(a), String(b)].sort();
  const contextKey = item ? `item:${item}` : request ? `request:${request}` : business ? `business:${business}` : 'direct';
  const set = { participants: [x, y], college };
  if (item) set.item = item;
  if (request) set.request = request;
  if (business) set.business = business;
  return Conversation.findOneAndUpdate(
    { pairKey: `${x}:${y}`, contextKey },
    { $setOnInsert: set },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

export async function postMessage({ conversation, sender, type = 'text', text = '', paymentRequest, amount }) {
  const msg = await Message.create({ conversation: conversation._id, sender, type, text, paymentRequest, amount });
  const recipients = conversation.participants.filter((p) => String(p) !== String(sender));
  const preview = type === 'text' || type === 'system' ? text : type === 'payment_request' ? 'Payment request' : 'Payment sent';

  await Conversation.updateOne(
    { _id: conversation._id },
    {
      lastMessage: { text: preview.slice(0, 120), sender, type },
      lastMessageAt: msg.createdAt,
      $inc: Object.fromEntries(recipients.map((r) => [`unread.${r}`, 1])),
    }
  );

  const populated = await Message.findById(msg._id).populate('paymentRequest', 'amount note status code payee payer expiresAt').lean();
  for (const uid of conversation.participants) emitToUser(uid, 'message:new', populated);

  for (const r of recipients) {
    const prevUnread = conversation.unread?.get?.(String(r)) || 0;
    if (prevUnread === 0) await notify(r, { type: 'message', title: 'New message', body: preview.slice(0, 80), link: `/chat/${conversation._id}` });
  }
  return populated;
}
