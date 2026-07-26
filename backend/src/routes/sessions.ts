import { Router, type Response } from 'express';
import { body } from 'express-validator';
import { prisma } from '../lib/prisma';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import { handleValidation } from '../middleware/validate';
import { getIO } from '../lib/socket';

const router = Router();

// POST /api/sessions — initiate a new session
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
    // Check practitioner exists and is online
    const practitioner = await prisma.practitioner.findUnique({
      where: { id: practitionerId },
      select: { id: true, isOnline: true, perMinuteRate: true },
    });

    if (!practitioner) {
      res.status(404).json({ success: false, message: 'Practitioner not found' });
      return;
    }

    if (!practitioner.isOnline) {
      res.status(400).json({ success: false, message: 'Practitioner is currently offline' });
      return;
    }

    // Check wallet has at least 1 minute worth of balance
    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet || wallet.balance < practitioner.perMinuteRate) {
      res.status(400).json({ success: false, message: 'Insufficient wallet balance. Please recharge.' });
      return;
    }

    const session = await prisma.session.create({
      data: {
        userId,
        practitionerId,
        type,
        status: 'ACTIVE',
        startTime: new Date(),
      },
      include: { user: { select: { id: true, name: true, photoUrl: true } } },
    });

    // Notify the practitioner in real-time
    const { getIO } = await import('../lib/socket');
    getIO()?.to(`practitioner_${practitionerId}`).emit('new_session_request', {
      id: session.id,
      type: session.type,
      status: session.status,
      createdAt: session.createdAt,
      user: session.user,
    });

    res.status(201).json({ success: true, data: { session } });
  }
);

// GET /api/sessions/:id — get session details
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
    },
  });

  if (!session) {
    res.status(404).json({ success: false, message: 'Session not found' });
    return;
  }

  res.json({ success: true, data: { session } });
});

// POST /api/sessions/:id/end
router.post('/:id/end', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const sessionId = req.params.id as string;

  const session = await prisma.session.findFirst({
    where: { id: sessionId, OR: [{ userId }, { practitionerId: userId }] },
  });

  if (!session) { res.status(404).json({ success: false, message: 'Session not found' }); return; }
  if (session.status !== 'ACTIVE') { res.status(400).json({ success: false, message: 'Session already ended' }); return; }

  const updated = await prisma.session.update({
    where: { id: sessionId },
    data: { status: 'COMPLETED', endTime: new Date() },
  });

  getIO()?.to(`room:${sessionId}`).emit('session_terminated', { sessionId, reason: 'ended_by_user' });

  res.json({ success: true, data: { session: updated } });
});

// GET /api/sessions/practitioner/active — for expert dashboard
router.get('/practitioner/active', requireAuth, async (req: AuthRequest, res: Response) => {
  const practitionerId = req.user!.userId;
  const sessions = await prisma.session.findMany({
    where: { practitionerId, status: 'ACTIVE' },
    include: { user: { select: { id: true, name: true, photoUrl: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: { sessions } });
});

// GET /api/sessions/practitioner/history — session history + earnings
router.get('/practitioner/history', requireAuth, async (req: AuthRequest, res: Response) => {
  const practitionerId = req.user!.userId;
  const sessions = await prisma.session.findMany({
    where: { practitionerId, status: 'COMPLETED' },
    include: { user: { select: { id: true, name: true, photoUrl: true } } },
    orderBy: { endTime: 'desc' },
    take: 20,
  });
  const totalEarnings = sessions.reduce((sum, s) => sum + (s.totalCost || 0), 0);
  res.json({ success: true, data: { sessions, totalEarnings } });
});

// GET /api/sessions/user/history — user session history
router.get('/user/history', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const sessions = await prisma.session.findMany({
    where: { userId, status: 'COMPLETED' },
    include: { practitioner: { select: { id: true, name: true, photoUrl: true, specialties: true } } },
    orderBy: { endTime: 'desc' },
    take: 20,
  });
  const totalSpent = sessions.reduce((sum, s) => sum + (s.totalCost || 0), 0);
  const totalMinutes = sessions.reduce((sum, s) => {
    if (!s.startTime || !s.endTime) return sum;
    return sum + Math.round((new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 60000);
  }, 0);
  res.json({ success: true, data: { sessions, totalSpent, totalMinutes } });
});

export default router;
