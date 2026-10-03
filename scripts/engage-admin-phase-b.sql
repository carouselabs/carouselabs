-- scripts/engage-admin-phase-b.sql
-- Engage admin, phase B (prisma/schema.prisma, model EngageSetting): settings
-- that apply to everyone, edited in admin → Engage → Controls:
--   "features"    a feature paused for all users, with the message they see
--   "insert"      the Insert button on or off, per extension
--   "minVersion"  the oldest extension version still allowed to write
--
-- One new table, no rows: with no row every setting is its default
-- (everything on, no minimum version), which is exactly how the extensions
-- work today. Nothing existing changes. Idempotent: safe to re-run.
-- Run in Supabase before deploying the phase B code (the code also works
-- without it, using the defaults, but the Controls page can't save).
-- Undo: scripts/engage-admin-phase-b-rollback.sql.

CREATE TABLE IF NOT EXISTS "EngageSetting" (
  "key"       TEXT PRIMARY KEY,
  "value"     JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedBy" TEXT
);

-- Check: the table is there (no rows yet is correct).
SELECT count(*) AS settings FROM "EngageSetting";
