import { Router, type Request, type Response } from 'express';
import { body, query } from 'express-validator';
import multer from 'multer';
import { prisma } from '../lib/prisma';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import { handleValidation } from '../middleware/validate';
import { uploadProfilePhoto, deleteProfilePhoto } from '../lib/azure';

interface MulterRequest extends AuthRequest {
  file?: Express.Multer.File | undefined;
}

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

function getParam(req: Request, key: string): string | undefined {
  const val = req.params[key];
  return Array.isArray(val) ? val[0] : val;
}

function getQuery(req: Request, key: string): string | undefined {
  const val = req.query[key];
  if (Array.isArray(val)) return String(val[0]);
  if (val == null) return undefined;
  return String(val);
}

// POST /api/practitioners/dev/verify (Temporary)
router.post('/dev/verify', async (req: Request, res: Response) => {
  try {
    const result = await prisma.practitioner.updateMany({
      data: { isVerified: true }
    });
    res.json({ success: true, message: `Successfully verified ${result.count} practitioners.` });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/practitioners
router.get(
  '/',
  [
    query('specialty').optional().trim(),
    query('language').optional().trim(),
    query('minRating').optional().isFloat({ min: 0, max: 5 }),
    query('maxRate').optional().isFloat({ min: 0 }),
    query('onlineOnly').optional().isBoolean(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('search').optional().trim(),
  ],
  handleValidation,
  async (req: Request, res: Response) => {
    const specialty = getQuery(req, 'specialty');
    const language = getQuery(req, 'language');
    const minRating = getQuery(req, 'minRating');
    const maxRate = getQuery(req, 'maxRate');
    const onlineOnly = getQuery(req, 'onlineOnly');
    const page = getQuery(req, 'page') ?? '1';
    const limit = getQuery(req, 'limit') ?? '20';
    const search = getQuery(req, 'search');

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    try {
      const where: Record<string, unknown> = { isVerified: true };
      if (specialty != null) where['specialties'] = { has: specialty };
      if (language != null) where['languages'] = { has: language };
      if (maxRate != null) where['perMinuteRate'] = { lte: parseFloat(maxRate) };
      if (onlineOnly === 'true') where['isOnline'] = true;
      if (search != null) {
        where['OR'] = [
          { name: { contains: search, mode: 'insensitive' } },
          { bio: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [practitioners, total] = await Promise.all([
        prisma.practitioner.findMany({
          where,
          skip,
          take,
          select: {
            id: true, name: true, bio: true, specialties: true, languages: true,
            certifications: true, experienceYrs: true, perMinuteRate: true,
            photoUrl: true, isVerified: true, isOnline: true, isBusy: true,
            reviews: { select: { rating: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.practitioner.count({ where }),
      ]);

      const minR = minRating != null ? parseFloat(minRating) : 0;
      const result = practitioners
        .map((p) => {
          const ratings = p.reviews.map((r) => r.rating);
          const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
          const reviewCount = ratings.length;
          const { reviews: _r, ...rest } = p;
          return { ...rest, avgRating: Math.round(avgRating * 10) / 10, reviewCount };
        })
        .filter((p) => p.avgRating >= minR);

      res.json({
        success: true,
        data: {
          practitioners: result,
          pagination: { total, page: parseInt(page), limit: take, pages: Math.ceil(total / take) },
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

// ─── GDPR: Data Export (Right to Access / Portability) ───────────────────────
// GET /api/practitioners/me/export — mirrors the user-side export in users.ts.
// IMPORTANT: This MUST be registered before GET /:id or Express will match
// "me" as the :id param and return 404 before reaching this handler.
router.get('/me/export', requireAuth, async (req: AuthRequest, res: Response) => {
  const practitionerId = req.user!.practitionerId;
  if (!practitionerId) {
    res.status(403).json({ success: false, message: 'This endpoint is for practitioner accounts' });
    return;
  }
  try {
    const [practitioner, sessions, reviews, tickets, consents] = await Promise.all([
      prisma.practitioner.findUnique({
        where: { id: practitionerId },
        select: {
          id: true, email: true, phone: true, name: true, bio: true, specialties: true,
          certifications: true, languages: true, experienceYrs: true, perMinuteRate: true,
          photoUrl: true, isVerified: true, avgRating: true, reviewCount: true,
          createdAt: true, updatedAt: true,
        },
      }),
      prisma.session.findMany({
        where: { practitionerId },
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true } },
          review: true,
          transcript: { select: { transcriptText: true, purgedAt: true, submittedAt: true } },
          messages: { orderBy: { createdAt: 'asc' } },
        },
      }),
      prisma.review.findMany({ where: { practitionerId }, orderBy: { createdAt: 'desc' } }),
      prisma.supportTicket.findMany({
        where: { practitionerId },
        orderBy: { createdAt: 'desc' },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      }),
      prisma.consent.findMany({ where: { practitionerId }, orderBy: { createdAt: 'desc' } }),
    ]);

    if (!practitioner) { res.status(404).json({ success: false, message: 'Practitioner not found' }); return; }

    await prisma.privacyRequestLog.create({
      data: { subjectType: 'PRACTITIONER', subjectId: practitionerId, type: 'EXPORT', ipAddress: req.ip ?? null },
    });

    res.json({
      success: true,
      data: {
        exportedAt: new Date().toISOString(),
        profile: practitioner,
        sessions,
        reviews,
        supportTickets: tickets,
        consentHistory: consents,
      },
    });
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/practitioners/:id
router.get('/:id', async (req: Request, res: Response) => {
  const id = getParam(req, 'id');
  if (!id) { res.status(400).json({ success: false, message: 'Missing id' }); return; }
  try {
    const p = await prisma.practitioner.findUnique({
      where: { id },
      select: {
        id: true, name: true, bio: true, specialties: true, languages: true,
        certifications: true, experienceYrs: true, perMinuteRate: true,
        photoUrl: true, isVerified: true, isOnline: true, isBusy: true, email: true, phone: true,
        reviews: {
          select: {
            id: true, rating: true, comment: true, createdAt: true,
            user: { select: { name: true, photoUrl: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!p) { res.status(404).json({ success: false, message: 'Practitioner not found' }); return; }

    const ratings = p.reviews.map((r) => r.rating);
    const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

    res.json({
      success: true,
      data: { practitioner: { ...p, avgRating: Math.round(avgRating * 10) / 10, reviewCount: ratings.length } },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/practitioners
router.post(
  '/',
  [
    body('name').trim().notEmpty(),
    body('email').optional().isEmail().normalizeEmail(),
    body('bio').optional().trim(),
    body('specialties').optional().isArray(),
    body('certifications').optional().isArray(),
    body('languages').optional().isArray(),
    body('experienceYrs').optional().isInt({ min: 0 }),
    body('perMinuteRate').optional().isFloat({ min: 0 }),
  ],
  handleValidation,
  async (req: Request, res: Response) => {
    const { name, email, bio, specialties, certifications, languages, experienceYrs, perMinuteRate } =
      req.body as {
        name: string; email?: string; bio?: string; specialties?: string[];
        certifications?: string[]; languages?: string[];
        experienceYrs?: number; perMinuteRate?: number;
      };

    try {
      const practitioner = await prisma.practitioner.create({
        data: {
          name,
          ...(email != null ? { email } : {}),
          ...(bio != null ? { bio } : {}),
          specialties: specialties ?? [],
          certifications: certifications ?? [],
          languages: languages ?? [],
          experienceYrs: experienceYrs ?? 0,
          perMinuteRate: perMinuteRate ?? 0,
        },
      });
      res.status(201).json({ success: true, data: { practitioner } });
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e.code === 'P2002') { res.status(409).json({ success: false, message: 'Email already registered' }); return; }
      console.error(err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

// PATCH /api/practitioners/:id
router.patch(
  '/:id',
  requireAuth,
  [
    body('name').optional().trim().notEmpty(),
    body('bio').optional().trim(),
    body('specialties').optional().isArray(),
    body('certifications').optional().isArray(),
    body('languages').optional().isArray(),
    body('experienceYrs').optional().isInt({ min: 0 }),
    body('perMinuteRate').optional().isFloat({ min: 0 }),
  ],
  handleValidation,
  async (req: AuthRequest, res: Response) => {
    const id = getParam(req, 'id');
    if (!id) { res.status(400).json({ success: false, message: 'Missing id' }); return; }

    const { name, bio, specialties, certifications, languages, experienceYrs, perMinuteRate } =
      req.body as {
        name?: string; bio?: string; specialties?: string[];
        certifications?: string[]; languages?: string[];
        experienceYrs?: number; perMinuteRate?: number;
      };

    try {
      const data: Parameters<typeof prisma.practitioner.update>[0]['data'] = {};
      if (name != null) data.name = name;
      if (bio != null) data.bio = bio;
      if (specialties != null) data.specialties = { set: specialties };
      if (certifications != null) data.certifications = { set: certifications };
      if (languages != null) data.languages = { set: languages };
      if (experienceYrs != null) data.experienceYrs = experienceYrs;
      if (perMinuteRate != null) data.perMinuteRate = perMinuteRate;

      const practitioner = await prisma.practitioner.update({ where: { id }, data });
      res.json({ success: true, data: { practitioner } });
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e.code === 'P2025') { res.status(404).json({ success: false, message: 'Practitioner not found' }); return; }
      console.error(err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

// POST /api/practitioners/:id/photo
router.post(
  '/:id/photo',
  requireAuth,
  upload.single('photo'),
  async (req: MulterRequest, res: Response) => {
    if (!req.file) { res.status(400).json({ success: false, message: 'No file uploaded' }); return; }

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(req.file.mimetype)) {
      res.status(400).json({ success: false, message: 'Only JPEG, PNG, or WebP allowed' });
      return;
    }

    const id = getParam(req, 'id');
    if (!id) { res.status(400).json({ success: false, message: 'Missing id' }); return; }

    try {
      const existing = await prisma.practitioner.findUnique({ where: { id }, select: { photoUrl: true } });
      if (!existing) { res.status(404).json({ success: false, message: 'Practitioner not found' }); return; }

      if (existing.photoUrl) await deleteProfilePhoto(existing.photoUrl);

      const photoUrl = await uploadProfilePhoto(req.file.buffer, req.file.mimetype, 'practitioners');
      await prisma.practitioner.update({ where: { id }, data: { photoUrl } });

      res.json({ success: true, data: { photoUrl } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Photo upload failed' });
    }
  }
);

// PATCH /api/practitioners/:id/availability
router.patch('/:id/availability', requireAuth, async (req: AuthRequest, res: Response) => {
  const { isOnline } = req.body as { isOnline: boolean };
  if (typeof isOnline !== 'boolean') {
    res.status(400).json({ success: false, message: 'isOnline (boolean) required' });
    return;
  }
  const id = getParam(req, 'id');
  if (!id) { res.status(400).json({ success: false, message: 'Missing id' }); return; }
  try {
    await prisma.practitioner.update({ where: { id }, data: { isOnline } });
    
    // Broadcast status to all connected clients
    import('../lib/socket').then(({ getIO }) => {
      const io = getIO();
      if (io) {
        io.emit('practitioner_status', { practitionerId: id, isOnline });
      }
    });

    res.json({ success: true, data: { isOnline } });
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === 'P2025') { res.status(404).json({ success: false, message: 'Practitioner not found' }); return; }
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/practitioners/:id/reviews
router.post(
  '/:id/reviews',
  requireAuth,
  [
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1–5'),
    body('comment').optional().trim().isLength({ max: 1000 }),
    body('sessionId').notEmpty().withMessage('sessionId required'),
  ],
  handleValidation,
  async (req: AuthRequest, res: Response) => {
    const practitionerId = getParam(req, 'id');
    if (!practitionerId) { res.status(400).json({ success: false, message: 'Missing id' }); return; }

    // Only users (not practitioners) can leave reviews
    if (req.user!.practitionerId) {
      res.status(403).json({ success: false, message: 'Practitioners cannot leave reviews' });
      return;
    }

    const userId = req.user!.userId;
    const { rating, comment, sessionId } = req.body as { rating: number; comment?: string; sessionId: string };

    try {
      // Verify the session exists, belongs to this user, and is completed
      const session = await prisma.session.findFirst({
        where: { id: sessionId, userId, practitionerId, status: 'COMPLETED' },
      });
      if (!session) {
        res.status(400).json({ success: false, message: 'No completed session found for this practitioner' });
        return;
      }

      // One review per session
      const existing = await prisma.review.findFirst({ where: { sessionId } });
      if (existing) {
        res.status(409).json({ success: false, message: 'Review already submitted for this session' });
        return;
      }

      const review = await prisma.review.create({
        data: { userId, practitionerId, sessionId, rating, comment: comment ?? null },
        include: { user: { select: { name: true, photoUrl: true } } },
      });

      res.status(201).json({ success: true, data: { review } });
    } catch (err) {
      console.error('Review error:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

// ─── GDPR: Erasure (Right to be Forgotten) ────────────────────────────────────
// /me/export was moved before /:id above. Only the DELETE erasure handler lives here.

// DELETE /api/practitioners/:id
// GDPR erasure for practitioners. Restricted to the practitioner's own account —
// previously this route had NO ownership check at all (any authenticated user or
// practitioner could delete any practitioner by ID), which is a separate, serious
// pre-existing bug fixed here as part of tightening this same handler. Admins use
// the dedicated DELETE /api/admin/practitioners/:id route, which is unaffected.
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const id = getParam(req, 'id');
  if (!id) { res.status(400).json({ success: false, message: 'Missing id' }); return; }
  if (req.user!.practitionerId !== id) {
    res.status(403).json({ success: false, message: 'You can only delete your own account' });
    return;
  }
  try {
    const p = await prisma.practitioner.findUnique({ where: { id }, select: { photoUrl: true, erasedAt: true } });
    if (!p) { res.status(404).json({ success: false, message: 'Practitioner not found' }); return; }
    if (p.erasedAt) {
      res.status(410).json({ success: false, message: 'Account already erased' });
      return;
    }

    if (p.photoUrl) await deleteProfilePhoto(p.photoUrl).catch(() => {});

    const sessions = await prisma.session.findMany({ where: { practitionerId: id }, select: { id: true } });
    const sessionIds = sessions.map((s) => s.id);

    if (sessionIds.length > 0) {
      const heldChat = await prisma.flaggedContent.findMany({
        where: { sessionId: { in: sessionIds }, status: 'PENDING', source: 'CHAT' },
        select: { chatMessageId: true },
      });
      const heldChatIds = new Set(
        heldChat.map((h) => h.chatMessageId).filter((cid): cid is string => cid !== null)
      );

      await prisma.chatMessage.updateMany({
        where: { sessionId: { in: sessionIds }, purgedAt: null, id: { notIn: [...heldChatIds] } },
        data: { content: '[Removed — account erased]', purgedAt: new Date() },
      });

      const heldTranscripts = await prisma.flaggedContent.findMany({
        where: { sessionId: { in: sessionIds }, status: 'PENDING', source: 'CALL_TRANSCRIPT' },
        select: { transcriptId: true },
      });
      const heldTranscriptIds = new Set(
        heldTranscripts.map((h) => h.transcriptId).filter((tid): tid is string => tid !== null)
      );

      await prisma.callTranscript.updateMany({
        where: { sessionId: { in: sessionIds }, purgedAt: null, id: { notIn: [...heldTranscriptIds] } },
        data: { transcriptText: '[Removed — account erased]', purgedAt: new Date() },
      });
    }

    await prisma.review.updateMany({ where: { practitionerId: id }, data: { comment: null } });
    await prisma.supportTicket.deleteMany({ where: { practitionerId: id } });

    await prisma.practitioner.update({
      where: { id },
      data: {
        name: 'Deleted Practitioner',
        email: null,
        phone: null,
        passwordHash: `erased:${Date.now()}:${Math.random().toString(36).slice(2)}`,
        bio: null,
        specialties: { set: [] },
        certifications: { set: [] },
        photoUrl: null,
        isOnline: false,
        erasedAt: new Date(),
      },
    });

    await prisma.privacyRequestLog.create({
      data: { subjectType: 'PRACTITIONER', subjectId: id, type: 'ERASURE', ipAddress: req.ip ?? null },
    });

    res.json({ success: true, message: 'Account erased' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
