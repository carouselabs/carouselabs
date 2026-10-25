-- scripts/email-placement.sql
-- "Where it landed" on a campaign's page (lib/placement): with a campaign's
-- first send through Resend or Brevo, one test copy also goes to the test
-- Gmail, and the page shows which tab or folder Gmail put it in, and each
-- person's likely place from their kind of inbox.
--   1. "EmailCampaignRecipient"."mailbox": whose servers hold the person's
--      inbox (gmail, google-workspace, outlook, microsoft-365, yahoo, …).
--   2. "EmailPlacementTest": each test copy and where it landed.
--
-- One new column and one new table: nothing existing changes. Idempotent:
-- safe to re-run. Run in Supabase BEFORE the website code that uses it is
-- deployed (until then campaigns send as before and the page says to run it).
-- Undo: scripts/email-placement-rollback.sql.

-- ── 1. Each person's provider ───────────────────────────────────────────
ALTER TABLE "EmailCampaignRecipient" ADD COLUMN IF NOT EXISTS "mailbox" TEXT;

-- ── 2. Test copies ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "EmailPlacementTest" (
  "id"         TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "via"        TEXT NOT NULL,
  "inbox"      TEXT NOT NULL DEFAULT 'gmail',
  "address"    TEXT NOT NULL,
  "status"     TEXT NOT NULL DEFAULT 'waiting',
  "placement"  TEXT,
  "important"  BOOLEAN NOT NULL DEFAULT false,
  "error"      TEXT,
  "sentAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "checkedAt"  TIMESTAMP(3),
  "foundAt"    TIMESTAMP(3),
  CONSTRAINT "EmailPlacementTest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "EmailPlacementTest_campaignId_sentAt_idx" ON "EmailPlacementTest"("campaignId", "sentAt");
DO $$ BEGIN
  ALTER TABLE "EmailPlacementTest" ADD CONSTRAINT "EmailPlacementTest_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "EmailCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
