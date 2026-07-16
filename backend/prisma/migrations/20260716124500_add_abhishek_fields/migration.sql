-- Add new fields to User table
ALTER TABLE "User" 
  ADD COLUMN "passwordHash" TEXT,
  ADD COLUMN "birthPlace" TEXT,
  ADD COLUMN "wellnessInterests" TEXT[],
  ADD COLUMN "photoUrl" TEXT,
  ADD COLUMN "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "emailVerifyToken" TEXT,
  ADD COLUMN "emailVerifyExpiry" TIMESTAMP(3),
  ADD COLUMN "passwordResetToken" TEXT,
  ADD COLUMN "passwordResetExpiry" TIMESTAMP(3),
  ADD COLUMN "googleId" TEXT,
  ADD COLUMN "appleId" TEXT,
  ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'email';

-- Create unique indexes for User
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
CREATE UNIQUE INDEX "User_appleId_key" ON "User"("appleId");

-- Add new fields to Practitioner table
ALTER TABLE "Practitioner" 
  ADD COLUMN "passwordHash" TEXT,
  ADD COLUMN "certifications" TEXT[],
  ADD COLUMN "photoUrl" TEXT;

-- Create RefreshToken table
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- Create indexes for RefreshToken
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- Add foreign key constraint
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
