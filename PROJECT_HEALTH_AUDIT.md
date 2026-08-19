# HealConnect — Project Health Audit

Scope: not a single-bug investigation — a general trace of the money-critical path (sessions → billing → wallet → sockets) plus a route-by-route auth sweep across the whole backend, following your root-cause methodology (traced execution flow, identified the true owner of each piece of logic, verified before concluding).

## TL;DR

The core money engine is solid — the billing engine, wallet webhooks, and session accept/reject logic are genuinely well-built with proper locking and idempotency. But there are **four live, unauthenticated or under-protected endpoints in production right now** that let anyone give themselves free wallet balance, fake-verify every expert, wipe every live session, or hammer a raw-SQL endpoint. These are "dev" endpoints that were never gated before shipping — the same pattern as the RCE endpoint you already removed from `index.ts`. There's also a real (non-security) data bug: a practitioner's profile page can show a different star rating than the search results page for the same practitioner.

---

## CRITICAL — exploitable right now

### 1. Free wallet credit — `POST /api/wallet/dev-recharge`
**Execution flow**: Frontend (n/a, not called by any UI) → `backend/src/routes/wallet.ts:49` → `requireAuth` only → credits the caller's own wallet by any amount they specify.
**Owner of the logic**: `wallet.ts`, alongside the real `/recharge` (Razorpay) and `/recharge/stripe` endpoints.
**Root cause**: This is a dev-testing shortcut that bypasses payment entirely. It has `requireAuth` (so it needs a login) but no admin check and no environment gate — so it's not "dev-only" in practice, it's live in production for every registered user.
**Impact**: Any user can `POST` `{"amount": 999999}` and get free wallet balance, then spend it on real paid consultations with real experts. Direct revenue loss.
**Risk to**: Billing — YES (drains real practitioner payouts funded by fake balance). Wallet — YES, directly.
**Fix**: Remove the route, or gate it behind `NODE_ENV !== 'production'` AND an admin check (mirror the `requireAdmin` pattern already used in `admin.ts`).

### 2. Every practitioner gets auto-verified — `POST /api/practitioners/dev/verify`
**Execution flow**: `backend/src/routes/practitioners.ts:29` → no auth middleware at all → `prisma.practitioner.updateMany({ data: { isVerified: true } })` with **no `where` clause**.
**Owner of the logic**: `practitioners.ts`.
**Root cause**: Same "temporary dev helper, never removed" pattern.
**Impact**: Anyone on the internet, logged in or not, can mark every practitioner in the database as verified in one request — including ones that were deliberately left unverified pending manual review. Undermines the entire verification/trust system.
**Risk to**: Dashboard/Admin — YES (verification status is an admin-controlled trust signal, this bypasses it entirely).
**Fix**: Delete the route (there's no legitimate production use case for "verify everyone").

### 3. Unauthenticated raw SQL execution — `GET /api/migrate/run`
**Execution flow**: `backend/src/routes/migrate.ts:48` → no auth → `prisma.$executeRawUnsafe(migrationSql)` against the production database.
**Owner of the logic**: `migrate.ts`.
**Root cause**: A one-time manual-migration helper (predates your normal `prisma migrate` workflow) that was left mounted and open.
**Impact**: The specific SQL in this file is currently idempotent (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`), so right now it's "just" an open door rather than actively destructive. But it's an unauthenticated endpoint that executes raw SQL against prod on a plain `GET` — anyone can hit it repeatedly, and the next person who edits this file could turn it destructive without realizing it's world-callable.
**Risk to**: Database schema integrity — YES (exposure, not currently active damage).
**Fix**: Delete the route once you've confirmed the migration already ran, or gate it behind `requireAdmin`.

### 4. Anyone can kill every live session — `POST /api/sessions/dev-clear`
**Execution flow**: `backend/src/routes/sessions.ts:185` → no auth → force-completes every `ACTIVE`/`INITIATED`/`ACCEPTED` session platform-wide.
**Root cause**: Same dev-helper pattern, this one already flagged in the earlier branch review — still present in current `main`.
**Impact**: A denial-of-service vector against your live consultations — anyone can end every ongoing paid session on the platform at will, with no financial fraud angle but a real availability/trust impact (users mid-call get disconnected).
**Risk to**: Sessions, Calls, Chat — YES, directly.
**Fix**: Delete or gate behind `requireAdmin` + non-production env check.

---

## MEDIUM — real gaps, lower immediate blast radius

### 5. Admin routes rely on a hardcoded fallback secret
`backend/src/routes/admin.ts:14`: `const expected = process.env['ADMIN_SECRET_KEY'] ?? 'healconnect-admin-2026';`
The good news: I initially misread this file — every route in `admin.ts` (including `/users/:id/balance`, user/practitioner deletion, etc.) **is** protected, via a router-level `router.use(requireAdmin)` at line 22. That check is real. The gap is narrower than it first looked: it falls back to a hardcoded, predictable string if `ADMIN_SECRET_KEY` is ever unset in Azure. Worth a 30-second check that the Azure App Service env var is actually set to something random — and worth removing the fallback so a missing env var fails closed (500) instead of silently defaulting to a known key.

### 6. A flagged practitioner can dismiss their own moderation flag
`backend/src/routes/reviews.ts:121-127`, self-documented in the code:
```
// Simple admin guard: only practitioners (or add an isAdmin flag later)
// TODO: replace with a proper isAdmin flag when role management is added.
if (!req.user!.practitionerId) { ... 403 ... }
```
Any practitioner token — not just admins — passes this check. A practitioner who gets flagged for a policy violation in `FlaggedContent` can view and mark their own flag `RESOLVED`/`DISMISSED`. This is a known, self-acknowledged gap (there's a TODO), not a surprise regression, but worth prioritizing before it's relied on for real moderation decisions.

### 7. Practitioner rating is computed three different ways, inconsistently
- `reviews.ts` (the actual owner of this logic) correctly maintains `practitioner.avgRating`/`reviewCount` as a denormalized, transactionally-accurate average over **all** reviews.
- `GET /api/practitioners` (list/search) independently recomputes the average from **all** fetched reviews — matches the denormalized value, just redundant.
- `GET /api/practitioners/:id` (detail page) independently recomputes the average from only the **last 10** reviews (`take: 10`, needed for displaying review content) and returns that instead of the accurate `avgRating` column.

**Net effect**: for any practitioner with more than 10 reviews, their profile page can show a different star rating than the search results page for the same practitioner. This is exactly the "duplicated business logic across layers" pattern your process is designed to catch — three owners for one number, and they've already drifted.
**Fix**: `practitioners.ts`'s detail route should just select and return the existing `avgRating`/`reviewCount` columns instead of recomputing from a capped review list.

### 8. "Session activation" logic exists in two places
`backend/src/lib/socket.ts` (`join_room` handler, used by chat sessions) and `backend/src/routes/sessions.ts` (`POST /:id/connect`, used by audio/video calls) both independently implement "mark session ACTIVE, set startTime, set practitioner busy, notify both sides." I confirmed they don't currently collide — `useSessionChat.ts` only ever triggers the socket path, `useAgoraCall.ts` only ever triggers the REST path — but it's the same business rule maintained in two files that could silently diverge (e.g. one already sets `isBusy` conditionally on room size, the other sets it unconditionally). Not an active bug; a maintainability flag.

---

## LOW / notes, not action items

- Per-minute billing rounds **down**: a session that ends mid-minute doesn't bill for the partial minute. Business-policy question, not a bug — favors the customer.
- `POST /:id/end` has no transaction guard against a near-simultaneous double call from both sides of a session; worst case is a duplicate `session_terminated` socket emit, no data corruption, no double billing (billing lives entirely in the separately-locked billing engine).

---

## What's actually solid (confirmed, not assumed)

- `backend/src/workers/billingEngine.ts`: per-session Redis distributed lock, per-60s-cycle idempotency key (`NX` + expiry) so two engine instances can't double-bill, atomic `$transaction` for the wallet debit + session cost increment together, grace-period handling for low balance, exponential backoff on DB outages. This is the highest-risk code in the app and it's built correctly.
- Razorpay and Stripe webhook handlers (`wallet.ts`) are correctly idempotent — both re-check `status === 'PENDING'` inside the transaction, so a duplicated webhook delivery can't double-credit a wallet.
- Session accept/reject can't be double-processed — both are scoped to the expected prior status in the `findFirst` filter, so a second call just gets a clean 404.
- Backend TypeScript compiles clean (`tsc --noEmit`, zero errors) as of this audit.
- The practitioner refresh-token FK bug from earlier this session hasn't regressed.

---

## Risk summary (your categories)

| System | At risk? | Why |
|---|---|---|
| Billing | Partial | Engine itself is solid; `/dev-recharge` lets it be bypassed with fake funds |
| Wallet | **YES** | `/dev-recharge` — direct free-money exploit |
| Calls | **YES** | `/dev-clear` can kill any live call |
| Chat | **YES** | Same `/dev-clear` exposure (chat sessions too) |
| Reviews | Minor | Rating display inconsistency (#7), not the review submission logic itself |
| Sessions | **YES** | `/dev-clear` |
| Dashboard/Admin | Minor | Admin routes are actually protected (router-level guard); hardcoded fallback secret is the only gap |

---

## Suggested next step

I haven't changed any code for this pass — this was investigation only, per your process. If you want, I can remove/gate the four dev endpoints (#1-4) next; that's a small, low-risk, well-scoped change (delete or wrap in `requireAdmin`, no business logic moved, nothing else touched) and is the highest-value fix here.
