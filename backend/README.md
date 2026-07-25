# HealConnect — Backend API

Production-grade REST API + Socket.IO server for the HealConnect wellness platform.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20+ |
| Framework | Express 5 |
| Language | TypeScript (strict) |
| ORM | Prisma 7 + `@prisma/adapter-pg` |
| Database | PostgreSQL 15 (Neon) |
| Cache | Redis (Azure Cache) |
| Real-time | Socket.IO 4 |
| Auth | JWT + bcrypt + Google OAuth + Twilio OTP |
| Storage | Azure Blob Storage |
| Email | SendGrid |
| Calls | Agora RTC (audio) |
| Payments | Razorpay + Stripe |
| Billing | Custom per-minute billing engine |

---

## Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma
│   └── prisma.config.ts
├── src/
│   ├── index.ts                  # Entry point (Port 8080)
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── jwt.ts
│   │   ├── redis.ts
│   │   ├── azure.ts
│   │   ├── email.ts
│   │   ├── sms.ts                # Twilio SMS OTP
│   │   └── socket.ts             # Socket.IO server init
│   ├── middleware/
│   │   ├── auth.ts               # JWT guard
│   │   ├── rateLimiter.ts        # Redis-backed rate limiting
│   │   └── validate.ts
│   ├── routes/
│   │   ├── auth.ts               # /api/auth/* (user + practitioner)
│   │   ├── users.ts              # /api/users/*
│   │   ├── practitioners.ts      # /api/practitioners/*
│   │   ├── sessions.ts           # /api/sessions/* + history endpoints
│   │   ├── chat.ts               # /api/chat/*
│   │   ├── agora.ts              # /api/agora/*
│   │   └── wallet.ts             # /api/wallet/* (Razorpay + Stripe)
│   ├── services/
│   │   └── twilio.service.ts
│   └── workers/
│       └── billingEngine.ts      # Per-minute billing
├── .env.example
├── package.json
└── tsconfig.json
```

---

## Environment Variables

```env
PORT=8080
DATABASE_URL="postgresql://user:password@host:5432/healconnect"
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
SENDGRID_API_KEY=SG.xxxx
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;...
AZURE_STORAGE_CONTAINER=profile-photos
REDIS_URL="rediss://:password@your-redis.redis.cache.windows.net:6380"
APP_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3000
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=xxxx
TWILIO_PHONE_NUMBER=+1xxxx
AGORA_APP_ID=xxxx
AGORA_APP_CERTIFICATE=xxxx
RAZORPAY_KEY_ID=rzp_xxxx
RAZORPAY_KEY_SECRET=xxxx
RAZORPAY_WEBHOOK_SECRET=xxxx
STRIPE_SECRET_KEY=sk_xxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxx
```

---

## Getting Started

```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma db push
npm run dev        # → http://localhost:8080
```

---

## API Reference

### Auth — `/api/auth`
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/register` | ❌ | Register user (auto-creates wallet) |
| POST | `/login` | ❌ | Login, returns access + refresh tokens |
| POST | `/refresh` | ❌ | Rotate refresh token |
| POST | `/logout` | ✅ | Revoke tokens, blacklist access token |
| POST | `/google` | ❌ | Google OAuth sign-in |
| GET | `/me` | ✅ | Current authenticated user |
| GET | `/verify-email` | ❌ | Verify email via token |
| POST | `/forgot-password` | ❌ | Send password reset email |
| POST | `/reset-password` | ❌ | Reset password via token |
| POST | `/send-otp` | ❌ | Send SMS OTP via Twilio |
| POST | `/verify-otp` | ❌ | Verify SMS OTP |
| POST | `/practitioner/register` | ❌ | Register expert account |
| POST | `/practitioner/login` | ❌ | Expert login |

### Users — `/api/users`
| Method | Endpoint | Description |
|---|---|---|
| GET | `/me` | Get full user profile |
| PATCH | `/me` | Update profile |
| POST | `/me/photo` | Upload photo to Azure Blob |
| DELETE | `/me/photo` | Delete photo |
| DELETE | `/me` | Delete account |

### Practitioners — `/api/practitioners`
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | ❌ | List with filters (search, specialty, language, rate) |
| GET | `/:id` | ❌ | Get profile + reviews |
| POST | `/` | ✅ | Create profile |
| PATCH | `/:id` | ✅ | Update profile |
| POST | `/:id/photo` | ✅ | Upload photo |
| PATCH | `/:id/availability` | ✅ | Toggle online/offline |
| DELETE | `/:id` | ✅ | Delete |

### Sessions — `/api/sessions`
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/` | ✅ | Create session (CHAT/AUDIO/VIDEO) |
| GET | `/:id` | ✅ | Get session details |
| POST | `/:id/end` | ✅ | End session |
| GET | `/practitioner/active` | ✅ | Expert's active sessions |
| GET | `/practitioner/history` | ✅ | Expert's session history + total earnings |
| GET | `/user/history` | ✅ | User's session history + total spent + minutes |

### Wallet — `/api/wallet`
| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Balance + transactions |
| POST | `/recharge` | Recharge via Razorpay |
| POST | `/recharge/stripe` | Recharge via Stripe |
| POST | `/webhook` | Razorpay webhook |
| POST | `/stripe-webhook` | Stripe webhook |

### Agora — `/api/agora`
| Method | Endpoint | Description |
|---|---|---|
| POST | `/token` | Get Agora RTC token |
| GET | `/channel/:sessionId` | Get channel info |
| POST | `/feedback` | Submit call feedback |

---

## Real-time Events (Socket.IO)

| Event | Direction | Description |
|---|---|---|
| `join_room` | Client → Server | Join a session room |
| `joined_room` | Server → Client | Confirmed join |
| `send_message` | Client → Server | Send chat message |
| `new_message` | Server → Client | Broadcast message |
| `message_history` | Server → Client | Past messages on join |
| `typing_start/stop` | Client → Server | Typing indicator |
| `typing_update` | Server → Client | Typing broadcast |
| `new_session_request` | Server → Expert | New session created |
| `session_terminated` | Server → Client | Session ended |
| `low_balance` | Server → Client | Wallet balance warning |
| `practitioner_status` | Server → All | Expert online/offline |

---

## Rate Limiting

| Limiter | Routes | Limit |
|---|---|---|
| `generalLimiter` | All routes | 100 req / 15 min |
| `authLimiter` | `/register`, `/login`, `/google` | 10 req / 15 min (prod) |
| `emailLimiter` | `/forgot-password` | 5 req / hr (prod) |

---

## Scripts

```bash
npm run dev      # ts-node dev server
npm run build    # Compile TypeScript
npm start        # Run dist/index.js
```

---

## Notes

- Redis Cluster (Azure) — `EVALSHA` not supported, use `sendCommand` wrapper
- Practitioners cannot book sessions (enforced at API level)
- Wallet auto-created on user register (email + Google OAuth)

---

## License

[MIT License](../LICENSE) — © 2026 Abhishek Giri
