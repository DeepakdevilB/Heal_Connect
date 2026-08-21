/**
 * adminSession.ts (backend) — SEC-04/05
 *
 * Signs + verifies the hc_admin_session cookie that now carries identity
 * ({ id, email, role, exp }) instead of just an expiry timestamp.
 *
 * Format: base64url(JSON payload) . HMAC-SHA256(base64url(payload), secret)
 *
 * This is a server-only module — never imported from browser code.
 */
import { createHmac, timingSafeEqual } from 'crypto';

export interface AdminSessionIdentity {
  id: string;
  email: string;
  role: string;
}

const COOKIE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function getSecret(): string {
  const secret = process.env['ADMIN_SESSION_SECRET'];
  if (!secret) {
    console.warn('WARNING: ADMIN_SESSION_SECRET is not set! Using an insecure fallback secret.');
    return 'fallback_insecure_admin_session_secret_2026';
  }
  return secret;
}

function sign(encoded: string): string {
  return createHmac('sha256', getSecret()).update(encoded).digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function createAdminSessionToken(identity: AdminSessionIdentity): string {
  const payload = {
    ...identity,
    exp: Date.now() + COOKIE_TTL_MS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = sign(encoded);
  return `${encoded}.${sig}`;
}

/**
 * Reads the hc_admin_session cookie value straight off the raw `Cookie`
 * request header. There's no cookie-parser middleware registered on this
 * Express app, so `req.cookies` is always undefined — every call site that
 * needs this cookie (requireAdminAuth, adminAuth.ts's /me + requireAdminSession)
 * must go through this helper instead of `req.cookies`.
 */
export function getAdminSessionCookie(req: { headers: { cookie?: string | undefined } }): string | undefined {
  const rawCookie = req.headers.cookie ?? '';
  const match = rawCookie.match(/(?:^|;\s*)hc_admin_session=([^;]+)/);
  return match?.[1];
}

export function verifyAdminSessionToken(token: string | undefined | null): (AdminSessionIdentity & { exp: number }) | null {
  if (!token) return null;
  const dot = token.lastIndexOf('.');
  if (dot === -1) return null;

  const encoded = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  let expectedSig: string;
  try {
    expectedSig = sign(encoded);
  } catch {
    return null; // ADMIN_SESSION_SECRET unset
  }

  if (!safeEqual(sig, expectedSig)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8')) as {
      id: string; email: string; role: string; exp: number;
    };
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
