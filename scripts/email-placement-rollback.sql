-- scripts/email-placement-rollback.sql
-- Undoes scripts/email-placement.sql: drops the test copies and each
-- person's provider. Deploy website code without "Where it landed" first.

DROP TABLE IF EXISTS "EmailPlacementTest";
ALTER TABLE "EmailCampaignRecipient" DROP COLUMN IF EXISTS "mailbox";
