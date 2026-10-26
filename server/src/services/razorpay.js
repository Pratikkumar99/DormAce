import Razorpay from 'razorpay';
import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { safeEqual } from '../utils/helpers.js';

export const razorpay =
  env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET
    ? new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET })
    : null;

const hmac = (secret, data) => crypto.createHmac('sha256', secret).update(data).digest('hex');

// Checkout callback signature: HMAC_SHA256(order_id + "|" + payment_id, key_secret)
export const verifyCheckoutSignature = (orderId, paymentId, signature) =>
  !!signature && safeEqual(hmac(env.RAZORPAY_KEY_SECRET, `${orderId}|${paymentId}`), signature);

// Webhook signature: HMAC_SHA256(raw request body, webhook_secret)
export const verifyWebhookSignature = (rawBody, signature) =>
  !!env.RAZORPAY_WEBHOOK_SECRET && !!signature && safeEqual(hmac(env.RAZORPAY_WEBHOOK_SECRET, rawBody), signature);
