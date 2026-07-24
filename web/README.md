# HealConnect — Web Frontend

<p align="center">
  <img src="../docs/logo.png" alt="HealConnect Logo" width="140" />
</p>

Production-grade Next.js frontend for the HealConnect wellness platform. Connects users with verified energy healers, Vastu experts, numerologists, and tarot readers.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | TailwindCSS + shadcn/ui |
| Theme | next-themes (Light / Dark mode) |
| Animation | lottie-react |
| Icons | lucide-react |
| Fonts | Geist (Variable) |
| Auth | JWT stored in localStorage |
| API Client | Native `fetch` (typed wrapper in `lib/api.ts`) |

---

## Project Structure

```
web/
├── public/
│   ├── logo.png
│   └── HealConnect.json            # Lottie animation (hero section)
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Landing page
│   │   ├── layout.tsx                  # Root layout (ThemeProvider, fonts)
│   │   ├── globals.css                 # Global styles + CSS variables
│   │   ├── login/page.tsx              # Login screen
│   │   ├── signup/page.tsx             # Registration screen
│   │   ├── verify-email/page.tsx       # Email verification handler
│   │   ├── dashboard/
│   │   │   ├── page.tsx                # User dashboard
│   │   │   └── profile/page.tsx        # Edit profile
│   │   ├── practitioners/
│   │   │   ├── page.tsx                # Browse practitioners
│   │   │   └── [id]/page.tsx           # Practitioner detail
│   │   └── auth/google/callback/       # Google OAuth callback
│   ├── components/
│   │   ├── ui/                         # shadcn/ui primitives
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   └── badge.tsx
│   │   ├── navbar.tsx                  # Top navigation bar
│   │   ├── hero-animation.tsx          # Lottie animation component (hero section)
│   │   ├── theme-toggle.tsx            # Dark/light mode toggle
│   │   └── theme-provider.tsx          # next-themes wrapper
│   └── lib/
│       ├── api.ts                      # Typed API client (authApi, usersApi, practitionersApi)
│       └── utils.ts                    # cn() utility (clsx + tailwind-merge)
├── .env                                # Environment variables
├── next.config.mjs
├── tailwind.config.ts
└── tsconfig.json
```

---

## Environment Variables

Create a `.env` file in `/web`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8082
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```

---

## Getting Started

```bash
npm install
npm run dev
```

App runs at `http://localhost:3000`.

---

## Pages

| Route | Description |
|---|---|
| `/` | Landing page with hero, features, testimonials |
| `/login` | Email + Google + Apple sign-in |
| `/signup` | Registration with email or OAuth |
| `/verify-email` | Handles email verification token from link |
| `/dashboard` | Authenticated user home |
| `/dashboard/profile` | Edit profile (name, dob, birthPlace, gender, interests, photo) |
| `/practitioners` | Browse & filter verified practitioners |
| `/practitioners/[id]` | Practitioner detail with reviews |
| `/auth/google/callback` | Google OAuth redirect handler |

---

## API Client — `lib/api.ts`

Typed wrapper around `fetch`. All calls go to `NEXT_PUBLIC_API_URL`.

```ts
// Auth
authApi.register({ name, email, password })
authApi.login({ email, password })
authApi.googleSignIn(idToken)
authApi.refresh(refreshToken)
authApi.me(accessToken)

// Users
usersApi.getProfile(token)
usersApi.updateProfile(token, { name, dob, birthPlace, gender, wellnessInterests })
usersApi.uploadPhoto(token, file)
usersApi.deletePhoto(token)
usersApi.deleteAccount(token)

// Practitioners
practitionersApi.list({ search, specialty, language, minRating, maxRate, onlineOnly, page, limit })
practitionersApi.get(id)
practitionersApi.create(token, body)
practitionersApi.update(token, id, body)
practitionersApi.uploadPhoto(token, id, file)
practitionersApi.setAvailability(token, id, isOnline)
```

---

## Token Management — `tokenStore`

Tokens are stored in `localStorage` under keys `hc_access` and `hc_refresh`.

```ts
tokenStore.setTokens(accessToken, refreshToken)
tokenStore.getAccess()
tokenStore.getRefresh()
tokenStore.clear()
```

---

## Theming

- Light and Dark mode via `next-themes`
- CSS variables defined in `globals.css` for both themes
- Toggle available in navbar via `ThemeToggle` component
- Default: system preference

---

## Scripts

```bash
npm run dev      # Next.js dev server (http://localhost:3000)
npm run build    # Production build
npm start        # Start production server
npm run lint     # ESLint check
```

---

## Docs

- [Tech Stack Review & Risks](../docs/tech_stack_review.md)
- [Project Plan](../docs/HealConnect_Project_Plan.xlsx)

## License

This project is licensed under the [MIT License](../LICENSE).
