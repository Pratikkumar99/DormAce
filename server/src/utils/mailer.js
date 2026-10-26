import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter = null;
if (env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
}

export async function sendMail({ to, subject, text }) {
  if (!transporter) {
    console.log(`\n[mail:dev] to=${to}\n  subject=${subject}\n  ${text}\n`);
    return;
  }
  await transporter.sendMail({ from: env.MAIL_FROM, to, subject, text });
}
