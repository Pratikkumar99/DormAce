import http from 'node:http';
import mongoose from 'mongoose';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { createApp } from './app.js';
import { initSocket } from './services/socket.js';
import './models/User.js';

async function main() {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    console.error('Missing CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET in server/.env');
    process.exit(1);
  }
  await connectDB();
  await mongoose.syncIndexes(); // make sure text/unique/TTL indexes exist

  const server = http.createServer(createApp());
  initSocket(server);
  server.listen(env.PORT, () => console.log(`DormAce API running on :${env.PORT} (${env.NODE_ENV})`));

  const shutdown = async (sig) => {
    console.log(`${sig} received, shutting down`);
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  ['SIGINT', 'SIGTERM'].forEach((s) => process.on(s, () => shutdown(s)));
}

process.on('unhandledRejection', (e) => console.error('Unhandled rejection:', e));
main().catch((e) => {
  console.error('Failed to start:', e);
  process.exit(1);
});
