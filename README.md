# DormAce — hostel marketplace (MERN)

Verified-students-only marketplace for hostels: list & sell items, post urgent requests ("I need Maggi"),
chat in real time, pay through a Razorpay-funded wallet, and promote campus businesses.
**Stack:** MongoDB · Express · React (JSX, Vite) · Node · Tailwind CSS · Socket.IO · Razorpay.

```
dormace/
├── server/   Express API (ESM) – models, controllers, services, socket
├── client/   React + Vite + Tailwind (black & white UI)
└── docker-compose.yml   local MongoDB replica set (needed for wallet transactions)
```

## Quick start

```bash
# 1. MongoDB as a replica set (or use MongoDB Atlas and paste its URI)
docker compose up -d

# 2. API
cd server && cp .env.example .env      # set JWT secrets (openssl rand -hex 48), Cloudinary + Razorpay keys
npm install
npm run seed                           # demo colleges/hostels + admin (ADMIN_EMAIL / ADMIN_PASSWORD)
npm run dev                            # http://localhost:5000

# 3. Web app
cd ../client && npm install
npm run dev                            # http://localhost:5173  (proxies /api and /socket.io)
```

Cloudinary credentials are required (the server won't start without them).
Without SMTP settings, OTP / reset emails are printed in the server console.
Without Razorpay keys, everything works except wallet top-ups.

**First run:** register a student → enter the OTP → sign in as the admin → *Admin → ID checks* → approve.

## How the requirements map to the code

| Requirement | Where |
|---|---|
| Boys / girls separation | `server/src/services/scope.js` — every listing/request/business/chat query is filtered by the **logged-in user's** DB `college` + `gender`; never by client input. Detail pages return 404 (not 403) to outsiders. Hostel must match gender at sign-up (`auth.controller.js`). |
| College ID verification | Student uploads ID at sign-up → uploaded to Cloudinary as a private `authenticated` asset (no public URL, re-encoded, EXIF stripped) → only admins can view it, streamed through the API via a 5-minute server-side link (`/api/admin/users/:id/id-card`) → `requireVerified` blocks listing/chat/wallet until approved. Admin can correct gender/hostel on approval. |
| Person-to-person only | Chat can only start from a listing/request/business you can see; contact numbers are never exposed; reports + auto-flag after 3 reporters; bans; rate limits. |
| Colleges → hostels → categories | `College`, `Hostel` models; taxonomy in `server/src/config/constants.js` (10 categories with sub-categories, 11 business segments). Marketplace filters by category, sub-category, hostel, condition, price. Items can be "my hostel only" or "all my hostels". |
| Urgent requests | `Request` model with expiry (2 h / 24 h / 7 d), "I have this" opens a chat; new listings notify matching open requests (`services/matching.js`). |
| Businesses | Register → admin approval → verified badge / featuring → post products & services, audience (boys/girls/both) and hostels served. |
| Wallet + Razorpay | `wallet.controller.js`: order creation, HMAC signature verification, signed webhook (idempotent), ledger in paise, atomic Mongo transactions, daily limits. Pay in chat, request money in chat, or pay in person with a one-time 6-digit code. Cash-out is a manual UPI payout queue in the admin panel. |
| Real-time | Socket.IO (cookie-authenticated): messages, typing, notifications. |

## Security measures
bcrypt (12) · short-lived access JWT (15 min) + rotating refresh token with reuse detection, both in httpOnly cookies ·
account lockout · OTP email verification · helmet · strict CORS · custom-header CSRF check + SameSite cookies ·
Zod validation on every input · NoSQL-injection sanitising · HPP · per-route rate limits · image re-encoding ·
private ID storage · webhook HMAC · idempotent top-ups · integer money · mongo transactions.

## Production checklist
1. Host API + client on one origin (Nginx: `/` → `client/dist`, `/api`, `/socket.io` → Node). Otherwise set `CLIENT_URL`, `COOKIE_SAMESITE=none`, `VITE_API_URL`.
2. Use MongoDB Atlas (replica set), strong JWT secrets, HTTPS, `NODE_ENV=production`.
3. Images are on Cloudinary under the `dormace/` folder. Listing/avatar/logo images are public URLs; ID cards use the private `authenticated` delivery type and are never exposed publicly.
4. Razorpay: set webhook URL `https://<api>/api/wallet/webhook`, event `payment.captured`, and the webhook secret.
5. Set per-college `emailDomains` + `REQUIRE_COLLEGE_EMAIL=true` for an extra layer of verification.
6. Add backups, error monitoring (Sentry) and a real SMTP provider.

> **Compliance note:** holding user balances and moving money between users can count as a prepaid payment
> instrument under RBI rules in India. Before launching the wallet publicly, get legal advice or route funds
> through a licensed partner (e.g. Razorpay's partner/payout products). The ledger is isolated in
> `wallet.controller.js` so it can be swapped.
