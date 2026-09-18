-- Manual fallback for the CarouseLabs Comment extension's schema changes —
-- run this in the Supabase SQL editor if `npx prisma db push` can't reach the
-- DB directly (same situation as scripts/referral-schema.sql). Matches
-- prisma/schema.prisma exactly:
--   - User.defaultCommentProfileId, User.insertWarningHidden (new columns on
--     an existing table)
--   - CommentProfile (new)
--   - CommentHistory (new, FK -> User)
--   - ExtensionToken (new, FK -> User)
--
-- IDEMPOTENT: every statement below is safe to re-run. CREATE TABLE/INDEX and
-- ALTER TABLE ADD COLUMN use native Postgres "IF NOT EXISTS". Postgres has no
-- "ADD CONSTRAINT IF NOT EXISTS", so each foreign key is wrapped in a
-- DO $$ ... IF NOT EXISTS (SELECT ... pg_constraint) $$ block instead — the
-- standard idiom for that case (same as scripts/email-marketing-schema.sql).
--
-- INDEPENDENT STATEMENTS: each numbered block below is a separate statement
-- (or self-contained DO block) — copy-paste and run them ONE AT A TIME if
-- you want to skip past ones already applied, or run the whole file at once
-- (top to bottom — later tables have foreign keys into earlier ones, and
-- each constraint's DO block assumes its own table already exists).

-- ── 1. User.defaultCommentProfileId ──────────────────────────────────
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "defaultCommentProfileId" TEXT;

-- ── 2. User.insertWarningHidden ───────────────────────────────────────
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "insertWarningHidden" BOOLEAN NOT NULL DEFAULT false;

-- ── 3. CommentProfile (table) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "CommentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "whoIAm" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "tone" TEXT NOT NULL,
    "length" TEXT NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT 'None',
    "language" TEXT NOT NULL DEFAULT 'English',
    "alwaysDo" TEXT,
    "neverDo" TEXT,
    "samples" TEXT[],
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "testsUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommentProfile_pkey" PRIMARY KEY ("id")
);

-- ── 4. CommentProfile (index: userId) ────────────────────────────────
CREATE INDEX IF NOT EXISTS "CommentProfile_userId_idx" ON "CommentProfile"("userId");

-- ── 5. CommentProfile -> User (FK) ───────────────────────────────────
-- Requires: statement 3 (CommentProfile table) already applied.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'CommentProfile_userId_fkey'
      AND conrelid = '"CommentProfile"'::regclass
  ) THEN
    ALTER TABLE "CommentProfile" ADD CONSTRAINT "CommentProfile_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ── 6. CommentHistory (table) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "CommentHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "postAuthor" TEXT NOT NULL,
    "postUrl" TEXT NOT NULL,
    "postSnippet" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "action" TEXT NOT NULL DEFAULT 'NONE',
    "creditsUsed" DOUBLE PRECISION NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentHistory_pkey" PRIMARY KEY ("id")
);

-- ── 7. CommentHistory (index: userId) ────────────────────────────────
CREATE INDEX IF NOT EXISTS "CommentHistory_userId_idx" ON "CommentHistory"("userId");

-- ── 8. CommentHistory (index: profileId) ─────────────────────────────
CREATE INDEX IF NOT EXISTS "CommentHistory_profileId_idx" ON "CommentHistory"("profileId");

-- ── 9. CommentHistory (index: userId, createdAt) ─────────────────────
CREATE INDEX IF NOT EXISTS "CommentHistory_userId_createdAt_idx"
    ON "CommentHistory"("userId", "createdAt");

-- ── 10. CommentHistory -> User (FK) ──────────────────────────────────
-- Requires: statement 6 (CommentHistory table) already applied.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'CommentHistory_userId_fkey'
      AND conrelid = '"CommentHistory"'::regclass
  ) THEN
    ALTER TABLE "CommentHistory" ADD CONSTRAINT "CommentHistory_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ── 11. ExtensionToken (table) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ExtensionToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "device" TEXT,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtensionToken_pkey" PRIMARY KEY ("id")
);

-- ── 12. ExtensionToken (unique index: tokenHash) ─────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS "ExtensionToken_tokenHash_key" ON "ExtensionToken"("tokenHash");

-- ── 13. ExtensionToken (index: userId) ───────────────────────────────
CREATE INDEX IF NOT EXISTS "ExtensionToken_userId_idx" ON "ExtensionToken"("userId");

-- ── 14. ExtensionToken -> User (FK) ──────────────────────────────────
-- Requires: statement 11 (ExtensionToken table) already applied.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ExtensionToken_userId_fkey'
      AND conrelid = '"ExtensionToken"'::regclass
  ) THEN
    ALTER TABLE "ExtensionToken" ADD CONSTRAINT "ExtensionToken_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
