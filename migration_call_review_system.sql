-- =============================================================================
-- HealConnect Migration: call-review-system
-- Branch: priyanshu/call-review-system
--
-- ⚠️  CAUTION: DO NOT APPLY TO PRODUCTION without explicit review.
-- Apply via the documented /api/migrate bypass endpoint ONLY after local testing.
-- Test locally first:
--   docker run -d -e POSTGRES_PASSWORD=test -e POSTGRES_DB=healconnect \
--     -p 5433:5432 postgres:15
--   psql postgresql://postgres:test@localhost:5433/healconnect -f migration_call_review_system.sql
-- =============================================================================

-- ─── Task 2: CallTranscript table ────────────────────────────────────────────
-- Stores call/audio/video session transcripts submitted by users after calls end.
-- One transcript per session (enforced by UNIQUE on sessionId).

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
  CONSTRAINT "CallTranscript_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "CallTranscript_sessionId_idx"
  ON "CallTranscript"("sessionId");

-- ─── Tasks 3 & 4: FlaggedContent table ───────────────────────────────────────
-- Stores all content flagged by the moderation pipeline for human review.
-- source: "CHAT" | "CALL_TRANSCRIPT"
-- reason: "PHONE_NUMBER" | "OFF_PLATFORM_CONTACT" | "HARASSMENT" | "SELF_HARM"
-- status: "PENDING" | "RESOLVED" | "DISMISSED"

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
  CONSTRAINT "FlaggedContent_transcriptId_fkey"
    FOREIGN KEY ("transcriptId") REFERENCES "CallTranscript"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "FlaggedContent_status_idx"
  ON "FlaggedContent"("status");
CREATE INDEX IF NOT EXISTS "FlaggedContent_source_idx"
  ON "FlaggedContent"("source");
CREATE INDEX IF NOT EXISTS "FlaggedContent_sessionId_idx"
  ON "FlaggedContent"("sessionId");

-- ─── Task 5: Denormalized rating stats on Practitioner ───────────────────────
-- avgRating and reviewCount are updated atomically on each review submission.
-- Default 0 means practitioners with no reviews sort to the bottom.

ALTER TABLE "Practitioner"
  ADD COLUMN IF NOT EXISTS "avgRating"   DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "reviewCount" INTEGER          NOT NULL DEFAULT 0;

-- ─── Tasks 8/9: Partial unique index on Transaction.referenceId ───────────────
-- Prevents duplicate SUCCESS/PENDING transactions for the same payment reference.
-- PARTIAL (WHERE referenceId IS NOT NULL) so internal transactions with NULL
-- referenceId (e.g. billing debits) are unaffected.
-- NOTE: Prisma schema has @unique on referenceId — this index is the DB-level
-- enforcement. Drop any conflicting index first if it already exists.

CREATE UNIQUE INDEX IF NOT EXISTS "Transaction_referenceId_key"
  ON "Transaction"("referenceId")
  WHERE "referenceId" IS NOT NULL;

-- ─── Backfill: recalculate avgRating and reviewCount for existing practitioners
-- Safe to run multiple times (idempotent update).

UPDATE "Practitioner" p
SET
  "avgRating"   = COALESCE((
    SELECT ROUND(AVG(r.rating)::numeric, 1)
    FROM "Review" r
    WHERE r."practitionerId" = p.id
  ), 0),
  "reviewCount" = COALESCE((
    SELECT COUNT(*)
    FROM "Review" r
    WHERE r."practitionerId" = p.id
  ), 0);
