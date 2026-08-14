import { Router, type Response } from 'express';
import { body } from 'express-validator';
import { prisma } from '../lib/prisma';
import { requireAuth, requireAdmin, type AuthRequest } from '../middleware/auth';
import { handleValidation } from '../middleware/validate';
import { getIO } from '../lib/socket';
import { SESSION_DISCLAIMER, SESSION_SAFETY_GUIDELINES } from '../lib/safetyGuidelines';
import { flagContentIfNeeded } from '../lib/moderation';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE ORDER MATTERS IN EXPRESS:
//   Named collection routes  (/practitioner/active, /user/history …)  FIRST
//   Then sub-resource routes (:id/accept, /:id/end …)
//   Then the generic /:id catch-all GET LAST
//   Otherwise "practitioner" is matched as :id and the named routes become
//   unreachable (pre-existing bug — fixed here).
// ─────────────────────────────────────────────────────────────────────────────

// ─── POST /api/sessions — initiate a new session (Task 1) ────────────────────
// Status transitions: INITIATED → ACCEPTED → ACTIVE → COMPLETED
router.post(
  '/',
  requireAuth,
  [
    body('practitionerId').notEmpty(),
    body('type').isIn(['CHAT', 'AUDIO', 'VIDEO']),
  ],
  handleValidation,
  async (req: AuthRequest, res: Response) => {
    const { practitionerId, type } = req.body as { practitionerId: string; type: string };
    const userId = req.user!.userId;

    // Block practitioners from creating sessions as users
    if (req.user!.practitionerId) {
      res.status(403).json({ success: false, message: 'Practitioners cannot book sessions' });
      return;
    }

    // Wrap practitioner lookup + wallet check + session creation in a single
    // atomic transaction to prevent race conditions (Tasks 8/9)
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Check practitioner exists and is online
        const practitioner = await tx.practitioner.findUnique({
          where: { id: practitionerId },
          select: { id: true, isOnline: true, perMinuteRate: true },
        });

        if (!practitioner) {
          return { error: { status: 404, message: 'Practitioner not found' } };
        }

        if (!practitioner.isOnline) {
          return { error: { status: 400, message: 'Practitioner is currently offline' } };
        }

        // Re-read wallet inside the transaction to prevent race conditions
        const wallet = await tx.wallet.findUnique({ where: { userId } });
        if (!wallet || wallet.balance < practitioner.perMinuteRate) {
          return { error: { status: 400, message: 'Insufficient wallet balance. Please recharge.' } };
        }

        const session = await tx.session.create({
          data: {
            userId,
            practitionerId,
            type,
            status: 'INITIATED',  // Task 1: proper initial status
            perMinuteRate: practitioner.perMinuteRate,
            createdAt: new Date(),
          },
          include: { user: { select: { id: true, name: true, photoUrl: true } } },
        });

        return { session, practitioner };
      });

      if ('error' in result) {
        res.status(result.error.status).json({ success: false, message: result.error.message });
        return;
      }

      const { session } = result;

      // Notify the practitioner in real-time
      getIO()?.to(`practitioner_${practitionerId}`).emit('new_session_request', {
        id: session.id,
        type: session.type,
        status: session.status,
        createdAt: session.createdAt,
        user: session.user,
      });

      res.status(201).json({
        success: true,
        data: {
          session,
          // Task 6: safety guidelines returned at session initiation
          safetyGuidelines: SESSION_SAFETY_GUIDELINES,
          disclaimer: SESSION_DISCLAIMER,
        },
      });
    } catch (err) {
      console.error('Session creation error:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

// ── Named collection routes — MUST come before /:id GET to avoid routing conflict ──

// ─── GET /api/sessions/practitioner/active — for expert dashboard ─────────────
router.get('/practitioner/active', requireAuth, async (req: AuthRequest, res: Response) => {
  const practitionerId = req.user!.practitionerId;
  if (!practitionerId) {
    res.status(403).json({ success: false, message: 'Not a practitioner' });
    return;
  }
  const sessions = await prisma.session.findMany({
    where: { practitionerId, status: { in: ['INITIATED', 'ACCEPTED', 'ACTIVE'] } },
    include: { user: { select: { id: true, name: true, photoUrl: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: { sessions } });
});

// ─── GET /api/sessions/practitioner/history ───────────────────────────────────
router.get('/practitioner/history', requireAuth, async (req: AuthRequest, res: Response) => {
  const practitionerId = req.user!.practitionerId;
  if (!practitionerId) {
    res.status(403).json({ success: false, message: 'Not a practitioner' });
    return;
  }

  const [sessions, aggregations] = await Promise.all([
    prisma.session.findMany({
      where: { practitionerId, status: 'COMPLETED' },
      include: { user: { select: { id: true, name: true, photoUrl: true } } },
      orderBy: { endTime: 'desc' },
      take: 20,
    }),
    prisma.session.aggregate({
      where: { practitionerId, status: 'COMPLETED' },
      _sum: { totalCost: true }
    })
  ]);

  const totalEarnings = aggregations._sum.totalCost || 0;
  res.json({ success: true, data: { sessions, totalEarnings } });
});

// ─── GET /api/sessions/user/history — user session history ───────────────────
router.get('/user/history', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;

  const [sessions, aggregations, allUserSessions] = await Promise.all([
    prisma.session.findMany({
      where: { userId, status: 'COMPLETED' },
      include: { practitioner: { select: { id: true, name: true, photoUrl: true, specialties: true } } },
      orderBy: { endTime: 'desc' },
      take: 20,
    }),
    prisma.session.aggregate({
      where: { userId, status: 'COMPLETED' },
      _sum: { totalCost: true }
    }),
    prisma.session.findMany({
      where: { userId, status: 'COMPLETED' },
      select: { startTime: true, endTime: true }
    })
  ]);

  const totalSpent = aggregations._sum.totalCost || 0;
  const totalMinutes = allUserSessions.reduce((sum, s) => {
    if (!s.startTime || !s.endTime) return sum;
    return sum + Math.round((new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 60000);
  }, 0);

  res.json({ success: true, data: { sessions, totalSpent, totalMinutes } });
});

// ─── GET /api/sessions/user/transcripts — user's own call transcripts ────────
router.get('/user/transcripts', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const page = parseInt(String(req.query.page ?? '1'));
  const limit = Math.min(parseInt(String(req.query.limit ?? '20')), 50);
  const skip = (page - 1) * limit;

  try {
    const [transcripts, total] = await Promise.all([
      prisma.callTranscript.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          transcriptText: true,
          submittedAt: true,
          session: {
            select: {
              id: true, type: true, startTime: true, endTime: true,
              practitioner: { select: { id: true, name: true, photoUrl: true } },
            },
          },
        },
      }),
      prisma.callTranscript.count({ where: { userId } }),
    ]);

    res.json({
      success: true,
      data: { transcripts, pagination: { total, page, limit, pages: Math.ceil(total / limit) } },
    });
  } catch (err) {
    console.error('User transcripts fetch error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ─── GET /api/sessions/practitioner/transcripts — practitioner's own call transcripts
router.get('/practitioner/transcripts', requireAuth, async (req: AuthRequest, res: Response) => {
  const practitionerId = req.user!.practitionerId;
  if (!practitionerId) {
    res.status(403).json({ success: false, message: 'Not a practitioner' });
    return;
  }
  const page = parseInt(String(req.query.page ?? '1'));
  const limit = Math.min(parseInt(String(req.query.limit ?? '20')), 50);
  const skip = (page - 1) * limit;

  try {
    const [transcripts, total] = await Promise.all([
      prisma.callTranscript.findMany({
        where: { practitionerId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          transcriptText: true,
          submittedAt: true,
          session: {
            select: {
              id: true, type: true, startTime: true, endTime: true,
              user: { select: { id: true, name: true, photoUrl: true } },
            },
          },
        },
      }),
      prisma.callTranscript.count({ where: { practitionerId } }),
    ]);

    res.json({
      success: true,
      data: { transcripts, pagination: { total, page, limit, pages: Math.ceil(total / limit) } },
    });
  } catch (err) {
    console.error('Practitioner transcripts fetch error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// DEV TEMP: Clear stuck active sessions
router.post('/dev-clear', requireAdmin, async (req: any, res: Response) => {
  try {
    const result = await prisma.session.updateMany({
      where: { status: { in: ['ACTIVE', 'INITIATED', 'ACCEPTED'] } },
      data: { status: 'COMPLETED', endTime: new Date() }
    });
    res.json({ success: true, message: `Cleared ${result.count} stuck sessions.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// ── Parameterised sub-resource routes (:id/action) ───────────────────────────

// ─── POST /api/sessions/:id/accept — practitioner accepts (Task 1) ───────────
router.post('/:id/accept', requireAuth, async (req: AuthRequest, res: Response) => {
  const practitionerId = req.user!.practitionerId;
  if (!practitionerId) {
    res.status(403).json({ success: false, message: 'Only practitioners can accept sessions' });
    return;
  }

  const sessionId = req.params.id as string;

  try {
    const session = await prisma.session.findFirst({
      where: { id: sessionId, practitionerId, status: 'INITIATED' },
    });

    if (!session) {
      res.status(404).json({ success: false, message: 'Session not found or not in INITIATED state' });
      return;
    }

    const updated = await prisma.session.update({
      where: { id: sessionId },
      data: { status: 'ACCEPTED' },
    });

    // Notify user that practitioner accepted
    import('../lib/socket').then(({ emitConsultationEvent }) => {
      emitConsultationEvent('session_accepted', sessionId, { sessionId, status: 'ACCEPTED' }, {
        userId: session.userId,
        practitionerId,
      });
    });

    res.json({ success: true, data: { session: updated } });
  } catch (err) {
    console.error('Session accept error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ─── POST /api/sessions/:id/reject — practitioner rejects (Task 1) ───────────
router.post('/:id/reject', requireAuth, async (req: AuthRequest, res: Response) => {
  const practitionerId = req.user!.practitionerId;
  if (!practitionerId) {
    res.status(403).json({ success: false, message: 'Only practitioners can reject sessions' });
    return;
  }

  const sessionId = req.params.id as string;

  try {
    const session = await prisma.session.findFirst({
      where: { id: sessionId, practitionerId, status: { in: ['INITIATED', 'ACCEPTED'] } },
    });

    if (!session) {
      res.status(404).json({ success: false, message: 'Session not found or cannot be rejected in current state' });
      return;
    }

    const updated = await prisma.session.update({
      where: { id: sessionId },
      data: { status: 'REJECTED', endTime: new Date() },
    });

    import('../lib/socket').then(({ emitConsultationEvent }) => {
      emitConsultationEvent('session_rejected', sessionId, { sessionId, status: 'REJECTED' }, {
        userId: session.userId,
        practitionerId,
      });
    });

    res.json({ success: true, data: { session: updated } });
  } catch (err) {
    console.error('Session reject error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ─── POST /api/sessions/:id/connect — mark session ACTIVE once both join (Task 1)
router.post('/:id/connect', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const sessionId = req.params.id as string;

  try {
    const session = await prisma.session.findFirst({
      where: {
        id: sessionId,
        OR: [{ userId }, { practitionerId: userId }],
        status: { in: ['ACCEPTED', 'WALLET_VERIFIED', 'JOINING_CHANNEL'] },
      },
    });

    if (!session) {
      res.status(404).json({ success: false, message: 'Session not found or cannot connect in current state' });
      return;
    }

    const updated = await prisma.session.update({
      where: { id: sessionId },
      data: {
        status: 'ACTIVE',
        startTime: session.startTime ?? new Date(),
      },
    });

    await prisma.practitioner.update({
      where: { id: session.practitionerId },
      data: { isBusy: true },
    });

    import('../lib/socket').then(({ emitConsultationEvent, getIO }) => {
      emitConsultationEvent('session_connected', sessionId, { sessionId, status: 'ACTIVE' }, {
        userId: session.userId,
        practitionerId: session.practitionerId,
      });
      const io = getIO();
      if (io) {
        io.emit('practitioner_status', { practitionerId: session.practitionerId, isOnline: true, isBusy: true });
      }
    });

    res.json({ success: true, data: { session: updated } });
  } catch (err) {
    console.error('Session connect error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ─── POST /api/sessions/:id/end ───────────────────────────────────────────────
router.post('/:id/end', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const sessionId = req.params.id as string;

  const session = await prisma.session.findFirst({
    where: { id: sessionId, OR: [{ userId }, { practitionerId: userId }] },
  });

  if (!session) { res.status(404).json({ success: false, message: 'Session not found' }); return; }
  if (session.status !== 'ACTIVE' && session.status !== 'DISCONNECTED') { res.status(400).json({ success: false, message: 'Session already ended' }); return; }

  const updated = await prisma.session.update({
    where: { id: sessionId },
    data: { status: 'COMPLETED', endTime: new Date() },
  });

  await prisma.practitioner.update({
    where: { id: session.practitionerId },
    data: { isBusy: false },
  });

  import('../lib/socket').then(({ emitConsultationEvent, getIO }) => {
    emitConsultationEvent('session_terminated', sessionId, { sessionId, reason: 'ended_by_user' }, {
      userId: session.userId,
      practitionerId: session.practitionerId
    });
    const io = getIO();
    if (io) {
      io.emit('practitioner_status', { practitionerId: session.practitionerId, isOnline: true, isBusy: false });
    }
  });

  res.json({ success: true, data: { session: updated } });
});

// ─── POST /api/sessions/:id/transcript — store call transcript (Task 2) ──────
router.post(
  '/:id/transcript',
  requireAuth,
  [body('transcriptText').trim().notEmpty().withMessage('Transcript text is required')],
  handleValidation,
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const sessionId = req.params.id as string;
    const { transcriptText } = req.body as { transcriptText: string };

    try {
      // Verify the session belongs to this user/practitioner and is completed
      const session = await prisma.session.findFirst({
        where: {
          id: sessionId,
          OR: [
            { userId },
            ...(req.user!.practitionerId ? [{ practitionerId: req.user!.practitionerId }] : [{ practitionerId: userId }]),
          ],
          status: 'COMPLETED',
        },
        select: { id: true, userId: true, practitionerId: true, type: true },
      });

      if (!session) {
        res.status(404).json({ success: false, message: 'Completed session not found' });
        return;
      }

      if (session.type === 'CHAT') {
        res.status(400).json({ success: false, message: 'Transcripts are for audio/video sessions only' });
        return;
      }

      const transcript = await prisma.callTranscript.create({
        data: {
          sessionId,
          transcriptText,
          userId: session.userId,
          practitionerId: session.practitionerId,
        },
      });

      // Task 3: scan transcript for policy violations (async, non-blocking)
      flagContentIfNeeded(transcriptText, 'CALL_TRANSCRIPT', {
        sessionId,
        userId: session.userId,
        practitionerId: session.practitionerId,
        transcriptId: transcript.id,
      }).catch((err) => console.error('[moderation] transcript scan error:', err));

      res.status(201).json({ success: true, data: { transcript } });
    } catch (err: any) {
      if (err.code === 'P2002') {
        res.status(409).json({ success: false, message: 'Transcript already submitted for this session' });
        return;
      }
      console.error('Transcript submission error:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

// ─── GET /api/sessions/:id — get session details ──────────────────────────────
// MUST be declared AFTER all named routes above to avoid consuming them.
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const session = await prisma.session.findFirst({
    where: {
      id: req.params.id as string,
      OR: [{ userId }, { practitionerId: userId }],
    },
    include: {
      practitioner: {
        select: { id: true, name: true, photoUrl: true, specialties: true, isOnline: true, perMinuteRate: true },
      },
      user: {
        select: { id: true, name: true, photoUrl: true },
      },
    },
  });

  if (!session) {
    res.status(404).json({ success: false, message: 'Session not found' });
    return;
  }

  res.json({ success: true, data: { session } });
});

export default router;
