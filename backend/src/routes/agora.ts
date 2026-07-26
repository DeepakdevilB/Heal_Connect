import { Router, type Response } from 'express';
import { body } from 'express-validator';
import { RtcTokenBuilder, RtcRole } from 'agora-token';
import { prisma } from '../lib/prisma';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import { handleValidation } from '../middleware/validate';

const router = Router();

const APP_ID = process.env.AGORA_APP_ID || '';
const APP_CERT = process.env.AGORA_APP_CERTIFICATE || '';
const TOKEN_EXPIRY_SEC = 3600; // 1 hour

// ─── POST /api/agora/token ────────────────────────────────────────────────────
// Generate RTC token for a session channel
router.post(
  '/token',
  requireAuth,
  [body('sessionId').notEmpty()],
  handleValidation,
  async (req: AuthRequest, res: Response) => {
    const { sessionId } = req.body as { sessionId: string };
    const userId = req.user!.userId;

    // Verify user belongs to this session
    const session = await prisma.session.findFirst({
      where: {
        id: sessionId,
        OR: [{ userId }, { practitionerId: userId }],
        status: { in: ['INITIATED', 'ACTIVE'] },
      },
    });

    if (!session) {
      res.status(404).json({ success: false, message: 'Session not found or not active' });
      return;
    }

    if (!APP_ID || !APP_CERT) {
      res.status(503).json({ success: false, message: 'Agora not configured' });
      return;
    }

    // Channel name = sessionId (unique per session)
    const channelName = sessionId;
    // uid = 0 means Agora assigns one; we use a deterministic numeric uid from userId hash
    const uid = Math.abs(hashCode(userId)) % 100000;
    const expireTs = Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_SEC;

    const token = RtcTokenBuilder.buildTokenWithUid(
      APP_ID,
      APP_CERT,
      channelName,
      uid,
      RtcRole.PUBLISHER,
      expireTs,
      expireTs
    );

    res.json({
      success: true,
      data: { token, channelName, uid, appId: APP_ID, expireTs },
    });
  }
);

// ─── GET /api/agora/channel/:sessionId ───────────────────────────────────────
// Get channel info (appId + channelName) — no token, just for joining info
router.get('/channel/:sessionId', requireAuth, async (req: AuthRequest, res: Response) => {
  const sessionId = String(req.params['sessionId']);
  const userId = req.user!.userId;

  const session = await prisma.session.findFirst({
    where: {
      id: sessionId,
      OR: [{ userId }, { practitionerId: userId }],
    },
    select: { id: true, status: true, type: true },
  });

  if (!session) {
    res.status(404).json({ success: false, message: 'Session not found' });
    return;
  }

  res.json({
    success: true,
    data: { appId: APP_ID, channelName: session.id, sessionStatus: session.status, sessionType: session.type },
  });
});

// ─── POST /api/agora/feedback ─────────────────────────────────────────────────
// Submit post-call quality feedback
router.post(
  '/feedback',
  requireAuth,
  [
    body('sessionId').notEmpty(),
    body('audioQuality').isInt({ min: 1, max: 5 }),
    body('overallRating').isInt({ min: 1, max: 5 }),
    body('issues').optional().isArray(),
    body('comment').optional().trim(),
  ],
  handleValidation,
  async (req: AuthRequest, res: Response) => {
    const { sessionId, audioQuality, overallRating, issues, comment } = req.body as {
      sessionId: string;
      audioQuality: number;
      overallRating: number;
      issues?: string[];
      comment?: string;
    };
    const userId = req.user!.userId;

    // Verify session belongs to user and is completed
    const session = await prisma.session.findFirst({
      where: { id: sessionId, userId, status: 'COMPLETED' },
    });

    if (!session) {
      res.status(404).json({ success: false, message: 'Completed session not found' });
      return;
    }

    try {
      const feedback = await prisma.callFeedback.create({
        data: {
          sessionId,
          userId,
          audioQuality,
          overallRating,
          issues: issues ?? [],
          ...(comment ? { comment } : {}),
        },
      });
      res.status(201).json({ success: true, data: { feedback } });
    } catch (err: any) {
      if (err.code === 'P2002') {
        res.status(409).json({ success: false, message: 'Feedback already submitted for this session' });
        return;
      }
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return hash;
}

export default router;
