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
| Database | PostgreSQL 15 (Azure) |
| Cache | Redis (Azure Cache) |
| Real-time | Socket.IO 4 |
| Auth | JWT + bcrypt + Google OAuth + Twilio OTP |
| Storage | Azure Blob Storage |
| Email | SendGrid |
| Calls | Agora RTC |
| Payments | Razorpay |

---

## Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
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
│   │   ├── auth.ts               # /api/auth/*
│   │   ├── users.ts              # /api/users/*
│   │   ├── practitioners.ts      # /api/practitioners/*
│   │   ├── sessions.ts           # /api/sessions/*
│   │   ├── chat.ts               # /api/chat/*
│   │   ├── agora.ts              # /api/agora/*
│   │   └── wallet.ts             # /api/wallet/*
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
| Method | Endpoint | Description |
|---|---|---|
| POST | `/register` | Register with email + password |
| POST | `/login` | Login |
| POST | `/refresh` | Rotate refresh token |
| POST | `/logout` | Revoke tokens |
| POST | `/google` | Google OAuth |
| GET | `/me` | Current user |
| GET | `/verify-email` | Email verification |
| POST | `/forgot-password` | Password reset email |
| POST | `/reset-password` | Reset password |
| POST | `/send-otp` | Send SMS OTP |
| POST | `/verify-otp` | Verify SMS OTP |

### Users — `/api/users`
| Method | Endpoint | Description |
|---|---|---|
| GET | `/me` | Get profile |
| PATCH | `/me` | Update profile |
| POST | `/me/photo` | Upload photo |
| DELETE | `/me/photo` | Delete photo |
| DELETE | `/me` | Delete account |

### Practitioners — `/api/practitioners`
| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | List (filterable) |
| GET | `/:id` | Get profile + reviews |
| POST | `/` | Create profile |
| PATCH | `/:id` | Update profile |
| PATCH | `/:id/availability` | Toggle online/offline |
| DELETE | `/:id` | Delete |

### Sessions — `/api/sessions`
| Method | Endpoint | Description |
|---|---|---|
| POST | `/` | Create session |
| GET | `/:id` | Get session |
| POST | `/:id/end` | End session |

### Wallet — `/api/wallet`
| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Balance + transactions |
| POST | `/recharge` | Recharge via Razorpay |

### Agora — `/api/agora`
| Method | Endpoint | Description |
|---|---|---|
| POST | `/token` | Get RTC token |
| GET | `/channel/:sessionId` | Channel info |
| POST | `/feedback` | Submit feedback |

---

## Rate Limiting

| Limiter | Routes | Limit |
|---|---|---|
| `generalLimiter` | All | 100 req / 15 min |
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

## License

[MIT License](../LICENSE) — © 2026 Abhishek Giri
