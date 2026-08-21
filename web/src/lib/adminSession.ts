/**
 * adminSession.ts (web/Next.js) â€” SEC-04/05
 *
 * Signs + verifies the hc_admin_session cookie that now carries identity
 * ({ id, email, role, exp }) instead of just an expiry timestamp.
 *
 * Format: base64url(JSON payload) . HMAC-SHA256(base64url(payload), secret)
 *
 * This is a server-only module â€” never imported from 'use client' components.
 */
import { createHmac, timingSafeEqual } from 'crypto';

export const SESSION_COOKIE = 'hc_admin_session';
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

export interface AdminSessionIdentity {
  id: string;
  email: string;
  role: string;
}

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

/** Constant-time string compare â€” used for the login password check too. */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function createSessionToken(identity: AdminSessionIdentity): string {
  const payload = { ...identity, exp: Date.now() + SESSION_TTL_MS };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encoded}.${sign(encoded)}`;
}

export function verifySessionToken(token: string | undefined | null): boolean {
  const id = decodeSessionToken(token);
  return id !== null;
}

export function decodeSessionToken(
  token: string | undefined | null,
): (AdminSessionIdentity & { exp: number }) | null {
  if (!token) return null;
  const dot = token.lastIndexOf('.');
  if (dot === -1) return null;

  const encoded = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  let expectedSig: string;
  try {
    expectedSig = sign(encoded);
  } catch {
    return null;
  }

  if (!safeEqual(sig, expectedSig)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf-8'),
    ) as { id: string; email: string; role: string; exp: number };
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
