/**
 * Catch-all proxy for /api/admin/** (everything except /api/admin/session,
 * which has its own static route and takes precedence).
 *
 * Runs server-side only. Checks the httpOnly admin session cookie; if valid,
 * forwards the request to the real backend with that SAME cookie attached
 * so the backend's per-identity `requireAdminAuth` (SEC-04/05) can verify it
 * itself and know which admin/role made the call.
 *
 * We also still attach x-admin-key (server-only env var, browser never sees
 * it) for any legacy/bootstrap routes that haven't been migrated off the old
 * shared-key `requireAdmin` yet — harmless no-op for routes that only check
 * the cookie now.
 *
 * next.config.mjs's generic /api/:path* rewrite is declared as `fallback` so
 * it's only reached if no app route (this one included) matches first —
 * otherwise that rewrite would forward /api/admin/* straight to the backend,
 * skipping this session check entirely.
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/adminSession';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env['BACKEND_URL'] || process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:8080';

async function proxy(req: NextRequest, pathSegments: string[]): Promise<NextResponse> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!verifySessionToken(token)) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  let adminKey = process.env['ADMIN_SECRET_KEY'];
  if (!adminKey) {
    console.warn('WARNING: ADMIN_SECRET_KEY is not set! Using an insecure fallback secret.');
    adminKey = 'fallback_insecure_admin_secret_key_2026';
  }

  const path = pathSegments.join('/');
  const targetUrl = `${BACKEND_URL}/api/admin/${path}${req.nextUrl.search}`;
  const hasBody = !['GET', 'HEAD'].includes(req.method);

  let backendRes: Response;
  try {
    backendRes = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': req.headers.get('content-type') ?? 'application/json',
        'x-admin-key': adminKey,
        // SEC-04/05: the backend's requireAdminAuth reads this cookie
        // directly off the request headers — without it every admin.ts
        // route would 401 since it no longer accepts x-admin-key alone.
        Cookie: `${SESSION_COOKIE}=${token}`,
      },
      body: hasBody ? await req.text() : undefined,
      cache: 'no-store',
    });
  } catch (err) {
    console.error('Admin proxy: backend request failed:', err);
    return NextResponse.json({ success: false, message: 'Backend unreachable' }, { status: 502 });
  }

  const text = await backendRes.text();
  return new NextResponse(text, {
    status: backendRes.status,
    headers: { 'Content-Type': backendRes.headers.get('content-type') ?? 'application/json' },
  });
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, { params }: RouteContext) {
  return proxy(req, (await params).path);
}
export async function POST(req: NextRequest, { params }: RouteContext) {
  return proxy(req, (await params).path);
}
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  return proxy(req, (await params).path);
}
export async function PUT(req: NextRequest, { params }: RouteContext) {
  return proxy(req, (await params).path);
}
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  return proxy(req, (await params).path);
}
