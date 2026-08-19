/**
 * Reviews router.
 *
 * POST /api/sessions/:id/review  — submit a rating/review for a completed session.
 *   Atomically updates the practitioner's avgRating and reviewCount in the same
 *   DB transaction to prevent read-then-write races.
 *
 * This file used to also own GET/PATCH /api/moderation/flagged — removed
 * 2026-08-17. That pair only checked `req.user.practitionerId` as an "admin"
 * proxy (a self-documented TODO in the code), which meant any practitioner
 * token — including the flagged practitioner's own — could list and dismiss
 * moderation flags against themselves. It had zero real callers (the actual
 * admin moderation UI, web/src/app/admin/moderation/page.tsx, has always used
 * the separately and correctly `requireAdmin`-gated GET/PATCH
 * /api/admin/moderation in admin.ts instead) — a dead, insecure duplicate of
 * a system that already existed correctly elsewhere, so it was deleted rather
 * than patched. See web/src/lib/api.ts — the matching unused `moderationApi`
 * export was removed in the same pass.
 */

import { Router, type Response } from 'express';
import { body, param } from 'express-validator';
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
        where: { id: sessionId, userId, status: { in: ['COMPLETED', 'DISCONNECTED'] } },
        select: { id: true, practitionerId: true },
      });

      if (!session) {
        res.status(404).json({ success: false, message: 'No completed session found for this practitioner' });
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

export default router;
