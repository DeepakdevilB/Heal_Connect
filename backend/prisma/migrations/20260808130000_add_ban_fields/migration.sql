-- Add moderation (temporary/permanent suspension) fields to User table
ALTER TABLE "User"
  ADD COLUMN "isBanned" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "banReason" TEXT,
  ADD COLUMN "banUntil" TIMESTAMP(3);

-- Add moderation (temporary/permanent suspension) fields to Practitioner table
ALTER TABLE "Practitioner"
  ADD COLUMN "isBanned" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "banReason" TEXT,
  ADD COLUMN "banUntil" TIMESTAMP(3);
