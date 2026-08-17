/**
 * migrationSql.ts — single source of truth for the hand-written, idempotent
 * raw-SQL migrations this codebase runs outside `prisma migrate` (Azure's
 * managed Postgres doesn't give this app migrate-shadow-database access, so
 * schema changes are applied via `CREATE TABLE IF NOT EXISTS` / `ADD COLUMN
 * IF NOT EXISTS` instead).
 *
 * Previously this SQL was duplicated across two different files —
 * `routes/migrate.ts` (`GET /api/migrate/run`, old shared-key auth) and
 * `routes/admin.ts` (`ALL /api/admin/migrate`, new per-admin SUPERADMIN
 * auth) — with DIFFERENT, only-partially-overlapping table lists. That
 * split meant the UI-reachable `/api/admin/migrate` button (the one the
 * "Run Migration" action in the admin panel calls) would silently never
 * create `AdminUser`, `AdminAuditLog`, `CallTranscript`, or `FlaggedContent`
 * — those only existed in the other, curl-only route. It also meant
 * admin.ts's own `ALTER TABLE "CallTranscript" ADD COLUMN ...` statement
 * would throw "relation does not exist" if ever run before the other
 * route's `CREATE TABLE "CallTranscript"` had a chance to run first.
 *
 * Both routes now import FULL_MIGRATION_SQL from here so there is exactly
 * one copy, correctly ordered (tables created before anything ALTERs them),
 * and both entry points stay in sync automatically as new statements are
 * added in the future.
 *
 * Every statement is safe to run repeatedly (IF NOT EXISTS / idempotent
 * UPDATE) and safe to run in any order relative to the app's own code —
 * these only add things Prisma's schema already expects to exist.
 */
export const FULL_MIGRATION_SQL = `
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

CREATE TABLE IF NOT EXISTS "SupportTicket" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "practitionerId" TEXT,
    "subject" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TicketMessage" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "senderType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TicketMessage_pkey" PRIMARY KEY ("id")
);

-- Ban fields
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isBanned" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN IF NOT EXISTS "banReason" TEXT, ADD COLUMN IF NOT EXISTS "banUntil" TIMESTAMP(3);
ALTER TABLE "Practitioner" ADD COLUMN IF NOT EXISTS "isBanned" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN IF NOT EXISTS "banReason" TEXT, ADD COLUMN IF NOT EXISTS "banUntil" TIMESTAMP(3);
ALTER TABLE "Practitioner" ADD COLUMN IF NOT EXISTS "googleId" TEXT UNIQUE;

-- GDPR fields
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "erasedAt" TIMESTAMP(3);
ALTER TABLE "Practitioner" ADD COLUMN IF NOT EXISTS "erasedAt" TIMESTAMP(3);
ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "purgedAt" TIMESTAMP(3);
ALTER TABLE "CallTranscript" ADD COLUMN IF NOT EXISTS "purgedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "Consent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "practitionerId" TEXT,
    "visitorId" TEXT,
    "category" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'BANNER',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Consent_pkey" PRIMARY KEY ("id")
);

-- Mehak's merged tables
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "scheduledStartTime" TIMESTAMP(3), ADD COLUMN IF NOT EXISTS "scheduledEndTime" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "DeviceToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "practitionerId" TEXT,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DeviceToken_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "DeviceToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
    CONSTRAINT "DeviceToken_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "Practitioner"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "DeviceToken_token_key" ON "DeviceToken"("token");

CREATE TABLE IF NOT EXISTS "NotificationLog" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "recipientType" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "entityId" TEXT,
    "status" TEXT NOT NULL,
    "errorMsg" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SessionTimeProposal" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "proposedBy" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    CONSTRAINT "SessionTimeProposal_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SessionTimeProposal_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "SessionReminder" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "reminderType" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sent" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SessionReminder_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SessionReminder_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE
);

-- Practitioner rating denormalization
ALTER TABLE "Practitioner" ADD COLUMN IF NOT EXISTS "avgRating" DOUBLE PRECISION NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS "reviewCount" INTEGER NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS "isBusy" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS "Transaction_referenceId_key" ON "Transaction"("referenceId") WHERE "referenceId" IS NOT NULL;

UPDATE "Practitioner" p SET "avgRating" = COALESCE((SELECT ROUND(AVG(r.rating)::numeric, 1) FROM "Review" r WHERE r."practitionerId" = p.id), 0), "reviewCount" = COALESCE((SELECT COUNT(*) FROM "Review" r WHERE r."practitionerId" = p.id), 0);

-- SEC-10: Admin audit log (idempotent)
CREATE TABLE IF NOT EXISTS "AdminAuditLog" (
  "id"          TEXT      NOT NULL,
  "adminLabel"  TEXT      NOT NULL,
  "action"      TEXT      NOT NULL,
  "targetType"  TEXT      NOT NULL,
  "targetId"    TEXT,
  "meta"        TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AdminAuditLog_action_idx"         ON "AdminAuditLog"("action");
CREATE INDEX IF NOT EXISTS "AdminAuditLog_targetType_idx"     ON "AdminAuditLog"("targetType", "targetId");
CREATE INDEX IF NOT EXISTS "AdminAuditLog_createdAt_idx"      ON "AdminAuditLog"("createdAt");

-- CONS-01/02: consent categories + policy version stamp (idempotent)
ALTER TABLE "Consent" ADD COLUMN IF NOT EXISTS "policyVersion" TEXT;
UPDATE "Consent" SET category = 'EMAIL_MARKETING' WHERE category = 'MARKETING';

-- SEC-04/05: Per-admin accounts, RBAC & MFA (idempotent)
CREATE TABLE IF NOT EXISTS "AdminUser" (
  "id"            TEXT      NOT NULL,
  "email"         TEXT      NOT NULL,
  "passwordHash"  TEXT      NOT NULL,
  "role"          TEXT      NOT NULL DEFAULT 'MODERATOR',
  "mfaSecret"     TEXT,
  "mfaEnabled"    BOOLEAN   NOT NULL DEFAULT false,
  "loginToken"    TEXT,
  "loginTokenExp" TIMESTAMP(3),
  "lastLoginAt"   TIMESTAMP(3),
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById"   TEXT,
  CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AdminUser_email_key" ON "AdminUser"("email");
CREATE INDEX IF NOT EXISTS "AdminUser_email_idx" ON "AdminUser"("email");
`;

/**
 * Split out because it's expected to occasionally fail on databases with
 * pre-existing duplicate (sessionId, participantId, reminderType) rows —
 * callers should run this in its own try/catch and not let it abort the
 * rest of the migration.
 */
export const SESSION_REMINDER_UNIQUE_INDEX_SQL = `CREATE UNIQUE INDEX IF NOT EXISTS "SessionReminder_sessionId_participantId_reminderType_key" ON "SessionReminder"("sessionId", "participantId", "reminderType");`;
