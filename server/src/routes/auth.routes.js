import { Router } from 'express';
import * as c from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter, otpLimiter } from '../middleware/security.js';
import { upload } from '../utils/upload.js';

const r = Router();

r.post('/register', authLimiter, upload.single('idCard'), c.register);
r.post('/login', authLimiter, c.login);
r.post('/refresh', c.refresh);
r.post('/logout', c.logout);
r.post('/forgot-password', authLimiter, c.forgotPassword);
r.post('/reset-password', authLimiter, c.resetPassword);

r.use(requireAuth);
r.get('/me', c.me);
r.post('/verify-email', otpLimiter, c.verifyEmail);
r.post('/resend-otp', otpLimiter, c.resendOtp);
r.post('/change-password', authLimiter, c.changePassword);
r.patch('/profile', upload.single('avatar'), c.updateProfile);
r.post('/id-card', otpLimiter, upload.single('idCard'), c.resubmitIdCard);

export default r;
