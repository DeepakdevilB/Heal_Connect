/**
 * /api/auth/astrologer — Passwordless mobile OTP auth for astrologers.
 * Reuses existing sms.ts (MSG91/Twilio), jwt.ts, redis.ts infrastructure.
 * Never returns OTP in response. Never logs plaintext OTP.
 */
import { Router, type Request, type Response } from 'express';
import { body } from 'express-validator';
import { prisma } from '../lib/prisma';
import { sendOtpSms, verifyOtpSms, isOtpConfigured } from '../lib/sms';
import {
  signAccessToken,
  signRefreshToken,
  getRefreshTokenExpiry,
} from '../lib/jwt';
import { blacklistToken } from '../lib/redis';
import { handleValidation } from '../middleware/validate';
import { authLimiter, emailLimiter } from '../middleware/rateLimiter';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import multer from 'multer';
import { uploadProfilePhoto } from '../lib/azure';

const router = Router();

const OTP_EXPIRY_MS = 10 * 60 * 1000;       // 10 minutes
const OTP_MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;        // 1 minute

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ─── POST /api/auth/astrologer/register ──────────────────────────────────────
router.post(
  '/register',
  upload.fields([{ name: 'kycDocument', maxCount: 1 }, { name: 'certificates', maxCount: 5 }]),
  [
    body('email').trim().isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('name').trim().notEmpty().withMessage('Name is required'),
  ],
  handleValidation,
  async (req: Request, res: Response) => {
    const { email, password, name } = req.body as { email: string; password: string; name: string };
    try {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        res.status(409).json({ success: false, message: 'An account with this email already exists.', code: 'EMAIL_EXISTS' });
        return;
      }

      const bcrypt = await import('bcryptjs');
      const passwordHash = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          name,
          provider: 'email',
          isEmailVerified: false,
          wallet: { create: { balance: 0 } },
        },
      });

      let kycDocumentUrl = null;
      let certificateUrls: string[] = [];
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      if (files?.kycDocument?.[0]) {
        const file = files.kycDocument[0];
        kycDocumentUrl = await uploadProfilePhoto(file.buffer, file.mimetype, 'astrologer-docs');
      }
      
      if (files?.certificates?.length) {
        certificateUrls = await Promise.all(
          files.certificates.map(file => uploadProfilePhoto(file.buffer, file.mimetype, 'astrologer-docs'))
        );
      }

      const profile = await prisma.astrologerProfile.create({
        data: {
          userId: user.id,
          fullLegalName: name,
          displayName: name,
          applicationStatus: 'DRAFT',
          application: { create: { step: 1 } },
          documents: {
            create: [
              ...(kycDocumentUrl && files.kycDocument?.[0] ? [{
                documentType: 'KYC',
                originalName: files.kycDocument[0].originalname,
                storedName: kycDocumentUrl.split('/').pop() || 'kyc',
                blobUrl: kycDocumentUrl,
                mimeType: files.kycDocument[0].mimetype,
                sizeBytes: files.kycDocument[0].size,
                isPrivate: true
              }] : []),
              ...certificateUrls.map((url, i) => {
                const certFile = files.certificates![i] as Express.Multer.File;
                return {
                  documentType: 'CERTIFICATE',
                  originalName: certFile.originalname,
                  storedName: url.split('/').pop() || 'certificate',
                  blobUrl: url,
                  mimeType: certFile.mimetype,
                  sizeBytes: certFile.size,
                  isPrivate: true
                };
              })
            ]
          }
        },
      });

      const payload = { userId: user.id, astrologerId: profile.id, role: 'ASTROLOGER' as const };
      const accessToken = signAccessToken(payload);
      const refreshToken = signRefreshToken(payload);

      await prisma.refreshToken.create({
        data: { userId: user.id, token: refreshToken, expiresAt: getRefreshTokenExpiry() },
      });

      await audit(profile.id, user.id, 'REGISTER', req);

      res.status(201).json({
        success: true,
        message: 'Account created successfully.',
        data: {
          accessToken,
          refreshToken,
          astrologer: {
            id: profile.id,
            userId: user.id,
            email: user.email,
            name: user.name,
            applicationStatus: profile.applicationStatus,
            accountStatus: profile.accountStatus,
          },
          redirect: '/astrologer/onboarding',
        },
      });
    } catch (err) {
      console.error('Astrologer register error:', err);
      res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  }
);

// ─── POST /api/auth/astrologer/login-email ────────────────────────────────────
router.post(
  '/login-email',
  [
    body('email').trim().isEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  handleValidation,
  async (req: Request, res: Response) => {
    const { email, password } = req.body as { email: string; password: string };
    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !user.passwordHash) {
        res.status(401).json({ success: false, message: 'Invalid email or password.', code: 'INVALID_CREDENTIALS' });
        return;
      }

      const bcrypt = await import('bcryptjs');
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        res.status(401).json({ success: false, message: 'Invalid email or password.', code: 'INVALID_CREDENTIALS' });
        return;
      }

      if (user.isBanned) {
        res.status(403).json({ success: false, message: 'Account suspended.', code: 'ACCOUNT_SUSPENDED' });
        return;
      }

      let profile = await prisma.astrologerProfile.findUnique({ where: { userId: user.id } });
      if (!profile) {
        profile = await prisma.astrologerProfile.create({
          data: {
            userId: user.id,
            fullLegalName: user.name || '',
            displayName: user.name || '',
            applicationStatus: 'DRAFT',
            application: { create: { step: 1 } },
          },
        });
      }

      const payload = { userId: user.id, astrologerId: profile.id, role: 'ASTROLOGER' as const };
      const accessToken = signAccessToken(payload);
      const refreshToken = signRefreshToken(payload);

      await prisma.refreshToken.create({
        data: { userId: user.id, token: refreshToken, expiresAt: getRefreshTokenExpiry() },
      });

      await audit(profile.id, user.id, 'LOGIN', req);

      const isApproved = profile.applicationStatus === 'APPROVED' && profile.accountStatus === 'ACTIVE';
      const isSubmitted = ['ADMIN_REVIEW', 'SUBMITTED'].includes(profile.applicationStatus);

      res.json({
        success: true,
        message: 'Login successful.',
        data: {
          accessToken,
          refreshToken,
          astrologer: {
            id: profile.id,
            userId: user.id,
            email: user.email,
            name: user.name,
            applicationStatus: profile.applicationStatus,
            accountStatus: profile.accountStatus,
            adminVerified: profile.adminVerified,
          },
          redirect: isApproved ? '/astrologer/dashboard' : isSubmitted ? '/astrologer/onboarding/submitted' : '/astrologer/onboarding',
        },
      });
    } catch (err) {
      console.error('Astrologer login-email error:', err);
      res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  }
);

// ─── Helper: write audit log (non-blocking) ───────────────────────────────────
async function audit(
  astrologerProfileId: string | null,
  actorId: string | null,
  action: string,
  req: Request,
  extra?: { previousState?: string; newState?: string; targetId?: string }
) {
  await prisma.astrologerAuditLog.create({
    data: {
      astrologerProfileId,
      actorId,
      actorType: 'ASTROLOGER',
      action,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
      ...extra,
    },
  }).catch(() => {}); // non-fatal
}

// ─── POST /api/auth/astrologer/send-otp ──────────────────────────────────────
router.post(
  '/send-otp',
  emailLimiter,
  [body('phone').trim().customSanitizer((v: string) => v.replace(/\s+/g, '')).isMobilePhone('any').withMessage('Valid phone number required'),
   body('purpose').optional().isIn(['login', 'register']).withMessage('Invalid purpose')],
  handleValidation,
  async (req: Request, res: Response) => {
    const { phone, purpose = 'login' } = req.body as { phone: string; purpose?: string };

    const isDev = process.env.NODE_ENV === 'development';

    if (!isDev && !isOtpConfigured(phone.replace(/\s+/g, ''))) {
      res.status(503).json({ success: false, message: 'SMS service not configured for this number.', code: 'SMS_NOT_CONFIGURED' });
      return;
    }

    try {
      // Resend cooldown: check most recent unused OTP
      const recent = await prisma.astrologerOtp.findFirst({
        where: { phone, purpose, isUsed: false },
        orderBy: { createdAt: 'desc' },
      });

      if (recent && Date.now() - recent.createdAt.getTime() < RESEND_COOLDOWN_MS) {
        const waitSec = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - recent.createdAt.getTime())) / 1000);
        res.status(429).json({ success: false, message: `Please wait ${waitSec}s before requesting a new OTP.`, code: 'OTP_COOLDOWN' });
        return;
      }

      // Invalidate all previous unused OTPs for this phone+purpose
      await prisma.astrologerOtp.updateMany({
        where: { phone, purpose, isUsed: false },
        data: { isUsed: true },
      });

      const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);
      await prisma.astrologerOtp.create({ data: { phone, otpHash: '', purpose, expiresAt } });

      if (!isDev) await sendOtpSms(phone);

      await audit(null, null, 'OTP_SENT', req, { targetId: phone });

      res.json({
        success: true,
        message: isDev ? 'DEV MODE: Use OTP 1234 to verify.' : 'OTP sent successfully.',
      });
    } catch (err) {
      console.error('Astrologer send-otp error:', err);
      res.status(500).json({ success: false, message: 'Failed to send OTP.' });
    }
  }
);

// ─── POST /api/auth/astrologer/verify-otp ────────────────────────────────────
router.post(
  '/verify-otp',
  authLimiter,
  [
    body('phone').trim().customSanitizer((v: string) => v.replace(/\s+/g, '')).isMobilePhone('any').withMessage('Valid phone number required'),
    body('otp').isLength({ min: 4, max: 6 }).isNumeric().withMessage('OTP must be 4-6 digits'),
    body('purpose').optional().isIn(['login', 'register']).withMessage('Invalid purpose'),
  ],
  handleValidation,
  async (req: Request, res: Response) => {
    const { phone, otp, purpose = 'login' } = req.body as { phone: string; otp: string; purpose?: string };

    try {
      // Find the most recent valid OTP record
      const otpRecord = await prisma.astrologerOtp.findFirst({
        where: { phone, purpose, isUsed: false },
        orderBy: { createdAt: 'desc' },
      });

      if (!otpRecord) {
        res.status(400).json({ success: false, message: 'No active OTP found. Please request a new one.', code: 'OTP_NOT_FOUND' });
        return;
      }

      // Brute-force protection
      if (otpRecord.attempts >= OTP_MAX_ATTEMPTS) {
        await prisma.astrologerOtp.update({ where: { id: otpRecord.id }, data: { isUsed: true } });
        res.status(429).json({ success: false, message: 'Too many failed attempts. Please request a new OTP.', code: 'OTP_MAX_ATTEMPTS' });
        return;
      }

      // Expiry check
      if (otpRecord.expiresAt < new Date()) {
        await prisma.astrologerOtp.update({ where: { id: otpRecord.id }, data: { isUsed: true } });
        res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.', code: 'OTP_EXPIRED' });
        return;
      }

      // Verify OTP — dev mode accepts '1234', production uses SMS provider
      const isDev = process.env.NODE_ENV === 'development';
      const providerValid = isDev ? otp === '1234' : await verifyOtpSms(phone, otp);

      if (!providerValid) {
        await prisma.astrologerOtp.update({ where: { id: otpRecord.id }, data: { attempts: { increment: 1 } } });
        const remaining = OTP_MAX_ATTEMPTS - otpRecord.attempts - 1;
        res.status(400).json({ success: false, message: `Invalid OTP. ${remaining} attempt(s) remaining.`, code: 'OTP_INVALID' });
        return;
      }

      // Mark OTP as used (one-time use)
      await prisma.astrologerOtp.update({ where: { id: otpRecord.id }, data: { isUsed: true } });

      // Find or create User account for this phone
      let user = await prisma.user.findUnique({ where: { phone } });

      if (!user) {
        // New registration — create User + AstrologerProfile
        user = await prisma.user.create({
          data: {
            phone,
            isPhoneVerified: true,
            provider: 'phone',
            wallet: { create: { balance: 0 } },
          },
        });
      } else {
        // Ensure phone is marked verified
        if (!user.isPhoneVerified) {
          await prisma.user.update({ where: { id: user.id }, data: { isPhoneVerified: true } });
        }
      }

      // Check ban status
      if (user.isBanned) {
        const isPermanent = !user.banUntil;
        const isActive = isPermanent || (user.banUntil && user.banUntil > new Date());
        if (isActive) {
          res.status(403).json({ success: false, message: `Account suspended.${user.banReason ? ` Reason: ${user.banReason}` : ''}`, code: 'ACCOUNT_SUSPENDED' });
          return;
        }
      }

      // Get or create AstrologerProfile
      let profile = await prisma.astrologerProfile.findUnique({ where: { userId: user.id } });

      if (!profile) {
        profile = await prisma.astrologerProfile.create({
          data: {
            userId: user.id,
            fullLegalName: '',
            displayName: '',
            phoneVerified: true,
            applicationStatus: 'PHONE_VERIFIED',
            application: { create: { step: 1 } },
          },
        });
      } else {
        // Update phoneVerified if not already set
        if (!profile.phoneVerified) {
          profile = await prisma.astrologerProfile.update({
            where: { id: profile.id },
            data: { phoneVerified: true, applicationStatus: profile.applicationStatus === 'DRAFT' ? 'PHONE_VERIFIED' : profile.applicationStatus },
          });
        }
      }

      // Issue tokens with astrologerId embedded
      const payload = { userId: user.id, astrologerId: profile.id, role: 'ASTROLOGER' as const };
      const accessToken = signAccessToken(payload);
      const refreshToken = signRefreshToken(payload);

      await prisma.refreshToken.create({
        data: { userId: user.id, token: refreshToken, expiresAt: getRefreshTokenExpiry() },
      });

      await audit(profile.id, user.id, 'LOGIN', req);

      // Determine redirect based on application status
      const status = profile.applicationStatus;
      const isApproved = status === 'APPROVED' && profile.accountStatus === 'ACTIVE';

      res.json({
        success: true,
        message: 'OTP verified successfully.',
        data: {
          accessToken,
          refreshToken,
          astrologer: {
            id: profile.id,
            userId: user.id,
            phone: user.phone,
            applicationStatus: status,
            accountStatus: profile.accountStatus,
            phoneVerified: profile.phoneVerified,
            emailVerified: profile.emailVerified,
            identityVerified: profile.identityVerified,
            professionalVerified: profile.professionalVerified,
            adminVerified: profile.adminVerified,
            displayName: profile.displayName || null,
          },
          redirect: isApproved ? '/astrologer/dashboard' : '/astrologer/onboarding',
        },
      });
    } catch (err) {
      console.error('Astrologer verify-otp error:', err);
      res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  }
);

// ─── POST /api/auth/astrologer/logout ────────────────────────────────────────
router.post('/logout', requireAuth, async (req: AuthRequest, res: Response) => {
  const { refreshToken } = req.body as { refreshToken?: string };
  const authHeader = req.headers.authorization;

  if (refreshToken) {
    await prisma.refreshToken.updateMany({ where: { token: refreshToken }, data: { isRevoked: true } });
  }

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const exp = (req.user as any)?.exp;
    if (token && exp) {
      const expiresInMs = exp * 1000 - Date.now();
      if (expiresInMs > 0) await blacklistToken(token, expiresInMs);
    }
  }

  if (req.user?.astrologerId) {
    await audit(req.user.astrologerId, req.user.userId, 'LOGOUT', req);
  }

  res.json({ success: true, message: 'Logged out successfully.' });
});

export default router;
