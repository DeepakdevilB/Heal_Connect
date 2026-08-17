import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAdmin } from '../middleware/auth';
import { FULL_MIGRATION_SQL, SESSION_REMINDER_UNIQUE_INDEX_SQL } from '../lib/migrationSql';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const router = Router();

// SEC-04/05 bootstrap note: this route is intentionally still gated by the
// OLD shared-key `requireAdmin` (x-admin-key), not the new per-admin
// `requireAdminAuth`. That's required, not a leftover — on a fresh deploy
// no AdminUser row exists yet, so nothing could ever obtain a SUPERADMIN
// session to pass the new gate. This route is the one-time bootstrap path:
// call it once (with x-admin-key) after first deploy to create every table
// this app needs, including AdminUser itself, and seed the first SUPERADMIN
// from ADMIN_LOGIN_EMAIL/ADMIN_LOGIN_PASSWORD. There is no UI button for
// this — it's meant to be curl'd/Postman'd once. After that, use the
// "Run Migration" button in the admin panel (ALL /api/admin/migrate) for
// any future schema additions; it runs this same shared SQL.
router.get('/run', requireAdmin, async (req: Request, res: Response) => {
  try {
    await prisma.$executeRawUnsafe(FULL_MIGRATION_SQL);
    try {
      await prisma.$executeRawUnsafe(SESSION_REMINDER_UNIQUE_INDEX_SQL);
    } catch (e) { /* pre-existing duplicate rows on some databases — non-fatal */ }

    // SEC-04/05: Bootstrap â€” if no AdminUser rows exist yet, auto-seed the
    // SUPERADMIN from the existing env-var credentials so the admin doesn't
    // lose access after this deploy. This is a one-time idempotent operation.
    const adminCount = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint as count FROM "AdminUser"
    `;
    const count = Number(adminCount[0]?.count ?? 0);

    const bootstrapEmail = process.env['ADMIN_LOGIN_EMAIL'];
    const bootstrapPassword = process.env['ADMIN_LOGIN_PASSWORD'];

    if (count === 0 && bootstrapEmail && bootstrapPassword) {
      const passwordHash = await bcrypt.hash(bootstrapPassword, 12);
      const now = new Date().toISOString();
      await prisma.$executeRawUnsafe(
        `INSERT INTO "AdminUser" ("id","email","passwordHash","role","mfaEnabled","createdAt","updatedAt")
         VALUES ($1, $2, $3, 'SUPERADMIN', false, $4, $4)
         ON CONFLICT ("email") DO NOTHING`,
        randomUUID(),
        bootstrapEmail,
        passwordHash,
        now,
      );
      console.log(`[migrate] Bootstrap SUPERADMIN seeded for ${bootstrapEmail}`);
    }

    res.json({ success: true, message: 'SQL Migration applied successfully' });
  } catch (error: any) {
    console.error(`Migration error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;