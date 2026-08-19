# HealConnect — Session Changes Report

**Branch:** `Priyanshu` · **Date:** 2026-08-14 · **Base commit for this work:** `749b0bb` (post-merge with `main`)

This covers everything built, fixed, and verified in this conversation — five lead-requested feature/UI tasks, a full security and bug sweep, and the new speech-to-text feature that was merged in from another branch and audited here.

---

## Part 1 — The 5 lead-requested tasks

### 1. Share button — bigger, more prominent, repositioned
**File:** `web/src/app/practitioners/[id]/PractitionerDetailClient.tsx`
Replaced the thin outlined pill with a filled amber/orange gradient button, larger padding, hover-scale animation. Same top-right header position, confirmed against the screenshot the lead sent.

### 2. Expert search — autocomplete/dropdown
**Files:** `web/src/app/dashboard/page.tsx`, `web/src/app/practitioners/PractitionersClient.tsx`
Added a debounced (300ms) dropdown to both the dashboard header search and the `/practitioners` search bar. Typing a name (e.g. "DEE") shows matching experts — avatar, name, specialty, online status — click navigates straight to their profile. Uses the existing case-insensitive `search` param on `GET /api/practitioners`.

### 3. Experts → See All
**Status:** Verified, no change needed. `/dashboard`'s "See all" link and the `/practitioners` page were already a real, dedicated, paginated listing page.

### 4. Chat History redesign (post-call)
**File:** `web/src/components/chat/ChatWindow.tsx`
The "ended" session state previously showed messages in an unlabeled 256px-tall sliver. Now has a clear "Chat History (N messages)" heading with icon, its own card with border/shadow, and a 420px scrollable area.

### 5. Chat ↔ Call switching
**File:** `web/src/app/session/[sessionId]/page.tsx`
Added a green phone icon in the chat header for CHAT-only sessions. Tapping it starts a new AUDIO session with the same expert and navigates there.
**Proposed but not built (discussed, awaiting go-ahead):** a `PATCH /api/sessions/:id/upgrade` endpoint to flip an active session's type in place instead of creating a second session — would avoid a second practitioner-accept step and keep chat history + billing continuous. Flagged in your own project tracker as "UI and backend done, logic remains."

---

## Part 2 — Security fixes (pre-production audit)

### Unauthenticated/under-protected endpoints — all now gated behind `requireAdmin`
Found live and exploitable in production (5 of them — one more than the original `PROJECT_HEALTH_AUDIT.md` had flagged):

| Endpoint | File | Was | Now |
|---|---|---|---|
| `POST /api/wallet/dev-recharge` | `wallet.ts` | Any logged-in user could credit their own wallet for free | `requireAuth` + `requireAdmin`, hard-blocked in `NODE_ENV=production` |
| `POST /api/practitioners/dev/verify` | `practitioners.ts` | Anyone, no auth, could verify every practitioner | `requireAdmin` |
| `POST /api/sessions/dev-clear` | `sessions.ts` | Anyone, no auth, could kill every live session platform-wide | `requireAdmin` |
| `GET /api/migrate/run` | `migrate.ts` | Anyone, no auth, unauthenticated raw SQL execution | `requireAdmin` |
| `POST /api/admin/migrate` | `admin.ts` | Gated only by a hardcoded query-string secret (`?secret=healconnect2026`), reachable by anyone | `requireAdmin` (`x-admin-key` header) |
| `POST /api/admin/fix-email` | `admin.ts` | Unauthenticated one-off data-fix route | `requireAdmin` |

**Important operational note:** `POST /api/admin/migrate` is the route that actually pushes pending schema changes (the `isBanned`/`banReason`/`banUntil` columns, GDPR `erasedAt` columns, etc.) to the live production database. It does **not** run automatically on deploy — someone needs to `POST` to it with a valid `x-admin-key` header to land those changes on prod.

**New shared middleware:** `requireAdmin` moved from a private function inside `admin.ts` to an exported function in `backend/src/middleware/auth.ts`, so other route files could import and reuse it. Also removed a dead, unused `child_process`/`exec` import from `admin.ts`.

**Still open, lower priority (not fixed, flagged for later):**
- `requireAdmin` falls back to a hardcoded key (`'healconnect-admin-2026'`) if `ADMIN_SECRET_KEY` isn't set in Azure — worth confirming that env var is actually set.
- Practitioner profile page recomputes `avgRating` from only the last 10 reviews instead of the accurate denormalized column — can show a different rating than search results for practitioners with >10 reviews.
- A flagged practitioner can dismiss their own moderation flag (`reviews.ts`, self-documented `TODO`) — any practitioner token passes the check, not just admins.

### Payment webhook security hardening
**File:** `backend/src/routes/wallet.ts`

1. **Razorpay signature verification was silently broken.** It computed the HMAC over `JSON.stringify(req.body)` (the re-serialized, already-parsed body) instead of the exact raw bytes Razorpay signed. This could cause legitimate successful payments to fail signature verification and never credit the customer's wallet. Fixed to use `req.rawBody` (already captured globally in `index.ts`), matching the pattern the Stripe handler used correctly.
2. **Both webhook handlers had hardcoded fallback secrets** (`|| 'dummy_webhook_secret'`) — publicly visible in this repo. If `RAZORPAY_WEBHOOK_SECRET` or `STRIPE_WEBHOOK_SECRET` were ever unset in Azure, anyone could forge a valid `payment.captured`/`checkout.session.completed` event and credit any wallet with fake money, no login required. Both now fail closed (reject with no fallback) if the secret isn't configured.
3. Switched the Razorpay signature comparison to `crypto.timingSafeEqual` instead of `!==` (timing-attack hardening).
4. Documented `RAZORPAY_WEBHOOK_SECRET`, `STRIPE_WEBHOOK_SECRET`, `RAZORPAY_KEY_ID/SECRET`, `STRIPE_SECRET_KEY` in `backend/.env.example` — none of these were documented before.

---

## Part 3 — Speech-to-text feature (merged from another branch, audited and fixed here)

The STT feature itself (`useDeepgramTranscription.ts`, `backend/src/routes/deepgram.ts`, Agora audio mixing, live caption UI, transcript auto-submission) was built elsewhere and merged into `Priyanshu` at commit `749b0bb`. Two real bugs were found during review and fixed:

### Bug 1 (security): Deepgram master API key was leaking to every user's browser
**File:** `backend/src/routes/deepgram.ts`
The `/api/deepgram/token` endpoint was supposed to hand out a short-lived scoped credential, but fell back to returning the **raw master `DEEPGRAM_API_KEY`** whenever `DEEPGRAM_PROJECT_ID` was unset (which it always was — that var wasn't even documented in `.env.example`) or whenever the ephemeral-key API call failed for any reason. The frontend then put that key directly into a browser-side WebSocket (`new WebSocket(url, ['token', apiKey])`) — fully visible in devtools to any user. **Fixed:** both env vars are now required together; if either is missing or the ephemeral-key call fails, the endpoint reports `isConfigured: false` (a path the frontend already handled gracefully) instead of ever sending the master key to a client. Documented both vars in `.env.example`.

### Bug 2 (functional): remote participant's voice could be silently missing from transcripts
**File:** `web/src/hooks/useDeepgramTranscription.ts`
The effect that attaches a remote participant's audio track after it publishes (a common timing case — the other person's track often isn't ready the instant transcription starts) was creating a **second, disconnected** `AudioContext` destination node instead of reusing the one actually wired into the `MediaRecorder`. That audio went into a dead end and never reached Deepgram. **Fixed:** both places now share one destination node via a `destinationRef`.

### Bug 3 (functional, quality): language config didn't actually support Hindi/English code-switching
Same file. Was using `language: 'hi'` + `detect_language: 'true'`, but per Deepgram's own docs, `detect_language` overrides a fixed `language` value and only picks one dominant language for the whole call — it does not support switching languages mid-conversation. **Fixed:** switched to `language: 'multi'` (Deepgram's actual code-switching mode for Nova-2/Nova-3) plus `endpointing: '100'`, which Deepgram specifically recommends for code-switching streams. This should now genuinely handle mixed Hindi/English ("Hinglish") speech instead of picking one language for the whole call.
Source: [Deepgram Multilingual Codeswitching docs](https://developers.deepgram.com/docs/multilingual-code-switching)

---

## Verification status

| Check | Result |
|---|---|
| Manual code review of every diff | Done — all changes reviewed line-by-line |
| Diff scoped to only intended files | Confirmed via `git -c core.autocrlf=input diff --stat` after each change |
| Backend `tsc --noEmit` | Passed cleanly earlier in the session (only pre-existing, unrelated errors: stale generated Prisma client re: `googleId` in `auth.ts`). **Could not get a fresh clean run after the merge** — this sandbox's typecheck has been consistently timing out (~170s+) since the repo grew with the merge; confirmed it's filesystem/environment slowness, not a code issue (trivial commands like `du` also hung). **Please run `cd backend && npx tsc --noEmit` yourself before pushing.** |
| Frontend `tsc --noEmit` | Passed cleanly (0 errors) earlier in the session, before the merge. Same post-merge timeout issue applies. **Please run `cd web && npx tsc --noEmit` yourself before pushing.** |
| No admin-panel code broken by the new `requireAdmin` gates | Confirmed — no existing frontend code calls any of the 5 newly-gated endpoints |
| Practitioner refresh-token FK regression (old known bug) | Re-checked after merge — still fixed, did not regress |
| `/me/export` route-ordering fix (from a separate pre-merge audit) | Re-verified correct — `/me/export` registered before `/:id` in `practitioners.ts` |

---

## Git status

- Branch `Priyanshu`, currently sitting on commit `749b0bb` (merge with `main`) plus all fixes above as uncommitted local changes.
- Last known state: **26 commits ahead of `origin/Priyanshu`** — none of this has been pushed to GitHub yet.
- Nothing has been pushed or deployed. Once you've run both `tsc` checks locally and they're clean, this is ready to commit and push.
