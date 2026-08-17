import { Router, type Response } from 'express';
import { body } from 'express-validator';
import multer from 'multer';
import { prisma } from '../lib/prisma';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import { handleValidation } from '../middleware/validate';
import { uploadProfilePhoto, deleteProfilePhoto } from '../lib/azure';

interface MulterRequest extends AuthRequest {
  file?: Express.Multer.File | undefined;
}

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/users/me
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true, email: true, name: true, phone: true, dob: true,
        birthPlace: true, gender: true, wellnessInterests: true,
        photoUrl: true, isEmailVerified: true, provider: true, createdAt: true,
      },
    });
    if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }
    res.json({ success: true, data: { user } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// PATCH /api/users/me
router.patch(
  '/me',
  requireAuth,
  [
    body('name').optional().trim().notEmpty(),
    body('dob').optional().isISO8601().toDate(),
    body('birthPlace').optional().trim(),
    body('gender').optional().isIn(['male', 'female', 'non-binary', 'prefer_not_to_say']),
    body('wellnessInterests').optional().isArray(),
    body('phone').optional().isMobilePhone('any'),
  ],
  handleValidation,
  async (req: AuthRequest, res: Response) => {
    const body = (req.body || {}) as {
      name?: string; dob?: Date; birthPlace?: string;
      gender?: string; wellnessInterests?: string[]; phone?: string;
    };

    // Build update data only with defined fields (exactOptionalPropertyTypes safe)
    const data: Parameters<typeof prisma.user.update>[0]['data'] = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.dob !== undefined) data.dob = body.dob;
    if (body.birthPlace !== undefined) data.birthPlace = body.birthPlace;
    if (body.gender !== undefined) data.gender = body.gender;
    if (body.wellnessInterests !== undefined) data.wellnessInterests = { set: body.wellnessInterests };
    if (body.phone !== undefined) data.phone = body.phone;

    try {
      const user = await prisma.user.update({
        where: { id: req.user!.userId },
        data,
        select: {
          id: true, email: true, name: true, phone: true, dob: true,
          birthPlace: true, gender: true, wellnessInterests: true,
          photoUrl: true, isEmailVerified: true,
        },
      });
      res.json({ success: true, data: { user } });
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e.code === 'P2002') {
        res.status(409).json({ success: false, message: 'Phone number already in use' });
        return;
      }
      console.error(err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

// POST /api/users/me/photo
router.post(
  '/me/photo',
  requireAuth,
  upload.single('photo'),
  async (req: MulterRequest, res: Response) => {
    if (!req.file) { res.status(400).json({ success: false, message: 'No file uploaded' }); return; }

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(req.file.mimetype)) {
      res.status(400).json({ success: false, message: 'Only JPEG, PNG, or WebP allowed' });
      return;
    }

    try {
      const existing = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: { photoUrl: true },
      });

      if (existing?.photoUrl) await deleteProfilePhoto(existing.photoUrl);

      const photoUrl = await uploadProfilePhoto(req.file.buffer, req.file.mimetype, 'users');
      await prisma.user.update({ where: { id: req.user!.userId }, data: { photoUrl } });

      res.json({ success: true, data: { photoUrl } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Photo upload failed' });
    }
  }
);

// DELETE /api/users/me/photo
router.delete('/me/photo', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { photoUrl: true },
    });
    if (user?.photoUrl) {
      await deleteProfilePhoto(user.photoUrl);
      await prisma.user.update({ where: { id: req.user!.userId }, data: { photoUrl: null } });
    }
    res.json({ success: true, message: 'Photo removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ─── GDPR: Data Export (Right to Access / Portability) ───────────────────────
// GET /api/users/me/export — full JSON dump of everything tied to this account.
// Deliberately excludes security artifacts that aren't "your data" in the GDPR
// portability sense: passwordHash, refresh tokens, OTP hashes/verification tokens.
router.get('/me/export', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  try {
    const [user, wallet, sessions, reviews, tickets, consents] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true, email: true, name: true, phone: true, dob: true,
          birthPlace: true, gender: true, wellnessInterests: true, photoUrl: true,
          isEmailVerified: true, isPhoneVerified: true, provider: true,
          createdAt: true, updatedAt: true,
        },
      }),
      prisma.wallet.findUnique({
        where: { userId },
        include: { transactions: { orderBy: { createdAt: 'desc' } } },
      }),
      prisma.session.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: {
          practitioner: { select: { id: true, name: true } },
          review: true,
          callFeedback: true,
          transcript: { select: { transcriptText: true, purgedAt: true, submittedAt: true } },
          messages: { orderBy: { createdAt: 'asc' } },
        },
      }),
      prisma.review.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      prisma.supportTicket.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      }),
      prisma.consent.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    ]);

    if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }

    await prisma.privacyRequestLog.create({
      data: { subjectType: 'USER', subjectId: userId, type: 'EXPORT', ipAddress: req.ip ?? null },
    });

    res.json({
      success: true,
      data: {
        exportedAt: new Date().toISOString(),
        profile: user,
        wallet,
        sessions,
        reviews,
        supportTickets: tickets,
        consentHistory: consents,
      },
    });
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ─── GDPR: Erasure (Right to be Forgotten) ────────────────────────────────────
// DELETE /api/users/me — anonymizes PII rather than hard-deleting the row.
// The row is kept because Session/Review/Transaction records reference it and
// are retained for financial/audit purposes (a legitimate-interest basis, not
// consent) — see PROJECT notes / GDPR guide "special-category trap" section for
// why chat & transcript *content* specifically also gets purged here, not just
// account fields.
router.delete('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { photoUrl: true, erasedAt: true } });
    if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }
    if (user.erasedAt) {
      res.status(410).json({ success: false, message: 'Account already erased' });
      return;
    }

    if (user.photoUrl) await deleteProfilePhoto(user.photoUrl).catch(() => {});

    // Purge chat/transcript content for this user's sessions immediately, honoring
    // the same moderation-hold exception as the scheduled 90-day sweep (an
    // erasure request shouldn't let someone destroy evidence of an active abuse
    // report against them).
    const sessions = await prisma.session.findMany({ where: { userId }, select: { id: true } });
    const sessionIds = sessions.map((s) => s.id);

    if (sessionIds.length > 0) {
      const heldChat = await prisma.flaggedContent.findMany({
        where: { sessionId: { in: sessionIds }, status: 'PENDING', source: 'CHAT' },
        select: { chatMessageId: true },
      });
      const heldChatIds = new Set(
        heldChat.map((h) => h.chatMessageId).filter((id): id is string => id !== null)
      );

      await prisma.chatMessage.updateMany({
        where: { sessionId: { in: sessionIds }, purgedAt: null, id: { notIn: [...heldChatIds] } },
        data: { content: '[Removed — account erased]', purgedAt: new Date() },
      });

      const heldTranscripts = await prisma.flaggedContent.findMany({
        where: { sessionId: { in: sessionIds }, status: 'PENDING', source: 'CALL_TRANSCRIPT' },
        select: { transcriptId: true },
      });
      const heldTranscriptIds = new Set(
        heldTranscripts.map((h) => h.transcriptId).filter((id): id is string => id !== null)
      );

      await prisma.callTranscript.updateMany({
        where: { sessionId: { in: sessionIds }, purgedAt: null, id: { notIn: [...heldTranscriptIds] } },
        data: { transcriptText: '[Removed — account erased]', purgedAt: new Date() },
      });

      await prisma.callFeedback.updateMany({
        where: { sessionId: { in: sessionIds } },
        data: { comment: null },
      });
    }

    // Free-text review comments are the user's own words about a practitioner —
    // erase the text but keep the numeric rating, since it's already folded into
    // the practitioner's denormalized avgRating/reviewCount and removing the row
    // would silently skew that aggregate.
    await prisma.review.updateMany({ where: { userId }, data: { comment: null } });

    // Support ticket content can contain freeform PII; delete it outright rather
    // than anonymize (tickets have no ongoing legal/financial retention need).
    await prisma.supportTicket.deleteMany({ where: { userId } });

    // Revoke + remove auth artifacts.
    await prisma.refreshToken.deleteMany({ where: { userId } });
    await prisma.otp.deleteMany({ where: { userId } });

    // Push tokens and notification history. DeviceToken.userId is ON DELETE
    // CASCADE, but that only fires on a hard delete of the User row — since
    // erasure anonymizes in place rather than deleting the row, the cascade
    // never triggers and these need to be cleared explicitly. NotificationLog
    // has no FK at all (recipientId is a plain string, shared across User and
    // Practitioner via recipientType) so it always needs an explicit delete.
    await prisma.deviceToken.deleteMany({ where: { userId } });
    await prisma.notificationLog.deleteMany({ where: { recipientId: userId, recipientType: 'USER' } });

    // Anonymize the account itself. passwordHash is overwritten with a value that
    // cannot be produced by bcrypt.compare against any real password, so the
    // account is permanently unable to authenticate.
    await prisma.user.update({
      where: { id: userId },
      data: {
        name: 'Deleted User',
        email: null,
        phone: null,
        passwordHash: `erased:${Date.now()}:${Math.random().toString(36).slice(2)}`,
        dob: null,
        birthPlace: null,
        gender: null,
        wellnessInterests: { set: [] },
        photoUrl: null,
        googleId: null,
        appleId: null,
        emailVerifyToken: null,
        emailVerifyExpiry: null,
        passwordResetToken: null,
        passwordResetExpiry: null,
        erasedAt: new Date(),
      },
    });

    await prisma.privacyRequestLog.create({
      data: { subjectType: 'USER', subjectId: userId, type: 'ERASURE', ipAddress: req.ip ?? null },
    });

    res.json({ success: true, message: 'Account erased' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
