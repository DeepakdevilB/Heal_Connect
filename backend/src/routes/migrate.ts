import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

const migrationSql = `
CREATE TABLE IF NOT EXISTS "CallTranscript" (
  "id"             TEXT NOT NULL,
  "sessionId"      TEXT NOT NULL,
  "transcriptText" TEXT NOT NULL,
  "userId"         TEXT NOT NULL,
  "practitionerId" TEXT NOT NULL,
  "submittedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CallTranscript_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CallTranscript_sessionId_key" UNIQUE ("sessionId"),
  CONSTRAINT "CallTranscript_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "CallTranscript_sessionId_idx" ON "CallTranscript"("sessionId");

CREATE TABLE IF NOT EXISTS "FlaggedContent" (
  "id"             TEXT NOT NULL,
  "source"         TEXT NOT NULL,
  "contentSnippet" TEXT NOT NULL,
  "reason"         TEXT NOT NULL,
  "status"         TEXT NOT NULL DEFAULT 'PENDING',
  "userId"         TEXT,
  "practitionerId" TEXT,
  "sessionId"      TEXT,
  "chatMessageId"  TEXT,
  "transcriptId"   TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FlaggedContent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FlaggedContent_transcriptId_fkey" FOREIGN KEY ("transcriptId") REFERENCES "CallTranscript"("id") ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "FlaggedContent_status_idx" ON "FlaggedContent"("status");
CREATE INDEX IF NOT EXISTS "FlaggedContent_source_idx" ON "FlaggedContent"("source");
CREATE INDEX IF NOT EXISTS "FlaggedContent_sessionId_idx" ON "FlaggedContent"("sessionId");

ALTER TABLE "Practitioner" ADD COLUMN IF NOT EXISTS "avgRating" DOUBLE PRECISION NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS "reviewCount" INTEGER NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS "isBusy" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS "Transaction_referenceId_key" ON "Transaction"("referenceId") WHERE "referenceId" IS NOT NULL;

UPDATE "Practitioner" p SET "avgRating" = COALESCE((SELECT ROUND(AVG(r.rating)::numeric, 1) FROM "Review" r WHERE r."practitionerId" = p.id), 0), "reviewCount" = COALESCE((SELECT COUNT(*) FROM "Review" r WHERE r."practitionerId" = p.id), 0);
`;

router.get('/run', async (req: Request, res: Response) => {
  try {
    await prisma.$executeRawUnsafe(migrationSql);
    res.json({ success: true, message: 'SQL Migration applied successfully' });
  } catch (error: any) {
    console.error(`Migration error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
