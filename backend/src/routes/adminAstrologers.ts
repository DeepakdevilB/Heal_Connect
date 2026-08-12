/**
 * /api/admin/astrologers — Admin management of astrologer applications.
 * Protected by existing x-admin-key middleware in admin.ts.
 * This file exports a sub-router to be mounted inside admin.ts.
 */
import { Router, type Request, type Response } from 'express';
import { body } from 'express-validator';
import { prisma } from '../lib/prisma';
import { handleValidation } from '../middleware/validate';
import { canGoLiveAsAstrologer } from '../middleware/astrologer';

const router = Router();

// ─── Audit helper ─────────────────────────────────────────────────────────────
async function adminAudit(
  astrologerProfileId: string,
  adminId: string,
  action: string,
  req: Request,
  extra?: { reason?: string | undefined; notes?: string | undefined; previousStatus?: string | undefined; newStatus?: string | undefined }
) {
  const { reason, notes, previousStatus, newStatus } = extra ?? {};
  const reviewData: Parameters<typeof prisma.astrologerAdminReview.create>[0]['data'] = {
    astrologerProfileId, adminId, action,
    ...(reason && { reason }),
    ...(notes && { notes }),
    ...(previousStatus && { previousStatus }),
    ...(newStatus && { newStatus }),
  };

  const logData: Parameters<typeof prisma.astrologerAuditLog.create>[0]['data'] = {
    astrologerProfileId,
    actorId: adminId,
    actorType: 'ADMIN',
    action,
    ipAddress: req.ip ?? null,
    userAgent: req.headers['user-agent'] ?? null,
    ...(previousStatus && { previousState: JSON.stringify({ applicationStatus: previousStatus }) }),
    ...(newStatus && { newState: JSON.stringify({ applicationStatus: newStatus }) }),
  };

  await Promise.all([
    prisma.astrologerAdminReview.create({ data: reviewData }),
    prisma.astrologerAuditLog.create({ data: logData }),
  ]).catch(() => {});
}

// ─── GET /api/admin/astrologers ───────────────────────────────────────────────
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      status, search,
      page = '1', limit = '20',
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    const where: any = {};
    if (status) where.applicationStatus = status;
    if (search) {
      where.OR = [
        { displayName: { contains: search, mode: 'insensitive' } },
        { fullLegalName: { contains: search, mode: 'insensitive' } },
        { user: { phone: { contains: search } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [astrologers, total] = await Promise.all([
      prisma.astrologerProfile.findMany({
        where,
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          displayName: true,
          fullLegalName: true,
          profilePhotoUrl: true,
          specializations: true,
          languages: true,
          astrologyExperienceYears: true,
          applicationStatus: true,
          accountStatus: true,
          phoneVerified: true,
          emailVerified: true,
          identityVerified: true,
          professionalVerified: true,
          adminVerified: true,
          createdAt: true,
          updatedAt: true,
          user: { select: { phone: true, email: true } },
          application: { select: { submittedAt: true, step: true } },
          kycVerification: { select: { verificationStatus: true } },
          professionalVerification: { select: { status: true } },
        },
      }),
      prisma.astrologerProfile.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        astrologers,
        pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
      },
    });
  } catch (err) {
    console.error('Admin astrologers list error:', err);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// ─── GET /api/admin/astrologers/:id ──────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const profile = await prisma.astrologerProfile.findUnique({
      where: { id },
      include: {
        user: { select: { phone: true, email: true, createdAt: true } },
        application: true,
        documents: {
          select: { id: true, documentType: true, originalName: true, blobUrl: true, mimeType: true, sizeBytes: true, isPrivate: true, uploadedAt: true },
        },
        kycVerification: true,
        professionalVerification: true,
        interviewVerification: true,
        adminReviews: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!profile) { res.status(404).json({ success: false, message: 'Astrologer not found.' }); return; }

    // Compute live eligibility
    const liveEligible = canGoLiveAsAstrologer(profile);

    res.json({ success: true, data: { profile, liveEligible } });
  } catch (err) {
    console.error('Admin astrologer detail error:', err);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// ─── POST /api/admin/astrologers/:id/approve ─────────────────────────────────
router.post(
  '/:id/approve',
  [body('notes').optional().isString()],
  handleValidation,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const { notes } = req.body as { notes?: string };
      const adminId = 'admin';

      const profile = await prisma.astrologerProfile.findUnique({ where: { id } });
      if (!profile) { res.status(404).json({ success: false, message: 'Astrologer not found.' }); return; }

      const updated = await prisma.astrologerProfile.update({
        where: { id },
        data: {
          applicationStatus: 'APPROVED',
          accountStatus: 'ACTIVE',
          adminVerified: true,
          approvedAt: new Date(),
          approvedBy: adminId,
          rejectionReason: null,
        },
      });

      await adminAudit(id, adminId, 'APPROVE', req, {
        notes,
        previousStatus: profile.applicationStatus,
        newStatus: 'APPROVED',
      });

      res.json({ success: true, message: 'Astrologer approved.', data: { applicationStatus: updated.applicationStatus } });
    } catch (err) {
      console.error('Admin approve error:', err);
      res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  }
);

// ─── POST /api/admin/astrologers/:id/reject ───────────────────────────────────
router.post(
  '/:id/reject',
  [body('reason').trim().notEmpty().withMessage('Rejection reason is required')],
  handleValidation,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const { reason, notes } = req.body as { reason: string; notes?: string };
      const adminId = 'admin';

      const profile = await prisma.astrologerProfile.findUnique({ where: { id } });
      if (!profile) { res.status(404).json({ success: false, message: 'Astrologer not found.' }); return; }

      const updated = await prisma.astrologerProfile.update({
        where: { id },
        data: {
          applicationStatus: 'REJECTED',
          accountStatus: 'INACTIVE',
          adminVerified: false,
          rejectionReason: reason,
        },
      });

      await adminAudit(id, adminId, 'REJECT', req, {
        reason,
        notes,
        previousStatus: profile.applicationStatus,
        newStatus: 'REJECTED',
      });

      res.json({ success: true, message: 'Astrologer rejected.', data: { applicationStatus: updated.applicationStatus } });
    } catch (err) {
      console.error('Admin reject error:', err);
      res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  }
);

// ─── POST /api/admin/astrologers/:id/request-information ─────────────────────
router.post(
  '/:id/request-information',
  [body('notes').trim().notEmpty().withMessage('Notes are required to request information')],
  handleValidation,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const { notes } = req.body as { notes: string };
      const adminId = 'admin';

      const profile = await prisma.astrologerProfile.findUnique({ where: { id } });
      if (!profile) { res.status(404).json({ success: false, message: 'Astrologer not found.' }); return; }

      await adminAudit(id, adminId, 'REQUEST_INFO', req, {
        notes,
        previousStatus: profile.applicationStatus,
        newStatus: profile.applicationStatus,
      });

      res.json({ success: true, message: 'Information request recorded.' });
    } catch (err) {
      console.error('Admin request-info error:', err);
      res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  }
);

// ─── POST /api/admin/astrologers/:id/suspend ─────────────────────────────────
router.post(
  '/:id/suspend',
  [body('reason').trim().notEmpty().withMessage('Suspension reason is required')],
  handleValidation,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const { reason, notes } = req.body as { reason: string; notes?: string };
      const adminId = 'admin';

      const profile = await prisma.astrologerProfile.findUnique({ where: { id } });
      if (!profile) { res.status(404).json({ success: false, message: 'Astrologer not found.' }); return; }

      const updated = await prisma.astrologerProfile.update({
        where: { id },
        data: { applicationStatus: 'SUSPENDED', accountStatus: 'SUSPENDED', suspensionReason: reason },
      });

      await adminAudit(id, adminId, 'SUSPEND', req, {
        reason,
        notes,
        previousStatus: profile.applicationStatus,
        newStatus: 'SUSPENDED',
      });

      res.json({ success: true, message: 'Astrologer suspended.', data: { applicationStatus: updated.applicationStatus } });
    } catch (err) {
      console.error('Admin suspend error:', err);
      res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  }
);

// ─── POST /api/admin/astrologers/:id/block ────────────────────────────────────
router.post(
  '/:id/block',
  [body('reason').trim().notEmpty().withMessage('Block reason is required')],
  handleValidation,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const { reason, notes } = req.body as { reason: string; notes?: string };
      const adminId = 'admin';

      const profile = await prisma.astrologerProfile.findUnique({ where: { id } });
      if (!profile) { res.status(404).json({ success: false, message: 'Astrologer not found.' }); return; }

      const updated = await prisma.astrologerProfile.update({
        where: { id },
        data: { applicationStatus: 'BLOCKED', accountStatus: 'BLOCKED', suspensionReason: reason },
      });

      await adminAudit(id, adminId, 'BLOCK', req, {
        reason,
        notes,
        previousStatus: profile.applicationStatus,
        newStatus: 'BLOCKED',
      });

      res.json({ success: true, message: 'Astrologer blocked.', data: { applicationStatus: updated.applicationStatus } });
    } catch (err) {
      console.error('Admin block error:', err);
      res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  }
);

export default router;
