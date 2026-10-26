import bcrypt from "bcryptjs";
import { z } from "zod";
import { env } from "../config/env.js";
import User from "../models/User.js";
import College from "../models/College.js";
import Hostel from "../models/Hostel.js";
import { Wallet } from "../models/Wallet.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendMail } from "../utils/mailer.js";
import {
  savePrivateImage,
  savePublicImage,
  removePrivate,
  removePublic,
} from "../utils/storage.js";
import { randomOtp, randomToken, sha256, safeEqual } from "../utils/helpers.js";
import {
  signAccess,
  signRefresh,
  verifyRefresh,
  setAuthCookies,
  clearAuthCookies,
} from "../utils/tokens.js";
import { userDTO, POPULATE_PROFILE } from "../utils/userDto.js";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");
const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72)
  .regex(/[a-z]/, "Password needs a lowercase letter")
  .regex(/[A-Z]/, "Password needs an uppercase letter")
  .regex(/\d/, "Password needs a number");

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  password,
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  gender: z.enum(["boys", "girls"]),
  collegeId: objectId,
  hostelId: objectId,
  roomNumber: z.string().trim().min(1).max(20),
  rollNumber: z.string().trim().min(2).max(40),
});
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(72),
});
export const otpSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
});
export const forgotSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});
export const resetSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  token: z.string().min(20),
  password,
});
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: password,
});
export const profileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/)
    .optional(),
  roomNumber: z.string().trim().min(1).max(20).optional(),
});

async function issueSession(req, res, user) {
  const access = signAccess(user);
  const { token, jti, expiresAt } = signRefresh(user);
  await User.updateOne(
    { _id: user._id },
    {
      $push: {
        refreshTokens: {
          $each: [
            {
              jti,
              expiresAt,
              userAgent: (req.headers["user-agent"] || "").slice(0, 200),
            },
          ],
          $slice: -5,
        },
      },
    },
  );
  setAuthCookies(res, access, token);
}

async function sendOtp(user) {
  const otp = randomOtp();
  await User.updateOne(
    { _id: user._id },
    {
      emailOtp: {
        hash: sha256(otp),
        expiresAt: new Date(Date.now() + 10 * 60_000),
        attempts: 0,
      },
    },
  );
  await sendMail({
    to: user.email,
    subject: "Your DormAce verification code",
    text: `Your DormAce code is ${otp}. It expires in 10 minutes. If you didn't sign up, ignore this email.`,
  });
}

export const register = asyncHandler(async (req, res) => {
  if (!req.file)
    throw new ApiError(
      400,
      "Please upload a clear photo of your college ID card",
    );
  const d = registerSchema.parse(req.body);

  const [college, hostel] = await Promise.all([
    College.findOne({ _id: d.collegeId, isActive: true }),
    Hostel.findOne({ _id: d.hostelId, isActive: true }),
  ]);
  if (!college || !hostel || !hostel.college.equals(college._id))
    throw new ApiError(400, "Invalid college or hostel");
  if (hostel.gender !== d.gender)
    throw new ApiError(400, `${hostel.name} is a ${hostel.gender} hostel`);

  if (env.REQUIRE_COLLEGE_EMAIL && college.emailDomains.length) {
    const domain = d.email.split("@")[1];
    if (!college.emailDomains.includes(domain))
      throw new ApiError(
        400,
        `Use your college email (@${college.emailDomains.join(", @")})`,
      );
  }
  if (await User.exists({ email: d.email }))
    throw new ApiError(409, "An account with this email already exists");
  if (
    await User.exists({
      college: college._id,
      rollNumber: d.rollNumber.toUpperCase(),
    })
  )
    throw new ApiError(409, "An account with this roll number already exists");

  const idCardFile = await savePrivateImage(req.file.buffer, "idcards");
  let user;
  try {
    user = await User.create({
      name: d.name,
      email: d.email,
      phone: d.phone,
      gender: d.gender,
      college: college._id,
      hostel: hostel._id,
      roomNumber: d.roomNumber,
      rollNumber: d.rollNumber,
      passwordHash: await bcrypt.hash(d.password, 12),
      verification: { status: "pending", idCardFile },
    });
  } catch (e) {
    await removePrivate(idCardFile);
    throw e;
  }
  await Wallet.create({ user: user._id });
  await sendOtp(user);
  await issueSession(req, res, user);
  await user.populate(POPULATE_PROFILE);
  res.status(201).json({ success: true, user: userDTO(user) });
});

const DUMMY_HASH = bcrypt.hashSync("dormace-dummy-password", 12); // equalises timing for unknown emails

export const login = asyncHandler(async (req, res) => {
  const { email, password: pw } = loginSchema.parse(req.body);
  const user = await User.findOne({ email }).select(
    "+passwordHash +loginAttempts +lockUntil",
  );

  console.log("Login email:", email);
  console.log("Admin/user found:", !!user);
  console.log("Password hash exists:", !!user?.passwordHash);
  console.log("Role:", user?.role);
  if (user?.lockUntil && user.lockUntil > new Date()) {
    throw new ApiError(
      423,
      "Too many failed attempts. Try again in a few minutes.",
      "LOCKED",
    );
  }
  const ok = await bcrypt.compare(pw, user?.passwordHash || DUMMY_HASH);
  console.log('Password matches:', ok);
  if (!user || !ok) {
    if (user) {
      const attempts = (user.loginAttempts || 0) + 1;
      const update =
        attempts >= 5
          ? { loginAttempts: 0, lockUntil: new Date(Date.now() + 15 * 60_000) }
          : { loginAttempts: attempts };
      await User.updateOne({ _id: user._id }, update);
    }
    throw new ApiError(401, "Incorrect email or password");
  }
  if (user.isBanned)
    throw new ApiError(403, "This account has been suspended", "BANNED");

  await User.updateOne(
    { _id: user._id },
    { loginAttempts: 0, $unset: { lockUntil: 1 }, lastSeenAt: new Date() },
  );
  await issueSession(req, res, user);
  await user.populate(POPULATE_PROFILE);
  res.json({ success: true, user: userDTO(user) });
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.da_rt;
  if (!token) throw new ApiError(401, "No session", "UNAUTHENTICATED");
  let payload;
  try {
    payload = verifyRefresh(token);
  } catch {
    clearAuthCookies(res);
    throw new ApiError(401, "Session expired", "UNAUTHENTICATED");
  }
  const user = await User.findById(payload.sub).select("+refreshTokens");
  if (!user || user.isBanned) {
    clearAuthCookies(res);
    throw new ApiError(401, "Session expired", "UNAUTHENTICATED");
  }
  const known = user.refreshTokens.some((t) => t.jti === payload.jti);
  if (!known) {
    // refresh token reuse => assume theft, revoke every session
    await User.updateOne({ _id: user._id }, { $set: { refreshTokens: [] } });
    clearAuthCookies(res);
    throw new ApiError(401, "Session expired", "UNAUTHENTICATED");
  }
  await User.updateOne(
    { _id: user._id },
    { $pull: { refreshTokens: { jti: payload.jti } } },
  );
  await issueSession(req, res, user);
  res.json({ success: true });
});

export const logout = asyncHandler(async (req, res) => {
  try {
    const payload = verifyRefresh(req.cookies?.da_rt);
    await User.updateOne(
      { _id: payload.sub },
      { $pull: { refreshTokens: { jti: payload.jti } } },
    );
  } catch {
    /* already invalid */
  }
  clearAuthCookies(res);
  res.json({ success: true });
});

export const me = asyncHandler(async (req, res) => {
  await req.user.populate(POPULATE_PROFILE);
  res.json({ success: true, user: userDTO(req.user) });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const { otp } = otpSchema.parse(req.body);
  const user = await User.findById(req.user._id).select("+emailOtp");
  if (user.emailVerified) return res.json({ success: true });
  const rec = user.emailOtp;
  if (!rec?.hash || rec.expiresAt < new Date())
    throw new ApiError(400, "Code expired. Request a new one.");
  if (rec.attempts >= 5)
    throw new ApiError(429, "Too many wrong attempts. Request a new code.");
  if (!safeEqual(sha256(otp), rec.hash)) {
    await User.updateOne(
      { _id: user._id },
      { $inc: { "emailOtp.attempts": 1 } },
    );
    throw new ApiError(400, "Incorrect code");
  }
  await User.updateOne(
    { _id: user._id },
    { emailVerified: true, $unset: { emailOtp: 1 } },
  );
  res.json({ success: true });
});

export const resendOtp = asyncHandler(async (req, res) => {
  if (req.user.emailVerified) return res.json({ success: true });
  await sendOtp(req.user);
  res.json({ success: true });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = forgotSchema.parse(req.body);
  const user = await User.findOne({ email });
  if (user && !user.isBanned) {
    const token = randomToken(24);
    await User.updateOne(
      { _id: user._id },
      {
        passwordReset: {
          hash: sha256(token),
          expiresAt: new Date(Date.now() + 30 * 60_000),
        },
      },
    );
    const base = env.CLIENT_URL.split(",")[0];
    await sendMail({
      to: email,
      subject: "Reset your DormAce password",
      text: `Reset link (valid 30 minutes): ${base}/reset-password?email=${encodeURIComponent(email)}&token=${token}`,
    });
  }
  // same response either way so emails can't be enumerated
  res.json({
    success: true,
    message: "If that email exists, a reset link has been sent.",
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { email, token, password: pw } = resetSchema.parse(req.body);
  const user = await User.findOne({ email }).select("+passwordReset");
  const rec = user?.passwordReset;
  if (
    !user ||
    !rec?.hash ||
    rec.expiresAt < new Date() ||
    !safeEqual(sha256(token), rec.hash)
  )
    throw new ApiError(400, "Reset link is invalid or expired");
  await User.updateOne(
    { _id: user._id },
    {
      passwordHash: await bcrypt.hash(pw, 12),
      refreshTokens: [],
      loginAttempts: 0,
      $unset: { passwordReset: 1, lockUntil: 1 },
    },
  );
  res.json({ success: true });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
  const user = await User.findById(req.user._id).select("+passwordHash");
  if (!(await bcrypt.compare(currentPassword, user.passwordHash)))
    throw new ApiError(400, "Current password is incorrect");
  await User.updateOne(
    { _id: user._id },
    { passwordHash: await bcrypt.hash(newPassword, 12), refreshTokens: [] },
  );
  await issueSession(req, res, user); // sign out other devices, keep this one
  res.json({ success: true });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const d = profileSchema.parse(req.body);
  const update = { ...d };
  if (req.file) {
    const old = req.user.avatar;
    update.avatar = await savePublicImage(req.file.buffer, "avatars", {
      width: 400,
    });
    await removePublic(old);
  }
  await User.updateOne({ _id: req.user._id }, update);
  const user = await User.findById(req.user._id).populate(POPULATE_PROFILE);
  res.json({ success: true, user: userDTO(user) });
});

// Re-submit ID after a rejection
export const resubmitIdCard = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, "Please upload your college ID card");
  const user = await User.findById(req.user._id).select(
    "+verification.idCardFile",
  );
  if (user.verification.status === "approved")
    throw new ApiError(400, "Your ID is already verified");
  const key = await savePrivateImage(req.file.buffer, "idcards");
  await removePrivate(user.verification.idCardFile);
  await User.updateOne(
    { _id: user._id },
    {
      "verification.status": "pending",
      "verification.idCardFile": key,
      "verification.submittedAt": new Date(),
      $unset: { "verification.rejectionReason": 1 },
    },
  );
  res.json({ success: true });
});
