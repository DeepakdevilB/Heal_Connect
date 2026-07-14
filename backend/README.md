# HealConnect — Backend API

<p align="center">
  <img src="../docs/logo.png" alt="HealConnect Logo" width="140" />
</p>

Production-grade REST API for the HealConnect wellness platform. Built with Node.js, Express, TypeScript, Prisma ORM, PostgreSQL, Redis, and Azure Blob Storage.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20+ |
| Framework | Express 5 |
| Language | TypeScript 6 (strict mode) |
| ORM | Prisma 7 + `@prisma/adapter-pg` |
| Database | PostgreSQL 15 |
| Cache / Rate Limit Store | Redis (Azure Cache for Redis) |
| File Storage | Azure Blob Storage |
| Auth | JWT (Access + Refresh token rotation) |
| Email | SendGrid |
| OAuth | Google OAuth 2.0 |

---

## Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma          # Database models
│   └── migrations/            # SQL migration history
├── src/
│   ├── index.ts               # Express app entry point
│   ├── lib/
│   │   ├── prisma.ts          # Prisma client singleton (pg adapter)
│   │   ├── jwt.ts             # Access & refresh token helpers
│   │   ├── redis.ts           # Redis client + token blacklist
│   │   ├── azure.ts           # Azure Blob Storage upload/delete
│   │   └── email.ts           # SendGrid email helpers
│   ├── middleware/
│   │   ├── auth.ts            # JWT authentication guard
│   │   ├── rateLimiter.ts     # Redis-backed rate limiters
│   │   └── validate.ts        # express-validator error handler
│   └── routes/
│       ├── auth.ts            # /api/auth/*
│       ├── users.ts           # /api/users/*
│       └── practitioners.ts   # /api/practitioners/*
├── prisma.config.ts           # Prisma 7 datasource config
├── package.json
└── tsconfig.json
```

---

## Environment Variables

Create a `.env` file in `/backend`:

```env
PORT=8082

# PostgreSQL
DATABASE_URL="postgresql://user:password@localhost:5432/healconnect"

# JWT
JWT_ACCESS_SECRET=your_access_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here

# SendGrid
SENDGRID_API_KEY=SG.xxxx
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com

# Azure Blob Storage
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;...
AZURE_STORAGE_CONTAINER=profile-photos

# Redis
REDIS_URL="rediss://:password@your-redis.redis.cache.windows.net:6380"

# Frontend (for email links & CORS)
APP_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3000
```

---

## Getting Started

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Start dev server
npm run dev
```

Server starts at `http://localhost:8082`.

---

## API Reference

### Auth — `/api/auth`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/register` | ❌ | Register with email + password |
| POST | `/login` | ❌ | Login, returns access + refresh tokens |
| POST | `/refresh` | ❌ | Rotate refresh token |
| POST | `/logout` | ✅ | Revoke tokens, blacklist access token |
| POST | `/google` | ❌ | Google OAuth sign-in |
| POST | `/apple` | ❌ | Apple sign-in |
| GET | `/me` | ✅ | Get current authenticated user |
| GET | `/verify-email` | ❌ | Verify email via token link |
| POST | `/resend-verification` | ❌ | Resend verification email |
| POST | `/forgot-password` | ❌ | Send password reset email |
| POST | `/reset-password` | ❌ | Reset password via token |

---

### Users — `/api/users`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/me` | ✅ | Get full user profile |
| PATCH | `/me` | ✅ | Update profile (name, dob, birthPlace, gender, wellnessInterests, phone) |
| POST | `/me/photo` | ✅ | Upload profile photo to Azure Blob |
| DELETE | `/me/photo` | ✅ | Delete profile photo |
| DELETE | `/me` | ✅ | Delete account permanently |

---

### Practitioners — `/api/practitioners`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | ❌ | List verified practitioners (filterable) |
| GET | `/:id` | ❌ | Get practitioner profile + reviews |
| POST | `/` | ✅ | Create practitioner profile |
| PATCH | `/:id` | ✅ | Update practitioner profile |
| POST | `/:id/photo` | ✅ | Upload practitioner photo |
| PATCH | `/:id/availability` | ✅ | Toggle online/offline status |
| DELETE | `/:id` | ✅ | Delete practitioner |

**Query filters for `GET /`:**

| Param | Type | Example |
|---|---|---|
| `search` | string | `?search=tarot` |
| `specialty` | string | `?specialty=numerology` |
| `language` | string | `?language=Hindi` |
| `minRating` | float | `?minRating=4.0` |
| `maxRate` | float | `?maxRate=15` |
| `onlineOnly` | boolean | `?onlineOnly=true` |
| `page` | int | `?page=2` |
| `limit` | int | `?limit=10` |

---

## Authentication Flow

```
POST /api/auth/login
  → returns { accessToken (15m), refreshToken (7d) }

Every request → Authorization: Bearer <accessToken>

When accessToken expires:
  POST /api/auth/refresh { refreshToken }
  → returns new { accessToken, refreshToken }  (old refresh token revoked)

POST /api/auth/logout
  → refresh token revoked in DB
  → access token blacklisted in Redis until natural expiry
```

---

## Rate Limiting

All limits are backed by Redis and keyed by client IP.

| Limiter | Routes | Limit |
|---|---|---|
| `generalLimiter` | All routes | 100 req / 15 min |
| `authLimiter` | `/api/auth/register`, `/login`, `/google`, `/apple` | 100 req / 15 min (dev) · 10 req / 15 min (prod) |
| `emailLimiter` | `/api/auth/resend-verification`, `/forgot-password` | 50 req / hr (dev) · 5 req / hr (prod) |

---

## Database Schema

```
User
  ├── id, email, phone, name
  ├── passwordHash, provider (email | google | apple)
  ├── googleId, appleId
  ├── dob, birthPlace, gender, wellnessInterests[]
  ├── photoUrl, isEmailVerified
  ├── emailVerifyToken/Expiry, passwordResetToken/Expiry
  └── → Wallet, Session[], Review[], RefreshToken[]

Practitioner
  ├── id, email, phone, name, bio
  ├── specialties[], certifications[], languages[]
  ├── experienceYrs, perMinuteRate
  ├── photoUrl, isVerified, isOnline
  └── → Session[], Review[]

RefreshToken     → userId, token, isRevoked, expiresAt
Wallet           → userId, balance, currency
Transaction      → walletId, amount, type, status
Session          → userId, practitionerId, type, status, totalCost
Review           → sessionId, userId, practitionerId, rating, comment
```

---

## Scripts

```bash
npm run dev       # ts-node dev server with hot reload
npm run build     # Compile TypeScript to dist/
npm start         # Run compiled dist/index.js
```

---

## Docs

- [Tech Stack Review & Risks](../docs/tech_stack_review.md)
- [Project Plan](../docs/HealConnect_Project_Plan.xlsx)
- [Tech Stack Document](../docs/HealConnect_Tech_Stack.docx)
