-- scripts/email-tracking.sql
-- Whether people opened ("seen") and clicked the emails the admin sends them
-- (lib/emailTracking.ts):
--   1. Campaign emails: five new columns on EmailCampaignRecipient.
--   2. Personal emails (Admin → a user → Send email with AI): a new
--      PersonalEmailTrack table, one row per email sent.
--
-- Nothing existing changes (new columns start empty / at 0). Idempotent:
-- safe to re-run. Run in Supabase BEFORE the website code that uses it is
-- deployed: the campaign page reads these columns.
-- Undo: scripts/email-tracking-rollback.sql.

-- ── 1. Campaign emails ──────────────────────────────────────────────────
ALTER TABLE "EmailCampaignRecipient" ADD COLUMN IF NOT EXISTS "openedAt" TIMESTAMP(3);
ALTER TABLE "EmailCampaignRecipient" ADD COLUMN IF NOT EXISTS "lastOpenedAt" TIMESTAMP(3);
ALTER TABLE "EmailCampaignRecipient" ADD COLUMN IF NOT EXISTS "openCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "EmailCampaignRecipient" ADD COLUMN IF NOT EXISTS "clickedAt" TIMESTAMP(3);
ALTER TABLE "EmailCampaignRecipient" ADD COLUMN IF NOT EXISTS "clickCount" INTEGER NOT NULL DEFAULT 0;

-- ── 2. Personal emails ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "PersonalEmailTrack" (
  "emailId"      TEXT PRIMARY KEY,
  "userId"       TEXT NOT NULL,
  "openedAt"     TIMESTAMP(3),
  "lastOpenedAt" TIMESTAMP(3),
  "openCount"    INTEGER NOT NULL DEFAULT 0,
  "clickedAt"    TIMESTAMP(3),
  "clickCount"   INTEGER NOT NULL DEFAULT 0,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "PersonalEmailTrack_userId_idx" ON "PersonalEmailTrack"("userId");
