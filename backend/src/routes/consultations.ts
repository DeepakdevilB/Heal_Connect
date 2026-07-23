import { Router, type Response } from 'express';
import { body } from 'express-validator';
import { prisma } from '../lib/prisma';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import { handleValidation } from '../middleware/validate';
import { generateAgoraRtcToken } from '../lib/agora';
import { emitConsultationEvent } from '../lib/socket';

const router = Router();

// POST /api/consultations/start
router.post(
  '/start',
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const practitionerId = String(req.body?.practitionerId || req.body?.practitioner_id || '').trim();
      const type = String(req.body?.type || 'AUDIO').toUpperCase();

      if (!practitionerId) {
        res.status(422).json({
          success: false,
          message: 'Practitioner ID is required',
          errors: [{ field: 'practitionerId', message: 'Practitioner ID is required' }],
        });
        return;
      }

      const practitioner = await prisma.practitioner.findUnique({
        where: { id: practitionerId },
      });

      if (!practitioner) {
        res.status(404).json({ success: false, message: 'Practitioner not found' });
        return;
      }

      // Check if user has minimum wallet balance (at least 1 minute of consultation)
      let wallet = await prisma.wallet.findUnique({ where: { userId } });
      if (!wallet) {
        wallet = await prisma.wallet.create({
          data: { userId, balance: 100, currency: 'INR' },
        });
      }

      if (wallet.balance < practitioner.perMinuteRate) {
        res.status(400).json({
          success: false,
          code: 'INSUFFICIENT_BALANCE',
          message: `Insufficient wallet balance. You need at least ₹${practitioner.perMinuteRate} to request a call.`,
          data: { walletBalance: wallet.balance, requiredBalance: practitioner.perMinuteRate },
        });
        return;
      }

      // Create consultation session in INITIATED -> PENDING_ACCEPTANCE state
      const session = await prisma.session.create({
        data: {
          userId,
          practitionerId,
          type,
          status: 'PENDING_ACCEPTANCE',
          perMinuteRate: practitioner.perMinuteRate,
        },
        include: {
          user: { select: { id: true, name: true, photoUrl: true, email: true, phone: true } },
          practitioner: { select: { id: true, name: true, photoUrl: true, perMinuteRate: true, specialties: true } },
        },
      });

      emitConsultationEvent(
        'consultation-requested',
        session.id,
        { session },
        { userId, practitionerId }
      );

      res.status(201).json({
        success: true,
        message: 'Consultation session initiated',
        data: { session },
      });
    } catch (err) {
      console.error('Error starting consultation:', err);
      res.status(500).json({ success: false, message: 'Failed to start consultation' });
    }
  }
);

// POST /api/consultations/accept
router.post(
  '/accept',
  requireAuth,
  [body('consultationId').isString().notEmpty()],
  handleValidation,
  async (req: AuthRequest, res: Response) => {
    try {
      const { consultationId } = req.body as { consultationId: string };

      const existing = await prisma.session.findUnique({
        where: { id: consultationId },
        include: { user: true, practitioner: true },
      });

      if (!existing) {
        res.status(404).json({ success: false, message: 'Consultation not found' });
        return;
      }

      const session = await prisma.session.update({
        where: { id: consultationId },
        data: { status: 'ACCEPTED' },
        include: {
          user: { select: { id: true, name: true, photoUrl: true } },
          practitioner: { select: { id: true, name: true, photoUrl: true, perMinuteRate: true } },
        },
      });

      emitConsultationEvent(
        'consultation-accepted',
        session.id,
        { session },
        { userId: session.userId, practitionerId: session.practitionerId }
      );

      res.json({ success: true, message: 'Consultation accepted', data: { session } });
    } catch (err) {
      console.error('Error accepting consultation:', err);
      res.status(500).json({ success: false, message: 'Failed to accept consultation' });
    }
  }
);

// POST /api/consultations/reject
router.post(
  '/reject',
  requireAuth,
  [body('consultationId').isString().notEmpty()],
  handleValidation,
  async (req: AuthRequest, res: Response) => {
    try {
      const { consultationId } = req.body as { consultationId: string };

      const session = await prisma.session.update({
        where: { id: consultationId },
        data: { status: 'REJECTED' },
      });

      emitConsultationEvent(
        'consultation-rejected',
        session.id,
        { session },
        { userId: session.userId, practitionerId: session.practitionerId }
      );

      res.json({ success: true, message: 'Consultation rejected', data: { session } });
    } catch (err) {
      console.error('Error rejecting consultation:', err);
      res.status(500).json({ success: false, message: 'Failed to reject consultation' });
    }
  }
);

// POST /api/consultations/check-wallet
router.post(
  '/check-wallet',
  requireAuth,
  [body('consultationId').isString().notEmpty()],
  handleValidation,
  async (req: AuthRequest, res: Response) => {
    try {
      const { consultationId } = req.body as { consultationId: string };

      const session = await prisma.session.findUnique({
        where: { id: consultationId },
        include: { practitioner: true },
      });

      if (!session) {
        res.status(404).json({ success: false, message: 'Consultation not found' });
        return;
      }

      const wallet = await prisma.wallet.findUnique({ where: { userId: session.userId } });
      const currentBalance = wallet ? wallet.balance : 0;
      const minRequired = session.practitioner.perMinuteRate;

      if (currentBalance < minRequired) {
        res.status(400).json({
          success: false,
          isSufficient: false,
          message: 'Insufficient wallet balance.',
          data: { currentBalance, minRequired },
        });
        return;
      }

      // Transition to WALLET_VERIFIED
      const updated = await prisma.session.update({
        where: { id: consultationId },
        data: { status: 'WALLET_VERIFIED' },
      });

      res.json({
        success: true,
        isSufficient: true,
        message: 'Wallet balance verified',
        data: { session: updated, currentBalance },
      });
    } catch (err) {
      console.error('Error checking wallet:', err);
      res.status(500).json({ success: false, message: 'Failed to verify wallet' });
    }
  }
);

// POST /api/consultations/join
router.post(
  '/join',
  requireAuth,
  [body('consultationId').isString().notEmpty()],
  handleValidation,
  async (req: AuthRequest, res: Response) => {
    try {
      const { consultationId } = req.body as { consultationId: string };

      const existing = await prisma.session.findUnique({
        where: { id: consultationId },
        include: {
          user: { select: { id: true, name: true, photoUrl: true } },
          practitioner: { select: { id: true, name: true, photoUrl: true, perMinuteRate: true } },
        },
      });

      if (!existing) {
        res.status(404).json({ success: false, message: 'Consultation not found' });
        return;
      }

      const channelName = existing.channelName || `consultation_${consultationId}`;
      const numericUid = Math.floor(100000 + Math.random() * 900000);

      const rtcData = generateAgoraRtcToken(channelName, numericUid, 'publisher');

      const updatedSession = await prisma.session.update({
        where: { id: consultationId },
        data: {
          status: 'ACTIVE',
          channelName,
          agoraUid: numericUid,
          startTime: existing.startTime || new Date(),
        },
        include: {
          user: { select: { id: true, name: true, photoUrl: true } },
          practitioner: { select: { id: true, name: true, photoUrl: true, perMinuteRate: true } },
        },
      });

      emitConsultationEvent(
        'consultation-started',
        consultationId,
        { session: updatedSession, rtcData },
        { userId: existing.userId, practitionerId: existing.practitionerId }
      );

      res.json({
        success: true,
        message: 'Joined consultation channel',
        data: {
          session: updatedSession,
          agora: rtcData,
        },
      });
    } catch (err) {
      console.error('Error joining consultation:', err);
      res.status(500).json({ success: false, message: 'Failed to join channel' });
    }
  }
);

// POST /api/consultations/end
router.post(
  '/end',
  requireAuth,
  [body('consultationId').isString().notEmpty()],
  handleValidation,
  async (req: AuthRequest, res: Response) => {
    try {
      const { consultationId } = req.body as { consultationId: string };

      const session = await prisma.session.findUnique({
        where: { id: consultationId },
        include: {
          user: { select: { id: true, name: true, photoUrl: true } },
          practitioner: { select: { id: true, name: true, photoUrl: true, perMinuteRate: true } },
        },
      });

      if (!session) {
        res.status(404).json({ success: false, message: 'Consultation not found' });
        return;
      }

      if (session.status === 'COMPLETED' || session.status === 'RATING_PENDING' || session.status === 'ENDED') {
        res.json({ success: true, message: 'Consultation already ended', data: { session } });
        return;
      }

      const endTime = new Date();
      const startTime = session.startTime || session.createdAt;
      const durationSeconds = Math.max(1, Math.floor((endTime.getTime() - startTime.getTime()) / 1000));
      const durationMinutes = Math.ceil(durationSeconds / 60);

      const perMinuteRate = session.perMinuteRate || session.practitioner.perMinuteRate;
      const totalCost = Number((durationMinutes * perMinuteRate).toFixed(2));

      // Update wallet balance & create debit transaction inside DB transaction
      let remainingBalance = 0;
      await prisma.$transaction(async (tx) => {
        const wallet = await tx.wallet.findUnique({ where: { userId: session.userId } });
        if (wallet) {
          const updatedWallet = await tx.wallet.update({
            where: { id: wallet.id },
            data: { balance: { decrement: totalCost } },
          });
          remainingBalance = updatedWallet.balance;

          await tx.transaction.create({
            data: {
              walletId: wallet.id,
              amount: totalCost,
              type: 'DEBIT',
              status: 'SUCCESS',
              referenceId: `CONS_${session.id}`,
            },
          });
        }
      });

      const updatedSession = await prisma.session.update({
        where: { id: consultationId },
        data: {
          status: 'RATING_PENDING',
          endTime,
          duration: durationSeconds,
          totalCost,
          walletDeduction: totalCost,
        },
        include: {
          user: { select: { id: true, name: true, photoUrl: true } },
          practitioner: { select: { id: true, name: true, photoUrl: true, perMinuteRate: true } },
        },
      });

      const billingSummary = {
        consultationId: session.id,
        durationSeconds,
        durationFormatted: `${Math.floor(durationSeconds / 3600).toString().padStart(2, '0')}:${Math.floor((durationSeconds % 3600) / 60).toString().padStart(2, '0')}:${(durationSeconds % 60).toString().padStart(2, '0')}`,
        perMinuteRate,
        totalAmount: totalCost,
        walletDeduction: totalCost,
        remainingWalletBalance: remainingBalance,
        startTime,
        endTime,
      };

      emitConsultationEvent(
        'consultation-ended',
        consultationId,
        { session: updatedSession, billingSummary },
        { userId: session.userId, practitionerId: session.practitionerId }
      );

      emitConsultationEvent(
        'billing-generated',
        consultationId,
        { billingSummary },
        { userId: session.userId, practitionerId: session.practitionerId }
      );

      res.json({
        success: true,
        message: 'Consultation ended successfully',
        data: {
          session: updatedSession,
          billingSummary,
        },
      });
    } catch (err) {
      console.error('Error ending consultation:', err);
      res.status(500).json({ success: false, message: 'Failed to end consultation' });
    }
  }
);

// GET /api/consultations/:id
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const consultationId = String(req.params['id']);
    const session = await prisma.session.findUnique({
      where: { id: consultationId },
      include: {
        user: { select: { id: true, name: true, photoUrl: true, email: true, phone: true } },
        practitioner: { select: { id: true, name: true, photoUrl: true, perMinuteRate: true, specialties: true } },
        review: true,
      },
    });

    if (!session) {
      res.status(404).json({ success: false, message: 'Consultation not found' });
      return;
    }

    res.json({ success: true, data: { session } });
  } catch (err) {
    console.error('Error fetching consultation:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/consultations/rating
router.post(
  '/rating',
  requireAuth,
  [
    body('consultationId').isString().notEmpty(),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('comment').optional().isString().trim(),
  ],
  handleValidation,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const { consultationId, rating, comment } = req.body as {
        consultationId: string;
        rating: number;
        comment?: string;
      };

      const session = await prisma.session.findUnique({
        where: { id: consultationId },
      });

      if (!session) {
        res.status(404).json({ success: false, message: 'Consultation not found' });
        return;
      }

      // Create Review record
      const review = await prisma.review.create({
        data: {
          sessionId: consultationId,
          userId,
          practitionerId: session.practitionerId,
          rating,
          comment: comment || null,
        },
      });

      // Transition session status to COMPLETED
      const updatedSession = await prisma.session.update({
        where: { id: consultationId },
        data: { status: 'COMPLETED' },
      });

      emitConsultationEvent(
        'rating-submitted',
        consultationId,
        { review, session: updatedSession },
        { userId: session.userId, practitionerId: session.practitionerId }
      );

      res.json({
        success: true,
        message: 'Rating submitted successfully',
        data: { review, session: updatedSession },
      });
    } catch (err) {
      console.error('Error submitting rating:', err);
      res.status(500).json({ success: false, message: 'Failed to submit rating' });
    }
  }
);

export default router;
