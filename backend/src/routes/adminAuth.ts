/**
 * adminAuth.ts — Per-admin-account auth routes (SEC-04/05)
 *
 * Mounted at /api/admin-auth (no requireAdmin guard — this IS the login).
 *
 * Flow for SUPERADMIN (MFA required):
 *   1. POST /login        → bcrypt check → issues loginToken (15-min, DB-stored)
 *   2. POST /mfa/verify   → TOTP check  → clears loginToken → sets session cookie
 *
 * Flow for first login (mfaEnabled = false on SUPERADMIN):
 *   1. POST /login        → returns { mfaRequired: true, mfaSetupRequired: true, loginToken }
 *   2. GET  /mfa/setup    → returns { qrUrl, secret } (loginToken in header)
 *   3. POST /mfa/confirm  → confirms TOTP, marks mfaEnabled = true, issues session cookie
 *
 * Flow for MODERATOR (MFA optional):
 *   1. POST /login        → if mfaEnabled: same as SUPERADMIN flow
 *                           if !mfaEnabled: returns { mfaSetupRequired: false } + issues cookie directly
 *
 * Session cookie:
 *   Name: hc_admin_session  (same name as before — adminSession.ts is updated to carry identity)
 *   Payload: base64(JSON{ id, email, role, exp }).HMAC
 */
import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';
import { prisma } from '../lib/prisma';
import { createAdminSessionToken, verifyAdminSessionToken, getAdminSessionCookie } from '../lib/adminSession';

const router = Router();

const COOKIE_NAME = 'hc_admin_session';
const COOKIE_TTL_SECONDS = 12 * 60 * 60; // 12 hours
const LOGIN_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

/** Generate a cryptographically random 8-char alphanumeric token */
function generateLoginToken(): string {
  return randomUUID().replace(/-/g, '').slice(0, 32);
}

function setSessionCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: COOKIE_TTL_SECONDS * 1000,
  });
}

function clearSessionCookie(res: Response): void {
  res.cookie(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
}

// ─── POST /login ─────────────────────────────────────────────────────────────

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    res.status(400).json({ success: false, message: 'Email and password are required' });
    return;
  }

  try {
    const admin = await prisma.adminUser.findUnique({ where: { email: email.toLowerCase() } });
    // Constant-time: always compare even if user not found (use dummy hash)
    const DUMMY_HASH = '$2a$12$invaliddummyhash00000000000000000000000000000000000000';
    const valid = await bcrypt.compare(password, admin?.passwordHash ?? DUMMY_HASH);

    if (!admin || !valid) {
      res.status(401).json({ success: false, message: 'Invalid admin credentials' });
      return;
    }

    const isSuperadmin = admin.role === 'SUPERADMIN';
    const mfaEnabled = admin.mfaEnabled;

    // MODERATOR without MFA set up → issue session cookie immediately
    if (!isSuperadmin && !mfaEnabled) {
      const token = createAdminSessionToken({ id: admin.id, email: admin.email, role: admin.role });
      setSessionCookie(res, token);
      await prisma.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
      res.json({ success: true, mfaRequired: false, mfaSetupRequired: false });
      return;
    }

    // Issue a short-lived loginToken for MFA step
    const loginToken = generateLoginToken();
    const loginTokenExp = new Date(Date.now() + LOGIN_TOKEN_TTL_MS);
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { loginToken, loginTokenExp },
    });

    res.json({
      success: true,
      mfaRequired: true,
      mfaSetupRequired: !mfaEnabled, // true = needs to scan QR first
      loginToken,
    });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ─── Helper: resolve adminUser from loginToken in header ─────────────────────

async function resolveFromLoginToken(req: Request, res: Response): Promise<{ admin: { id: string; email: string; role: string; mfaSecret: string | null; mfaEnabled: boolean } } | null> {
  const loginToken = req.headers['x-login-token'] as string | undefined;
  if (!loginToken) {
    res.status(401).json({ success: false, message: 'Login token required' });
    return null;
  }
  const admin = await prisma.adminUser.findFirst({
    where: { loginToken },
    select: { id: true, email: true, role: true, mfaSecret: true, mfaEnabled: true, loginTokenExp: true },
  });
  if (!admin || !admin.loginTokenExp || admin.loginTokenExp < new Date()) {
    res.status(401).json({ success: false, message: 'Login token expired or invalid. Please log in again.' });
    return null;
  }
  return { admin };
}

// ─── POST /mfa/verify ────────────────────────────────────────────────────────

router.post('/mfa/verify', async (req: Request, res: Response) => {
  const { code } = req.body as { code?: string };
  if (!code || !/^\d{6}$/.test(code)) {
    res.status(400).json({ success: false, message: 'A 6-digit code is required' });
    return;
  }

  const result = await resolveFromLoginToken(req, res);
  if (!result) return;
  const { admin } = result;

  if (!admin.mfaSecret) {
    res.status(400).json({ success: false, message: 'MFA not set up. Please complete setup first.' });
    return;
  }

  try {
    const totp = new OTPAuth.TOTP({
      issuer: 'HealConnect',
      label: admin.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: admin.mfaSecret,
    });

    const delta = totp.validate({ token: code, window: 1 });
    if (delta === null) {
      res.status(401).json({ success: false, message: 'Invalid or expired code' });
      return;
    }

    // Clear loginToken, set lastLoginAt, issue session cookie
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { loginToken: null, loginTokenExp: null, lastLoginAt: new Date() },
    });

    const token = createAdminSessionToken({ id: admin.id, email: admin.email, role: admin.role });
    setSessionCookie(res, token);
    res.json({ success: true });
  } catch (err) {
    console.error('MFA verify error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ─── GET /mfa/setup ──────────────────────────────────────────────────────────

router.get('/mfa/setup', async (req: Request, res: Response) => {
  const result = await resolveFromLoginToken(req, res);
  if (!result) return;
  const { admin } = result;

  try {
    // Generate a new TOTP secret every time this endpoint is called
    // (idempotent — if they scan again before confirming, that's fine)
    const secret = new OTPAuth.Secret({ size: 20 });
    const totp = new OTPAuth.TOTP({
      issuer: 'HealConnect Admin',
      label: admin.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret,
    });

    const uri = totp.toString();
    const qrUrl = await QRCode.toDataURL(uri);
    const secretBase32 = secret.base32;

    // Persist pending secret (not yet confirmed)
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { mfaSecret: secretBase32, mfaEnabled: false },
    });

    res.json({ success: true, data: { qrUrl, secret: secretBase32, uri } });
  } catch (err) {
    console.error('MFA setup error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ─── POST /mfa/confirm ───────────────────────────────────────────────────────

router.post('/mfa/confirm', async (req: Request, res: Response) => {
  const { code } = req.body as { code?: string };
  if (!code || !/^\d{6}$/.test(code)) {
    res.status(400).json({ success: false, message: 'A 6-digit code is required' });
    return;
  }

  const result = await resolveFromLoginToken(req, res);
  if (!result) return;
  const { admin } = result;

  if (!admin.mfaSecret) {
    res.status(400).json({ success: false, message: 'No pending MFA setup found. Call GET /mfa/setup first.' });
    return;
  }

  try {
    const totp = new OTPAuth.TOTP({
      issuer: 'HealConnect Admin',
      label: admin.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: admin.mfaSecret,
    });

    const delta = totp.validate({ token: code, window: 1 });
    if (delta === null) {
      res.status(401).json({ success: false, message: 'Invalid code — please try again' });
      return;
    }

    // Confirm MFA, clear loginToken, issue session cookie
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { mfaEnabled: true, loginToken: null, loginTokenExp: null, lastLoginAt: new Date() },
    });

    const token = createAdminSessionToken({ id: admin.id, email: admin.email, role: admin.role });
    setSessionCookie(res, token);
    res.json({ success: true, message: 'MFA enabled. You are now logged in.' });
  } catch (err) {
    console.error('MFA confirm error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ─── POST /logout ────────────────────────────────────────────────────────────

router.post('/logout', (_req: Request, res: Response) => {
  clearSessionCookie(res);
  res.json({ success: true });
});

// ─── GET /me ─────────────────────────────────────────────────────────────────

router.get('/me', (req: Request, res: Response) => {
  // No cookie-parser middleware is registered on this app — req.cookies is
  // always undefined. Read the raw Cookie header instead (same helper
  // requireAdminAuth uses in middleware/auth.ts).
  const token = getAdminSessionCookie(req);
  const identity = verifyAdminSessionToken(token);
  if (!identity) {
    res.status(401).json({ success: false, message: 'Not authenticated' });
    return;
  }
  res.json({ success: true, data: identity });
});

// ─── Admin management routes (SUPERADMIN only) ────────────────────────────────

/** Middleware: require a valid session cookie with optional role check */
function requireAdminSession(roles?: string[]) {
  return (req: Request, res: Response, next: () => void): void => {
    const token = getAdminSessionCookie(req);
    const identity = verifyAdminSessionToken(token);
    if (!identity) {
      res.status(401).json({ success: false, message: 'Admin authentication required' });
      return;
    }
    if (roles && !roles.includes(identity.role)) {
      res.status(403).json({ success: false, message: 'Insufficient permissions' });
      return;
    }
    (req as any).adminUser = identity;
    next();
  };
}

// GET /admins — list all admin accounts (SUPERADMIN only)
router.get('/admins', requireAdminSession(['SUPERADMIN']), async (_req: Request, res: Response) => {
  try {
    const admins = await prisma.adminUser.findMany({
      select: { id: true, email: true, role: true, mfaEnabled: true, lastLoginAt: true, createdAt: true, createdById: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ success: true, data: admins });
  } catch (err) {
    console.error('List admins error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /admins — create a new admin account (SUPERADMIN only)
router.post('/admins', requireAdminSession(['SUPERADMIN']), async (req: Request, res: Response) => {
  const { email, role } = req.body as { email?: string; role?: string };
  if (!email || !['SUPERADMIN', 'MODERATOR'].includes(role ?? '')) {
    res.status(400).json({ success: false, message: 'email and role (SUPERADMIN | MODERATOR) are required' });
    return;
  }

  try {
    const existing = await prisma.adminUser.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      res.status(409).json({ success: false, message: 'An admin with that email already exists' });
      return;
    }

    // Generate a strong temporary password — shown once to the creating admin
    const tempPassword = randomUUID().replace(/-/g, '').slice(0, 16);
    const passwordHash = await bcrypt.hash(tempPassword, 12);
    const creator = (req as any).adminUser as { id: string };

    const admin = await prisma.adminUser.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        role: role as string,
        createdById: creator.id,
      },
      select: { id: true, email: true, role: true, mfaEnabled: true, createdAt: true },
    });

    // tempPassword is returned ONCE — the creating admin must copy it now
    res.status(201).json({ success: true, data: { admin, tempPassword } });
  } catch (err) {
    console.error('Create admin error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// DELETE /admins/:id — revoke an admin account (SUPERADMIN only, cannot self-revoke)
router.delete('/admins/:id', requireAdminSession(['SUPERADMIN']), async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  const caller = (req as any).adminUser as { id: string };

  if (id === caller.id) {
    res.status(400).json({ success: false, message: 'You cannot revoke your own account' });
    return;
  }

  try {
    await prisma.adminUser.delete({ where: { id } });
    res.json({ success: true, message: 'Admin account revoked' });
  } catch {
    res.status(404).json({ success: false, message: 'Admin not found' });
  }
});

// POST /admins/:id/reset-mfa — clear MFA for an admin (SUPERADMIN only)
router.post('/admins/:id/reset-mfa', requireAdminSession(['SUPERADMIN']), async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  try {
    await prisma.adminUser.update({
      where: { id },
      data: { mfaSecret: null, mfaEnabled: false, loginToken: null, loginTokenExp: null },
    });
    res.json({ success: true, message: 'MFA reset. Admin must set up TOTP on next login.' });
  } catch {
    res.status(404).json({ success: false, message: 'Admin not found' });
  }
});

export default router;
