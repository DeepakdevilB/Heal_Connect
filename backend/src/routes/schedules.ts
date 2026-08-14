import { Router, Response, Request, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { sendNotificationToUser, sendNotificationToPractitioner } from '../services/notification.service';
import { scheduleSessionReminders, removeScheduledReminders } from '../services/scheduler.service';

const handleValidation = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return;
  }
  next();
};

const router = Router();

// ─── POST /api/schedules/request — User requests session ──────────────────────
router.post(
  '/request',
  requireAuth,
  [body('practitionerId').isUUID().withMessage('Valid practitionerId required')],
  handleValidation,
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const { practitionerId } = req.body;

    // A user shouldn't be booking a session if they are a practitioner
    if (req.user!.practitionerId) {
      res.status(403).json({ success: false, message: 'Practitioners cannot book sessions' });
      return;
    }

    try {
      // Create session as PENDING
      const session = await prisma.session.create({
        data: {
          userId,
          practitionerId,
          type: 'CHAT', // default for now, can be updated later
          status: 'PENDING',
        }
      });

      // Notify practitioner
      await sendNotificationToPractitioner(practitionerId, {
        type: 'SESSION_REQUESTED',
        title: 'New Session Request',
        body: 'You have received a new session request.',
        entityId: session.id,
      });

      res.status(201).json({ success: true, data: { session } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// ─── GET /api/schedules/requests — View requests (User & Practitioner) ────────
router.get('/requests', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const isPractitioner = !!req.user!.practitionerId;

  try {
    const sessions = await prisma.session.findMany({
      where: isPractitioner 
        ? { practitionerId: req.user!.practitionerId as string, status: { in: ['PENDING', 'TIME_PROPOSED'] } }
        : { userId, status: { in: ['PENDING', 'TIME_PROPOSED'] } },
      include: {
        user: { select: { id: true, name: true, photoUrl: true } },
        practitioner: { select: { id: true, name: true, photoUrl: true } },
        timeProposals: { orderBy: { startTime: 'asc' } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: { sessions } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── POST /api/schedules/:id/propose — Expert proposes time slots ──────────────
router.post(
  '/:id/propose',
  requireAuth,
  [
    body('slots').isArray({ min: 1 }).withMessage('At least one slot required'),
    body('slots.*.startTime').isISO8601().toDate().withMessage('Invalid start time'),
    body('slots.*.endTime').isISO8601().toDate().withMessage('Invalid end time'),
  ],
  handleValidation,
  async (req: AuthRequest, res: Response) => {
    const practitionerId = req.user!.practitionerId;
    if (!practitionerId) {
      res.status(403).json({ success: false, message: 'Only practitioners can propose times' });
      return;
    }

    const sessionId = req.params.id as string;
    const { slots } = req.body;

    try {
      const session = await prisma.session.findFirst({
        where: { id: sessionId, practitionerId: practitionerId as string, status: { in: ['PENDING', 'TIME_PROPOSED'] } }
      });

      if (!session) {
        res.status(404).json({ success: false, message: 'Request not found' });
        return;
      }

      // Check conflicts (basic check for existing CONFIRMED sessions)
      for (const slot of slots) {
        const conflict = await prisma.session.findFirst({
          where: {
            practitionerId,
            status: 'CONFIRMED',
            scheduledStartTime: { lt: slot.endTime },
            scheduledEndTime: { gt: slot.startTime }
          }
        });
        if (conflict) {
          res.status(409).json({ success: false, message: `Conflict detected for slot starting at ${slot.startTime}` });
          return;
        }
      }

      // Invalidate old proposals
      await prisma.sessionTimeProposal.updateMany({
        where: { sessionId, status: 'PENDING' },
        data: { status: 'CANCELLED' }
      });

      // Create new proposals
      await prisma.sessionTimeProposal.createMany({
        data: slots.map((s: any) => ({
          sessionId,
          proposedBy: 'PRACTITIONER',
          startTime: s.startTime,
          endTime: s.endTime,
          status: 'PENDING'
        }))
      });

      const updatedSession = await prisma.session.update({
        where: { id: sessionId },
        data: { status: 'TIME_PROPOSED' },
      });

      // Notify User
      await sendNotificationToUser(session.userId, {
        type: 'TIMES_PROPOSED',
        title: 'New Session Times Available',
        body: 'Your expert has suggested available times for your session.',
        entityId: session.id,
      });

      res.json({ success: true, data: { session: updatedSession } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// ─── POST /api/schedules/:id/select — User selects a time slot ─────────────────
router.post(
  '/:id/select',
  requireAuth,
  [body('proposalId').isUUID().withMessage('Valid proposalId required')],
  handleValidation,
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId as string;
    const sessionId = req.params.id as string;
    const { proposalId } = req.body;

    try {
      // Start transaction to prevent double booking
      const result = await prisma.$transaction(async (tx) => {
        const session = await tx.session.findFirst({
          where: { id: sessionId, userId, status: 'TIME_PROPOSED' }
        });

        if (!session) throw new Error('NOT_FOUND');

        const proposal = await tx.sessionTimeProposal.findFirst({
          where: { id: proposalId, sessionId, status: 'PENDING' }
        });

        if (!proposal) throw new Error('INVALID_PROPOSAL');

        // Check if practitioner got booked in the meantime
        const conflict = await tx.session.findFirst({
          where: {
            practitionerId: session.practitionerId,
            status: 'CONFIRMED',
            scheduledStartTime: { lt: proposal.endTime },
            scheduledEndTime: { gt: proposal.startTime }
          }
        });

        if (conflict) throw new Error('CONFLICT');

        // Accept proposal
        await tx.sessionTimeProposal.update({
          where: { id: proposalId },
          data: { status: 'SELECTED' }
        });

        // Cancel other pending proposals for this session
        await tx.sessionTimeProposal.updateMany({
          where: { sessionId, status: 'PENDING' },
          data: { status: 'CANCELLED' }
        });

        // Update session
        const updatedSession = await tx.session.update({
          where: { id: sessionId },
          data: {
            status: 'CONFIRMED',
            scheduledStartTime: proposal.startTime,
            scheduledEndTime: proposal.endTime,
          }
        });

        return updatedSession;
      });

      if (!result.scheduledStartTime) {
        throw new Error('MISSING_START_TIME');
      }

      const scheduledTime = result.scheduledStartTime.getTime();

      // Default reminders on creation
      await prisma.sessionReminder.createMany({
        data: [
          { sessionId, participantId: result.userId, reminderType: '24_HOURS', scheduledFor: new Date(scheduledTime - 24 * 60 * 60 * 1000) },
          { sessionId, participantId: result.userId, reminderType: '30_MINUTES', scheduledFor: new Date(scheduledTime - 30 * 60 * 1000) },
          { sessionId, participantId: result.practitionerId, reminderType: '24_HOURS', scheduledFor: new Date(scheduledTime - 24 * 60 * 60 * 1000) },
          { sessionId, participantId: result.practitionerId, reminderType: '30_MINUTES', scheduledFor: new Date(scheduledTime - 30 * 60 * 1000) },
        ],
        skipDuplicates: true
      });

      // Trigger scheduler
      if (result.scheduledStartTime) {
        try {
          await scheduleSessionReminders(result.id, result.scheduledStartTime);
        } catch (schedulerErr) {
          console.warn('⚠ Failed to schedule BullMQ reminders (cluster topology issue). Session confirmed successfully anyway:', schedulerErr);
        }
      }

      // Notify both
      const formatter = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
      const timeStr = formatter.format(result.scheduledStartTime!);

      await sendNotificationToUser(result.userId, {
        type: 'SESSION_CONFIRMED',
        title: 'Session Confirmed',
        body: `Your session is confirmed for ${timeStr}.`,
        entityId: result.id,
      });

      await sendNotificationToPractitioner(result.practitionerId, {
        type: 'SESSION_CONFIRMED',
        title: 'Session Time Confirmed',
        body: `Your session with the user is confirmed for ${timeStr}.`,
        entityId: result.id,
      });

      res.json({ success: true, data: { session: result } });
    } catch (err: any) {
      if (err.message === 'NOT_FOUND') {
        res.status(404).json({ success: false, message: 'Session not found or not in proposed state' });
      } else if (err.message === 'INVALID_PROPOSAL') {
        res.status(400).json({ success: false, message: 'Invalid or expired proposal' });
      } else if (err.message === 'CONFLICT') {
        res.status(409).json({ success: false, message: 'Sorry, this time is no longer available.' });
      } else {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
      }
    }
  }
);

// ─── POST /api/schedules/:id/reminders — Configure reminders ───────────────────
router.post(
  '/:id/reminders',
  requireAuth,
  [
    body('reminder24h').isBoolean().optional(),
    body('reminder30m').isBoolean().optional(),
  ],
  handleValidation,
  async (req: AuthRequest, res: Response) => {
    const participantId = (req.user!.practitionerId || req.user!.userId) as string;
    const sessionId = req.params.id as string;
    const { reminder24h, reminder30m } = req.body;

    try {
      const session = await prisma.session.findUnique({ where: { id: sessionId } });
      if (!session) return res.status(404).json({ success: false, message: 'Not found' });

      if (reminder24h !== undefined) {
        await prisma.sessionReminder.updateMany({
          where: { sessionId, participantId, reminderType: '24_HOURS' },
          data: { enabled: reminder24h }
        });
      }

      if (reminder30m !== undefined) {
        await prisma.sessionReminder.updateMany({
          where: { sessionId, participantId, reminderType: '30_MINUTES' },
          data: { enabled: reminder30m }
        });
      }

      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// ─── POST /api/schedules/:id/reschedule — Reschedule a session ────────────────
router.post(
  '/:id/reschedule',
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const participantId = (req.user!.practitionerId || req.user!.userId) as string;
    const isPractitioner = !!req.user!.practitionerId;
    const sessionId = req.params.id as string;

    try {
      const session = await prisma.session.findFirst({
        where: isPractitioner 
          ? { id: sessionId, practitionerId: participantId } 
          : { id: sessionId, userId: participantId }
      });

      if (!session) return res.status(404).json({ success: false, message: 'Not found' });
      if (session.status !== 'CONFIRMED') return res.status(400).json({ success: false, message: 'Only confirmed sessions can be rescheduled' });

      // Change status to PENDING so the expert can propose new times
      const updated = await prisma.session.update({
        where: { id: sessionId },
        data: { status: 'PENDING', scheduledStartTime: null, scheduledEndTime: null }
      });

      // Remove old reminders
      await removeScheduledReminders(sessionId);

      // Notify the other party
      const notifyId = isPractitioner ? session.userId : session.practitionerId;
      const title = 'Session Rescheduled';
      const body = isPractitioner ? 'The expert has requested to reschedule your session.' : 'The user has requested to reschedule the session.';
      
      if (isPractitioner) {
        await sendNotificationToUser(notifyId, { type: 'SESSION_RESCHEDULED', title, body, entityId: sessionId });
      } else {
        await sendNotificationToPractitioner(notifyId, { type: 'SESSION_RESCHEDULED', title, body, entityId: sessionId });
      }

      res.json({ success: true, data: { session: updated } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

export default router;
