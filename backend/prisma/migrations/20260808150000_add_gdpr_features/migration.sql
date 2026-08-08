-- GDPR: right-to-erasure markers on User / Practitioner (anonymize, don't hard-delete
-- rows that are referenced by Session/Review/Transaction for financial/audit reasons)
ALTER TABLE "User"
  ADD COLUMN "erasedAt" TIMESTAMP(3);

ALTER TABLE "Practitioner"
  ADD COLUMN "erasedAt" TIMESTAMP(3);

-- GDPR: retention-purge markers on the two tables that can hold special-category
-- content (chat messages, call transcripts). Row is kept; only the text is wiped.
ALTER TABLE "ChatMessage"
  ADD COLUMN "purgedAt" TIMESTAMP(3);

ALTER TABLE "CallTranscript"
  ADD COLUMN "purgedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Consent" (
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

-- CreateTable
CREATE TABLE "PrivacyRequestLog" (
    "id" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrivacyRequestLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Consent_userId_idx" ON "Consent"("userId");

-- CreateIndex
CREATE INDEX "Consent_practitionerId_idx" ON "Consent"("practitionerId");

-- CreateIndex
CREATE INDEX "Consent_visitorId_idx" ON "Consent"("visitorId");

-- CreateIndex
CREATE INDEX "Consent_category_idx" ON "Consent"("category");

-- CreateIndex
CREATE INDEX "PrivacyRequestLog_subjectId_idx" ON "PrivacyRequestLog"("subjectId");

-- AddForeignKey
-- SET NULL (not CASCADE): Consent is an audit log and should outlive a hard-deleted
-- User/Practitioner row (see admin.ts DELETE routes), just detached from the account.
ALTER TABLE "Consent" ADD CONSTRAINT "Consent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consent" ADD CONSTRAINT "Consent_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "Practitioner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
