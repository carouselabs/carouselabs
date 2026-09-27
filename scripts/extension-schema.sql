-- scripts/extension-schema.sql
-- Everything the LinkedIn extension's paywall and its website section need
-- (prisma/schema.prisma):
--   1. The paywall: User.extensionTrialUsed (10 free generations per account
--      for life) and the ExtensionSubscription table ($15/month).
--   2. History for every kind of generation: CommentHistory.kind and
--      .profileName, and profileId made optional.
--   3. Extension settings the website can edit too: four User columns and
--      the ContactContext table (each conversation's reason and tone).
--
-- Idempotent: safe to re-run, and safe to run before the code that uses it
-- is deployed. Run this in Supabase BEFORE deploying — the extension, the
-- Billing page and the Toolkit page all read these columns.

-- Free generations used. Existing users start at 0, so everyone gets 10.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "extensionTrialUsed" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "ExtensionSubscription" (
  "id"                TEXT PRIMARY KEY,
  "userId"            TEXT NOT NULL,
  "lsSubscriptionId"  TEXT NOT NULL,
  "lsCustomerId"      TEXT,
  "lsVariantId"       TEXT,
  "status"            TEXT NOT NULL,
  "renewsAt"          TIMESTAMP(3),
  "endsAt"            TIMESTAMP(3),
  "customerPortalUrl" TEXT,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "ExtensionSubscription_userId_key" ON "ExtensionSubscription"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "ExtensionSubscription_lsSubscriptionId_key" ON "ExtensionSubscription"("lsSubscriptionId");

-- Cascade matches the Prisma relation: deleting a user removes their row.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ExtensionSubscription_userId_fkey'
  ) THEN
    ALTER TABLE "ExtensionSubscription"
      ADD CONSTRAINT "ExtensionSubscription_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ── 2. History kinds ────────────────────────────────────────────────────
-- Connection notes and messages are saved to history too, and may have no
-- saved profile behind them (a one-off reason), so profileId becomes optional.
ALTER TABLE "CommentHistory" ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'comment';
ALTER TABLE "CommentHistory" ADD COLUMN IF NOT EXISTS "profileName" TEXT;
ALTER TABLE "CommentHistory" ALTER COLUMN "profileId" DROP NOT NULL;
CREATE INDEX IF NOT EXISTS "CommentHistory_userId_kind_createdAt_idx" ON "CommentHistory"("userId", "kind", "createdAt");

-- Existing replies were only recognisable by their snippet ("Reply to …").
-- Labels them as replies; changes nothing else. Safe to re-run.
UPDATE "CommentHistory" SET "kind" = 'reply' WHERE "kind" = 'comment' AND "postSnippet" LIKE 'Reply to %';

-- ── 3. Settings shared with the website ─────────────────────────────────
-- Used to live only in one browser. Null means "never set".
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "connectNoteContext" JSONB;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "connectNoteLength" JSONB;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "linkedinProfile" JSONB;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "insertButtonHidden" BOOLEAN;

CREATE TABLE IF NOT EXISTS "ContactContext" (
  "id"          TEXT PRIMARY KEY,
  "userId"      TEXT NOT NULL,
  "contactUrl"  TEXT NOT NULL,
  "contactName" TEXT NOT NULL DEFAULT '',
  "choice"      TEXT NOT NULL,
  "profileId"   TEXT,
  "purpose"     TEXT NOT NULL DEFAULT '',
  "tone"        TEXT NOT NULL DEFAULT '',
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "ContactContext_userId_contactUrl_key" ON "ContactContext"("userId", "contactUrl");
CREATE INDEX IF NOT EXISTS "ContactContext_userId_updatedAt_idx" ON "ContactContext"("userId", "updatedAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ContactContext_userId_fkey'
  ) THEN
    ALTER TABLE "ContactContext"
      ADD CONSTRAINT "ContactContext_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Verify:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'extensionTrialUsed';
-- SELECT count(*) FROM "ExtensionSubscription";
-- SELECT "kind", count(*) FROM "CommentHistory" GROUP BY "kind";
-- SELECT count(*) FROM "ContactContext";
