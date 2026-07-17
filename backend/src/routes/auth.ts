import { Router, type Request, type Response } from 'express';
import { body } from 'express-validator';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../lib/prisma';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  getRefreshTokenExpiry,
  generateSecureToken,
  hashToken,
  generateOtp,
} from '../lib/jwt';
import {
  sendWelcomeEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
} from '../lib/email';
import { sendOtpSms, verifyOtpSms, isTwilioConfigured } from '../lib/sms';
import { handleValidation } from '../middleware/validate';
import { authLimiter, emailLimiter } from '../middleware/rateLimiter';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import { blacklistToken } from '../lib/redis';

const router = Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function issueTokens(userId: string, email?: string | null) {
  const payload = { userId, ...(email ? { email } : {}) };
  const accessToken  = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await prisma.refreshToken.create({
    data: { userId, token: refreshToken, expiresAt: getRefreshTokenExpiry() },
  });

  return { accessToken, refreshToken };
}

// ─── Register ─────────────────────────────────────────────────────────────────

router.post(
  '/register',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
      .matches(/[0-9]/).withMessage('Password must contain at least one number'),
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('phone').optional({ nullable: true }).isMobilePhone('any').withMessage('Valid phone number required'),
    body('verifyMethod')
      .optional()
      .isIn(['email', 'sms'])
      .withMessage('verifyMethod must be "email" or "sms"'),
  ],
  handleValidation,
  async (req: Request, res: Response) => {
    const { email, password, name, phone, verifyMethod = 'email' } =
      req.body as {
        email: string; password: string; name: string;
        phone?: string; verifyMethod?: 'email' | 'sms';
      };

    // SMS chosen but Twilio not configured → fall back to email silently
    const useEmail = verifyMethod === 'email' || !isTwilioConfigured();

    try {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        res.status(409).json({ success: false, message: 'Email already registered' });
        return;
      }

      if (phone) {
        const existingPhone = await prisma.user.findUnique({ where: { phone } });
        if (existingPhone) {
          res.status(409).json({ success: false, message: 'Phone number already registered' });
          return;
        }
      }

      const passwordHash = await bcrypt.hash(password, 12);

      // Generate & hash email verify token
      const rawEmailToken    = generateSecureToken();
      const emailVerifyToken = hashToken(rawEmailToken);
      const emailVerifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

      const user = await prisma.user.create({
        data: {
          email,
          name,
          passwordHash,
          phone: phone ?? null,
          emailVerifyToken,
          emailVerifyExpiry,
          provider: 'email',
          wallet: { create: { balance: 0 } },
        },
      });

      // Send welcome email (non-blocking)
      sendWelcomeEmail(email, name).catch((e) => console.error('Welcome email failed:', e));

      if (useEmail) {
        // Send email verification (non-blocking)
        sendVerificationEmail(email, rawEmailToken).catch((e) =>
          console.error('Verification email failed:', e)
        );
      } else if (phone) {
        // Twilio Verify handles OTP generation and delivery
        sendOtpSms(phone).catch((e) => console.error('OTP SMS failed:', e));
      }

      const { accessToken, refreshToken } = await issueTokens(user.id, user.email);

      res.status(201).json({
        success: true,
        message: useEmail
          ? 'Account created. Please verify your email before logging in.'
          : 'Account created. An OTP has been sent to your phone.',
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            phone: user.phone,
            isEmailVerified: user.isEmailVerified,
            isPhoneVerified: user.isPhoneVerified,
          },
          accessToken,
          refreshToken,
          verifyMethod: useEmail ? 'email' : 'sms',
        },
      });
    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

// ─── Login ────────────────────────────────────────────────────────────────────

router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  handleValidation,
  async (req: Request, res: Response) => {
    const { email, password } = req.body as { email: string; password: string };

    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !user.passwordHash) {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
        return;
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
        return;
      }

      // ── Block login until account is verified ──────────────────────────────
      const isVerified = user.isEmailVerified || user.isPhoneVerified;
      if (!isVerified) {
        res.status(403).json({
          success: false,
          message: 'Please verify your email or phone before logging in.',
          code: 'UNVERIFIED_ACCOUNT',
          data: { email: user.email, phone: user.phone },
        });
        return;
      }

      const { accessToken, refreshToken } = await issueTokens(user.id, user.email);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            phone: user.phone,
            isEmailVerified: user.isEmailVerified,
            isPhoneVerified: user.isPhoneVerified,
          },
          accessToken,
          refreshToken,
        },
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

// ─── Refresh Token Rotation ───────────────────────────────────────────────────

router.post('/refresh', async (req: Request, res: Response) => {
  const { refreshToken } = req.body as { refreshToken?: string };

  if (!refreshToken) {
    res.status(400).json({ success: false, message: 'Refresh token required' });
    return;
  }

  try {
    const payload = verifyRefreshToken(refreshToken);

    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.isRevoked || stored.expiresAt < new Date()) {
      res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
      return;
    }

    await prisma.refreshToken.update({ where: { id: stored.id }, data: { isRevoked: true } });
    const { accessToken, refreshToken: newRefreshToken } = await issueTokens(payload.userId, payload.email);

    res.json({ success: true, data: { accessToken, refreshToken: newRefreshToken } });
  } catch {
    res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
});

// ─── Logout ───────────────────────────────────────────────────────────────────

router.post('/logout', requireAuth, async (req: AuthRequest, res: Response) => {
  const { refreshToken } = req.body as { refreshToken?: string };
  const authHeader = req.headers.authorization;

  if (refreshToken) {
    await prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { isRevoked: true },
    });
  }

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const exp = (req.user as any)?.exp;
    if (token && exp) {
      const expiresInMs = exp * 1000 - Date.now();
      if (expiresInMs > 0) await blacklistToken(token, expiresInMs);
    }
  }

  res.json({ success: true, message: 'Logged out successfully' });
});

// ─── Google Sign-In ───────────────────────────────────────────────────────────

router.post(
  '/google',
  authLimiter,
  [body('idToken').notEmpty().withMessage('Google ID token required')],
  handleValidation,
  async (req: Request, res: Response) => {
    const { idToken } = req.body as { idToken: string };

    try {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID ?? '',
      });

      const gPayload = ticket.getPayload();
      if (!gPayload?.sub) {
        res.status(400).json({ success: false, message: 'Invalid Google token' });
        return;
      }

      const { sub: googleId, email, name, email_verified } = gPayload;

      let user = await prisma.user.findUnique({ where: { googleId } });
      if (!user && email) user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        user = await prisma.user.create({
          data: {
            googleId,
            email: email ?? null,
            name: name ?? null,
            isEmailVerified: email_verified ?? false,
            provider: 'google',
            wallet: { create: { balance: 0 } },
          },
        });
        // Welcome email for new Google users
        if (email && name) sendWelcomeEmail(email, name).catch(() => {});
      } else if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId, isEmailVerified: true },
        });
      }

      const { accessToken, refreshToken } = await issueTokens(user.id, user.email);

      res.json({
        success: true,
        message: 'Signed in with Google',
        data: {
          user: {
            id: user.id, email: user.email, name: user.name,
            isEmailVerified: user.isEmailVerified, isPhoneVerified: user.isPhoneVerified,
          },
          accessToken,
          refreshToken,
        },
      });
    } catch (err: any) {
      console.error('Google auth error:', err);
      res.status(400).json({ success: false, message: `Google authentication failed: ${err?.message || 'Unknown error'}` });
    }
  }
);

// ─── Apple Sign-In ────────────────────────────────────────────────────────────

router.post(
  '/apple',
  authLimiter,
  [body('appleId').notEmpty().withMessage('Apple user ID required')],
  handleValidation,
  async (req: Request, res: Response) => {
    const { appleId, email, name } = req.body as {
      appleId: string; email?: string; name?: string;
    };

    try {
      let user = await prisma.user.findFirst({
        where: { OR: [{ appleId }, ...(email ? [{ email }] : [])] },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            appleId,
            email: email ?? null,
            name: name ?? null,
            isEmailVerified: !!email,
            provider: 'apple',
            wallet: { create: { balance: 0 } },
          },
        });
        if (email && name) sendWelcomeEmail(email, name).catch(() => {});
      } else if (!user.appleId) {
        user = await prisma.user.update({ where: { id: user.id }, data: { appleId } });
      }

      const { accessToken, refreshToken } = await issueTokens(user.id, user.email);

      res.json({
        success: true,
        message: 'Signed in with Apple',
        data: {
          user: {
            id: user.id, email: user.email, name: user.name,
            isEmailVerified: user.isEmailVerified, isPhoneVerified: user.isPhoneVerified,
          },
          accessToken,
          refreshToken,
        },
      });
    } catch (err) {
      console.error('Apple auth error:', err);
      res.status(500).json({ success: false, message: 'Apple authentication failed' });
    }
  }
);

// ─── Email Verification ───────────────────────────────────────────────────────

router.get('/verify-email', async (req: Request, res: Response) => {
  const { token } = req.query as { token?: string };

  if (!token) {
    res.status(400).json({ success: false, message: 'Verification token required' });
    return;
  }

  try {
    // Compare hash of the incoming raw token against stored hashes
    const tokenHash = hashToken(token);
    const user = await prisma.user.findFirst({ where: { emailVerifyToken: tokenHash } });

    if (!user) {
      res.status(400).json({ success: false, message: 'Invalid or already used verification link.' });
      return;
    }

    if (user.emailVerifyExpiry && user.emailVerifyExpiry < new Date()) {
      res.status(400).json({
        success: false,
        message: 'Verification link expired. Please request a new one.',
      });
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { isEmailVerified: true, emailVerifyToken: null, emailVerifyExpiry: null },
    });

    res.json({ success: true, message: 'Email verified successfully. You can now log in.' });
  } catch (err) {
    console.error('Email verification error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ─── Resend Verification Email ────────────────────────────────────────────────

router.post(
  '/resend-verification',
  emailLimiter,
  [body('email').isEmail().normalizeEmail().withMessage('Valid email required')],
  handleValidation,
  async (req: Request, res: Response) => {
    const { email } = req.body as { email: string };

    try {
      const user = await prisma.user.findUnique({ where: { email } });

      if (user && !user.isEmailVerified) {
        const rawToken = generateSecureToken();
        const tokenHash = hashToken(rawToken);
        const emailVerifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await prisma.user.update({
          where: { id: user.id },
          data: { emailVerifyToken: tokenHash, emailVerifyExpiry },
        });

        sendVerificationEmail(email, rawToken).catch((e) =>
          console.error('Resend verification email failed:', e)
        );
      }

      // Always return success to prevent email enumeration
      res.json({
        success: true,
        message: 'If your email is registered and unverified, you will receive a verification link.',
      });
    } catch (err) {
      console.error('Resend verification error:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

// ─── Forgot Password ──────────────────────────────────────────────────────────

router.post(
  '/forgot-password',
  emailLimiter,
  [body('email').isEmail().normalizeEmail().withMessage('Valid email required')],
  handleValidation,
  async (req: Request, res: Response) => {
    const { email } = req.body as { email: string };

    try {
      const user = await prisma.user.findUnique({ where: { email } });

      if (user) {
        // OAuth users can also set/reset a password via email
        const rawToken  = generateSecureToken();
        const tokenHash = hashToken(rawToken);
        const passwordResetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1h

        await prisma.user.update({
          where: { id: user.id },
          data: { passwordResetToken: tokenHash, passwordResetExpiry },
        });

        sendPasswordResetEmail(email, rawToken).catch((e) =>
          console.error('Password reset email failed:', e)
        );
      }

      res.json({
        success: true,
        message: 'If your email is registered, you will receive a password reset link.',
      });
    } catch (err) {
      console.error('Forgot password error:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

// ─── Reset Password ───────────────────────────────────────────────────────────

router.post(
  '/reset-password',
  authLimiter,
  [
    body('token').notEmpty().withMessage('Reset token required'),
    body('password')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
      .matches(/[0-9]/).withMessage('Password must contain at least one number'),
  ],
  handleValidation,
  async (req: Request, res: Response) => {
    const { token, password } = req.body as { token: string; password: string };

    try {
      const tokenHash = hashToken(token);
      const user = await prisma.user.findFirst({ where: { passwordResetToken: tokenHash } });

      if (!user) {
        res.status(400).json({ success: false, message: 'Invalid or already used reset link.' });
        return;
      }

      if (user.passwordResetExpiry && user.passwordResetExpiry < new Date()) {
        res.status(400).json({
          success: false,
          message: 'Reset link expired. Please request a new one.',
        });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 12);

      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, passwordResetToken: null, passwordResetExpiry: null },
      });

      // Revoke all refresh tokens for security
      await prisma.refreshToken.updateMany({
        where: { userId: user.id },
        data: { isRevoked: true },
      });

      // Send password changed confirmation email (non-blocking)
      if (user.email) {
        sendPasswordChangedEmail(user.email, user.name ?? 'there').catch((e) =>
          console.error('Password changed email failed:', e)
        );
      }

      res.json({ success: true, message: 'Password reset successfully. Please log in.' });
    } catch (err) {
      console.error('Reset password error:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

// ─── Send Phone OTP ───────────────────────────────────────────────────────────

router.post(
  '/send-otp',
  emailLimiter,
  [body('phone').isMobilePhone('any').withMessage('Valid phone number required')],
  handleValidation,
  async (req: Request, res: Response) => {
    const { phone } = req.body as { phone: string };

    if (!isTwilioConfigured()) {
      res.status(503).json({
        success: false,
        message: 'SMS service is not configured. Please verify via email.',
      });
      return;
    }

    try {
      const user = await prisma.user.findUnique({ where: { phone } });
      if (!user) {
        // Return success to prevent phone enumeration
        res.json({ success: true, message: 'If this number is registered, an OTP has been sent.' });
        return;
      }

      if (user.isPhoneVerified) {
        res.json({ success: true, message: 'Phone already verified.' });
        return;
      }

      // Twilio Verify handles OTP — just call sendOtpSms
      await sendOtpSms(phone);

      res.json({ success: true, message: 'OTP sent successfully.' });
    } catch (err) {
      console.error('Send OTP error:', err);
      res.status(500).json({ success: false, message: 'Failed to send OTP. Please try again.' });
    }
  }
);

// ─── Verify Phone OTP ─────────────────────────────────────────────────────────

router.post(
  '/verify-otp',
  authLimiter,
  [
    body('phone').isMobilePhone('any').withMessage('Valid phone number required'),
    body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('OTP must be 6 digits'),
  ],
  handleValidation,
  async (req: Request, res: Response) => {
    const { phone, otp } = req.body as { phone: string; otp: string };

    try {
      const user = await prisma.user.findUnique({ where: { phone } });
      if (!user) {
        res.status(400).json({ success: false, message: 'Invalid phone or OTP.' });
        return;
      }

      if (user.isPhoneVerified) {
        res.json({ success: true, message: 'Phone already verified.' });
        return;
      }

      // Use Twilio Verify to check the OTP code
      const approved = await verifyOtpSms(phone, otp);

      if (!approved) {
        res.status(400).json({ success: false, message: 'Invalid or expired OTP. Please try again.' });
        return;
      }

      // Mark phone as verified in DB
      await prisma.user.update({
        where: { id: user.id },
        data: { isPhoneVerified: true },
      });

      res.json({ success: true, message: 'Phone verified successfully. You can now log in.' });
    } catch (err) {
      console.error('Verify OTP error:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

// ─── Resend OTP ───────────────────────────────────────────────────────────────

router.post(
  '/resend-otp',
  emailLimiter,
  [body('phone').isMobilePhone('any').withMessage('Valid phone number required')],
  handleValidation,
  async (req: Request, res: Response) => {
    const { phone } = req.body as { phone: string };

    if (!isTwilioConfigured()) {
      res.status(503).json({ success: false, message: 'SMS service is not configured.' });
      return;
    }

    try {
      const user = await prisma.user.findUnique({ where: { phone } });

      if (user && !user.isPhoneVerified) {
        // Twilio Verify handles resend with built-in cooldown
        await sendOtpSms(phone);
      }

      res.json({ success: true, message: 'If this number is registered, a new OTP has been sent.' });
    } catch (err) {
      console.error('Resend OTP error:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

// ─── Get Current User ─────────────────────────────────────────────────────────

router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true, email: true, name: true, phone: true,
        isEmailVerified: true, isPhoneVerified: true,
        provider: true, createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.json({ success: true, data: { user } });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
