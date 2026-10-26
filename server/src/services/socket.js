import { Server } from 'socket.io';
import { parse } from 'cookie';
import { env } from '../config/env.js';
import { verifyAccess } from '../utils/tokens.js';
import Conversation from '../models/Conversation.js';

let io = null;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: env.CLIENT_URL.split(','), credentials: true },
    maxHttpBufferSize: 1e5,
  });

  io.use((socket, next) => {
    try {
      const token = parse(socket.handshake.headers.cookie || '').da_at;
      if (!token) return next(new Error('unauthenticated'));
      socket.userId = verifyAccess(token).sub;
      next();
    } catch {
      next(new Error('unauthenticated'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.userId}`);

    socket.on('typing', async ({ conversationId, typing }) => {
      try {
        const convo = await Conversation.findOne({ _id: conversationId, participants: socket.userId }).select('participants');
        if (!convo) return;
        convo.participants
          .filter((p) => String(p) !== socket.userId)
          .forEach((p) => io.to(`user:${p}`).emit('typing', { conversationId, userId: socket.userId, typing: !!typing }));
      } catch {
        /* ignore */
      }
    });
  });
  return io;
}

export function emitToUser(userId, event, payload) {
  io?.to(`user:${userId}`).emit(event, payload);
}
