-- scripts/connection-profiles-schema.sql
-- Connection Note profiles (prisma/schema.prisma -> model ConnectionProfile)
-- plus the per-user default that Settings writes.
--
-- Idempotent, same pattern as scripts/settings-schema.sql: safe to re-run, and
-- safe to run before the code that uses it is deployed.
--
-- Run this in Supabase BEFORE deploying, then seed the built-in profiles with:
--   node scripts/seed-connection-profiles.js

CREATE TABLE IF NOT EXISTS "ConnectionProfile" (
  "id"            TEXT PRIMARY KEY,
  "userId"        TEXT,
  "name"          TEXT NOT NULL,
  "angle"         TEXT NOT NULL,
  "goal"          TEXT NOT NULL,
  "tone"          TEXT NOT NULL,
  "length"        TEXT NOT NULL,
  "alwaysDo"      TEXT,
  "neverDo"       TEXT,
  "samples"       TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "isDefault"     BOOLEAN NOT NULL DEFAULT false,
  "isSystem"      BOOLEAN NOT NULL DEFAULT false,
  "isRecommended" BOOLEAN NOT NULL DEFAULT false,
  "testsUsed"     INTEGER NOT NULL DEFAULT 0,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Cascade matches the Prisma relation: deleting a user removes their custom
-- profiles. System profiles have a NULL userId and are never touched.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ConnectionProfile_userId_fkey'
  ) THEN
    ALTER TABLE "ConnectionProfile"
      ADD CONSTRAINT "ConnectionProfile_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "ConnectionProfile_userId_idx" ON "ConnectionProfile"("userId");

-- The user's chosen default connection profile (User.defaultConnectionProfileId).
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "defaultConnectionProfileId" TEXT;
