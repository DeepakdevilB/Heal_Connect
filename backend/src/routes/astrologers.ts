import { Router, type Request, type Response } from 'express';
import { body } from 'express-validator';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../lib/prisma';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import { requireAstrologer, requireApprovedAstrologer } from '../middleware/astrologer';
import { handleValidation } from '../middleware/validate';
import { uploadProfilePhoto } from '../lib/azure';

const router = Router();

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type. Allowed: JPEG, PNG, WebP, PDF'));
  },
});

async function audit(profileId: string, actorId: string, action: string, req: Request, extra?: { previousState?: string; newState?: string }) {
  const data: Parameters<typeof prisma.astrologerAuditLog.create>[0]['data'] = {
    astrologerProfileId: profileId,
    actorId,
    actorType: 'ASTROLOGER',
    action,
    ipAddress: req.ip ?? null,
    userAgent: req.headers['user-agent'] ?? null,
  };
  if (extra?.previousState) data.previousState = extra.previousState;
  if (extra?.newState) data.newState = extra.newState;
  await prisma.astrologerAuditLog.create({ data }).catch(() => {});
}

// All routes require auth + astrologer role
router.use(requireAuth, requireAstrologer);

// ─── GET /api/astrologers/application/me ─────────────────────────────────────
router.get('/application/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const aid = req.user!.astrologerId as string;
  try {
    const profile = await prisma.astrologerProfile.findUnique({
      where: { id: aid },
      include: { application: true, kycVerification: true, professionalVerification: true },
    });
    if (!profile) { res.status(404).json({ success: false, message: 'Profile not found.' }); return; }
    res.json({ success: true, data: { profile } });
  } catch { res.status(500).json({ success: false, message: 'Internal server error.' }); }
});

// ─── POST /api/astrologers/application ───────────────────────────────────────
router.post(
  '/application',
  [
    body('fullLegalName').trim().notEmpty().withMessage('Full legal name required'),
    body('displayName').trim().notEmpty().withMessage('Display name required'),
  ],
  handleValidation,
  async (req: AuthRequest, res: Response) => {
    const aid = req.user!.astrologerId as string;
    try {
      const existing = await prisma.astrologerProfile.findUnique({ where: { id: aid } });
      if (existing && existing.applicationStatus !== 'DRAFT' && existing.applicationStatus !== 'PHONE_VERIFIED') {
        res.status(409).json({ success: false, message: 'Application already started.', code: 'APPLICATION_EXISTS' });
        return;
      }
      const { fullLegalName, displayName, dateOfBirth, gender, country, state, city } = req.body;
      const updateData: Parameters<typeof prisma.astrologerProfile.update>[0]['data'] = {
        fullLegalName,
        displayName,
        gender: gender ?? null,
        country: country ?? 'India',
        state: state ?? null,
        city: city ?? null,
        applicationStatus: 'PROFILE_INCOMPLETE',
        application: { upsert: { create: { step: 1, lastSavedAt: new Date() }, update: { step: 1, lastSavedAt: new Date() } } },
      };
      if (dateOfBirth) updateData.dateOfBirth = new Date(dateOfBirth);
      const profile = await prisma.astrologerProfile.update({ where: { id: aid }, data: updateData, include: { application: true } });
      await audit(profile.id, req.user!.userId, 'APPLICATION_STARTED', req);
      res.status(201).json({ success: true, data: { profile } });
    } catch (err) {
      console.error('Create application error:', err);
      res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  }
);

// ─── PUT /api/astrologers/application/me ─────────────────────────────────────
router.put('/application/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const aid = req.user!.astrologerId as string;
  try {
    const current = await prisma.astrologerProfile.findUnique({ where: { id: aid } });
    if (!current) { res.status(404).json({ success: false, message: 'Profile not found.' }); return; }

    const {
      fullLegalName, displayName, dateOfBirth, gender, country, state, city,
      specializations, languages, astrologyExperienceYears, professionalConsultationYears,
      previousPlatformExperience, professionalBio, consultationApproach,
      completedAstrologyCourse, instituteName, courseName, completionYear, step,
    } = req.body;

    const fl = fullLegalName ?? current.fullLegalName;
    const dn = displayName ?? current.displayName;
    const sp = specializations ?? current.specializations;
    const la = languages ?? current.languages;
    const exp = astrologyExperienceYears !== undefined ? Number(astrologyExperienceYears) : current.astrologyExperienceYears;
    const bio = professionalBio ?? current.professionalBio;

    const isComplete = !!(fl?.trim() && dn?.trim() && sp?.length > 0 && la?.length > 0 && exp >= 0 && bio?.trim());
    const editableStatuses = ['DRAFT', 'PHONE_VERIFIED', 'PROFILE_INCOMPLETE', 'PROFILE_COMPLETED'];
    const newStatus = editableStatuses.includes(current.applicationStatus)
      ? (isComplete ? 'PROFILE_COMPLETED' : 'PROFILE_INCOMPLETE')
      : current.applicationStatus;

    const data: Parameters<typeof prisma.astrologerProfile.update>[0]['data'] = {
      applicationStatus: newStatus,
      application: { upsert: { create: { step: step ?? 1, lastSavedAt: new Date() }, update: { step: step ?? 1, lastSavedAt: new Date() } } },
    };
    if (fullLegalName !== undefined) data.fullLegalName = fullLegalName;
    if (displayName !== undefined) data.displayName = displayName;
    if (dateOfBirth !== undefined) data.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
    if (gender !== undefined) data.gender = gender;
    if (country !== undefined) data.country = country;
    if (state !== undefined) data.state = state;
    if (city !== undefined) data.city = city;
    if (specializations !== undefined) data.specializations = specializations;
    if (languages !== undefined) data.languages = languages;
    if (astrologyExperienceYears !== undefined) data.astrologyExperienceYears = Number(astrologyExperienceYears);
    if (professionalConsultationYears !== undefined) data.professionalConsultationYears = Number(professionalConsultationYears);
    if (previousPlatformExperience !== undefined) data.previousPlatformExperience = previousPlatformExperience;
    if (professionalBio !== undefined) data.professionalBio = professionalBio;
    if (consultationApproach !== undefined) data.consultationApproach = consultationApproach;
    if (completedAstrologyCourse !== undefined) data.completedAstrologyCourse = Boolean(completedAstrologyCourse);
    if (instituteName !== undefined) data.instituteName = instituteName;
    if (courseName !== undefined) data.courseName = courseName;
    if (completionYear !== undefined) data.completionYear = completionYear ? Number(completionYear) : null;

    const profile = await prisma.astrologerProfile.update({ where: { id: aid }, data, include: { application: true } });
    await audit(profile.id, req.user!.userId, 'APPLICATION_UPDATED', req, {
      previousState: JSON.stringify({ applicationStatus: current.applicationStatus }),
      newState: JSON.stringify({ applicationStatus: newStatus }),
    });
    res.json({ success: true, data: { profile } });
  } catch (err) {
    console.error('Update application error:', err);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// ─── GET /api/astrologers/me ──────────────────────────────────────────────────
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const aid = req.user!.astrologerId as string;
  try {
    const profile = await prisma.astrologerProfile.findUnique({
      where: { id: aid },
      include: {
        application: true,
        kycVerification: { select: { verificationStatus: true, submittedAt: true, verifiedAt: true } },
        professionalVerification: { select: { status: true, submittedAt: true, reviewedAt: true } },
      },
    });
    if (!profile) { res.status(404).json({ success: false, message: 'Profile not found.' }); return; }
    res.json({ success: true, data: { profile } });
  } catch { res.status(500).json({ success: false, message: 'Internal server error.' }); }
});

// ─── PUT /api/astrologers/me/profile ─────────────────────────────────────────
router.put('/me/profile', requireAuth, async (req: AuthRequest, res: Response) => {
  const aid = req.user!.astrologerId as string;
  try {
    const { displayName, professionalBio, consultationApproach, specializations, languages } = req.body;
    const data: Parameters<typeof prisma.astrologerProfile.update>[0]['data'] = {};
    if (displayName !== undefined) data.displayName = displayName;
    if (professionalBio !== undefined) data.professionalBio = professionalBio;
    if (consultationApproach !== undefined) data.consultationApproach = consultationApproach;
    if (specializations !== undefined) data.specializations = specializations;
    if (languages !== undefined) data.languages = languages;
    const profile = await prisma.astrologerProfile.update({ where: { id: aid }, data });
    await audit(profile.id, req.user!.userId, 'PROFILE_UPDATED', req);
    res.json({ success: true, data: { profile } });
  } catch { res.status(500).json({ success: false, message: 'Internal server error.' }); }
});

// ─── POST /api/astrologers/me/documents ──────────────────────────────────────
router.post(
  '/me/documents',
  requireAuth,
  upload.single('document'),
  [body('documentType').isIn(['CERTIFICATE', 'IDENTITY', 'PROFILE_PHOTO', 'WORK_SAMPLE', 'PLATFORM_PROFILE']).withMessage('Invalid document type')],
  handleValidation,
  async (req: AuthRequest, res: Response) => {
    const aid = req.user!.astrologerId as string;
    if (!req.file) { res.status(400).json({ success: false, message: 'No file uploaded.' }); return; }
    try {
      const { documentType } = req.body as { documentType: string };
      const isPublic = documentType === 'PROFILE_PHOTO';
      const folder = isPublic ? 'astrologer-photos' : 'astrologer-docs';
      const ext = path.extname(req.file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '');
      const storedName = `${uuidv4()}${ext}`;
      const blobUrl = await uploadProfilePhoto(req.file.buffer, req.file.mimetype, folder);
      const doc = await prisma.astrologerDocument.create({
        data: {
          astrologerProfileId: aid,
          documentType,
          originalName: req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_'),
          storedName,
          blobUrl,
          mimeType: req.file.mimetype,
          sizeBytes: req.file.size,
          isPrivate: !isPublic,
        },
      });
      if (documentType === 'PROFILE_PHOTO') {
        await prisma.astrologerProfile.update({ where: { id: aid }, data: { profilePhotoUrl: blobUrl } });
      }
      await audit(aid, req.user!.userId, 'DOCUMENT_UPLOADED', req, { newState: JSON.stringify({ documentType, storedName }) });
      res.status(201).json({
        success: true,
        data: {
          document: {
            id: doc.id, documentType: doc.documentType, originalName: doc.originalName,
            mimeType: doc.mimeType, sizeBytes: doc.sizeBytes, uploadedAt: doc.uploadedAt,
            ...(isPublic && { url: blobUrl }),
          },
        },
      });
    } catch (err) {
      console.error('Document upload error:', err);
      res.status(500).json({ success: false, message: 'Failed to upload document.' });
    }
  }
);

// ─── GET /api/astrologers/me/documents ───────────────────────────────────────
router.get('/me/documents', requireAuth, async (req: AuthRequest, res: Response) => {
  const aid = req.user!.astrologerId as string;
  try {
    const docs = await prisma.astrologerDocument.findMany({
      where: { astrologerProfileId: aid },
      select: { id: true, documentType: true, originalName: true, mimeType: true, sizeBytes: true, isPrivate: true, uploadedAt: true },
      orderBy: { uploadedAt: 'desc' },
    });
    res.json({ success: true, data: { documents: docs } });
  } catch { res.status(500).json({ success: false, message: 'Internal server error.' }); }
});

// ─── DELETE /api/astrologers/me/documents/:id ─────────────────────────────────
router.delete('/me/documents/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const aid = req.user!.astrologerId as string;
  try {
    const { id } = req.params as { id: string };
    // IDOR check: verify ownership before delete
    const doc = await prisma.astrologerDocument.findFirst({ where: { id, astrologerProfileId: aid } });
    if (!doc) { res.status(404).json({ success: false, message: 'Document not found.' }); return; }
    await prisma.astrologerDocument.delete({ where: { id } });
    await audit(aid, req.user!.userId, 'DOCUMENT_DELETED', req, { previousState: JSON.stringify({ documentType: doc.documentType }) });
    res.json({ success: true, message: 'Document deleted.' });
  } catch { res.status(500).json({ success: false, message: 'Internal server error.' }); }
});

// ─── POST /api/astrologers/me/verification/submit ────────────────────────────
router.post('/me/verification/submit', requireAuth, async (req: AuthRequest, res: Response) => {
  const aid = req.user!.astrologerId as string;
  try {
    const profile = await prisma.astrologerProfile.findUnique({ where: { id: aid }, include: { application: true } });
    if (!profile) { res.status(404).json({ success: false, message: 'Profile not found.' }); return; }

    if (!['PROFILE_COMPLETED', 'KYC_PENDING', 'PROFESSIONAL_REVIEW'].includes(profile.applicationStatus)) {
      res.status(400).json({ success: false, message: 'Complete your profile before submitting for verification.', code: 'PROFILE_INCOMPLETE' });
      return;
    }

    const { idDocType, panLast4, verificationType, platformProfileUrl, professionalWebsite, verificationNotes } = req.body;

    const kycCreate: Parameters<typeof prisma.astrologerKycVerification.upsert>[0]['create'] = {
      astrologerProfileId: aid,
      verificationStatus: 'SUBMITTED',
      submittedAt: new Date(),
    };
    const kycUpdate: Parameters<typeof prisma.astrologerKycVerification.upsert>[0]['update'] = {
      verificationStatus: 'SUBMITTED',
      submittedAt: new Date(),
    };
    if (idDocType) { kycCreate.idDocType = idDocType; kycUpdate.idDocType = idDocType; }
    if (panLast4) { kycCreate.panLast4 = panLast4; kycUpdate.panLast4 = panLast4; }

    await prisma.astrologerKycVerification.upsert({ where: { astrologerProfileId: aid }, create: kycCreate, update: kycUpdate });

    const pvCreate: Parameters<typeof prisma.astrologerProfessionalVerification.upsert>[0]['create'] = {
      astrologerProfileId: aid,
      status: 'SUBMITTED',
      submittedAt: new Date(),
    };
    const pvUpdate: Parameters<typeof prisma.astrologerProfessionalVerification.upsert>[0]['update'] = {
      status: 'SUBMITTED',
      submittedAt: new Date(),
    };
    if (verificationType) { pvCreate.verificationType = verificationType; pvUpdate.verificationType = verificationType; }
    if (platformProfileUrl) { pvCreate.platformProfileUrl = platformProfileUrl; pvUpdate.platformProfileUrl = platformProfileUrl; }
    if (professionalWebsite) { pvCreate.professionalWebsite = professionalWebsite; pvUpdate.professionalWebsite = professionalWebsite; }
    if (verificationNotes) { pvCreate.notes = verificationNotes; pvUpdate.notes = verificationNotes; }

    await prisma.astrologerProfessionalVerification.upsert({ where: { astrologerProfileId: aid }, create: pvCreate, update: pvUpdate });

    const updated = await prisma.astrologerProfile.update({
      where: { id: aid },
      data: { applicationStatus: 'ADMIN_REVIEW', application: { update: { submittedAt: new Date(), lastSavedAt: new Date() } } },
    });

    await audit(aid, req.user!.userId, 'APPLICATION_SUBMITTED', req, {
      previousState: JSON.stringify({ applicationStatus: profile.applicationStatus }),
      newState: JSON.stringify({ applicationStatus: 'ADMIN_REVIEW' }),
    });

    res.json({
      success: true,
      message: 'Your astrologer application is under review. We will notify you within 2-3 business days.',
      data: { applicationStatus: updated.applicationStatus },
    });
  } catch (err) {
    console.error('Verification submit error:', err);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// ─── GET /api/astrologers/me/verification/status ─────────────────────────────
router.get('/me/verification/status', requireAuth, async (req: AuthRequest, res: Response) => {
  const aid = req.user!.astrologerId as string;
  try {
    const profile = await prisma.astrologerProfile.findUnique({
      where: { id: aid },
      select: {
        applicationStatus: true, accountStatus: true,
        phoneVerified: true, emailVerified: true, identityVerified: true,
        professionalVerified: true, adminVerified: true,
        rejectionReason: true, approvedAt: true,
        kycVerification: { select: { verificationStatus: true, submittedAt: true, verifiedAt: true, failureReason: true } },
        professionalVerification: { select: { status: true, submittedAt: true, reviewedAt: true, rejectionReason: true } },
      },
    });
    if (!profile) { res.status(404).json({ success: false, message: 'Profile not found.' }); return; }
    res.json({ success: true, data: { verification: profile } });
  } catch { res.status(500).json({ success: false, message: 'Internal server error.' }); }
});

// ─── PUT /api/astrologers/me/pricing ─────────────────────────────────────────
router.put(
  '/me/pricing',
  requireApprovedAstrologer,
  [
    body('chatPricePerMin').isFloat({ min: 0 }).withMessage('Chat price must be >= 0'),
    body('callPricePerMin').isFloat({ min: 0 }).withMessage('Call price must be >= 0'),
  ],
  handleValidation,
  async (req: AuthRequest, res: Response) => {
    const aid = req.user!.astrologerId as string;
    try {
      const { chatPricePerMin, callPricePerMin } = req.body as { chatPricePerMin: number; callPricePerMin: number };
      const profile = await prisma.astrologerProfile.update({
        where: { id: aid },
        data: { chatPricePerMin, callPricePerMin },
        select: { id: true, chatPricePerMin: true, callPricePerMin: true },
      });
      await audit(profile.id, req.user!.userId, 'PRICING_UPDATED', req);
      res.json({ success: true, data: { pricing: profile } });
    } catch { res.status(500).json({ success: false, message: 'Internal server error.' }); }
  }
);

// ─── PUT /api/astrologers/me/availability ────────────────────────────────────
router.put('/me/availability', requireApprovedAstrologer, async (req: AuthRequest, res: Response) => {
  const aid = req.user!.astrologerId as string;
  try {
    const { isOnline, isChatAvailable, isCallAvailable } = req.body as { isOnline?: boolean; isChatAvailable?: boolean; isCallAvailable?: boolean };
    const data: Parameters<typeof prisma.astrologerProfile.update>[0]['data'] = {};
    if (isOnline !== undefined) data.isOnline = isOnline;
    if (isChatAvailable !== undefined) data.isChatAvailable = isChatAvailable;
    if (isCallAvailable !== undefined) data.isCallAvailable = isCallAvailable;
    const profile = await prisma.astrologerProfile.update({ where: { id: aid }, data, select: { id: true, isOnline: true, isChatAvailable: true, isCallAvailable: true } });
    res.json({ success: true, data: { availability: profile } });
  } catch { res.status(500).json({ success: false, message: 'Internal server error.' }); }
});

// ─── GET /api/astrologers/me/dashboard ───────────────────────────────────────
router.get('/me/dashboard', requireApprovedAstrologer, async (req: AuthRequest, res: Response) => {
  const aid = req.user!.astrologerId as string;
  try {
    const profile = await prisma.astrologerProfile.findUnique({
      where: { id: aid },
      select: {
        id: true, displayName: true, profilePhotoUrl: true, specializations: true, languages: true,
        chatPricePerMin: true, callPricePerMin: true, isOnline: true, isChatAvailable: true, isCallAvailable: true,
        avgRating: true, reviewCount: true, totalConsultations: true, totalEarnings: true,
        applicationStatus: true, accountStatus: true,
        phoneVerified: true, emailVerified: true, identityVerified: true, professionalVerified: true, adminVerified: true,
      },
    });
    if (!profile) { res.status(404).json({ success: false, message: 'Profile not found.' }); return; }
    res.json({ success: true, data: { dashboard: profile } });
  } catch { res.status(500).json({ success: false, message: 'Internal server error.' }); }
});

// ─── GET /api/astrologers/public ─────────────────────────────────────────────
router.get('/public', async (req: Request, res: Response) => {
  try {
    const { search, specialization, language, page = '1', limit = '20' } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const where: { applicationStatus: string; accountStatus: string; identityVerified: boolean; professionalVerified: boolean; adminVerified: boolean; OR?: object[]; specializations?: object; languages?: object } = {
      applicationStatus: 'APPROVED', accountStatus: 'ACTIVE',
      identityVerified: true, professionalVerified: true, adminVerified: true,
    };
    if (search) where.OR = [{ displayName: { contains: search, mode: 'insensitive' } }, { professionalBio: { contains: search, mode: 'insensitive' } }];
    if (specialization) where.specializations = { has: specialization };
    if (language) where.languages = { has: language };
    const [astrologers, total] = await Promise.all([
      prisma.astrologerProfile.findMany({
        where, skip: (pageNum - 1) * limitNum, take: limitNum, orderBy: { avgRating: 'desc' },
        select: {
          id: true, displayName: true, profilePhotoUrl: true, specializations: true, languages: true,
          astrologyExperienceYears: true, professionalBio: true, chatPricePerMin: true, callPricePerMin: true,
          isOnline: true, isChatAvailable: true, isCallAvailable: true,
          avgRating: true, reviewCount: true, totalConsultations: true, adminVerified: true,
        },
      }),
      prisma.astrologerProfile.count({ where }),
    ]);
    res.json({ success: true, data: { astrologers, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } } });
  } catch { res.status(500).json({ success: false, message: 'Internal server error.' }); }
});

// ─── GET /api/astrologers/public/:id ─────────────────────────────────────────
router.get('/public/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const profile = await prisma.astrologerProfile.findFirst({
      where: { id, applicationStatus: 'APPROVED', accountStatus: 'ACTIVE', adminVerified: true },
      select: {
        id: true, displayName: true, profilePhotoUrl: true, specializations: true, languages: true,
        astrologyExperienceYears: true, professionalBio: true, consultationApproach: true,
        chatPricePerMin: true, callPricePerMin: true, isOnline: true, isChatAvailable: true, isCallAvailable: true,
        avgRating: true, reviewCount: true, totalConsultations: true, adminVerified: true, country: true, city: true,
      },
    });
    if (!profile) { res.status(404).json({ success: false, message: 'Astrologer not found.' }); return; }
    res.json({ success: true, data: { astrologer: profile } });
  } catch { res.status(500).json({ success: false, message: 'Internal server error.' }); }
});

export default router;
