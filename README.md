<div align="center">

<img src="docs/logo.png" alt="HealConnect Banner" width="100%" style="margin-bottom: 20px; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.15);"/>

<h1>🌿 HealConnect — Wellness Platform</h1>

<p style="color: #7c3aed; margin: 15px 0; font-size: 1.1em;">🚀 A production-ready full-stack wellness platform connecting users with verified energy healers, Vastu experts, numerologists, and tarot readers — featuring JWT auth, real-time Agora audio calls, session management, wallet system, and multi-language support built with Next.js 14, Express 5, PostgreSQL, and Redis.</p>

<p style="font-size: 1.2em; color: #5b21b6; background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%); padding: 20px; border-radius: 12px; max-width: 800px; margin: 20px auto; line-height: 1.6; border-left: 4px solid #7c3aed;">
🎯 <b>3 Role Portals</b> — User, Practitioner, Admin | ⚡ <b>Real-Time Calls</b> — Agora audio sessions | 🌐 <b>i18n Support</b> — Multi-language UI | ⚖️ <b>JWT Secured</b> — Access + Refresh token rotation
</p>

<p align="center">
<img src="https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js&logoColor=white"/>
<img src="https://img.shields.io/badge/Express-5-000000?style=for-the-badge&logo=express&logoColor=white"/>
<img src="https://img.shields.io/badge/TypeScript-strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white"/>
<img src="https://img.shields.io/badge/PostgreSQL-15-4169E1?style=for-the-badge&logo=postgresql&logoColor=white"/>
<img src="https://img.shields.io/badge/Redis-Azure-DC382D?style=for-the-badge&logo=redis&logoColor=white"/>
<img src="https://img.shields.io/badge/Agora-RTC-099DFD?style=for-the-badge&logo=agora&logoColor=white"/>
<img src="https://img.shields.io/badge/Azure-Blob_Storage-0078D4?style=for-the-badge&logo=microsoftazure&logoColor=white"/>
<img src="https://img.shields.io/badge/license-MIT-blue?style=for-the-badge"/>
</p>

</div>

---

## 📖 Problem Statement

The wellness and spiritual guidance industry lacks a trusted, centralized digital platform:

<div align="center">

| Challenge | Impact | Consequence |
|---|---|---|
| No verified practitioner directory | Users can't find trusted healers | Poor outcomes, scams |
| No real-time session booking | Manual coordination via calls/WhatsApp | Missed appointments |
| No payment transparency | Hidden charges, no receipts | User distrust |
| No session history | No continuity of care | Ineffective healing |
| No multi-language support | Language barriers | Limited reach |

</div>

---

## 💡 Solution

HealConnect provides a centralized platform with role-based portals for users, practitioners, and admins:

<div align="center">

| Feature | Traditional | HealConnect | Improvement |
|---|---|---|---|
| Finding Practitioners | Word of mouth | Verified directory + filters | Instant & trusted |
| Booking Sessions | Phone calls | Real-time availability + booking | Automated |
| Payments | Cash/UPI manually | Wallet system + per-minute billing | Transparent |
| Communication | WhatsApp | Agora audio calls in-app | Secure & tracked |
| Language | Single language | i18n multi-language UI | Inclusive |
| Auth | Basic login | JWT rotation + Redis blacklist | Enterprise-grade |

</div>

---

## ✨ Features

### User Portal
- Register/login with email or Google OAuth
- Browse verified practitioners with search, filter by specialty, language, rating, price
- Book real-time audio sessions via Agora RTC
- Per-minute billing with wallet deduction
- View session history and leave reviews
- Upload profile photo to Azure Blob Storage
- Multi-language UI (i18n)
- Light / Dark mode

### Practitioner Portal
- Create and manage practitioner profile
- Set availability (online/offline toggle)
- Conduct audio sessions via Agora
- View earnings and session history
- Receive and respond to reviews

### Admin Portal
- Trigger database migrations
- Manage practitioners (verify, suspend)
- Platform analytics

### Security
- JWT access token (15min) + refresh token (7 days) rotation
- Redis-backed access token blacklisting on logout
- Google OAuth 2.0
- Email verification + password reset via SendGrid
- Redis rate limiting per IP (general / auth / email tiers)
- bcrypt password hashing
- Helmet security headers
- CORS restricted to allowed origins
- PDF-only file upload with mimetype validation

---

## 📁 Project Structure

```
HealConnect/
├── 📂 backend/                        # Node.js + Express 5 + Prisma API
│   ├── 📂 prisma/
│   │   ├── 📄 schema.prisma           # Database models
│   │   └── 📂 migrations/             # SQL migration history
│   ├── 📂 src/
│   │   ├── 📄 index.ts                # Express app entry point (Port 8082)
│   │   ├── 📂 lib/
│   │   │   ├── 📄 prisma.ts           # Prisma client singleton
│   │   │   ├── 📄 jwt.ts              # Access & refresh token helpers
│   │   │   ├── 📄 redis.ts            # Redis client + token blacklist
│   │   │   ├── 📄 azure.ts            # Azure Blob Storage upload/delete
│   │   │   └── 📄 email.ts            # SendGrid email helpers
│   │   ├── 📂 middleware/
│   │   │   ├── 📄 auth.ts             # JWT authentication guard
│   │   │   ├── 📄 rateLimiter.ts      # Redis-backed rate limiters
│   │   │   └── 📄 validate.ts         # express-validator error handler
│   │   └── 📂 routes/
│   │       ├── 📄 auth.ts             # /api/auth/*
│   │       ├── 📄 users.ts            # /api/users/*
│   │       └── 📄 practitioners.ts    # /api/practitioners/*
│   ├── 📄 prisma.config.ts
│   ├── 📄 package.json
│   └── 📄 tsconfig.json
├── 📂 web/                            # Next.js 14 App Router Frontend
│   ├── 📂 public/
│   │   └── 📄 HealConnect.json        # Lottie hero animation
│   ├── 📂 src/
│   │   ├── 📂 app/
│   │   │   ├── 📄 page.tsx            # Landing page
│   │   │   ├── 📄 layout.tsx          # Root layout (ThemeProvider, fonts)
│   │   │   ├── 📄 globals.css         # Global styles + CSS variables
│   │   │   ├── 📂 login/              # Login page
│   │   │   ├── 📂 signup/             # Registration page
│   │   │   ├── 📂 dashboard/          # User dashboard + profile
│   │   │   └── 📂 practitioners/      # Browse + detail pages
│   │   ├── 📂 components/
│   │   │   ├── 📂 ui/                 # shadcn/ui primitives
│   │   │   ├── 📄 navbar.tsx          # Top navigation bar
│   │   │   ├── 📄 hero-animation.tsx  # Lottie animation
│   │   │   └── 📄 theme-toggle.tsx    # Dark/light toggle
│   │   └── 📂 lib/
│   │       ├── 📄 api.ts              # Typed fetch API client
│   │       ├── 📄 i18n.ts             # i18n translations
│   │       ├── 📄 lang-context.tsx    # Language context provider
│   │       └── 📄 utils.ts            # cn() utility
│   ├── 📄 next.config.mjs
│   ├── 📄 tailwind.config.ts
│   └── 📄 tsconfig.json
├── 📂 docs/                           # Project assets & documentation
│   ├── 🖼️ logo.png
│   └── 📄 tech_stack_review.md
├── 📄 LICENSE
└── 📄 README.md
```

---

## 🛠️ System Architecture

```mermaid
graph TB
    subgraph Client["Client (Browser)"]
        style Client fill:#1e1b4b,stroke:#6366f1,color:#e0e7ff
        WEB["Next.js 14\nApp Router\nTailwindCSS + shadcn/ui"]
    end

    subgraph Frontend["/web — Frontend"]
        style Frontend fill:#1e1b4b,stroke:#6366f1,color:#e0e7ff
        PAGES["Pages\n/ · /login · /signup\n/dashboard · /practitioners"]
        APICLIENT["lib/api.ts\nTyped Fetch Client"]
        I18N["lib/i18n.ts\nMulti-language Support"]
    end

    subgraph Backend["/backend — API Server"]
        style Backend fill:#14532d,stroke:#22c55e,color:#dcfce7
        EXPRESS["Express 5 · TypeScript\nPort 8082"]
        AUTH["routes/auth.ts\nRegister · Login · OAuth\nRefresh · Logout · Verify"]
        USERS["routes/users.ts\nProfile · Photo · Account"]
        PRACTITIONERS["routes/practitioners.ts\nCRUD · Availability · Reviews"]
        MW["Middleware\nJWT Auth · Rate Limiter · Validator"]
    end

    subgraph Services["External Services"]
        style Services fill:#431407,stroke:#f97316,color:#ffedd5
        PG[("PostgreSQL\nAzure DB")]
        REDIS[("Redis\nAzure Cache")]
        AZURE["Azure Blob Storage\nProfile Photos"]
        SENDGRID["SendGrid\nEmail Service"]
        GOOGLE["Google OAuth 2.0"]
        AGORA["Agora RTC\nAudio Calls"]
    end

    WEB --> PAGES
    PAGES --> APICLIENT
    PAGES --> I18N
    APICLIENT -->|"HTTP REST · Bearer Token"| EXPRESS
    EXPRESS --> MW
    MW --> AUTH
    MW --> USERS
    MW --> PRACTITIONERS
    AUTH --> PG
    AUTH --> REDIS
    AUTH --> SENDGRID
    AUTH --> GOOGLE
    USERS --> PG
    USERS --> AZURE
    PRACTITIONERS --> PG
    PRACTITIONERS --> AZURE
    PRACTITIONERS --> AGORA
    MW -->|"Rate Limit Store"| REDIS
```

---

## 🗄️ Database Schema

```mermaid
erDiagram
    User {
        uuid id PK
        string email UK
        string phone UK
        string name
        string passwordHash
        string provider
        string googleId UK
        string birthPlace
        string gender
        string[] wellnessInterests
        string photoUrl
        bool isEmailVerified
        datetime createdAt
    }

    Practitioner {
        uuid id PK
        string email UK
        string name
        string bio
        string[] specialties
        string[] certifications
        string[] languages
        int experienceYrs
        float perMinuteRate
        string photoUrl
        bool isVerified
        bool isOnline
    }

    RefreshToken {
        uuid id PK
        uuid userId FK
        string token UK
        bool isRevoked
        datetime expiresAt
    }

    Wallet {
        uuid id PK
        uuid userId FK
        float balance
        string currency
    }

    Transaction {
        uuid id PK
        uuid walletId FK
        float amount
        string type
        string status
    }

    Session {
        uuid id PK
        uuid userId FK
        uuid practitionerId FK
        string type
        string status
        float totalCost
        datetime startTime
        datetime endTime
    }

    Review {
        uuid id PK
        uuid sessionId FK
        uuid userId FK
        uuid practitionerId FK
        int rating
        string comment
    }

    User ||--o{ RefreshToken : "has"
    User ||--o| Wallet : "has"
    User ||--o{ Session : "books"
    User ||--o{ Review : "writes"
    Wallet ||--o{ Transaction : "has"
    Practitioner ||--o{ Session : "conducts"
    Practitioner ||--o{ Review : "receives"
    Session ||--o| Review : "has"
```

---

## 🌐 API Reference

### Auth — `/api/auth`
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/register` | ❌ | Register with email + password |
| POST | `/login` | ❌ | Login, returns access + refresh tokens |
| POST | `/refresh` | ❌ | Rotate refresh token |
| POST | `/logout` | ✅ | Revoke tokens, blacklist access token |
| POST | `/google` | ❌ | Google OAuth sign-in |
| GET | `/me` | ✅ | Get current authenticated user |
| GET | `/verify-email` | ❌ | Verify email via token link |
| POST | `/forgot-password` | ❌ | Send password reset email |
| POST | `/reset-password` | ❌ | Reset password via token |

### Users — `/api/users` *(auth: user)*
| Method | Endpoint | Description |
|---|---|---|
| GET | `/me` | Get full user profile |
| PATCH | `/me` | Update profile |
| POST | `/me/photo` | Upload profile photo to Azure Blob |
| DELETE | `/me/photo` | Delete profile photo |
| DELETE | `/me` | Delete account permanently |

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

## 🔐 Authentication Flow

```
POST /api/auth/login
  → returns { accessToken (15min), refreshToken (7d) }

Every request → Authorization: Bearer <accessToken>

When accessToken expires:
  POST /api/auth/refresh { refreshToken }
  → returns new { accessToken, refreshToken }  (old refresh token revoked)

POST /api/auth/logout
  → refresh token revoked in DB
  → access token blacklisted in Redis until natural expiry
```

---

## ⚡ Rate Limiting

| Limiter | Routes | Limit |
|---|---|---|
| `generalLimiter` | All routes | 100 req / 15 min |
| `authLimiter` | `/register`, `/login`, `/google` | 10 req / 15 min (prod) |
| `emailLimiter` | `/resend-verification`, `/forgot-password` | 5 req / hr (prod) |

---

## 🚀 Quick Start (Local)

### 1. Clone Repository

```bash
git clone https://github.com/AbhishekGiri04/HealConnect.git
cd HealConnect
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
PORT=8082
DATABASE_URL="postgresql://user:password@localhost:5432/healconnect"
JWT_ACCESS_SECRET=your_access_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
SENDGRID_API_KEY=SG.xxxx
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;...
AZURE_STORAGE_CONTAINER=profile-photos
REDIS_URL="rediss://:password@your-redis.redis.cache.windows.net:6380"
APP_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3000
```

```bash
npx prisma generate
npx prisma db push
npm run dev
# → http://localhost:8082
```

### 3. Frontend Setup

```bash
cd web
npm install
```

Create `web/.env`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8082
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```

```bash
npm run dev
# → http://localhost:3000
```

---

## 🛠️ Tech Stack

<div align="center">

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Styling | TailwindCSS + shadcn/ui |
| Theme | next-themes (Light / Dark) |
| Animation | lottie-react |
| i18n | Custom lang-context |
| Backend | Express 5 + Node.js 20+ |
| ORM | Prisma 7 + `@prisma/adapter-pg` |
| Database | PostgreSQL 15 (Azure) |
| Cache | Redis (Azure Cache) |
| Auth | JWT + bcrypt + Google OAuth |
| Storage | Azure Blob Storage |
| Email | SendGrid |
| Calls | Agora RTC (audio) |

</div>

---

## 📞 Contact & Support

<div align="center">

> 💬 *Got questions or want to collaborate on HealConnect?*

**👤 Abhishek Giri** — Developer & Project Lead

<a href="https://linkedin.com/in/abhishekgiri04">
  <img src="https://img.shields.io/badge/Connect%20on-LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn"/>
</a>
&nbsp;
<a href="https://github.com/AbhishekGiri04">
  <img src="https://img.shields.io/badge/Follow%20on-GitHub-100000?style=for-the-badge&logo=github&logoColor=white" alt="GitHub"/>
</a>
&nbsp;
<a href="mailto:abhishekgiri0405@gmail.com">
  <img src="https://img.shields.io/badge/Email-Contact-D14836?style=for-the-badge&logo=gmail&logoColor=white" alt="Email"/>
</a>

</div>

---

<div align="center">

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

**🌿 Built with ❤️ for Wellness & Healing**

*Connecting people with verified healers through intelligent digital automation*

<img src="https://img.shields.io/badge/Made%20with-Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white"/>
<img src="https://img.shields.io/badge/Database-PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white"/>
<img src="https://img.shields.io/badge/Calls-Agora_RTC-099DFD?style=for-the-badge"/>

**© 2025 Abhishek Giri | HealConnect**

</div>
