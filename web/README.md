# HealConnect — Web Frontend

Production-grade Next.js 14 frontend for the HealConnect wellness platform.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | TailwindCSS + shadcn/ui |
| Theme | next-themes (Light / Dark) |
| Animation | lottie-react |
| Icons | lucide-react |
| Real-time | Socket.IO client |
| Calls | Agora RTC SDK |
| Payments | Razorpay |
| i18n | Custom lang-context (EN/HI) |

---

## Project Structure

```
web/
├── public/
│   ├── logo.png
│   ├── HealConnect.json          # Lottie animation
│   └── avatars/                  # Practitioner avatars
├── src/
│   ├── app/
│   │   ├── page.tsx              # Landing page
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   ├── login/
│   │   ├── signup/
│   │   ├── dashboard/
│   │   │   ├── page.tsx
│   │   │   ├── profile/
│   │   │   └── wallet/
│   │   ├── practitioners/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   ├── session/[sessionId]/  # Live audio/chat session
│   │   ├── verify-email/
│   │   ├── verify-otp/
│   │   ├── reset-password/
│   │   └── auth/google/callback/
│   ├── components/
│   │   ├── ui/                   # shadcn/ui primitives
│   │   ├── chat/                 # AudioCallScreen, ChatWindow, etc.
│   │   ├── wallet/               # RechargeModal
│   │   ├── navbar.tsx
│   │   ├── hero-animation.tsx
│   │   └── theme-toggle.tsx
│   ├── hooks/
│   │   ├── useAgoraCall.ts       # Agora RTC hook
│   │   └── useSessionChat.ts     # Socket.IO chat hook
│   └── lib/
│       ├── api.ts                # Typed fetch client
│       ├── i18n.ts               # EN/HI translations
│       ├── lang-context.tsx      # Language provider
│       ├── socket.ts             # Socket.IO client
│       ├── razorpay.ts           # Razorpay helpers
│       └── utils.ts              # cn() utility
├── next.config.mjs
├── tailwind.config.ts
└── tsconfig.json
```

---

## Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```

---

## Getting Started

```bash
npm install
npm run dev    # → http://localhost:3000
```

---

## Pages

| Route | Description |
|---|---|
| `/` | Landing page |
| `/login` | Login (User / Expert toggle) |
| `/signup` | Signup (User / Expert toggle) |
| `/dashboard` | User dashboard |
| `/dashboard/profile` | Edit profile |
| `/dashboard/wallet` | Wallet + recharge |
| `/practitioners` | Browse practitioners |
| `/practitioners/[id]` | Practitioner detail |
| `/session/[sessionId]` | Live audio/chat session |
| `/verify-email` | Email verification |
| `/verify-otp` | SMS OTP verification |
| `/reset-password` | Password reset |
| `/auth/google/callback` | Google OAuth callback |

---

## Scripts

```bash
npm run dev      # Next.js dev server
npm run build    # Production build
npm start        # Start production server
npm run lint     # ESLint
```

---

## License

[MIT License](../LICENSE) — © 2026 Abhishek Giri
