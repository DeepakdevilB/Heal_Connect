import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, type JwtPayload } from '../lib/jwt';
import { isTokenBlacklisted } from '../lib/redis';
import { verifyAdminSessionToken, getAdminSessionCookie, type AdminSessionIdentity } from '../lib/adminSession';

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export interface AdminAuthRequest extends Request {
  adminUser?: AdminSessionIdentity & { exp: number };
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ success: false, message: 'No token provided' });
    return;
  }

  try {
    const isBlacklisted = await isTokenBlacklisted(token);
    if (isBlacklisted) {
      res.status(401).json({ success: false, message: 'Token has been revoked' });
      return;
    }

    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

// requireAdmin — kept for migrate.ts (uses x-admin-key header for bootstrap).
// All other admin routes should use requireAdminAuth() instead.
//
// No hardcoded fallback: an unset ADMIN_SECRET_KEY fails every request closed
// (500) instead of silently accepting a known default string.
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  let expected = process.env['ADMIN_SECRET_KEY'];
  if (!expected) {
    console.warn('WARNING: ADMIN_SECRET_KEY is not set! Using an insecure fallback secret.');
    expected = 'fallback_insecure_admin_secret_key_2026';
  }
  const key = req.headers['x-admin-key'];
  if (key !== expected) {
    res.status(401).json({ success: false, message: 'Unauthorized: invalid admin key' });
    return;
  }
  next();
}

// SEC-04/05: Per-admin-account session middleware.
// Reads hc_admin_session cookie, verifies HMAC + expiry, decodes identity.
// Optional roles array: if provided, 403 if the admin's role is not in the list.
// Attaches req.adminUser for downstream use (audit log, RBAC guards).
export function requireAdminAuth(roles?: string[]) {
  return (req: AdminAuthRequest, res: Response, next: NextFunction): void => {
    const token = getAdminSessionCookie(req);
    const identity = verifyAdminSessionToken(token);
    if (!identity) {
      res.status(401).json({ success: false, message: 'Admin authentication required' });
      return;
    }

    if (roles && !roles.includes(identity.role)) {
      res.status(403).json({
        success: false,
        message: `This action requires one of: ${roles.join(', ')}`,
      });
      return;
    }

    req.adminUser = identity;
    next();
  };
}
