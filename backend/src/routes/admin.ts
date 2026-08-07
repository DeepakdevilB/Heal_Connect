import { Router, type Request, type Response, type NextFunction } from 'express';
import { type Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

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

router.use(requireAdmin);

// ─── Clean Dummy Practitioners Endpoint ───────────────────────────────────────
router.post('/clean-dummies', async (_req: Request, res: Response) => {
  try {
    const deleted = await prisma.practitioner.deleteMany({
      where: {
        OR: [
          { name: { contains: 'Michael', mode: 'insensitive' } },
          { name: { contains: 'Sarah', mode: 'insensitive' } },
          { name: { contains: 'Yogi', mode: 'insensitive' } },
        ],
      },
    });
    res.json({ success: true, message: `Removed ${deleted.count} dummy practitioners` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to clean dummy practitioners' });
  }
});

// ─── 1. Comprehensive Real Dashboard Metrics ──────────────────────────────────
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      totalPractitioners,
      pendingKyc,
      verifiedPractitioners,
      activeSessions,
      completedSessions,
      cancelledSessions,
      totalChatConversations,
      totalMessages,
      revenueAgg,
      durationAgg,
      ratingAgg,
      dau,
      wau,
      mau,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.practitioner.count(),
      prisma.practitioner.count({ where: { isVerified: false } }),
      prisma.practitioner.count({ where: { isVerified: true } }),
      prisma.session.count({ where: { status: { in: ['ACTIVE', 'ACCEPTED', 'JOINING_CHANNEL'] } } }),
      prisma.session.count({ where: { status: 'COMPLETED' } }),
      prisma.session.count({ where: { status: { in: ['CANCELLED', 'REJECTED'] } } }),
      prisma.session.count({ where: { type: 'CHAT' } }),
      prisma.chatMessage.count(),
      prisma.session.aggregate({ _sum: { totalCost: true }, where: { status: 'COMPLETED' } }),
      prisma.session.aggregate({ _avg: { duration: true }, where: { status: 'COMPLETED' } }),
      prisma.review.aggregate({ _avg: { rating: true } }),
      prisma.user.count({ where: { createdAt: { gte: oneDayAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    ]);

    const totalRevenue = Math.round((revenueAgg._sum.totalCost ?? 0) * 100) / 100;
    const avgSessionDuration = durationAgg._avg.duration ? Math.round(durationAgg._avg.duration / 60 * 10) / 10 : 0; // in minutes
    const avgRating = ratingAgg._avg.rating ? Math.round(ratingAgg._avg.rating * 10) / 10 : 0;

    res.json({
      success: true,
      data: {
        totalUsers,
        totalPractitioners,
        pendingKyc,
        verifiedPractitioners,
        activeSessions,
        completedSessions,
        cancelledSessions,
        totalChatConversations,
        totalMessages,
        totalRevenue,
        avgSessionDuration,
        avgRating,
        dau,
        wau,
        mau,
      },
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ─── 2. Real Database Analytics Charts (Last 30 Days) ─────────────────────────
router.get('/analytics/charts', async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Date range map initialization (last 30 days)
    const datesMap: Record<string, { users: number; practitioners: number; sessions: number; revenue: number; messages: number; avgDuration: number } > = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      datesMap[key] = { users: 0, practitioners: 0, sessions: 0, revenue: 0, messages: 0, avgDuration: 0 };
    }

    const [
      users,
      practitioners,
      sessions,
      messages,
      sessionsByStatus,
      allPractitioners,
    ] = await Promise.all([
      prisma.user.findMany({ where: { createdAt: { gte: thirtyDaysAgo } }, select: { createdAt: true } }),
      prisma.practitioner.findMany({ where: { createdAt: { gte: thirtyDaysAgo } }, select: { createdAt: true } }),
      prisma.session.findMany({ where: { createdAt: { gte: thirtyDaysAgo } }, select: { createdAt: true, status: true, totalCost: true, duration: true } }),
      prisma.chatMessage.findMany({ where: { createdAt: { gte: thirtyDaysAgo } }, select: { createdAt: true } }),
      prisma.session.groupBy({ by: ['status'], _count: { status: true } }),
      prisma.practitioner.findMany({ select: { specialties: true } }),
    ]);

    // Aggregate user growth
    for (const u of users) {
      const key = u.createdAt.toISOString().slice(0, 10);
      if (datesMap[key]) datesMap[key].users += 1;
    }

    // Aggregate practitioner growth
    for (const p of practitioners) {
      const key = p.createdAt.toISOString().slice(0, 10);
      if (datesMap[key]) datesMap[key].practitioners += 1;
    }

    // Aggregate sessions & revenue & duration
    for (const s of sessions) {
      const key = s.createdAt.toISOString().slice(0, 10);
      if (datesMap[key]) {
        datesMap[key].sessions += 1;
        if (s.status === 'COMPLETED') {
          datesMap[key].revenue += s.totalCost;
        }
      }
    }

    // Aggregate messages
    for (const m of messages) {
      const key = m.createdAt.toISOString().slice(0, 10);
      if (datesMap[key]) datesMap[key].messages += 1;
    }

    const chartData = Object.entries(datesMap).map(([date, val]) => ({
      date,
      users: val.users,
      practitioners: val.practitioners,
      sessions: val.sessions,
      revenue: Math.round(val.revenue * 100) / 100,
      messages: val.messages,
    }));

    const statusDistribution = sessionsByStatus.map((s) => ({
      status: s.status,
      count: s._count.status,
    }));

    // Specialty counts
    const categoryCounts: Record<string, number> = {};
    for (const p of allPractitioners) {
      for (const spec of p.specialties) {
        categoryCounts[spec] = (categoryCounts[spec] ?? 0) + 1;
      }
    }
    const topCategories = Object.entries(categoryCounts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    res.json({
      success: true,
      data: {
        chartData,
        statusDistribution,
        topCategories,
      },
    });
  } catch (err) {
    console.error('Analytics chart error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ─── 3. Real Live Activity Feed ───────────────────────────────────────────────
router.get('/activities', async (_req: Request, res: Response) => {
  try {
    const [recentUsers, recentPractitioners, recentSessions, recentReviews] = await Promise.all([
      prisma.user.findMany({ take: 5, orderBy: { createdAt: 'desc' }, select: { id: true, name: true, email: true, createdAt: true } }),
      prisma.practitioner.findMany({ take: 5, orderBy: { createdAt: 'desc' }, select: { id: true, name: true, isVerified: true, createdAt: true } }),
      prisma.session.findMany({ take: 5, orderBy: { createdAt: 'desc' }, select: { id: true, type: true, status: true, createdAt: true, user: { select: { name: true } }, practitioner: { select: { name: true } } } }),
      prisma.review.findMany({ take: 5, orderBy: { createdAt: 'desc' }, select: { id: true, rating: true, comment: true, createdAt: true, user: { select: { name: true } } } }),
    ]);

    const events: Array<{ type: string; title: string; description: string; timestamp: Date; status: string }> = [];

    for (const u of recentUsers) {
      events.push({ type: 'user', title: 'New User Registered', description: u.name || u.email || 'Anonymous', timestamp: u.createdAt, status: 'active' });
    }
    for (const p of recentPractitioners) {
      events.push({ type: 'practitioner', title: p.isVerified ? 'Practitioner Verified' : 'New Practitioner Registered', description: p.name, timestamp: p.createdAt, status: p.isVerified ? 'verified' : 'pending' });
    }
    for (const s of recentSessions) {
      events.push({ type: 'session', title: `Session ${s.status}`, description: `${s.user.name || 'User'} with ${s.practitioner.name} (${s.type})`, timestamp: s.createdAt, status: s.status.toLowerCase() });
    }
    for (const r of recentReviews) {
      events.push({ type: 'review', title: `New ${r.rating}★ Review`, description: `${r.user.name || 'User'}: ${r.comment ? `"${r.comment.slice(0, 40)}..."` : 'No comment'}`, timestamp: r.createdAt, status: 'active' });
    }

    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    res.json({ success: true, data: { activities: events.slice(0, 15) } });
  } catch (err) {
    console.error('Activities error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ─── 4. Real User Management Table ───────────────────────────────────────────
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
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status === 'verified') {
      where.isEmailVerified = true;
    } else if (status === 'unverified') {
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
          photoUrl: true,
          _count: { select: { sessions: true, reviews: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const formattedUsers = users.map((u) => ({
      id: u.id,
      name: u.name || 'Anonymous User',
      email: u.email || 'N/A',
      phone: u.phone || 'N/A',
      provider: u.provider,
      isEmailVerified: u.isEmailVerified,
      isPhoneVerified: u.isPhoneVerified,
      createdAt: u.createdAt,
      photoUrl: u.photoUrl,
      sessionCount: u._count.sessions,
      reviewCount: u._count.reviews,
      status: u.isEmailVerified || u.isPhoneVerified ? 'active' : 'unverified',
    }));

    res.json({
      success: true,
      data: {
        users: formattedUsers,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (err) {
    console.error('Admin users error:', err);
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
          id: true, name: true, email: true, phone: true, dob: true, birthPlace: true,
          gender: true, wellnessInterests: true, photoUrl: true, provider: true,
          isEmailVerified: true, isPhoneVerified: true, createdAt: true, updatedAt: true,
        },
      }),
      prisma.session.count({ where: { userId: id } }),
      prisma.wallet.findUnique({ where: { userId: id }, select: { balance: true, currency: true } }),
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

    // Find sessions
    const userSessions = await prisma.session.findMany({ where: { userId: id }, select: { id: true } });
    const sessionIds = userSessions.map((s) => s.id);

    // Delete flagged contents
    if (sessionIds.length > 0) {
      await prisma.flaggedContent.deleteMany({ where: { OR: [{ userId: id }, { sessionId: { in: sessionIds } }] } });
    } else {
      await prisma.flaggedContent.deleteMany({ where: { userId: id } });
    }

    // Delete wallet and transactions
    const wallet = await prisma.wallet.findUnique({ where: { userId: id }, select: { id: true } });
    if (wallet) {
      await prisma.transaction.deleteMany({ where: { walletId: wallet.id } });
      await prisma.wallet.delete({ where: { id: wallet.id } });
    }

    // Delete reviews and sessions
    await prisma.review.deleteMany({ where: { userId: id } });
    await prisma.session.deleteMany({ where: { userId: id } });

    // Finally delete the user
    await prisma.user.delete({ where: { id } });

    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ─── 5. Real Practitioner Management Table ───────────────────────────────────
router.get('/practitioners', async (req: Request, res: Response) => {
  try {
    const search = typeof req.query['search'] === 'string' ? req.query['search'] : undefined;
    const kycStatus = typeof req.query['kycStatus'] === 'string' ? req.query['kycStatus'] : undefined;
    const page = Math.max(1, parseInt(typeof req.query['page'] === 'string' ? req.query['page'] : '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(typeof req.query['limit'] === 'string' ? req.query['limit'] : '20', 10) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.PractitionerWhereInput = {
      // Exclude dummy practitioners Michael, Sarah, Yogi
      NOT: [
        { name: { contains: 'Michael', mode: 'insensitive' } },
        { name: { contains: 'Sarah', mode: 'insensitive' } },
        { name: { contains: 'Yogi', mode: 'insensitive' } },
      ],
    };

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
      const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

      return {
        id: p.id,
        name: p.name,
        email: p.email || 'N/A',
        phone: p.phone || 'N/A',
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
        avgRating: Math.round(avgRating * 10) / 10,
        status: p.isVerified ? 'verified' : 'pending',
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
    console.error('Admin practitioners error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// PATCH /api/admin/practitioners/:id/verify
router.patch('/practitioners/:id/verify', async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as { isVerified?: unknown };
    const isVerified = Boolean(body.isVerified);

    const updated = await prisma.practitioner.update({
      where: { id },
      data: { isVerified },
      select: { id: true, name: true, isVerified: true },
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

    const practitionerSessions = await prisma.session.findMany({ where: { practitionerId: id }, select: { id: true } });
    const sessionIds = practitionerSessions.map((s) => s.id);

    if (sessionIds.length > 0) {
      await prisma.flaggedContent.deleteMany({ where: { OR: [{ practitionerId: id }, { sessionId: { in: sessionIds } }] } });
    } else {
      await prisma.flaggedContent.deleteMany({ where: { practitionerId: id } });
    }

    await prisma.review.deleteMany({ where: { practitionerId: id } });
    await prisma.session.deleteMany({ where: { practitionerId: id } });

    await prisma.practitioner.delete({ where: { id } });

    res.json({ success: true, message: 'Practitioner deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ─── 6. Real Session Management Table ─────────────────────────────────────────
router.get('/sessions', async (req: Request, res: Response) => {
  try {
    const statusParam = typeof req.query['status'] === 'string' ? req.query['status'] : undefined;
    const search = typeof req.query['search'] === 'string' ? req.query['search'] : undefined;
    const page = Math.max(1, parseInt(typeof req.query['page'] === 'string' ? req.query['page'] : '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(typeof req.query['limit'] === 'string' ? req.query['limit'] : '20', 10) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.SessionWhereInput = {};

    if (statusParam) {
      where.status = statusParam.toUpperCase();
    }

    if (search) {
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { practitioner: { name: { contains: search, mode: 'insensitive' } } },
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
          startTime: true,
          endTime: true,
          totalCost: true,
          perMinuteRate: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true } },
          practitioner: { select: { id: true, name: true } },
        },
      }),
      prisma.session.count({ where }),
    ]);

    const formattedSessions = sessions.map((s) => {
      // Auto duration calculation in minutes
      let calculatedDuration = s.duration ? Math.round(s.duration / 60 * 10) / 10 : 0;
      if (!calculatedDuration && s.startTime && s.endTime) {
        const diffMs = s.endTime.getTime() - s.startTime.getTime();
        calculatedDuration = Math.max(1, Math.round(diffMs / 60000 * 10) / 10);
      }

      return {
        id: s.id,
        user: s.user.name || s.user.email || 'User',
        userId: s.user.id,
        practitioner: s.practitioner.name,
        practitionerId: s.practitioner.id,
        type: s.type,
        status: s.status,
        durationMinutes: calculatedDuration,
        startTime: s.startTime ? s.startTime.toISOString() : s.createdAt.toISOString(),
        endTime: s.endTime ? s.endTime.toISOString() : null,
        totalCost: Math.round(s.totalCost * 100) / 100,
        paymentStatus: s.totalCost > 0 ? 'Paid' : 'Free / Pending',
        createdAt: s.createdAt,
      };
    });

    res.json({
      success: true,
      data: {
        sessions: formattedSessions,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (err) {
    console.error('Admin sessions error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ─── 7. Real Chat Analytics ───────────────────────────────────────────────────
router.get('/analytics/chat', async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalConversations,
      messagesToday,
      messagesThisWeek,
      totalMessages,
      activeConversations,
      messagesTimelineRaw,
    ] = await Promise.all([
      prisma.session.count({ where: { type: 'CHAT' } }),
      prisma.chatMessage.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.chatMessage.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.chatMessage.count(),
      prisma.session.count({ where: { type: 'CHAT', status: 'ACTIVE' } }),
      prisma.chatMessage.findMany({ where: { createdAt: { gte: sevenDaysAgo } }, select: { createdAt: true } }),
    ]);

    const avgMessagesPerSession = totalConversations > 0 ? Math.round(totalMessages / totalConversations * 10) / 10 : 0;

    const timelineMap: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      timelineMap[d.toISOString().slice(0, 10)] = 0;
    }
    for (const m of messagesTimelineRaw) {
      const key = m.createdAt.toISOString().slice(0, 10);
      if (timelineMap[key] !== undefined) timelineMap[key] += 1;
    }

    const conversationTimeline = Object.entries(timelineMap).map(([date, count]) => ({ date, count }));

    res.json({
      success: true,
      data: {
        totalConversations,
        messagesToday,
        messagesThisWeek,
        avgMessagesPerSession,
        activeConversations,
        conversationTimeline,
      },
    });
  } catch (err) {
    console.error('Chat analytics error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
