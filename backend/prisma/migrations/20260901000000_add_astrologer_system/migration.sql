-- CreateTable: AstrologerProfile
CREATE TABLE "AstrologerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullLegalName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "gender" TEXT,
    "profilePhotoUrl" TEXT,
    "country" TEXT NOT NULL DEFAULT 'India',
    "state" TEXT,
    "city" TEXT,
    "specializations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "astrologyExperienceYears" INTEGER NOT NULL DEFAULT 0,
    "professionalConsultationYears" INTEGER NOT NULL DEFAULT 0,
    "previousPlatformExperience" TEXT,
    "professionalBio" TEXT,
    "consultationApproach" TEXT,
    "completedAstrologyCourse" BOOLEAN NOT NULL DEFAULT false,
    "instituteName" TEXT,
    "courseName" TEXT,
    "completionYear" INTEGER,
    "chatPricePerMin" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "callPricePerMin" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isChatAvailable" BOOLEAN NOT NULL DEFAULT false,
    "isCallAvailable" BOOLEAN NOT NULL DEFAULT false,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "avgRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "totalConsultations" INTEGER NOT NULL DEFAULT 0,
    "totalEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "identityVerified" BOOLEAN NOT NULL DEFAULT false,
    "professionalVerified" BOOLEAN NOT NULL DEFAULT false,
    "adminVerified" BOOLEAN NOT NULL DEFAULT false,
    "applicationStatus" TEXT NOT NULL DEFAULT 'DRAFT',
    "accountStatus" TEXT NOT NULL DEFAULT 'INACTIVE',
    "rejectionReason" TEXT,
    "suspensionReason" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AstrologerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AstrologerApplication
CREATE TABLE "AstrologerApplication" (
    "id" TEXT NOT NULL,
    "astrologerProfileId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "lastSavedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "step" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AstrologerApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AstrologerDocument
CREATE TABLE "AstrologerDocument" (
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

-- CreateTable: AstrologerKycVerification
CREATE TABLE "AstrologerKycVerification" (
    "id" TEXT NOT NULL,
    "astrologerProfileId" TEXT NOT NULL,
    "provider" TEXT,
    "verificationRefId" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "panLast4" TEXT,
    "idDocType" TEXT,
    "idDocVerified" BOOLEAN NOT NULL DEFAULT false,
    "bankAccountVerified" BOOLEAN NOT NULL DEFAULT false,
    "metadata" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AstrologerKycVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AstrologerProfessionalVerification
CREATE TABLE "AstrologerProfessionalVerification" (
    "id" TEXT NOT NULL,
    "astrologerProfileId" TEXT NOT NULL,
    "verificationType" TEXT,
    "documentReference" TEXT,
    "platformProfileUrl" TEXT,
    "professionalWebsite" TEXT,
    "notes" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AstrologerProfessionalVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AstrologerInterviewVerification
CREATE TABLE "AstrologerInterviewVerification" (
    "id" TEXT NOT NULL,
    "astrologerProfileId" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduledAt" TIMESTAMP(3),
    "meetingRefId" TEXT,
    "completedAt" TIMESTAMP(3),
    "reviewerId" TEXT,
    "result" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AstrologerInterviewVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AstrologerAdminReview
CREATE TABLE "AstrologerAdminReview" (
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

-- CreateTable: AstrologerAuditLog
CREATE TABLE "AstrologerAuditLog" (
    "id" TEXT NOT NULL,
    "astrologerProfileId" TEXT,
    "actorId" TEXT,
    "actorType" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "previousState" TEXT,
    "newState" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AstrologerAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AstrologerOtp
CREATE TABLE "AstrologerOtp" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AstrologerOtp_pkey" PRIMARY KEY ("id")
);

-- Unique indexes
CREATE UNIQUE INDEX "AstrologerProfile_userId_key" ON "AstrologerProfile"("userId");
CREATE UNIQUE INDEX "AstrologerApplication_astrologerProfileId_key" ON "AstrologerApplication"("astrologerProfileId");
CREATE UNIQUE INDEX "AstrologerKycVerification_astrologerProfileId_key" ON "AstrologerKycVerification"("astrologerProfileId");
CREATE UNIQUE INDEX "AstrologerProfessionalVerification_astrologerProfileId_key" ON "AstrologerProfessionalVerification"("astrologerProfileId");
CREATE UNIQUE INDEX "AstrologerInterviewVerification_astrologerProfileId_key" ON "AstrologerInterviewVerification"("astrologerProfileId");

-- Performance indexes
CREATE INDEX "AstrologerProfile_applicationStatus_idx" ON "AstrologerProfile"("applicationStatus");
CREATE INDEX "AstrologerProfile_accountStatus_idx" ON "AstrologerProfile"("accountStatus");
CREATE INDEX "AstrologerProfile_adminVerified_idx" ON "AstrologerProfile"("adminVerified");
CREATE INDEX "AstrologerDocument_astrologerProfileId_idx" ON "AstrologerDocument"("astrologerProfileId");
CREATE INDEX "AstrologerDocument_documentType_idx" ON "AstrologerDocument"("documentType");
CREATE INDEX "AstrologerKycVerification_verificationStatus_idx" ON "AstrologerKycVerification"("verificationStatus");
CREATE INDEX "AstrologerProfessionalVerification_status_idx" ON "AstrologerProfessionalVerification"("status");
CREATE INDEX "AstrologerAdminReview_astrologerProfileId_idx" ON "AstrologerAdminReview"("astrologerProfileId");
CREATE INDEX "AstrologerAdminReview_action_idx" ON "AstrologerAdminReview"("action");
CREATE INDEX "AstrologerAdminReview_createdAt_idx" ON "AstrologerAdminReview"("createdAt");
CREATE INDEX "AstrologerAuditLog_astrologerProfileId_idx" ON "AstrologerAuditLog"("astrologerProfileId");
CREATE INDEX "AstrologerAuditLog_actorId_idx" ON "AstrologerAuditLog"("actorId");
CREATE INDEX "AstrologerAuditLog_action_idx" ON "AstrologerAuditLog"("action");
CREATE INDEX "AstrologerAuditLog_createdAt_idx" ON "AstrologerAuditLog"("createdAt");
CREATE INDEX "AstrologerOtp_phone_idx" ON "AstrologerOtp"("phone");

-- Foreign Keys
ALTER TABLE "AstrologerProfile" ADD CONSTRAINT "AstrologerProfile_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AstrologerApplication" ADD CONSTRAINT "AstrologerApplication_astrologerProfileId_fkey"
    FOREIGN KEY ("astrologerProfileId") REFERENCES "AstrologerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AstrologerDocument" ADD CONSTRAINT "AstrologerDocument_astrologerProfileId_fkey"
    FOREIGN KEY ("astrologerProfileId") REFERENCES "AstrologerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AstrologerKycVerification" ADD CONSTRAINT "AstrologerKycVerification_astrologerProfileId_fkey"
    FOREIGN KEY ("astrologerProfileId") REFERENCES "AstrologerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AstrologerProfessionalVerification" ADD CONSTRAINT "AstrologerProfessionalVerification_astrologerProfileId_fkey"
    FOREIGN KEY ("astrologerProfileId") REFERENCES "AstrologerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AstrologerInterviewVerification" ADD CONSTRAINT "AstrologerInterviewVerification_astrologerProfileId_fkey"
    FOREIGN KEY ("astrologerProfileId") REFERENCES "AstrologerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AstrologerAdminReview" ADD CONSTRAINT "AstrologerAdminReview_astrologerProfileId_fkey"
    FOREIGN KEY ("astrologerProfileId") REFERENCES "AstrologerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AstrologerAuditLog" ADD CONSTRAINT "AstrologerAuditLog_astrologerProfileId_fkey"
    FOREIGN KEY ("astrologerProfileId") REFERENCES "AstrologerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
