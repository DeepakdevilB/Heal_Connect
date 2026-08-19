-- Add missing columns to Session table
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "scheduledStartTime" TIMESTAMP(3);
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "scheduledEndTime" TIMESTAMP(3);

-- Add missing Astrologer tables if not exist
CREATE TABLE IF NOT EXISTS "AstrologerOtp" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'login',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AstrologerOtp_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AstrologerOtp_phone_idx" ON "AstrologerOtp"("phone");

CREATE TABLE IF NOT EXISTS "AstrologerDocument" (
    "id" TEXT NOT NULL,
    "astrologerProfileId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "blobUrl" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "isPrivate" BOOLEAN NOT NULL DEFAULT true,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AstrologerDocument_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AstrologerDocument_astrologerProfileId_idx" ON "AstrologerDocument"("astrologerProfileId");

CREATE TABLE IF NOT EXISTS "AstrologerKycVerification" (
    "id" TEXT NOT NULL,
    "astrologerProfileId" TEXT NOT NULL,
    "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "idDocType" TEXT,
    "panLast4" TEXT,
    "submittedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AstrologerKycVerification_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AstrologerKycVerification_astrologerProfileId_key" UNIQUE ("astrologerProfileId")
);

CREATE TABLE IF NOT EXISTS "AstrologerProfessionalVerification" (
    "id" TEXT NOT NULL,
    "astrologerProfileId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "verificationType" TEXT,
    "platformProfileUrl" TEXT,
    "professionalWebsite" TEXT,
    "notes" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AstrologerProfessionalVerification_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AstrologerProfessionalVerification_astrologerProfileId_key" UNIQUE ("astrologerProfileId")
);

CREATE TABLE IF NOT EXISTS "AstrologerInterviewVerification" (
    "id" TEXT NOT NULL,
    "astrologerProfileId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "scheduledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AstrologerInterviewVerification_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AstrologerInterviewVerification_astrologerProfileId_key" UNIQUE ("astrologerProfileId")
);

CREATE TABLE IF NOT EXISTS "AstrologerAdminReview" (
    "id" TEXT NOT NULL,
    "astrologerProfileId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "notes" TEXT,
    "previousStatus" TEXT,
    "newStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AstrologerAdminReview_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AstrologerAdminReview_astrologerProfileId_idx" ON "AstrologerAdminReview"("astrologerProfileId");

-- Add missing columns to AstrologerProfile if not exist
ALTER TABLE "AstrologerProfile" ADD COLUMN IF NOT EXISTS "approvedBy" TEXT;
ALTER TABLE "AstrologerProfile" ADD COLUMN IF NOT EXISTS "suspensionReason" TEXT;
ALTER TABLE "AstrologerProfile" ADD COLUMN IF NOT EXISTS "totalConsultations" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AstrologerProfile" ADD COLUMN IF NOT EXISTS "totalEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "AstrologerProfile" ADD COLUMN IF NOT EXISTS "avgRating" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "AstrologerProfile" ADD COLUMN IF NOT EXISTS "reviewCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AstrologerProfile" ADD COLUMN IF NOT EXISTS "chatPricePerMin" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "AstrologerProfile" ADD COLUMN IF NOT EXISTS "callPricePerMin" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "AstrologerProfile" ADD COLUMN IF NOT EXISTS "isOnline" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AstrologerProfile" ADD COLUMN IF NOT EXISTS "isChatAvailable" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AstrologerProfile" ADD COLUMN IF NOT EXISTS "isCallAvailable" BOOLEAN NOT NULL DEFAULT false;

-- Add missing columns to AstrologerApplication if not exist
ALTER TABLE "AstrologerApplication" ADD COLUMN IF NOT EXISTS "lastSavedAt" TIMESTAMP(3);
ALTER TABLE "AstrologerApplication" ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMP(3);
