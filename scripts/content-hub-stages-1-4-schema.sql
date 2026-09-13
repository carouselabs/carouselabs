-- Manual fallback for the Content Hub Stage 1-4 schema changes — run this in
-- the Supabase SQL editor if `npx prisma db push` can't reach the DB
-- directly. Matches prisma/schema.prisma exactly:
--   - PostTemplate (new, FK -> User)                    (Stage 1 — Content Organization)
--   - PostTag (new, FK -> User)                          (Stage 1)
--   - _PostToPostTag (new — implicit m2m join table      (Stage 1)
--     for Post.tags <-> PostTag.posts, FK -> Post, FK -> PostTag)
--   - HashtagGroup (new, FK -> User)                     (Stage 1)
--   [Stage 2 — Scheduling Refinements — added no schema; Bulk Upload,
--    Pause/Shuffle Queue, Duplicate, and Post Previews all build on models
--    that already existed (Post, ScheduledPost, QueueSlot). Nothing to add here.]
--   - ShortLink (new, FK -> User)                        (Stage 3 — Marketing Tools)
--   - Profile.notifyPostPublished (new column)           (Stage 4 — Account/UX Polish)
--   - Profile.notifyPostFailed (new column)              (Stage 4)
--   - Profile.notifyWeeklySummary (new column)           (Stage 4)
-- No other changes to the User table itself — every relation above besides
-- the Profile columns is a foreign key on the CHILD table (e.g.
-- PostTemplate.userId), so User needs no new column for any of this.
--
-- IDEMPOTENT: every statement below is safe to re-run, including against a
-- DB where `prisma db push` already succeeded for some or all of it. CREATE
-- TABLE/INDEX and ALTER TABLE ADD COLUMN use native Postgres "IF NOT
-- EXISTS". Postgres has no "ADD CONSTRAINT IF NOT EXISTS", so each foreign
-- key is wrapped in a DO $$ ... IF NOT EXISTS (SELECT ... pg_constraint) $$
-- block instead — the standard idiom for that case.
--
-- INDEPENDENT STATEMENTS: each numbered block is separate — copy-paste and
-- run individual blocks if you only need to patch one stage, or run the
-- whole file top to bottom (the _PostToPostTag block assumes both Post,
-- which already exists in the DB, and PostTag, created a few blocks above
-- it here, already exist — keep that relative order if running partially).

-- ── 1. PostTemplate (table) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "PostTemplate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostTemplate_pkey" PRIMARY KEY ("id")
);

-- ── 2. PostTemplate (index) ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "PostTemplate_userId_idx" ON "PostTemplate"("userId");

-- ── 3. PostTemplate -> User (FK) ──────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'PostTemplate_userId_fkey' AND conrelid = '"PostTemplate"'::regclass
  ) THEN
    ALTER TABLE "PostTemplate" ADD CONSTRAINT "PostTemplate_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ── 4. PostTag (table) ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "PostTag" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#7C3AED',

    CONSTRAINT "PostTag_pkey" PRIMARY KEY ("id")
);

-- ── 5. PostTag (index) ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "PostTag_userId_idx" ON "PostTag"("userId");

-- ── 6. PostTag -> User (FK) ───────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'PostTag_userId_fkey' AND conrelid = '"PostTag"'::regclass
  ) THEN
    ALTER TABLE "PostTag" ADD CONSTRAINT "PostTag_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ── 7. _PostToPostTag (implicit many-to-many join table) ─────────────
-- Backs Post.tags <-> PostTag.posts. Prisma's standard naming for an
-- implicit m2m: "_<ModelA>To<ModelB>" with models in alphabetical order
-- ("Post" sorts before "PostTag"), columns A/B referencing each side's id.
-- Requires: block 4 (PostTag table) already applied, and the pre-existing
-- "Post" table.
CREATE TABLE IF NOT EXISTS "_PostToPostTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- ── 8. _PostToPostTag (indexes) ───────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS "_PostToPostTag_AB_unique" ON "_PostToPostTag"("A", "B");
CREATE INDEX IF NOT EXISTS "_PostToPostTag_B_index" ON "_PostToPostTag"("B");

-- ── 9. _PostToPostTag -> Post (FK) ────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = '_PostToPostTag_A_fkey' AND conrelid = '"_PostToPostTag"'::regclass
  ) THEN
    ALTER TABLE "_PostToPostTag" ADD CONSTRAINT "_PostToPostTag_A_fkey"
        FOREIGN KEY ("A") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ── 10. _PostToPostTag -> PostTag (FK) ────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = '_PostToPostTag_B_fkey' AND conrelid = '"_PostToPostTag"'::regclass
  ) THEN
    ALTER TABLE "_PostToPostTag" ADD CONSTRAINT "_PostToPostTag_B_fkey"
        FOREIGN KEY ("B") REFERENCES "PostTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ── 11. HashtagGroup (table) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "HashtagGroup" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hashtags" TEXT[],

    CONSTRAINT "HashtagGroup_pkey" PRIMARY KEY ("id")
);

-- ── 12. HashtagGroup (index) ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "HashtagGroup_userId_idx" ON "HashtagGroup"("userId");

-- ── 13. HashtagGroup -> User (FK) ─────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'HashtagGroup_userId_fkey' AND conrelid = '"HashtagGroup"'::regclass
  ) THEN
    ALTER TABLE "HashtagGroup" ADD CONSTRAINT "HashtagGroup_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ── 14. ShortLink (table) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ShortLink" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShortLink_pkey" PRIMARY KEY ("id")
);

-- ── 15. ShortLink (indexes) ────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS "ShortLink_slug_key" ON "ShortLink"("slug");
CREATE INDEX IF NOT EXISTS "ShortLink_userId_idx" ON "ShortLink"("userId");

-- ── 16. ShortLink -> User (FK) ─────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ShortLink_userId_fkey' AND conrelid = '"ShortLink"'::regclass
  ) THEN
    ALTER TABLE "ShortLink" ADD CONSTRAINT "ShortLink_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ── 17. Profile notification preference columns ───────────────────────
-- All default true (opt-OUT, not opt-in) so existing users keep getting
-- exactly the emails they already got before these toggles existed.
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "notifyPostPublished" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "notifyPostFailed" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "notifyWeeklySummary" BOOLEAN NOT NULL DEFAULT true;
