-- Manual fallback for the Content Hub Phase A-D schema changes — run this in
-- the Supabase SQL editor if `npx prisma db push` can't reach the DB
-- directly. Matches prisma/schema.prisma exactly:
--   - PostFormat: new enum value 'CUSTOM' (Phase A — Custom Post composer)
--   - QueueSlot (new, FK -> User)               (Phase B — Posting Queue)
--   - IdeaBoardItem (new, FK -> User)            (Phase C — Ideas Board)
--   - ExtensionApiKey (new, FK -> User)          (Phase C — browser extension auth)
--   - StartPage (new, FK -> User)                (Phase D — Start Page)
--   - StartPageLink (new, FK -> StartPage)       (Phase D — Start Page)
-- No changes to the User table itself — every relation above is a foreign
-- key on the CHILD table (e.g. QueueSlot.userId), so User needs no new
-- column for any of this.
--
-- IDEMPOTENT: every statement below is safe to re-run, including against a
-- DB where `prisma db push` already succeeded for some or all of it. CREATE
-- TABLE/INDEX use native Postgres "IF NOT EXISTS", and the enum addition
-- uses "ADD VALUE IF NOT EXISTS". Postgres has no "ADD CONSTRAINT IF NOT
-- EXISTS", so each foreign key is wrapped in a
-- DO $$ ... IF NOT EXISTS (SELECT ... pg_constraint) $$ block instead — the
-- standard idiom for that case.
--
-- INDEPENDENT STATEMENTS: each numbered block is separate — copy-paste and
-- run individual blocks if you only need to patch one phase, or run the
-- whole file top to bottom (StartPageLink's FK block assumes StartPage's
-- table already exists, so keep that relative order if running partially).

-- ── 1. PostFormat enum — add 'CUSTOM' ────────────────────────────────
ALTER TYPE "PostFormat" ADD VALUE IF NOT EXISTS 'CUSTOM';

-- ── 2. QueueSlot (table) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "QueueSlot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "timeOfDay" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QueueSlot_pkey" PRIMARY KEY ("id")
);

-- ── 3. QueueSlot (index) ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "QueueSlot_userId_idx" ON "QueueSlot"("userId");

-- ── 4. QueueSlot -> User (FK) ─────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'QueueSlot_userId_fkey' AND conrelid = '"QueueSlot"'::regclass
  ) THEN
    ALTER TABLE "QueueSlot" ADD CONSTRAINT "QueueSlot_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ── 5. IdeaBoardItem (table) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "IdeaBoardItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdeaBoardItem_pkey" PRIMARY KEY ("id")
);

-- ── 6. IdeaBoardItem (indexes) ────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "IdeaBoardItem_userId_idx" ON "IdeaBoardItem"("userId");
CREATE INDEX IF NOT EXISTS "IdeaBoardItem_userId_createdAt_idx" ON "IdeaBoardItem"("userId", "createdAt");

-- ── 7. IdeaBoardItem -> User (FK) ─────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'IdeaBoardItem_userId_fkey' AND conrelid = '"IdeaBoardItem"'::regclass
  ) THEN
    ALTER TABLE "IdeaBoardItem" ADD CONSTRAINT "IdeaBoardItem_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ── 8. ExtensionApiKey (table) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ExtensionApiKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Browser extension',
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtensionApiKey_pkey" PRIMARY KEY ("id")
);

-- ── 9. ExtensionApiKey (indexes) ──────────────────────────────────────
-- One active key per user: userId is unique. keyHash is unique so a lookup
-- by presented key is a direct index hit. The extra plain index on userId
-- mirrors prisma/schema.prisma's explicit @@index([userId]) alongside
-- @unique on the same column — redundant with the unique index below, kept
-- only so this script matches the schema exactly.
CREATE UNIQUE INDEX IF NOT EXISTS "ExtensionApiKey_userId_key" ON "ExtensionApiKey"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "ExtensionApiKey_keyHash_key" ON "ExtensionApiKey"("keyHash");
CREATE INDEX IF NOT EXISTS "ExtensionApiKey_userId_idx" ON "ExtensionApiKey"("userId");

-- ── 10. ExtensionApiKey -> User (FK) ──────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ExtensionApiKey_userId_fkey' AND conrelid = '"ExtensionApiKey"'::regclass
  ) THEN
    ALTER TABLE "ExtensionApiKey" ADD CONSTRAINT "ExtensionApiKey_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ── 11. StartPage (table) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "StartPage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "theme" TEXT NOT NULL DEFAULT 'default',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StartPage_pkey" PRIMARY KEY ("id")
);

-- ── 12. StartPage (indexes) ───────────────────────────────────────────
-- One Start Page per user (userId unique) and one slug per Start Page (slug
-- unique). The extra plain index on slug mirrors the schema's explicit
-- @@index([slug]) alongside @unique — same harmless redundancy as
-- ExtensionApiKey above, kept for an exact match to prisma/schema.prisma.
CREATE UNIQUE INDEX IF NOT EXISTS "StartPage_userId_key" ON "StartPage"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "StartPage_slug_key" ON "StartPage"("slug");
CREATE INDEX IF NOT EXISTS "StartPage_slug_idx" ON "StartPage"("slug");

-- ── 13. StartPage -> User (FK) ────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'StartPage_userId_fkey' AND conrelid = '"StartPage"'::regclass
  ) THEN
    ALTER TABLE "StartPage" ADD CONSTRAINT "StartPage_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ── 14. StartPageLink (table) ─────────────────────────────────────────
-- Requires: block 11 (StartPage table) already applied.
CREATE TABLE IF NOT EXISTS "StartPageLink" (
    "id" TEXT NOT NULL,
    "startPageId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StartPageLink_pkey" PRIMARY KEY ("id")
);

-- ── 15. StartPageLink (indexes) ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS "StartPageLink_startPageId_idx" ON "StartPageLink"("startPageId");
CREATE INDEX IF NOT EXISTS "StartPageLink_startPageId_order_idx" ON "StartPageLink"("startPageId", "order");

-- ── 16. StartPageLink -> StartPage (FK) ───────────────────────────────
-- Requires: block 11 (StartPage table) already applied.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'StartPageLink_startPageId_fkey' AND conrelid = '"StartPageLink"'::regclass
  ) THEN
    ALTER TABLE "StartPageLink" ADD CONSTRAINT "StartPageLink_startPageId_fkey"
        FOREIGN KEY ("startPageId") REFERENCES "StartPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
