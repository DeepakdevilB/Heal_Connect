/**
 * astrologer.ts — Authorization helpers for the astrologer system.
 *
 * CRITICAL BUSINESS RULE: A user must NEVER become a public astrologer
 * merely because role=ASTROLOGER exists in a token or request body.
 * Public visibility requires ALL five conditions below.
 */
import type { Response, NextFunction } from 'express';
import type { AuthRequest } from './auth';
import { prisma } from '../lib/prisma';

export interface AstrologerProfile {
  applicationStatus: string;
  accountStatus: string;
  identityVerified: boolean;
  professionalVerified: boolean;
  adminVerified: boolean;
}

/**
 * The single source of truth for whether an astrologer can go live.
 * Use this everywhere — public search, session creation, payout, etc.
 */
export function canGoLiveAsAstrologer(profile: AstrologerProfile): boolean {
  return (
    profile.applicationStatus === 'APPROVED' &&
    profile.identityVerified === true &&
    profile.professionalVerified === true &&
    profile.adminVerified === true &&
    profile.accountStatus === 'ACTIVE'
  );
}

/**
 * Express middleware: requires a valid JWT with astrologerId.
 * Does NOT require the astrologer to be approved — use requireApprovedAstrologer for that.
 */
export async function requireAstrologer(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!req.user?.astrologerId) {
    res.status(403).json({ success: false, message: 'Astrologer access required.', code: 'NOT_ASTROLOGER' });
    return;
  }
  next();
}

/**
 * Express middleware: requires astrologer to be fully approved and active.
 * Use on endpoints that should only be accessible to live astrologers.
 */
export async function requireApprovedAstrologer(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!req.user?.astrologerId) {
    res.status(403).json({ success: false, message: 'Astrologer access required.', code: 'NOT_ASTROLOGER' });
    return;
  }

  try {
    const profile = await prisma.astrologerProfile.findUnique({
      where: { id: req.user.astrologerId },
      select: { applicationStatus: true, accountStatus: true, identityVerified: true, professionalVerified: true, adminVerified: true },
    });

    if (!profile) {
      res.status(404).json({ success: false, message: 'Astrologer profile not found.', code: 'PROFILE_NOT_FOUND' });
      return;
    }

    if (!canGoLiveAsAstrologer(profile)) {
      const code = profile.applicationStatus === 'REJECTED' ? 'ASTROLOGER_REJECTED'
        : profile.applicationStatus === 'SUSPENDED' ? 'ASTROLOGER_SUSPENDED'
        : profile.applicationStatus === 'BLOCKED' ? 'ASTROLOGER_BLOCKED'
        : profile.applicationStatus === 'ADMIN_REVIEW' ? 'ASTROLOGER_UNDER_REVIEW'
        : 'ASTROLOGER_NOT_APPROVED';

      res.status(403).json({
        success: false,
        message: 'Your astrologer account is not approved for this action.',
        code,
        data: { applicationStatus: profile.applicationStatus, accountStatus: profile.accountStatus },
      });
      return;
    }

    next();
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
}
