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
} from '../lib/jwt';
import { sendVerificationEmail, sendPasswordResetEmail } from '../lib/email';
import { handleValidation } from '../middleware/validate';
import { authLimiter, emailLimiter } from '../middleware/rateLimiter';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import { blacklistToken } from '../lib/redis';

const router = Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function issueTokens(userId: string, email?: string | null) {
  const payload = { userId, ...(email ? { email } : {}) };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await prisma.refreshToken.create({
    data: {
      userId,
      token: refreshToken,
      expiresAt: getRefreshTokenExpiry(),
    },
  });

  return { accessToken, refreshToken };
}

// ─── Register with Email ──────────────────────────────────────────────────────

router.post(
  '/register',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('name').trim().notEmpty().withMessage('Name is required'),
  ],
  handleValidation,
  async (req: Request, res: Response) => {
    const { email, password, name } = req.body as { email: string; password: string; name: string };

    try {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        res.status(409).json({ success: false, message: 'Email already registered' });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const emailVerifyToken = generateSecureToken();
      const emailVerifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

      const user = await prisma.user.create({
        data: {
          email,
          name,
          passwordHash,
          emailVerifyToken,
          emailVerifyExpiry,
          provider: 'email',
          wallet: { create: { balance: 0 } },
        },
      });

      // Send verification email (non-blocking on failure)
      try {
        await sendVerificationEmail(email, emailVerifyToken);
      } catch (emailErr) {
        console.error('Email send failed:', emailErr);
      }

      const { accessToken, refreshToken } = await issueTokens(user.id, user.email);

      res.status(201).json({
        success: true,
        message: 'Account created. Please verify your email.',
        data: {
          user: { id: user.id, email: user.email, name: user.name, isEmailVerified: user.isEmailVerified },
          accessToken,
          refreshToken,
        },
      });
    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

// ─── Login with Email ─────────────────────────────────────────────────────────

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

      const { accessToken, refreshToken } = await issueTokens(user.id, user.email);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: { id: user.id, email: user.email, name: user.name, isEmailVerified: user.isEmailVerified },
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

    // Check DB — must exist, not revoked, not expired
    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.isRevoked || stored.expiresAt < new Date()) {
      res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
      return;
    }

    // Rotate: revoke old, issue new
    await prisma.refreshToken.update({ where: { id: stored.id }, data: { isRevoked: true } });

    const { accessToken, refreshToken: newRefreshToken } = await issueTokens(payload.userId, payload.email);

    res.json({
      success: true,
      data: { accessToken, refreshToken: newRefreshToken },
    });
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

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    // Cast to access the standard exp claim
    const exp = (req.user as any)?.exp;
    if (token && exp) {
      const expiresInMs = (exp * 1000) - Date.now();
      if (expiresInMs > 0) {
        await blacklistToken(token, expiresInMs);
      }
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
      if (!gPayload || !gPayload.sub) {
        res.status(400).json({ success: false, message: 'Invalid Google token' });
        return;
      }

      const { sub: googleId, email, name, email_verified } = gPayload;

      // First try to find by googleId
      let user = await prisma.user.findUnique({ where: { googleId } });

      // If not found by googleId, try by email
      if (!user && email) {
        user = await prisma.user.findUnique({ where: { email } });
      }

      if (!user) {
        // New user — create account
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
      } else if (!user.googleId) {
        // Existing email account — link Google ID to it
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId, isEmailVerified: true },
        });
      }

      const { accessToken, refreshToken } = await issueTokens(user.id, user.email);

      res.json({
        success: true,
        message: user ? 'Signed in with Google' : 'Account created with Google',
        data: {
          user: { id: user.id, email: user.email, name: user.name, isEmailVerified: user.isEmailVerified },
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
    // Apple tokens are validated client-side via Sign in with Apple JS SDK.
    // The frontend sends the verified appleId (sub) and optional email (only on first login).
    const { appleId, email, name } = req.body as { appleId: string; email?: string; name?: string };

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
      } else if (!user.appleId) {
        user = await prisma.user.update({ where: { id: user.id }, data: { appleId } });
      }

      const { accessToken, refreshToken } = await issueTokens(user.id, user.email);

      res.json({
        success: true,
        message: 'Signed in with Apple',
        data: {
          user: { id: user.id, email: user.email, name: user.name, isEmailVerified: user.isEmailVerified },
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
    const user = await prisma.user.findFirst({
      where: { emailVerifyToken: token },
    });

    if (!user) {
      // Check if already verified
      res.status(400).json({ success: false, message: 'Invalid or already used verification token.' });
      return;
    }

    if (user.emailVerifyExpiry && user.emailVerifyExpiry < new Date()) {
      res.status(400).json({ success: false, message: 'Verification token expired. Please request a new one.' });
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { isEmailVerified: true, emailVerifyToken: null, emailVerifyExpiry: null },
    });

    res.json({ success: true, message: 'Email verified successfully' });
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

      // Always return success to prevent email enumeration
      if (!user || user.isEmailVerified) {
        res.json({ success: true, message: 'If your email is registered, you will receive a verification link.' });
        return;
      }

      const emailVerifyToken = generateSecureToken();
      const emailVerifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerifyToken, emailVerifyExpiry },
      });

      await sendVerificationEmail(email, emailVerifyToken);

      res.json({ success: true, message: 'If your email is registered, you will receive a verification link.' });
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

      if (user && user.provider === 'email') {
        const passwordResetToken = generateSecureToken();
        const passwordResetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1h

        await prisma.user.update({
          where: { id: user.id },
          data: { passwordResetToken, passwordResetExpiry },
        });

        try {
          await sendPasswordResetEmail(email, passwordResetToken);
        } catch (emailErr) {
          console.error('Password reset email failed:', emailErr);
        }
      }

      // Always return success to prevent email enumeration
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
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  handleValidation,
  async (req: Request, res: Response) => {
    const { token, password } = req.body as { token: string; password: string };

    try {
      const user = await prisma.user.findFirst({
        where: { passwordResetToken: token },
      });

      if (!user) {
        res.status(400).json({ success: false, message: 'Invalid reset token' });
        return;
      }

      if (user.passwordResetExpiry && user.passwordResetExpiry < new Date()) {
        res.status(400).json({ success: false, message: 'Reset token expired. Please request a new one.' });
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

      res.json({ success: true, message: 'Password reset successfully. Please log in.' });
    } catch (err) {
      console.error('Reset password error:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

// ─── Get Current User ─────────────────────────────────────────────────────────

router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, email: true, name: true, phone: true, isEmailVerified: true, provider: true, createdAt: true },
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
