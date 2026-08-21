import { Router, type Request, type Response } from 'express';
import { type Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { requireAdmin, requireAdminAuth, type AdminAuthRequest } from '../middleware/auth';
import { scanContent, flagContentIfNeeded } from '../lib/moderation';
import { FULL_MIGRATION_SQL, SESSION_REMINDER_UNIQUE_INDEX_SQL } from '../lib/migrationSql';
import { randomUUID } from 'crypto';

const router = Router();

// SEC-04/05: Admin audit log helper â€” now uses adminLabel from req.adminUser
// when available (full session), falls back to env var for legacy / bootstrap routes.
async function writeAuditLog(
  req: Request | null,
  action: string,
  targetType: string,
  targetId?: string | null,
  meta?: Record<string, unknown> | null,
): Promise<void> {
  try {
    const adminUser = (req as AdminAuthRequest | null)?.adminUser;
    const adminLabel = adminUser?.email ?? process.env['ADMIN_LOGIN_EMAIL'] ?? 'admin';
    await prisma.adminAuditLog.create({
      data: {
        id: randomUUID(),
        adminLabel,
        action,
        targetType,
        targetId: targetId ?? null,
        meta: meta ? JSON.stringify(meta) : null,
      },
    });
  } catch (err) {
    // Never throw â€” log only
    console.error('[AuditLog] Failed to write audit row:', err);
  }
}

// SEC-04/05: All admin routes are now guarded by the per-identity cookie session.
// requireAdminAuth() with no args allows both SUPERADMIN and MODERATOR.
// Sensitive routes individually add requireAdminAuth(['SUPERADMIN']).
router.use(requireAdminAuth());

// â”€â”€â”€ 0. Run Database Migrations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.all('/migrate', requireAdminAuth(['SUPERADMIN']), async (req: Request, res: Response) => {
  try {
    // Single shared migration script — see lib/migrationSql.ts for why this
    // used to be two different, out-of-sync copies (this route was missing
    // AdminUser/AdminAuditLog/CallTranscript/FlaggedContent entirely).
    await prisma.$executeRawUnsafe(FULL_MIGRATION_SQL);
    try {
      await prisma.$executeRawUnsafe(SESSION_REMINDER_UNIQUE_INDEX_SQL);
    } catch (e) { /* pre-existing duplicate rows on some databases — non-fatal */ }

    // SEC-10: audit trail
    await writeAuditLog(req, 'MIGRATE', 'SYSTEM', null, null);

    res.status(200).json({ success: true, message: 'Migrations applied successfully' });
  } catch (error: any) {
    console.error('Migration error:', error);
    res.status(200).json({ success: false, message: 'Migration failed', error: error.message });
  }
});

router.post('/fix-email', async (req: Request, res: Response) => {
  try {
    // Delete the mistakenly created new empty account if it exists
    await prisma.practitioner.deleteMany({
      where: { email: 'deep.pgl.work@gmail.com', reviewCount: 0, experienceYrs: 0 }
    });
    // Update the old account to have the correct dotted email
    const updated = await prisma.practitioner.updateMany({
      where: { email: 'deeppglwork@gmail.com' },
      data: { email: 'deep.pgl.work@gmail.com' }
    });
    res.json({ success: true, updated: updated.count });
  } catch (e: any) {
    res.json({ success: false, error: e.message });
  }
});


// â”€â”€â”€ Clean Dummy Practitioners Endpoint â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ 1. Comprehensive Real Dashboard Metrics â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ 2. Real Database Analytics Charts (Last 30 Days) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ 3. Real Live Activity Feed â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      events.push({ type: 'review', title: `New ${r.rating}â˜… Review`, description: `${r.user.name || 'User'}: ${r.comment ? `"${r.comment.slice(0, 40)}..."` : 'No comment'}`, timestamp: r.createdAt, status: 'active' });
    }

    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    res.json({ success: true, data: { activities: events.slice(0, 15) } });
  } catch (err) {
    console.error('Activities error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// â”€â”€â”€ 4. Real User Management Table â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
          isBanned: true,
          banReason: true,
          banUntil: true,
          wallet: { select: { balance: true } },
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
      balance: u.wallet?.balance || 0,
      status: u.isEmailVerified || u.isPhoneVerified ? 'active' : 'unverified',
      isBanned: u.isBanned,
      banReason: u.banReason,
      banUntil: u.banUntil,
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

// â”€â”€â”€ 4.1 Update User Balance â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.patch('/users/:id/balance', requireAdminAuth(['SUPERADMIN']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { balance } = req.body;

    if (typeof balance !== 'number') {
      res.status(400).json({ success: false, message: 'Invalid balance amount' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: { wallet: true },
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const currentBalance = user.wallet?.balance || 0;
    const diff = balance - currentBalance;

    if (diff === 0) {
      res.json({ success: true, message: 'Balance is already set to this amount' });
      return;
    }

    // Upsert wallet
    const updatedWallet = await prisma.wallet.upsert({
      where: { userId: id },
      create: { userId: id, balance, currency: 'INR' },
      update: { balance },
    });

    // Log transaction
    await prisma.transaction.create({
      data: {
        walletId: updatedWallet.id,
        amount: Math.abs(diff),
        type: diff > 0 ? 'RECHARGE' : 'DEBIT',
        status: 'SUCCESS',
        referenceId: `admin_adj_${Date.now()}`,
      },
    });

    // SEC-10: audit trail
    await writeAuditLog(req, 'ADJUST_WALLET', 'WALLET', id, {
      previousBalance: currentBalance,
      newBalance: balance,
      diff,
    });

    res.json({
      success: true,
      message: 'Balance updated successfully',
      data: { balance: updatedWallet.balance },
    });
  } catch (err) {
    console.error('Update balance error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// PATCH /api/admin/users/:id/ban â€” temporary or permanent suspension
router.patch('/users/:id/ban', async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { banned, days, reason } = req.body as { banned: boolean; days?: number; reason?: string };

    if (typeof banned !== 'boolean') {
      res.status(400).json({ success: false, message: '"banned" must be a boolean' });
      return;
    }

    const banUntil = banned && typeof days === 'number' && days > 0
      ? new Date(Date.now() + days * 24 * 60 * 60 * 1000)
      : null; // no days provided while banning => permanent; unbanning always clears it

    const user = await prisma.user.update({
      where: { id },
      data: {
        isBanned: banned,
        banReason: banned ? (reason ?? null) : null,
        banUntil,
      },
      select: { id: true, name: true, email: true, isBanned: true, banReason: true, banUntil: true },
    });

    // SEC-10: audit trail
    await writeAuditLog(
      req,
      banned ? 'BAN' : 'UNBAN',
      'USER',
      id,
      banned ? { reason: reason ?? null, days: days ?? null, banUntil: banUntil?.toISOString() ?? null } : null,
    );

    res.json({ success: true, data: { user } });
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ success: false, message: 'User not found' }); return; }
    console.error('Ban user error:', err);
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
router.delete('/users/:id', requireAdminAuth(['SUPERADMIN']), async (req: Request, res: Response) => {
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

    // NotificationLog has no FK to User at all (recipientId is a plain
    // string, shared across User/Practitioner via recipientType), so unlike
    // Otp/RefreshToken/SupportTicket/DeviceToken â€” which cascade automatically
    // when the User row below is deleted â€” this needs an explicit delete or
    // it's orphaned forever.
    await prisma.notificationLog.deleteMany({ where: { recipientId: id, recipientType: 'USER' } });

    // Finally delete the user
    await prisma.user.delete({ where: { id } });

    // SEC-10: audit trail
    await writeAuditLog(req, 'DELETE_USER', 'USER', id, null);

    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// â”€â”€â”€ 5. Real Practitioner Management Table â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

    // SEC-10: audit trail
    await writeAuditLog(req, 'VERIFY_PRACTITIONER', 'PRACTITIONER', id, { isVerified });

    res.json({ success: true, data: { practitioner: updated } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// PATCH /api/admin/practitioners/:id/ban â€” temporary or permanent suspension
router.patch('/practitioners/:id/ban', async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { banned, days, reason } = req.body as { banned: boolean; days?: number; reason?: string };

    if (typeof banned !== 'boolean') {
      res.status(400).json({ success: false, message: '"banned" must be a boolean' });
      return;
    }

    const banUntil = banned && typeof days === 'number' && days > 0
      ? new Date(Date.now() + days * 24 * 60 * 60 * 1000)
      : null;

    const practitioner = await prisma.practitioner.update({
      where: { id },
      data: {
        isBanned: banned,
        banReason: banned ? (reason ?? null) : null,
        banUntil,
      },
      select: { id: true, name: true, email: true, isBanned: true, banReason: true, banUntil: true },
    });

    // SEC-10: audit trail
    await writeAuditLog(
      req,
      banned ? 'BAN' : 'UNBAN',
      'PRACTITIONER',
      id,
      banned ? { reason: reason ?? null, days: days ?? null, banUntil: banUntil?.toISOString() ?? null } : null,
    );

    res.json({ success: true, data: { practitioner } });
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ success: false, message: 'Practitioner not found' }); return; }
    console.error('Ban practitioner error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/admin/practitioners/:id
router.get('/practitioners/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const p = await prisma.practitioner.findUnique({
      where: { id },
      include: {
        _count: { select: { sessions: true } },
        reviews: { select: { rating: true, comment: true, createdAt: true } },
        sessions: { orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, type: true, status: true, totalCost: true, duration: true, createdAt: true } },
      },
    });
    if (!p) { res.status(404).json({ success: false, message: 'Practitioner not found' }); return; }
    const ratings = p.reviews.map(r => r.rating);
    const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
    res.json({
      success: true,
      data: {
        practitioner: {
          id: p.id, name: p.name, email: p.email, phone: p.phone,
          bio: p.bio, specialties: p.specialties, certifications: p.certifications,
          languages: p.languages, experienceYrs: p.experienceYrs, perMinuteRate: p.perMinuteRate,
          photoUrl: p.photoUrl, isVerified: p.isVerified, isOnline: p.isOnline,
          isBanned: p.isBanned, banReason: p.banReason, banUntil: p.banUntil,
          createdAt: p.createdAt, sessionCount: p._count.sessions,
          avgRating: Math.round(avgRating * 10) / 10,
          recentSessions: p.sessions,
          reviews: p.reviews,
        },
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// DELETE /api/admin/practitioners/:id
router.delete('/practitioners/:id', requireAdminAuth(['SUPERADMIN']), async (req: Request, res: Response) => {
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

    // See the same fix in DELETE /users/:id above â€” NotificationLog has no FK
    // and doesn't cascade with the rest.
    await prisma.notificationLog.deleteMany({ where: { recipientId: id, recipientType: 'PRACTITIONER' } });

    await prisma.practitioner.delete({ where: { id } });

    // SEC-10: audit trail
    await writeAuditLog(req, 'DELETE_PRACTITIONER', 'PRACTITIONER', id, null);

    res.json({ success: true, message: 'Practitioner deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// â”€â”€â”€ 6. Real Session Management Table â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
          scheduledStartTime: true,
          scheduledEndTime: true,
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
        scheduledStartTime: s.scheduledStartTime ? s.scheduledStartTime.toISOString() : null,
        scheduledEndTime: s.scheduledEndTime ? s.scheduledEndTime.toISOString() : null,
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

// â”€â”€â”€ 7. Real Chat Analytics â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ 8. Chat Session History â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/sessions/:id/chat', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const messages = await prisma.chatMessage.findMany({
      where: { sessionId: id },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ success: true, data: { messages } });
  } catch (err) {
    console.error('Chat history error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// â”€â”€â”€ 8.1 View Call Transcript â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/sessions/:id/transcript', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const transcript = await prisma.callTranscript.findUnique({
      where: { sessionId: id },
      include: { flaggedContent: true },
    });
    
    res.json({ success: true, data: { transcript } });
  } catch (err) {
    console.error('Fetch transcript error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// â”€â”€â”€ 8.2 Scan Transcript for Flags â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/sessions/:id/transcript/scan', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    
    const transcript = await prisma.callTranscript.findUnique({
      where: { sessionId: id },
    });
    
    if (!transcript) {
      res.status(404).json({ success: false, message: 'Transcript not found for this session' });
      return;
    }
    
    const result = scanContent(transcript.transcriptText);
    
    if (result.flagged) {
      await flagContentIfNeeded(
        transcript.transcriptText,
        'CALL_TRANSCRIPT',
        {
          sessionId: transcript.sessionId,
          userId: transcript.userId,
          practitionerId: transcript.practitionerId,
          transcriptId: transcript.id,
        }
      );
    }
    
    res.json({ success: true, data: { scanResult: result } });
  } catch (err) {
    console.error('Scan transcript error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// â”€â”€â”€ 9. Moderation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/moderation', requireAdmin, async (req: Request, res: Response) => {
  try {
    const statusParam = typeof req.query['status'] === 'string' ? req.query['status'] : undefined;
    const where: Prisma.FlaggedContentWhereInput = {};
    if (statusParam && statusParam !== 'all') {
      where.status = statusParam.toUpperCase();
    }
    const flagged = await prisma.flaggedContent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    // We need to fetch the related user/practitioner details manually since they aren't strict relations in the schema
    const results = await Promise.all(flagged.map(async (flag) => {
      let user = null;
      let practitioner = null;
      if (flag.userId) user = await prisma.user.findUnique({ where: { id: flag.userId }, select: { name: true, email: true } });
      if (flag.practitionerId) practitioner = await prisma.practitioner.findUnique({ where: { id: flag.practitionerId }, select: { name: true } });
      return { ...flag, user, practitioner };
    }));
    res.json({ success: true, data: { flagged: results } });
  } catch (err) {
    console.error('Moderation fetch error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.patch('/moderation/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { status } = req.body;
    const updated = await prisma.flaggedContent.update({
      where: { id },
      data: { status },
    });

    // SEC-10: audit trail
    await writeAuditLog(req, 'MODERATE', 'SESSION', id, { status });

    res.json({ success: true, data: { flagged: updated } });
  } catch (err) {
    console.error('Moderation update error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// â”€â”€â”€ 10. Contact Messages â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/messages', requireAdmin, async (req: Request, res: Response) => {
  try {
    const statusParam = typeof req.query['status'] === 'string' ? req.query['status'] : undefined;
    const where: any = {};
    if (statusParam && statusParam !== 'all') {
      where.status = statusParam;
    }
    const messages = await prisma.contactMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: { messages } });
  } catch (err) {
    console.error('Messages fetch error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.patch('/messages/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { status } = req.body;
    const updated = await prisma.contactMessage.update({
      where: { id },
      data: { status },
    });
    res.json({ success: true, data: { message: updated } });
  } catch (err) {
    console.error('Message update error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.delete('/messages/:id', requireAdminAuth(['SUPERADMIN']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    await prisma.contactMessage.delete({ where: { id } });
    res.json({ success: true, message: 'Message deleted' });
  } catch (err) {
    console.error('Message delete error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// â”€â”€â”€ 10b. Support Tickets â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/tickets', requireAdmin, async (req: Request, res: Response) => {
  try {
    const statusParam = typeof req.query['status'] === 'string' ? req.query['status'] : undefined;
    const where: any = {};
    if (statusParam && statusParam !== 'all') where.status = statusParam;

    const page = parseInt(String(req.query['page'] ?? '1'));
    const limit = Math.min(parseInt(String(req.query['limit'] ?? '20')), 100);
    const skip = (page - 1) * limit;

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true } },
          practitioner: { select: { id: true, name: true, email: true } },
          _count: { select: { messages: true } },
        },
      }),
      prisma.supportTicket.count({ where }),
    ]);

    res.json({
      success: true,
      data: { tickets, pagination: { total, page, limit, pages: Math.ceil(total / limit) } },
    });
  } catch (err) {
    console.error('Admin ticket list error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.get('/tickets/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        practitioner: { select: { id: true, name: true, email: true } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!ticket) {
      res.status(404).json({ success: false, message: 'Ticket not found' });
      return;
    }
    res.json({ success: true, data: { ticket } });
  } catch (err) {
    console.error('Admin ticket detail error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.post('/tickets/:id/messages', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { message, status } = req.body as { message?: string; status?: string };

    const ticket = await prisma.supportTicket.findUnique({ where: { id }, select: { id: true } });
    if (!ticket) {
      res.status(404).json({ success: false, message: 'Ticket not found' });
      return;
    }

    const validStatuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
    const nextStatus = status && validStatuses.includes(status) ? status : 'IN_PROGRESS';
    const trimmedMessage = message?.trim();

    const ticketMessage = await prisma.$transaction(async (tx) => {
      const created = trimmedMessage
        ? await tx.ticketMessage.create({ data: { ticketId: id, senderType: 'ADMIN', message: trimmedMessage } })
        : null;
      await tx.supportTicket.update({ where: { id }, data: { status: nextStatus } });
      return created;
    });

    // SEC-10: audit trail
    await writeAuditLog(req, 'TICKET_REPLY', 'SYSTEM', id, { status: nextStatus, replied: Boolean(trimmedMessage) });

    res.json({ success: true, data: { message: ticketMessage, status: nextStatus } });
  } catch (err) {
    console.error('Admin ticket reply error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// â”€â”€â”€ 11. DB Push (Temporary Migration Runner) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Runs `prisma db push --accept-data-loss`, which syncs the live DB schema to
// match schema.prisma and â€” unlike /migrate's additive, idempotent raw SQL â€”
// is explicitly allowed to DROP columns/tables/data that aren't in the
// current schema. Correctly `requireAdmin`-gated already, but the admin key
// alone isn't much friction against a single accidental/misdirected request
// (a saved script, a copy-pasted curl command, a stray retry) doing
// unrecoverable damage. Requires an explicit, unambiguous confirmation in the
// body on top of the admin key, same spirit as AWS/GCP "type the resource
// name to delete it" confirmations.
router.post('/db-push', requireAdmin, async (req: Request, res: Response) => {
  if (req.body?.confirm !== 'I_UNDERSTAND_DATA_LOSS') {
    res.status(400).json({
      success: false,
      message: 'This runs `prisma db push --accept-data-loss` against the live database and can drop columns/tables. Resend with { "confirm": "I_UNDERSTAND_DATA_LOSS" } in the body to proceed.',
    });
    return;
  }
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    const { stdout, stderr } = await execAsync('npx prisma db push --accept-data-loss');
    res.json({ success: true, stdout, stderr });
  } catch (err: any) {
    console.error('DB push error:', err);
    res.status(500).json({ success: false, message: err.message, stderr: err.stderr });
  }
});

// â”€â”€â”€ 12. Content Management (Blogs) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/blogs', requireAdmin, async (req: Request, res: Response) => {
  try {
    const blogs = await prisma.blog.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: { blogs } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/blogs', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { title, content, author, imageUrl, published } = req.body;
    const blog = await prisma.blog.create({ data: { title, content, author, imageUrl, published } });
    res.json({ success: true, data: { blog } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.patch('/blogs/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const blog = await prisma.blog.update({
      where: { id: req.params.id as string },
      data: req.body,
    });
    res.json({ success: true, data: { blog } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/blogs/:id', requireAdminAuth(['SUPERADMIN']), async (req: Request, res: Response) => {
  try {
    await prisma.blog.delete({ where: { id: req.params.id as string } });
    res.json({ success: true, message: 'Blog deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// â”€â”€â”€ 13. Content Management (FAQs) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/faqs', requireAdmin, async (req: Request, res: Response) => {
  try {
    const faqs = await prisma.faq.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: { faqs } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/faqs', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { question, answer, category } = req.body;
    const faq = await prisma.faq.create({ data: { question, answer, category } });
    res.json({ success: true, data: { faq } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.patch('/faqs/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const faq = await prisma.faq.update({
      where: { id: req.params.id as string },
      data: req.body,
    });
    res.json({ success: true, data: { faq } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/faqs/:id', requireAdminAuth(['SUPERADMIN']), async (req: Request, res: Response) => {
  try {
    await prisma.faq.delete({ where: { id: req.params.id as string } });
    res.json({ success: true, message: 'FAQ deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// â”€â”€â”€ 14. Content Management (Banners) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/banners', requireAdmin, async (req: Request, res: Response) => {
  try {
    const banners = await prisma.banner.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: { banners } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/banners', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { title, imageUrl, linkUrl, isActive } = req.body;
    const banner = await prisma.banner.create({ data: { title, imageUrl, linkUrl, isActive } });
    res.json({ success: true, data: { banner } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.patch('/banners/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const banner = await prisma.banner.update({
      where: { id: req.params.id as string },
      data: req.body,
    });
    res.json({ success: true, data: { banner } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/banners/:id', requireAdminAuth(['SUPERADMIN']), async (req: Request, res: Response) => {
  try {
    await prisma.banner.delete({ where: { id: req.params.id as string } });
    res.json({ success: true, message: 'Banner deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── 16. Astrologer Onboarding Applications ─────────────────────────────────
router.get('/astrologer-profiles', async (req: Request, res: Response) => {
  try {
    const search = typeof req.query['search'] === 'string' ? req.query['search'] : undefined;
    const status = typeof req.query['status'] === 'string' ? req.query['status'] : undefined;
    const page = Math.max(1, parseInt(String(req.query['page'] ?? '1'), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query['limit'] ?? '20'), 10) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.AstrologerProfileWhereInput = {};
    if (search) {
      where.OR = [
        { fullLegalName: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (status) where.applicationStatus = status;

    const [profiles, total] = await Promise.all([
      prisma.astrologerProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { email: true, phone: true } } },
      }),
      prisma.astrologerProfile.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        profiles: profiles.map(p => ({
          id: p.id,
          fullLegalName: p.fullLegalName,
          displayName: p.displayName,
          email: p.user?.email || '',
          phone: p.user?.phone || '',
          specializations: p.specializations,
          languages: p.languages,
          applicationStatus: p.applicationStatus,
          accountStatus: p.accountStatus,
          astrologyExperienceYears: p.astrologyExperienceYears,
          city: p.city,
          country: p.country,
          createdAt: p.createdAt,
        })),
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (err) {
    console.error('Astrologer profiles list error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.get('/astrologer-profiles/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const p = await prisma.astrologerProfile.findUnique({
      where: { id },
      include: {
        user: { select: { email: true, phone: true, name: true } },
        application: true,
        kycVerification: true,
        professionalVerification: true,
        adminReviews: { orderBy: { createdAt: 'desc' }, take: 3 },
      },
    });
    if (!p) { res.status(404).json({ success: false, message: 'Profile not found' }); return; }
    res.json({ success: true, data: { profile: p } });
  } catch (err) {
    console.error('Astrologer profile detail error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.patch('/astrologer-profiles/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { applicationStatus, accountStatus, rejectionReason } = req.body as { applicationStatus?: string; accountStatus?: string; rejectionReason?: string };
    const data: any = {};
    if (applicationStatus) data.applicationStatus = applicationStatus;
    if (accountStatus) data.accountStatus = accountStatus;
    if (rejectionReason !== undefined) data.rejectionReason = rejectionReason;
    if (applicationStatus === 'APPROVED') { data.adminVerified = true; data.approvedAt = new Date(); }
    const updated = await prisma.astrologerProfile.update({ where: { id }, data, select: { id: true, applicationStatus: true, accountStatus: true } });
    res.json({ success: true, data: { profile: updated } });
  } catch (err) {
    console.error('Astrologer profile status update error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ─── 15. Payouts (Stub) ────────────────────────────────────────────────────────
router.post('/payouts/:id/process', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { status, amount, practitionerId } = req.body;
    
    // In a real implementation, you would update the Payout model here and call Razorpay
    
    // 6. Notify Practitioner about payout
    if (status === 'SUCCESS' && practitionerId) {
      const { sendNotificationToPractitioner } = await import('../services/notification.service');
      await sendNotificationToPractitioner(practitionerId, {
        type: 'PAYOUT',
        title: 'Payout Processed',
        body: `Your payout of â‚¹${amount} has been successfully processed to your bank account.`,
        entityId: id
      });
    }

    res.json({ success: true, message: 'Payout processed' });
  } catch (err) {
    console.error('Payout processing error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// â”€â”€â”€ 16. Admin Audit Log â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// GET /api/admin/audit-log?action=BAN&targetType=USER&page=1&limit=50
// Read-only; filtered and paginated. Only the admin can call this (the whole
// router is behind requireAdmin so no extra guard needed here).
router.get('/audit-log', async (req: Request, res: Response) => {
  try {
    const action     = typeof req.query['action']     === 'string' ? req.query['action']     : undefined;
    const targetType = typeof req.query['targetType'] === 'string' ? req.query['targetType'] : undefined;
    const page  = Math.max(1, parseInt(typeof req.query['page']  === 'string' ? req.query['page']  : '1',  10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(typeof req.query['limit'] === 'string' ? req.query['limit'] : '50', 10) || 50));
    const skip  = (page - 1) * limit;

    const where: { action?: string; targetType?: string } = {};
    if (action)     where.action     = action;
    if (targetType) where.targetType = targetType;

    const [rows, total] = await Promise.all([
      prisma.adminAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.adminAuditLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        entries: rows,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (err) {
    console.error('Audit log fetch error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ─── 17. Reviews ─────────────────────────────────────────────────────────────
router.get('/reviews', async (req: Request, res: Response) => {
  try {
    const reviews = await prisma.review.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        practitioner: { select: { id: true, name: true } },
        session: { select: { id: true } }
      }
    });
    res.json({ success: true, data: { reviews } });
  } catch (err) {
    console.error('Reviews fetch error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.delete('/reviews/:id', requireAdminAuth(['SUPERADMIN', 'MODERATOR']), async (req: Request, res: Response) => {
  try {
    const id = req.params['id'];
    if (typeof id !== 'string' || !id) {
      res.status(400).json({ success: false, message: 'ID required' });
      return;
    }
    await prisma.review.delete({ where: { id } });
    await writeAuditLog(req, 'DELETE_REVIEW', 'REVIEW', id);
    res.json({ success: true, message: 'Review deleted successfully' });
  } catch (err) {
    console.error('Delete review error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
