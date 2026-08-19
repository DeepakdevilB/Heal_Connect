/**
 * POST /api/admin/session/mfa
 *
 * Step 2 of the two-step admin login (SEC-04/05):
 * - Accepts loginToken (from step 1) + 6-digit TOTP code
 * - For MFA setup: first call GET /mfa/setup (which the login page will call),
 *   then call this with the first valid code to confirm and get the session.
 *
 * On success: sets hc_admin_session cookie and returns identity.
 *
 * GET /api/admin/session/mfa/setup
 * - Returns { qrUrl, secret } for the Authenticator app setup screen.
 *   Only valid while a loginToken is in progress.
 */
import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, SESSION_TTL_MS } from '@/lib/adminSession';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BACKEND = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:5000';

// POST /api/admin/session/mfa — verify TOTP (or confirm setup)
export async function POST(req: NextRequest) {
  let body: { loginToken?: unknown; code?: unknown; setup?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid request' }, { status: 400 });
  }

  const loginToken = typeof body.loginToken === 'string' ? body.loginToken : '';
  const code = typeof body.code === 'string' ? body.code : '';
  const isSetup = body.setup === true;

  if (!loginToken || !code) {
    return NextResponse.json({ success: false, message: 'loginToken and code are required' }, { status: 400 });
  }

  const endpoint = isSetup
    ? `${BACKEND}/api/admin-auth/mfa/confirm`
    : `${BACKEND}/api/admin-auth/mfa/verify`;

  let backendRes: Response;
  try {
    backendRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-login-token': loginToken,
      },
      body: JSON.stringify({ code }),
    });
  } catch {
    return NextResponse.json({ success: false, message: 'Could not reach authentication server' }, { status: 502 });
  }

  const data = await backendRes.json() as { success: boolean; message?: string };

  if (!backendRes.ok || !data.success) {
    return NextResponse.json(
      { success: false, message: data.message ?? 'Invalid code' },
      { status: backendRes.status },
    );
  }

  // Backend set its own hc_admin_session cookie — relay the Set-Cookie header
  // so the browser also gets it for this (Next.js) domain if they differ.
  const setCookie = backendRes.headers.get('set-cookie');
  const nextRes = NextResponse.json({ success: true });
  if (setCookie) {
    nextRes.headers.set('set-cookie', setCookie);
  }
  return nextRes;
}

// GET /api/admin/session/mfa — returns QR setup data (loginToken in header)
export async function GET(req: NextRequest) {
  const loginToken = req.headers.get('x-login-token') ?? '';
  if (!loginToken) {
    return NextResponse.json({ success: false, message: 'x-login-token header required' }, { status: 400 });
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND}/api/admin-auth/mfa/setup`, {
      headers: { 'x-login-token': loginToken },
    });
  } catch {
    return NextResponse.json({ success: false, message: 'Could not reach authentication server' }, { status: 502 });
  }

  const data = await backendRes.json();
  return NextResponse.json(data, { status: backendRes.status });
}
