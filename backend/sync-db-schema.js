const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:test@127.0.0.1:5432/healconnect?schema=public'
});

async function main() {
  console.log('Running comprehensive database column & table sync...');

  const queries = [
    // ─── Practitioner ───
    `ALTER TABLE "Practitioner" ADD COLUMN IF NOT EXISTS "googleId" TEXT;`,
    `ALTER TABLE "Practitioner" ADD COLUMN IF NOT EXISTS "phone" TEXT;`,
    `ALTER TABLE "Practitioner" ADD COLUMN IF NOT EXISTS "email" TEXT;`,
    `ALTER TABLE "Practitioner" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;`,
    `ALTER TABLE "Practitioner" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT 'Practitioner';`,
    `ALTER TABLE "Practitioner" ADD COLUMN IF NOT EXISTS "bio" TEXT;`,
    `ALTER TABLE "Practitioner" ADD COLUMN IF NOT EXISTS "specialties" TEXT[] DEFAULT ARRAY[]::TEXT[];`,
    `ALTER TABLE "Practitioner" ADD COLUMN IF NOT EXISTS "certifications" TEXT[] DEFAULT ARRAY[]::TEXT[];`,
    `ALTER TABLE "Practitioner" ADD COLUMN IF NOT EXISTS "languages" TEXT[] DEFAULT ARRAY[]::TEXT[];`,
    `ALTER TABLE "Practitioner" ADD COLUMN IF NOT EXISTS "experienceYrs" INTEGER NOT NULL DEFAULT 0;`,
    `ALTER TABLE "Practitioner" ADD COLUMN IF NOT EXISTS "perMinuteRate" DOUBLE PRECISION NOT NULL DEFAULT 0;`,
    `ALTER TABLE "Practitioner" ADD COLUMN IF NOT EXISTS "photoUrl" TEXT;`,
    `ALTER TABLE "Practitioner" ADD COLUMN IF NOT EXISTS "isVerified" BOOLEAN NOT NULL DEFAULT false;`,
    `ALTER TABLE "Practitioner" ADD COLUMN IF NOT EXISTS "isOnline" BOOLEAN NOT NULL DEFAULT false;`,
    `ALTER TABLE "Practitioner" ADD COLUMN IF NOT EXISTS "isBusy" BOOLEAN NOT NULL DEFAULT false;`,
    `ALTER TABLE "Practitioner" ADD COLUMN IF NOT EXISTS "avgRating" DOUBLE PRECISION NOT NULL DEFAULT 0;`,
    `ALTER TABLE "Practitioner" ADD COLUMN IF NOT EXISTS "reviewCount" INTEGER NOT NULL DEFAULT 0;`,
    `ALTER TABLE "Practitioner" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;`,
    `ALTER TABLE "Practitioner" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;`,
    `ALTER TABLE "Practitioner" ADD COLUMN IF NOT EXISTS "isBanned" BOOLEAN NOT NULL DEFAULT false;`,
    `ALTER TABLE "Practitioner" ADD COLUMN IF NOT EXISTS "banReason" TEXT;`,
    `ALTER TABLE "Practitioner" ADD COLUMN IF NOT EXISTS "banUntil" TIMESTAMP(3);`,
    `ALTER TABLE "Practitioner" ADD COLUMN IF NOT EXISTS "erasedAt" TIMESTAMP(3);`,

    // ─── User ───
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "email" TEXT;`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "name" TEXT;`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "dob" TIMESTAMP(3);`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "birthPlace" TEXT;`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "gender" TEXT;`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "wellnessInterests" TEXT[] DEFAULT ARRAY[]::TEXT[];`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "photoUrl" TEXT;`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isEmailVerified" BOOLEAN NOT NULL DEFAULT false;`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerifyToken" TEXT;`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerifyExpiry" TIMESTAMP(3);`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isPhoneVerified" BOOLEAN NOT NULL DEFAULT false;`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordResetToken" TEXT;`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordResetExpiry" TIMESTAMP(3);`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "googleId" TEXT;`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "appleId" TEXT;`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "provider" TEXT NOT NULL DEFAULT 'email';`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isBanned" BOOLEAN NOT NULL DEFAULT false;`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "banReason" TEXT;`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "banUntil" TIMESTAMP(3);`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "erasedAt" TIMESTAMP(3);`,

    // ─── Session ───
    `ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "channelName" TEXT;`,
    `ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "agoraUid" INTEGER;`,
    `ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "perMinuteRate" DOUBLE PRECISION NOT NULL DEFAULT 0;`,
    `ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "walletDeduction" DOUBLE PRECISION NOT NULL DEFAULT 0;`,
    `ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "duration" INTEGER NOT NULL DEFAULT 0;`,
    `ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "startTime" TIMESTAMP(3);`,
    `ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "endTime" TIMESTAMP(3);`,
    `ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "scheduledStartTime" TIMESTAMP(3);`,
    `ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "scheduledEndTime" TIMESTAMP(3);`,
    `ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0;`,
    `ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;`,
    `ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;`
  ];

  for (const q of queries) {
    try {
      await pool.query(q);
    } catch (e) {
      console.warn('Query warning:', q, e.message);
    }
  }

  console.log('✅ Sync completed.');
  await pool.end();
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
