-- scripts/email-campaigns.sql
-- Email campaigns: one email sent to a fixed list of people in batches the
-- admin picks (Admin → Broadcasts → Campaigns), prisma/schema.prisma's
-- EmailCampaign and EmailCampaignRecipient:
--   1. EmailCampaign: the email (subject, body; "design" is filled by the AI
--      email writer) and where its list came from.
--   2. EmailCampaignRecipient: one row per person, with whether they've been
--      sent it. A person appears once per campaign, so nobody gets it twice.
--
-- Two new tables: nothing existing changes. Idempotent: safe to re-run.
-- Run in Supabase BEFORE the website code that uses them is deployed.
-- Undo: scripts/email-campaigns-rollback.sql.

-- ── 1. EmailCampaign ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "EmailCampaign" (
  "id"            TEXT PRIMARY KEY,
  "subject"       TEXT NOT NULL,
  "body"          TEXT NOT NULL,
  "audience"      TEXT NOT NULL,
  "audienceValue" TEXT,
  "design"        JSONB,
  "status"        TEXT NOT NULL DEFAULT 'active',
  "createdBy"     TEXT NOT NULL,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "EmailCampaign_createdAt_idx" ON "EmailCampaign"("createdAt");

-- ── 2. EmailCampaignRecipient ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "EmailCampaignRecipient" (
  "id"         TEXT PRIMARY KEY,
  "campaignId" TEXT NOT NULL,
  "userId"     TEXT,
  "email"      TEXT NOT NULL,
  "name"       TEXT,
  "status"     TEXT NOT NULL DEFAULT 'pending',
  "sentAt"     TIMESTAMP(3),
  "error"      TEXT,
  "batchId"    TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "EmailCampaignRecipient_campaignId_email_key"
  ON "EmailCampaignRecipient"("campaignId", "email");
CREATE INDEX IF NOT EXISTS "EmailCampaignRecipient_campaignId_status_idx"
  ON "EmailCampaignRecipient"("campaignId", "status");
CREATE INDEX IF NOT EXISTS "EmailCampaignRecipient_status_sentAt_idx"
  ON "EmailCampaignRecipient"("status", "sentAt");

-- Deleting a campaign removes its list, as in Prisma.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EmailCampaignRecipient_campaignId_fkey') THEN
    ALTER TABLE "EmailCampaignRecipient" ADD CONSTRAINT "EmailCampaignRecipient_campaignId_fkey"
      FOREIGN KEY ("campaignId") REFERENCES "EmailCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
