import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, type JwtPayload } from '../lib/jwt';
import { isTokenBlacklisted } from '../lib/redis';

export interface AuthRequest extends Request {
  user?: JwtPayload;
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

// Shared admin gate — used by admin.ts and by any one-off/dev/maintenance routes
// (migrations, dev-only test helpers, etc.) that must never be reachable without
// the admin key. Centralized here so those routes can't accidentally be mounted
// without protection the way several previously were.
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const key = req.headers['x-admin-key'];
  const expected = process.env['ADMIN_SECRET_KEY'] ?? 'healconnect-admin-2026';
  if (key !== expected) {
    res.status(401).json({ success: false, message: 'Unauthorized: invalid admin key' });
    return;
  }
  next();
}
