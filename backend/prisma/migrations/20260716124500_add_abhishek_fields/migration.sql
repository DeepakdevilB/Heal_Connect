-- Add new fields to User table
ALTER TABLE "User" 
  ADD COLUMN "birthPlace" TEXT,
  ADD COLUMN "wellnessInterests" TEXT[],
  ADD COLUMN "photoUrl" TEXT;

-- Add new fields to Practitioner table
ALTER TABLE "Practitioner" 
  ADD COLUMN "passwordHash" TEXT,
  ADD COLUMN "certifications" TEXT[],
  ADD COLUMN "photoUrl" TEXT;
