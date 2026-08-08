# CMS: Banners, Blogs, FAQs

Three content types were added so admins can manage site content without a code deploy: **Banners** (homepage promo images), **Blogs**, and **FAQs**.

## Data models (`backend/prisma/schema.prisma`)

- `Blog` — `title`, `content`, `author`, `imageUrl?`, `published` (draft/live toggle), timestamps.
- `Faq` — `question`, `answer`, `category`, timestamps.
- `Banner` — `title`, `imageUrl`, `linkUrl?`, `isActive`, timestamps.

## Backend routes

**Public read endpoints** — `backend/src/index.ts`
- `GET /api/blogs` — published blogs only.
- `GET /api/blogs/:id` — single blog (404 if unpublished/missing).
- `GET /api/faqs` — all FAQs.
- `GET /api/banners` — active banners only.

**Admin CRUD** — `backend/src/routes/admin.ts` (lines ~894–1011), full create/read/update/delete for `/admin/blogs`, `/admin/faqs`, `/admin/banners`. Protected by the `requireAdmin` middleware, which checks an `x-admin-key` header (not the JWT-based admin auth used elsewhere) — set via CORS in `index.ts`.

## Frontend — public pages (`web/src/app`)

- `blog/page.tsx` — blog listing.
- `blog/[id]/page.tsx` — single blog view.
- `faq/page.tsx` — FAQ list.
- Banners aren't a standalone page — they're fetched (`/api/banners`) and rendered directly on the homepage (`web/src/app/page.tsx`).

## Frontend — admin panel

Linked in the sidebar (`web/src/components/admin-shell.tsx`): Blogs → `/admin/blogs`, FAQs → `/admin/faqs`, Banners → `/admin/banners`. Each page does full CRUD against the admin routes above, gated by `x-admin-key`.

> **Note:** `web/src/app/admin/faq/page.tsx` (singular) also exists but isn't linked in the sidebar nav — looks like a leftover duplicate of `admin/faqs/page.tsx`. Worth deleting to avoid confusion, but left untouched here since it wasn't part of the ask.
