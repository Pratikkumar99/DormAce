import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import morgan from 'morgan';
import { env, isProd } from './config/env.js';
import routes from './routes/index.js';
import { razorpayWebhook } from './controllers/wallet.controller.js';
import { apiLimiter, requireCustomHeader } from './middleware/security.js';
import { notFound, errorHandler } from './middleware/error.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1); // behind Nginx / Render / Railway etc. so rate-limit sees real IPs

  app.use(
    helmet({
      hsts: isProd, // never send HSTS over plain-http localhost
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: { useDefaults: false, directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
    })
  );
  app.use(cors({ origin: env.CLIENT_URL.split(','), credentials: true, methods: ['GET', 'POST', 'PATCH', 'DELETE'] }));
  app.use(compression());
  if (!isProd) app.use(morgan('dev'));

  // Razorpay webhook needs the *raw* body to verify the signature -> mount before express.json()
  const raw = express.raw({ type: 'application/json', limit: '1mb' });
  app.post('/api/wallet/webhook', raw, razorpayWebhook);

  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use(mongoSanitize()); // strips $ and . operators from user input (NoSQL injection)
  app.use(hpp());

  app.use('/api', apiLimiter, requireCustomHeader, routes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
