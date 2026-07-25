<div align="center">

# 🌿 HealConnect — Backend API

**Production-grade REST API + Socket.IO server for the HealConnect wellness platform.**

[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-5-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://neon.tech)
[![Redis](https://img.shields.io/badge/Redis-Azure_Cache-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://azure.microsoft.com)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io)

<a href="https://healconnect-backend-dqcsaqf4a6baffaz.centralindia-01.azurewebsites.net/health">
  <img src="https://img.shields.io/badge/API-Live-success?style=for-the-badge&logo=microsoftazure" alt="API Live"/>
</a>

</div>

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Runtime | Node.js 20+ | Server environment |
| Framework | Express 5 | REST API |
| Language | TypeScript (strict) | Type safety |
| ORM | Prisma 7 + `@prisma/adapter-pg` | Type-safe DB queries |
| Database | PostgreSQL 15 (Neon) | Primary data store |
| Cache | Redis (Azure Cache) | Token blacklist + billing locks |
| Real-time | Socket.IO 4 | Chat, typing, billing events |
| Auth | JWT + bcrypt + Google OAuth | User + Expert auth |
| Storage | Azure Blob Storage | Profile photo uploads |
| Email | SendGrid | Email verification + password reset |
| SMS | Twilio | OTP verification |
| Audio | Agora RTC | Real-time voice consultations |
| Payments | Razorpay + Stripe | Wallet recharge |
| Billing | Custom per-minute engine | Background billing worker |

---

## 📁 Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma             # DB schema — User, Practitioner, Session, Wallet...
│   └── prisma.config.ts          # Prisma config with adapter-pg
├── src/
│   ├── index.ts                  # Entry point — Port 8080
│   ├── lib/
│   │   ├── prisma.ts             # Prisma client with @prisma/adapter-pg
│   │   ├── jwt.ts                # Access (15min) + refresh (7d) token signing
│   │   ├── redis.ts              # Redis client — supports Azure Cluster mode
│   │   ├── azure.ts              # Azure Blob Storage upload/delete
│   │   ├── email.ts              # SendGrid — verify email, reset password
│   │   ├── sms.ts                # Twilio SMS OTP
│   │   └── socket.ts             # Socket.IO server — full real-time chat logic
│   ├── middleware/
│   │   ├── auth.ts               # JWT Bearer token guard
│   │   ├── rateLimiter.ts        # express-rate-limit (general, auth, email)
│   │   └── validate.ts           # express-validator error handler
│   ├── routes/
│   │   ├── auth.ts               # User + Expert register/login/OAuth/OTP
│   │   ├── users.ts              # User profile CRUD + photo upload
│   │   ├── practitioners.ts      # Expert profile CRUD + availability toggle
│   │   ├── sessions.ts           # Session create/end + history endpoints
│   │   ├── chat.ts               # Chat message history (REST fallback)
│   │   ├── agora.ts              # Agora RTC token generation + feedback
│   │   └── wallet.ts             # Razorpay + Stripe recharge + webhooks
│   ├── services/
│   │   └── twilio.service.ts     # SMS OTP send/verify logic
│   └── workers/
│       └── billingEngine.ts      # Per-minute billing — runs every 10s
├── .env.example
├── package.json
└── tsconfig.json
```

---

## ⚙️ Environment Variables

```env
PORT=8080
NODE_ENV=development

# Database
DATABASE_URL="postgresql://user:password@host:5432/healconnect?sslmode=require"

# JWT
JWT_ACCESS_SECRET=your_access_secret_min_32_chars
JWT_REFRESH_SECRET=your_refresh_secret_min_32_chars

# Redis (Azure Cache for Redis)
REDIS_URL="rediss://:password@your-redis.redis.cache.windows.net:6380"
REDIS_CLUSTER=true   # set to true for Azure Redis Cluster

# Azure Blob Storage
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;...
AZURE_STORAGE_CONTAINER=profile-photos

# SendGrid
SENDGRID_API_KEY=SG.xxxx
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com

# Twilio SMS OTP
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=xxxx
TWILIO_PHONE_NUMBER=+1xxxx

# Agora RTC
AGORA_APP_ID=xxxx
AGORA_APP_CERTIFICATE=xxxx

# Razorpay
RAZORPAY_KEY_ID=rzp_xxxx
RAZORPAY_KEY_SECRET=xxxx
RAZORPAY_WEBHOOK_SECRET=xxxx

# Stripe
STRIPE_SECRET_KEY=sk_xxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxx

# App
APP_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3000
```

---

## 🚀 Getting Started

```bash
npm install
cp .env.example .env        # fill in your values
npx prisma generate
npx prisma db push
npm run dev                 # → http://localhost:8080
```

---

## 🌐 API Reference

### Auth — `/api/auth`

| Method | Endpoint | Auth Required | Description |
|--------|----------|:---:|-------------|
| POST | `/register` | **Yes** | Register user — auto-creates Wallet |
| POST | `/login` | **Yes** | Login — returns `accessToken` (15min) + `refreshToken` (7d) |
| POST | `/refresh` | **Yes** | Rotate refresh token |
| POST | `/logout` | **Yes** | Revoke refresh token + blacklist access token in Redis |
| POST | `/google` |**Yes** | Google OAuth sign-in — auto-creates Wallet |
| GET | `/me` | **Yes** | Get current authenticated user |
| GET | `/verify-email` | **Yes** | Verify email via token link |
| POST | `/forgot-password` | **Yes** | Send password reset email via SendGrid |
| POST | `/reset-password` | **Yes** | Reset password via token |
| POST | `/send-otp` | **Yes** | Send SMS OTP via Twilio |
| POST | `/verify-otp` | **Yes** | Verify SMS OTP |
| POST | `/practitioner/register` | **Yes** | Register expert account with hashed password |
| POST | `/practitioner/login` | **Yes** | Expert login — JWT includes `practitionerId` claim |

### Users — `/api/users`

| Method | Endpoint | Auth Required | Description |
|--------|----------|:---:|-------------|
| GET | `/me` | **Yes** | Get full user profile |
| PATCH | `/me` | **Yes** | Update profile fields |
| POST | `/me/photo` | **Yes** | Upload photo to Azure Blob Storage |
| DELETE | `/me/photo` | **Yes** | Delete photo from Azure Blob |
| DELETE | `/me` | **Yes** | Delete account |

### Practitioners — `/api/practitioners`

| Method | Endpoint | Auth Required | Description |
|--------|----------|:---:|-------------|
| GET | `/` | No | List experts — filter by specialty, language, rating, rate, online |
| GET | `/:id` | No | Get expert profile + reviews |
| POST | `/` | **Yes** | Create practitioner profile |
| PATCH | `/:id` | **Yes** | Update profile |
| POST | `/:id/photo` | **Yes** | Upload photo |
| PATCH | `/:id/availability` | **Yes** | Toggle `isOnline` — broadcasts `practitioner_status` via Socket.IO |
| DELETE | `/:id` | **Yes** | Delete practitioner |

### Sessions — `/api/sessions`

| Method | Endpoint | Auth Required | Description |
|--------|----------|:---:|-------------|
| POST | `/` | **Yes** | Create session (CHAT / AUDIO / VIDEO) — checks wallet + expert online |
| GET | `/:id` | **Yes** | Get session details with practitioner info |
| POST | `/:id/end` | **Yes** | End session — emits `session_terminated` to room |
| GET | `/practitioner/active` | **Yes** | Expert's currently active sessions |
| GET | `/practitioner/history` | **Yes** | Expert's completed sessions + total earnings |
| GET | `/user/history` | **Yes** | User's completed sessions + total spent + total minutes |

### Wallet — `/api/wallet`

| Method | Endpoint | Auth Required | Description |
|--------|----------|:---:|-------------|
| GET | `/` | **Yes** | Get balance + transaction history |
| POST | `/recharge` | **Yes** | Create Razorpay order |
| POST | `/recharge/stripe` | **Yes** | Create Stripe checkout session |
| POST | `/webhook` | No | Razorpay webhook — credits wallet on payment success |
| POST | `/stripe-webhook` | No | Stripe webhook — credits wallet on payment success |

### Agora — `/api/agora`

| Method | Endpoint | Auth Required | Description |
|--------|----------|:---:|-------------|
| POST | `/token` | **Yes** | Generate Agora RTC token for a session |
| GET | `/channel/:sessionId` | **Yes** | Get channel info + session type |
| POST | `/feedback` | **Yes** | Submit call quality feedback |

---

## ⚡ Real-time Events (Socket.IO)

JWT token passed in `socket.handshake.auth.token`. Expert's `practitionerId` is embedded in JWT.

| Event | Direction | Description |
|-------|-----------|-------------|
| `join_room` | Client → Server | Join `room:<sessionId>` — receives message history |
| `joined_room` | Server → Client | Confirms join, client starts session timer |
| `peer_joined` | Server → Room | Notifies other participant |
| `send_message` | Client → Server | Saves to DB, broadcasts to room |
| `new_message` | Server → Room | Delivers message to both parties |
| `message_history` | Server → Client | Last 100 messages sent on join |
| `typing_start` | Client → Server | User started typing |
| `typing_stop` | Client → Server | User stopped typing |
| `typing_update` | Server → Room | `{ userId, isTyping }` |
| `message_read` | Client → Server | Updates `isRead` in DB |
| `receipt_update` | Server → Room | `{ messageId, readAt }` |
| `new_session_request` | Server → Expert | Sent to `practitioner_<id>` room when user creates session |
| `session_terminated` | Server → Room | Session ended or balance exhausted |
| `low_balance` | Server → Room | Wallet balance below per-minute rate |
| `practitioner_status` | Server → All | `{ practitionerId, isOnline }` — real-time card updates |

---

## 💳 Billing Engine

`src/workers/billingEngine.ts` — runs every **10 seconds**, bills every **60 seconds**.

```
Every 60s per ACTIVE session:
  balance >= perMinuteRate  →  debit wallet, increment session.totalCost
  balance < perMinuteRate   →  start 60s grace period, emit low_balance
  grace period expired      →  terminate session, emit session_terminated
```

Uses Redis distributed lock `lock:billing:<sessionId>` to prevent double-billing across multiple instances.

---

## ⚡ Rate Limiting

| Limiter | Applied To | Limit (Prod) | Limit (Dev) |
|---------|-----------|:---:|:---:|
| `generalLimiter` | All routes | 100 req / 15 min | 100 req / 15 min |
| `authLimiter` | `/register`, `/login`, `/google`, `/practitioner/*` | 10 req / 15 min | 100 req / 15 min |
| `emailLimiter` | `/forgot-password`, `/resend-verification` | 5 req / hr | 50 req / hr |

---

## 📜 Scripts

```bash
npm run dev      # ts-node dev server with hot reload
npm run build    # Compile TypeScript → dist/
npm start        # Run compiled dist/index.js
```

---

## ⚠️ Notes

- Redis Cluster (Azure) — `EVALSHA` / Lua scripts not supported — `rate-limit-redis` removed, using in-memory store
- Practitioners cannot book sessions — enforced at API level (`practitionerId` in JWT blocks session creation)
- Wallet auto-created on user register (email + Google OAuth) — experts have no wallet
- `ChatMessage` table requires `npx prisma db push` if not yet migrated

---

## 📄 License

[MIT License](../LICENSE) — © 2026 Abhishek Giri
