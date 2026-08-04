/**
 * Reviews router — Tasks 4 & 5.
 *
 * POST /api/sessions/:id/review  — submit a rating/review for a completed session.
 *   Atomically updates the practitioner's avgRating and reviewCount in the same
 *   DB transaction to prevent read-then-write races (Task 5).
 *
 * GET  /api/moderation/flagged       — list flagged content (admin, Task 4).
 * PATCH /api/moderation/flagged/:id  — resolve or dismiss a flag (admin, Task 4).
 *
 * Strict scope: only touch what is required for tasks 4 & 5.
 */

import { Router, type Response } from 'express';
import { body, query, param } from 'express-validator';
import { prisma } from '../lib/prisma';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import { handleValidation } from '../middleware/validate';

const router = Router();

// ─── POST /api/sessions/:id/review — submit review (Tasks 4 & 5) ─────────────
router.post(
  '/sessions/:id/review',
  requireAuth,
  [
    param('id').notEmpty(),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1–5'),
    body('comment').optional().trim(),
  ],
  handleValidation,
  async (req: AuthRequest, res: Response) => {
    const sessionId = req.params.id as string;
    const userId = req.user!.userId;
    const { rating, comment } = req.body as { rating: number; comment?: string };

    // Block practitioners from submitting reviews
    if (req.user!.practitionerId) {
      res.status(403).json({ success: false, message: 'Practitioners cannot submit reviews' });
      return;
    }

    try {
      // Fetch session to confirm it's completed and belongs to this user
      const session = await prisma.session.findFirst({
        where: { id: sessionId, userId, status: 'COMPLETED' },
        select: { id: true, practitionerId: true },
      });

      if (!session) {
        res.status(404).json({ success: false, message: 'Completed session not found' });
        return;
      }

      const { practitionerId } = session;

      // Task 5: Atomic transaction — upsert review + recalculate + update practitioner
      const { review, practitioner } = await prisma.$transaction(async (tx) => {
        // Upsert the Review row (one review per session)
        const review = await tx.review.upsert({
          where: { sessionId },
          create: {
            sessionId,
            userId,
            practitionerId,
            rating,
            ...(comment ? { comment } : {}),
          },
          update: {
            rating,
            ...(comment !== undefined ? { comment } : {}),
          },
        });

        // Recalculate aggregate rating within the same transaction
        const aggregate = await tx.review.aggregate({
          where: { practitionerId },
          _avg: { rating: true },
          _count: { rating: true },
        });

        const avgRating = aggregate._avg.rating ?? 0;
        const reviewCount = aggregate._count.rating;

        // Update the practitioner's denormalized stats
        const practitioner = await tx.practitioner.update({
          where: { id: practitionerId },
          data: {
            avgRating: Math.round(avgRating * 10) / 10,
            reviewCount,
          },
          select: { id: true, avgRating: true, reviewCount: true },
        });

        return { review, practitioner };
      });

      res.status(201).json({
        success: true,
        data: { review, practitionerStats: practitioner },
      });
    } catch (err: any) {
      console.error('Review submission error:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

// ─── GET /api/moderation/flagged — list flagged content (admin, Task 4) ──────
router.get(
  '/moderation/flagged',
  requireAuth,
  [
    query('status').optional().isIn(['PENDING', 'RESOLVED', 'DISMISSED']),
    query('source').optional().isIn(['CHAT', 'CALL_TRANSCRIPT']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  handleValidation,
  async (req: AuthRequest, res: Response) => {
    // Simple admin guard: only practitioners (or add an isAdmin flag later)
    // For now, require a practitioner token as a proxy for admin access.
    // TODO: replace with a proper isAdmin flag when role management is added.
    if (!req.user!.practitionerId) {
      res.status(403).json({ success: false, message: 'Admin access required' });
      return;
    }

    const status = req.query.status as string | undefined;
    const source = req.query.source as string | undefined;
    const page = parseInt(String(req.query.page ?? '1'));
    const limit = Math.min(parseInt(String(req.query.limit ?? '20')), 100);
    const skip = (page - 1) * limit;

    try {
      const where: Record<string, unknown> = {};
      if (status) where['status'] = status;
      if (source) where['source'] = source;

      const [items, total] = await Promise.all([
        prisma.flaggedContent.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.flaggedContent.count({ where }),
      ]);

      res.json({
        success: true,
        data: {
          items,
          pagination: { total, page, limit, pages: Math.ceil(total / limit) },
        },
      });
    } catch (err) {
      console.error('Moderation list error:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

// ─── PATCH /api/moderation/flagged/:id — resolve/dismiss a flag (admin, Task 4)
router.patch(
  '/moderation/flagged/:id',
  requireAuth,
  [
    param('id').notEmpty(),
    body('status').isIn(['RESOLVED', 'DISMISSED']).withMessage('Status must be RESOLVED or DISMISSED'),
  ],
  handleValidation,
  async (req: AuthRequest, res: Response) => {
    if (!req.user!.practitionerId) {
      res.status(403).json({ success: false, message: 'Admin access required' });
      return;
    }

    const flagId = req.params.id as string;
    const { status } = req.body as { status: 'RESOLVED' | 'DISMISSED' };

    try {
      const updated = await prisma.flaggedContent.update({
        where: { id: flagId },
        data: { status },
      });
      res.json({ success: true, data: { flaggedContent: updated } });
    } catch (err: any) {
      if (err.code === 'P2025') {
        res.status(404).json({ success: false, message: 'Flagged content not found' });
        return;
      }
      console.error('Moderation update error:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

export default router;
