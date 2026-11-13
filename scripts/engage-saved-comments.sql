-- scripts/engage-saved-comments.sql
-- Saved comments for CarouseLabs Engage (LinkedIn's side panel and the
-- website's Engage → Saved comments), prisma/schema.prisma's
-- EngageSavedComment: comments a person keeps to insert again with one click
-- (a creator's usual pinned comment, a go-to reply). No AI involved.
--
-- One new table: nothing existing changes, and extension versions without
-- saved comments ignore it. Idempotent: safe to re-run.
-- Run in Supabase BEFORE the website code that uses it is deployed.
-- Undo: scripts/engage-saved-comments-rollback.sql.

CREATE TABLE IF NOT EXISTS public."EngageSavedComment" (
  "id"         TEXT PRIMARY KEY,
  "userId"     TEXT NOT NULL,
  "platform"   TEXT NOT NULL DEFAULT 'linkedin',
  "title"      TEXT NOT NULL,
  "body"       TEXT NOT NULL,
  "tags"       TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "favorite"   BOOLEAN NOT NULL DEFAULT false,
  "remindOn"   TEXT NOT NULL DEFAULT 'own',
  "useCount"   INTEGER NOT NULL DEFAULT 0,
  "lastUsedAt" TIMESTAMP(3),
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "EngageSavedComment_userId_platform_idx"
  ON public."EngageSavedComment"("userId", "platform");

-- Deleting a user removes their saved comments, as in Prisma.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EngageSavedComment_userId_fkey') THEN
    ALTER TABLE public."EngageSavedComment" ADD CONSTRAINT "EngageSavedComment_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES public."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
