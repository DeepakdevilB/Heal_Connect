/**
 * POST   /api/admin/session      — step 1 login (proxies to backend /api/admin-auth/login)
 * GET    /api/admin/session      — check session, return {authenticated, email, role}
 * DELETE /api/admin/session      — logout (clears cookie)
 *
 * SEC-04/05: The POST handler no longer checks env-var credentials directly.
 * It proxies to the backend adminAuth router, which validates against the
 * AdminUser table. If mfaRequired is true the cookie is NOT set yet —
 * the client must complete the MFA step via POST /api/admin/session/mfa.
 */
import { NextRequest, NextResponse } from 'next/server';
import { decodeSessionToken, SESSION_COOKIE, SESSION_TTL_MS } from '@/lib/adminSession';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BACKEND = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:5000';

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const identity = decodeSessionToken(token);
  if (!identity) {
    return NextResponse.json({ authenticated: false });
  }
  return NextResponse.json({
    authenticated: true,
    email: identity.email,
    role: identity.role,
    id: identity.id,
  });
}

export async function POST(req: NextRequest) {
  let body: { email?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid request' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email || !password) {
    return NextResponse.json({ success: false, message: 'Email and password are required' }, { status: 400 });
  }

  // Proxy to backend
  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND}/api/admin-auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    return NextResponse.json({ success: false, message: 'Could not reach authentication server' }, { status: 502 });
  }

  const data = await backendRes.json() as {
    success: boolean;
    mfaRequired?: boolean;
    mfaSetupRequired?: boolean;
    loginToken?: string;
    message?: string;
  };

  if (!backendRes.ok || !data.success) {
    return NextResponse.json(
      { success: false, message: data.message ?? 'Invalid admin credentials' },
      { status: backendRes.status },
    );
  }

  // MODERATOR without MFA → the backend already issued its own hc_admin_session
  // Set-Cookie header on backendRes. Relay it verbatim onto our response so the
  // browser stores it against the Next.js (browser-facing) origin — the same
  // technique the /mfa route uses. Without this the browser gets no cookie at
  // all and every subsequent request looks unauthenticated.
  if (!data.mfaRequired) {
    const setCookie = backendRes.headers.get('set-cookie');
    const nextRes = NextResponse.json({ success: true, mfaRequired: false, mfaSetupRequired: false });
    if (setCookie) {
      nextRes.headers.set('set-cookie', setCookie);
    } else {
      console.error('Admin login: backend did not return a Set-Cookie header for the no-MFA path');
    }
    return nextRes;
  }

  // MFA step required — return loginToken to the client (no cookie yet)
  return NextResponse.json({
    success: true,
    mfaRequired: true,
    mfaSetupRequired: data.mfaSetupRequired ?? false,
    loginToken: data.loginToken,
  });
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });

  // Also proxy logout to backend so its cookie is cleared
  try {
    await fetch(`${BACKEND}/api/admin-auth/logout`, { method: 'POST' });
  } catch { /* best-effort */ }

  return res;
}
