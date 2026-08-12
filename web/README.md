<div align="center">

# 🌿 HealConnect — Web Frontend

**Production-grade Next.js 15 frontend for the HealConnect wellness platform.**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io)

<a href="https://blue-plant-0d21bc900.6.azurestaticapps.net">
  <img src="https://img.shields.io/badge/Frontend-Live-success?style=for-the-badge&logo=microsoftazure" alt="Frontend Live"/>
</a>

</div>

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Next.js 15 (App Router) | SSR + client pages |
| Language | TypeScript (strict) | Type safety |
| Styling | TailwindCSS + shadcn/ui | UI components |
| Theme | next-themes | Light / Dark mode |
| Animation | lottie-react | Landing page animation |
| Icons | lucide-react | Icon library |
| Real-time | Socket.IO client | Chat, typing, billing events |
| Audio Calls | Agora RTC SDK | Real-time voice consultations |
| Payments | Razorpay + Stripe | Wallet recharge |
| i18n | Custom lang-context | EN / HI language toggle |

---

## 📁 Project Structure

```
web/
├── public/
│   ├── logo.png                  # App logo
│   ├── HealConnect.json          # Lottie animation (landing page)
│   └── avatars/                  # Fallback practitioner avatars (1–6)
├── src/
│   ├── app/
│   │   ├── page.tsx              # Landing page with Lottie animation
│   │   ├── layout.tsx            # Root layout + providers
│   │   ├── globals.css           # Global styles
│   │   ├── login/
│   │   │   └── page.tsx          # Unified login — User tab + Expert tab
│   │   ├── signup/
│   │   │   └── page.tsx          # Unified signup — User tab + Expert tab
│   │   ├── dashboard/
│   │   │   ├── page.tsx          # User dashboard — experts, wallet, quick actions
│   │   │   ├── profile/
│   │   │   │   └── page.tsx      # User profile editor
│   │   │   └── wallet/
│   │   │       └── page.tsx      # Wallet balance + transaction history
│   │   ├── practitioners/
│   │   │   ├── page.tsx          # Browse all experts with filters
│   │   │   └── [id]/
│   │   │       └── page.tsx      # Expert detail page + reviews
│   │   ├── expert/
│   │   │   ├── login/
│   │   │   │   └── page.tsx      # Expert login (redirects from /login Expert tab)
│   │   │   └── dashboard/
│   │   │       └── page.tsx      # Expert panel — active sessions, earnings, profile
│   │   ├── session/
│   │   │   └── [sessionId]/
│   │   │       └── page.tsx      # Live chat + audio call screen
│   │   ├── verify-email/
│   │   │   └── page.tsx          # Email verification
│   │   ├── verify-otp/
│   │   │   └── page.tsx          # SMS OTP verification
│   │   ├── reset-password/
│   │   │   └── page.tsx          # Password reset
│   │   └── auth/google/callback/
│   │       └── page.tsx          # Google OAuth callback handler
│   ├── components/
│   │   ├── ui/                   # shadcn/ui primitives (Button, Card, Badge...)
│   │   ├── chat/
│   │   │   ├── ChatWindow.tsx    # Full chat UI — messages, input, timer
│   │   │   ├── MessageBubble.tsx # Individual message bubble
│   │   │   ├── TypingIndicator.tsx
│   │   │   ├── SessionTimerOverlay.tsx
│   │   │   ├── EndSessionConfirmDialog.tsx
│   │   │   └── AudioCallScreen.tsx
│   │   ├── wallet/
│   │   │   └── RechargeModal.tsx # Razorpay + Stripe recharge modal
│   │   ├── navbar.tsx
│   │   ├── hero-animation.tsx    # Lottie wrapper
│   │   └── theme-toggle.tsx
│   ├── hooks/
│   │   ├── useSessionChat.ts     # Socket.IO chat hook — messages, typing, billing
│   │   └── useAgoraCall.ts       # Agora RTC audio call hook
│   └── lib/
│       ├── api.ts                # All REST API calls (fully typed)
│       ├── socket.ts             # Socket.IO client singleton
│       ├── i18n.ts               # EN/HI translation strings
│       ├── lang-context.tsx      # Language context provider
│       ├── razorpay.ts           # Razorpay checkout helper
│       └── utils.ts              # cn(), getPractitionerAvatar()
├── next.config.mjs               # /api/* → backend rewrite proxy
├── tailwind.config.ts
└── tsconfig.json
```

---

## ⚙️ Environment Variables

```env
# Backend URL — used by Next.js rewrite proxy (next.config.mjs)
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_BACKEND_URL=http://localhost:8080

# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```

> **Note:** `NEXT_PUBLIC_API_URL` is intentionally empty string in production — all `/api/*` calls go through the Next.js rewrite proxy to avoid CORS issues.

---

## 🚀 Getting Started

```bash
npm install

# Create .env file
echo "NEXT_PUBLIC_API_URL=http://localhost:8080" > .env
echo "NEXT_PUBLIC_BACKEND_URL=http://localhost:8080" >> .env
echo "NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id" >> .env

npm run dev    # → http://localhost:3000
```

---

## 📄 Pages

| Route | Who Can Access | Description |
|-------|:---:|-------------|
| `/` | Everyone | Landing page with Lottie animation |
| `/login` | Everyone | Unified login — User tab + Expert tab |
| `/signup` | Everyone | Unified signup — User tab + Expert tab |
| `/practitioners` | Everyone | Browse all experts with filters |
| `/practitioners/[id]` | Everyone | Expert detail page + reviews |
| `/dashboard` | User only | Dashboard — experts, wallet, quick actions |
| `/dashboard/profile` | User only | Edit profile |
| `/dashboard/wallet` | User only | Wallet balance + transaction history |
| `/expert/login` | Expert only | Expert login redirect |
| `/expert/dashboard` | Expert only | Active sessions, earnings, profile overview |
| `/session/[sessionId]` | User + Expert | Live chat + audio call screen |
| `/verify-email` | Everyone | Email verification |
| `/verify-otp` | Everyone | SMS OTP verification |
| `/reset-password` | Everyone | Password reset |
| `/auth/google/callback` | Everyone | Google OAuth callback |

---

## 👤 User vs Expert Flow

| Feature | User | Expert |
|---------|------|--------|
| Login | `/login` → User tab | `/login` → Expert tab |
| After login | Redirected to `/dashboard` | Redirected to `/expert/dashboard` |
| Dashboard | Browse experts, wallet, sessions | Active sessions, earnings, profile |
| Wallet | Auto-created on register | Not available |
| Billing | Debited per minute during session | Credited per session |
| Session history | `/api/sessions/user/history` | `/api/sessions/practitioner/history` |
| Online status | Not applicable | Toggle in dashboard — auto online on socket connect |
| Socket identity | `userId` in JWT | `practitionerId` in JWT |

---

## 🔌 Socket.IO Client

Socket connects **directly to backend** — not via Next.js `/api` proxy (WebSocket upgrade not supported in rewrites).

```ts
// lib/socket.ts
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

const socket = io(BACKEND_URL, {
  auth: { token },           // JWT passed here — backend verifies on connect
  transports: ['websocket', 'polling'],
});
```

Events used by `useSessionChat` hook:

| Event | Direction | Used For |
|-------|-----------|----------|
| `join_room` | Emit | Join session room on page load |
| `send_message` | Emit | Send chat message |
| `typing_start` / `typing_stop` | Emit | Typing indicator |
| `message_read` | Emit | Mark message as read |
| `new_message` | Listen | Receive incoming messages |
| `message_history` | Listen | Load past messages on join |
| `typing_update` | Listen | Show other party typing |
| `receipt_update` | Listen | Update read receipts |
| `low_balance` | Listen | Show low balance warning |
| `session_terminated` | Listen | End session, redirect |
| `practitioner_status` | Listen | Real-time online/offline card updates |

---

## 📜 Scripts

```bash
npm run dev      # Next.js dev server with hot reload
npm run build    # Production build
npm start        # Start production server
npm run lint     # ESLint check
```

---

## ⚠️ Notes

- Socket.IO connects directly to `NEXT_PUBLIC_BACKEND_URL` — not via Next.js proxy
- Local dev: use **incognito window for user** + **normal window for expert** (separate `localStorage` on same port)
- `NEXT_PUBLIC_API_URL` is empty string in production build — all REST calls go through Next.js rewrite proxy

---

## 📄 License

[MIT License](../LICENSE) — © 2026 Abhishek Giri
