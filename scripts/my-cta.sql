-- scripts/my-cta.sql — My CTA (Settings → My CTA, lib/creatorCta.ts): a
-- creator's own call to action, drawn by the image AI into their images and
-- carousels (prisma/schema.prisma):
--   1. CtaProfile: their photo ("this is me"), one row per user.
--   2. CtaCard: up to 3 saved CTAs per user (name, headline, the CTA line,
--      an optional extra line), one marked as the default.
--
-- Additive only: two new tables, nothing else changes. Idempotent: safe to
-- re-run. The app works before it runs (My CTA just says it isn't ready).
-- Undo: scripts/my-cta-rollback.sql.

CREATE TABLE IF NOT EXISTS "CtaProfile" (
  "userId"    TEXT PRIMARY KEY,
  "photoUrl"  TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CtaProfile_userId_fkey') THEN
    ALTER TABLE "CtaProfile" ADD CONSTRAINT "CtaProfile_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "CtaCard" (
  "id"        TEXT PRIMARY KEY,
  "userId"    TEXT NOT NULL,
  "label"     TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "headline"  TEXT,
  "line"      TEXT NOT NULL,
  "extra"     TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "CtaCard_userId_idx" ON "CtaCard"("userId");
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CtaCard_userId_fkey') THEN
    ALTER TABLE "CtaCard" ADD CONSTRAINT "CtaCard_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Check: both tables are there (expect 2 rows).
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('CtaProfile', 'CtaCard')
ORDER BY table_name;
