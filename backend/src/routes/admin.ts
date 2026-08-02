import { Router, type Request, type Response, type NextFunction } from 'express';
import { type Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { requireAuth, type AuthRequest } from '../middleware/auth';

// Silence unused import warning — requireAuth is kept per codebase convention
void requireAuth;

const router = Router();

// ─── Admin Auth Middleware ────────────────────────────────────────────────────

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const key = req.headers['x-admin-key'];
  const expected = process.env['ADMIN_SECRET_KEY'] ?? 'healconnect-admin-2026';
  if (key !== expected) {
    res.status(401).json({ success: false, message: 'Unauthorized: invalid admin key' });
    return;
  }
  next();
}

// Apply requireAdmin to all routes in this router
router.use(requireAdmin);

// ─── 1. Dashboard Stats ───────────────────────────────────────────────────────

// GET /api/admin/stats
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [
      totalUsers,
      totalPractitioners,
      activeSessions,
      pendingKyc,
      verifiedPractitioners,
      totalSessions,
      revenueAgg,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.practitioner.count(),
      prisma.session.count({ where: { status: 'ACTIVE' } }),
      prisma.practitioner.count({ where: { isVerified: false } }),
      prisma.practitioner.count({ where: { isVerified: true } }),
      prisma.session.count(),
      prisma.session.aggregate({
        _sum: { totalCost: true },
        where: { status: 'COMPLETED' },
      }),
    ]);

    const totalRevenue = revenueAgg._sum.totalCost ?? 0;

    res.json({
      success: true,
      data: {
        totalUsers,
        totalPractitioners,
        activeSessions,
        pendingKyc,
        verifiedPractitioners,
        totalSessions,
        totalRevenue,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ─── 2. User Management ───────────────────────────────────────────────────────

// GET /api/admin/users
router.get('/users', async (req: Request, res: Response) => {
  try {
    const search = typeof req.query['search'] === 'string' ? req.query['search'] : undefined;
    const status = typeof req.query['status'] === 'string' ? req.query['status'] : undefined;
    const page = Math.max(1, parseInt(typeof req.query['page'] === 'string' ? req.query['page'] : '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(typeof req.query['limit'] === 'string' ? req.query['limit'] : '20', 10) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // No isSuspended field — filter by isEmailVerified when status param is provided
    if (status === 'active') {
      where.isEmailVerified = true;
    } else if (status === 'suspended') {
      where.isEmailVerified = false;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          provider: true,
          isEmailVerified: true,
          isPhoneVerified: true,
          createdAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/admin/users/:id
router.get('/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    const [user, sessionCount, wallet] = await Promise.all([
      prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          dob: true,
          birthPlace: true,
          gender: true,
          wellnessInterests: true,
          photoUrl: true,
          provider: true,
          googleId: true,
          isEmailVerified: true,
          isPhoneVerified: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.session.count({ where: { userId: id } }),
      prisma.wallet.findUnique({
        where: { userId: id },
        select: { balance: true, currency: true },
      }),
    ]);

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.json({
      success: true,
      data: {
        user,
        sessionCount,
        wallet: wallet ?? { balance: 0, currency: 'INR' },
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    await prisma.user.delete({ where: { id } });
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ─── 3. Practitioner Management ───────────────────────────────────────────────

// GET /api/admin/practitioners
router.get('/practitioners', async (req: Request, res: Response) => {
  try {
    const search = typeof req.query['search'] === 'string' ? req.query['search'] : undefined;
    const kycStatus = typeof req.query['kycStatus'] === 'string' ? req.query['kycStatus'] : undefined;
    const page = Math.max(1, parseInt(typeof req.query['page'] === 'string' ? req.query['page'] : '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(typeof req.query['limit'] === 'string' ? req.query['limit'] : '20', 10) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.PractitionerWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (kycStatus === 'verified') {
      where.isVerified = true;
    } else if (kycStatus === 'pending') {
      where.isVerified = false;
    }

    const [practitioners, total] = await Promise.all([
      prisma.practitioner.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { sessions: true } },
          reviews: { select: { rating: true } },
        },
      }),
      prisma.practitioner.count({ where }),
    ]);

    const result = practitioners.map((p) => {
      const ratings = p.reviews.map((r) => r.rating);
      const avgRating = ratings.length > 0
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length
        : null;

      return {
        id: p.id,
        name: p.name,
        email: p.email,
        phone: p.phone,
        bio: p.bio,
        specialties: p.specialties,
        certifications: p.certifications,
        languages: p.languages,
        experienceYrs: p.experienceYrs,
        perMinuteRate: p.perMinuteRate,
        photoUrl: p.photoUrl,
        isVerified: p.isVerified,
        isOnline: p.isOnline,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        sessionCount: p._count.sessions,
        avgRating: avgRating !== null ? Math.round(avgRating * 100) / 100 : null,
      };
    });

    res.json({
      success: true,
      data: {
        practitioners: result,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/admin/practitioners/:id
router.get('/practitioners/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    const practitioner = await prisma.practitioner.findUnique({
      where: { id },
      include: {
        sessions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            type: true,
            status: true,
            duration: true,
            totalCost: true,
            createdAt: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
            user: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!practitioner) {
      res.status(404).json({ success: false, message: 'Practitioner not found' });
      return;
    }

    res.json({ success: true, data: { practitioner } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// PATCH /api/admin/practitioners/:id/verify
router.patch('/practitioners/:id/verify', async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as { isVerified?: unknown };

    if (typeof body.isVerified !== 'boolean') {
      res.status(400).json({ success: false, message: 'isVerified must be a boolean' });
      return;
    }

    const practitioner = await prisma.practitioner.findUnique({ where: { id }, select: { id: true } });
    if (!practitioner) {
      res.status(404).json({ success: false, message: 'Practitioner not found' });
      return;
    }

    const updated = await prisma.practitioner.update({
      where: { id },
      data: { isVerified: body.isVerified },
      select: { id: true, name: true, isVerified: true },
    });

    res.json({ success: true, data: { practitioner: updated } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// PATCH /api/admin/practitioners/:id/rate
router.patch('/practitioners/:id/rate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as { perMinuteRate?: unknown };

    if (typeof body.perMinuteRate !== 'number' || body.perMinuteRate < 0) {
      res.status(400).json({ success: false, message: 'perMinuteRate must be a non-negative number' });
      return;
    }

    const practitioner = await prisma.practitioner.findUnique({ where: { id }, select: { id: true } });
    if (!practitioner) {
      res.status(404).json({ success: false, message: 'Practitioner not found' });
      return;
    }

    const updated = await prisma.practitioner.update({
      where: { id },
      data: { perMinuteRate: body.perMinuteRate },
      select: { id: true, name: true, perMinuteRate: true },
    });

    res.json({ success: true, data: { practitioner: updated } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// DELETE /api/admin/practitioners/:id
router.delete('/practitioners/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    const practitioner = await prisma.practitioner.findUnique({ where: { id }, select: { id: true } });
    if (!practitioner) {
      res.status(404).json({ success: false, message: 'Practitioner not found' });
      return;
    }

    await prisma.practitioner.delete({ where: { id } });
    res.json({ success: true, message: 'Practitioner deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ─── 4. Session Management ────────────────────────────────────────────────────

// GET /api/admin/sessions
router.get('/sessions', async (req: Request, res: Response) => {
  try {
    const statusParam = typeof req.query['status'] === 'string' ? req.query['status'] : undefined;
    const search = typeof req.query['search'] === 'string' ? req.query['search'] : undefined;
    const page = Math.max(1, parseInt(typeof req.query['page'] === 'string' ? req.query['page'] : '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(typeof req.query['limit'] === 'string' ? req.query['limit'] : '20', 10) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.SessionWhereInput = {};

    if (statusParam) {
      where.status = statusParam;
    }

    if (search) {
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          status: true,
          duration: true,
          totalCost: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true } },
          practitioner: { select: { id: true, name: true } },
        },
      }),
      prisma.session.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        sessions,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/admin/sessions/:id
router.get('/sessions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        practitioner: {
          select: { id: true, name: true, email: true, phone: true, specialties: true },
        },
        review: {
          select: { rating: true, comment: true, createdAt: true },
        },
        _count: { select: { messages: true } },
      },
    });

    if (!session) {
      res.status(404).json({ success: false, message: 'Session not found' });
      return;
    }

    res.json({ success: true, data: { session } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ─── 5. Payout Management (mock-ready) ───────────────────────────────────────

// GET /api/admin/payouts
router.get('/payouts', async (_req: Request, res: Response) => {
  try {
    const practitioners = await prisma.practitioner.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        perMinuteRate: true,
        isVerified: true,
        sessions: {
          where: { status: 'COMPLETED' },
          select: { totalCost: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const payouts = practitioners.map((p) => {
      const totalEarned = p.sessions.reduce((sum, s) => sum + s.totalCost, 0);
      return {
        id: p.id,
        name: p.name,
        email: p.email,
        phone: p.phone,
        perMinuteRate: p.perMinuteRate,
        isVerified: p.isVerified,
        completedSessionCount: p.sessions.length,
        totalEarned: Math.round(totalEarned * 100) / 100,
      };
    });

    res.json({ success: true, data: { payouts } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ─── 6. Analytics ─────────────────────────────────────────────────────────────

// GET /api/admin/analytics
router.get('/analytics', async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Sessions by type
    const [chatCount, audioCount, videoCount] = await Promise.all([
      prisma.session.count({ where: { type: 'CHAT' } }),
      prisma.session.count({ where: { type: 'AUDIO' } }),
      prisma.session.count({ where: { type: 'VIDEO' } }),
    ]);

    const sessionsByType = {
      CHAT: chatCount,
      AUDIO: audioCount,
      VIDEO: videoCount,
    };

    // Revenue by day — last 7 days
    // Fetch all completed sessions in last 7 days and bucket them in JS
    const recentCompletedSessions = await prisma.session.findMany({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: sevenDaysAgo },
      },
      select: { createdAt: true, totalCost: true },
    });

    const revByDay: Record<string, number> = {};
    // Pre-populate last 7 days with 0
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
      revByDay[key] = 0;
    }
    for (const s of recentCompletedSessions) {
      const key = s.createdAt.toISOString().slice(0, 10);
      if (key in revByDay) {
        revByDay[key] = (revByDay[key] ?? 0) + s.totalCost;
      }
    }
    const revenueByDay = Object.entries(revByDay).map(([date, revenue]) => ({
      date,
      revenue: Math.round(revenue * 100) / 100,
    }));

    // Top 5 practitioners by total revenue
    const allPractitioners = await prisma.practitioner.findMany({
      select: {
        id: true,
        name: true,
        sessions: {
          where: { status: 'COMPLETED' },
          select: { totalCost: true },
        },
      },
    });

    const topPractitioners = allPractitioners
      .map((p) => ({
        id: p.id,
        name: p.name,
        totalEarned: p.sessions.reduce((sum, s) => sum + s.totalCost, 0),
      }))
      .sort((a, b) => b.totalEarned - a.totalEarned)
      .slice(0, 5)
      .map((p) => ({ ...p, totalEarned: Math.round(p.totalEarned * 100) / 100 }));

    // User growth — last 7 days grouped by day
    const recentUsers = await prisma.user.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true },
    });

    const usersByDay: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      usersByDay[key] = 0;
    }
    for (const u of recentUsers) {
      const key = u.createdAt.toISOString().slice(0, 10);
      if (key in usersByDay) {
        usersByDay[key] = (usersByDay[key] ?? 0) + 1;
      }
    }
    const userGrowth = Object.entries(usersByDay).map(([date, count]) => ({ date, count }));

    res.json({
      success: true,
      data: {
        sessionsByType,
        revenueByDay,
        topPractitioners,
        userGrowth,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ─── Reviews ──────────────────────────────────────────────────────────────────

// GET /api/admin/reviews
router.get('/reviews', async (_req: Request, res: Response) => {
  try {
    const reviews = await prisma.review.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        practitioner: { select: { id: true, name: true } },
        session: { select: { id: true } },
      },
    });
    res.json({ success: true, data: { reviews } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// DELETE /api/admin/reviews/:id
router.delete('/reviews/:id', async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  try {
    await prisma.review.delete({ where: { id } });
    res.json({ success: true, message: 'Review deleted' });
  } catch (err: any) {
    if (err?.code === 'P2025') {
      res.status(404).json({ success: false, message: 'Review not found' });
      return;
    }
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
