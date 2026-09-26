-- scripts/message-profiles-schema.sql
-- Conversation Assistant profiles (prisma/schema.prisma -> model
-- MessageProfile) plus the per-user default that Settings writes.
--
-- Idempotent, same pattern as scripts/connection-profiles-schema.sql: safe to
-- re-run, and safe to run before the code that uses it is deployed.
--
-- Run this in Supabase BEFORE deploying, then seed the built-in profiles with:
--   node scripts/seed-message-profiles.js

CREATE TABLE IF NOT EXISTS "MessageProfile" (
  "id"            TEXT PRIMARY KEY,
  "userId"        TEXT,
  "name"          TEXT NOT NULL,
  "goal"          TEXT NOT NULL,
  "tone"          TEXT NOT NULL,
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
    SELECT 1 FROM pg_constraint WHERE conname = 'MessageProfile_userId_fkey'
  ) THEN
    ALTER TABLE "MessageProfile"
      ADD CONSTRAINT "MessageProfile_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "MessageProfile_userId_idx" ON "MessageProfile"("userId");

-- The user's chosen default message profile (User.defaultMessageProfileId).
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "defaultMessageProfileId" TEXT;
