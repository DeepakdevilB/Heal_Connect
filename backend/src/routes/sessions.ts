import { Router, type Response } from 'express';
import { body } from 'express-validator';
import { prisma } from '../lib/prisma';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import { handleValidation } from '../middleware/validate';

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

export default router;
