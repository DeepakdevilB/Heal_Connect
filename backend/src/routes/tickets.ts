import { Router, type Response } from 'express';
import { body, param, query } from 'express-validator';
import { prisma } from '../lib/prisma';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import { handleValidation } from '../middleware/validate';

const router = Router();

const CATEGORIES = ['BILLING', 'TECHNICAL', 'ACCOUNT', 'SESSION', 'OTHER'];

// ─── POST /api/tickets — raise a new support ticket ───────────────────────────
router.post(
  '/',
  requireAuth,
  [
    body('subject').trim().notEmpty().withMessage('Subject is required').isLength({ max: 200 }),
    body('message').trim().notEmpty().withMessage('Message is required'),
    body('category').optional().isIn(CATEGORIES).withMessage('Invalid category'),
  ],
  handleValidation,
  async (req: AuthRequest, res: Response) => {
    const { subject, message, category } = req.body as { subject: string; message: string; category?: string };
    const isPractitioner = Boolean(req.user!.practitionerId);
    const userId = isPractitioner ? null : req.user!.userId;
    const practitionerId = isPractitioner ? req.user!.practitionerId! : null;

    try {
      const ticket = await prisma.supportTicket.create({
        data: {
          subject,
          category: category ?? 'OTHER',
          ...(userId ? { userId } : {}),
          ...(practitionerId ? { practitionerId } : {}),
          messages: {
            create: {
              senderType: isPractitioner ? 'PRACTITIONER' : 'USER',
              message,
            },
          },
        },
        include: { messages: true },
      });

      res.status(201).json({ success: true, data: { ticket } });
    } catch (err) {
      console.error('Ticket creation error:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

// ─── GET /api/tickets/mine — caller's own tickets ─────────────────────────────
router.get(
  '/mine',
  requireAuth,
  [
    query('status').optional().isIn(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  handleValidation,
  async (req: AuthRequest, res: Response) => {
    const isPractitioner = Boolean(req.user!.practitionerId);
    const where: Record<string, unknown> = isPractitioner
      ? { practitionerId: req.user!.practitionerId }
      : { userId: req.user!.userId };

    const status = req.query.status as string | undefined;
    if (status) where['status'] = status;

    const page = parseInt(String(req.query.page ?? '1'));
    const limit = Math.min(parseInt(String(req.query.limit ?? '20')), 50);
    const skip = (page - 1) * limit;

    try {
      const [tickets, total] = await Promise.all([
        prisma.supportTicket.findMany({
          where,
          orderBy: { updatedAt: 'desc' },
          skip,
          take: limit,
          select: {
            id: true, subject: true, category: true, status: true,
            createdAt: true, updatedAt: true,
            _count: { select: { messages: true } },
          },
        }),
        prisma.supportTicket.count({ where }),
      ]);

      res.json({
        success: true,
        data: { tickets, pagination: { total, page, limit, pages: Math.ceil(total / limit) } },
      });
    } catch (err) {
      console.error('Ticket list error:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

// ─── GET /api/tickets/:id — ticket detail + message thread ───────────────────
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const isPractitioner = Boolean(req.user!.practitionerId);
  const where: any = { id: req.params.id as string };
  if (isPractitioner) {
    where.practitionerId = req.user!.practitionerId;
  } else {
    where.userId = req.user!.userId;
  }

  try {
    const ticket = await prisma.supportTicket.findFirst({
      where,
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    if (!ticket) {
      res.status(404).json({ success: false, message: 'Ticket not found' });
      return;
    }

    res.json({ success: true, data: { ticket } });
  } catch (err) {
    console.error('Ticket detail error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ─── POST /api/tickets/:id/messages — reply to own ticket ────────────────────
router.post(
  '/:id/messages',
  requireAuth,
  [param('id').notEmpty(), body('message').trim().notEmpty().withMessage('Message is required')],
  handleValidation,
  async (req: AuthRequest, res: Response) => {
    const isPractitioner = Boolean(req.user!.practitionerId);
    const where: any = { id: req.params.id as string };
    if (isPractitioner) {
      where.practitionerId = req.user!.practitionerId;
    } else {
      where.userId = req.user!.userId;
    }
    const { message } = req.body as { message: string };

    try {
      const ticket = await prisma.supportTicket.findFirst({
        where,
        select: { id: true, status: true },
      });

      if (!ticket) {
        res.status(404).json({ success: false, message: 'Ticket not found' });
        return;
      }

      const [ticketMessage] = await prisma.$transaction([
        prisma.ticketMessage.create({
          data: {
            ticketId: ticket.id,
            senderType: isPractitioner ? 'PRACTITIONER' : 'USER',
            message,
          },
        }),
        // Replying to a resolved/closed ticket reopens it for visibility
        prisma.supportTicket.update({
          where: { id: ticket.id },
          data: ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'
            ? { status: 'OPEN' }
            : {},
        }),
      ]);

      res.status(201).json({ success: true, data: { message: ticketMessage } });
    } catch (err) {
      console.error('Ticket reply error:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

export default router;
