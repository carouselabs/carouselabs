-- scripts/email-sending-rollback.sql
-- Undoes scripts/email-sending.sql: every campaign goes back to the defaults
-- (automatic, CarouseLabs <support@carouselabs.com>, replies to the sender).
-- Only run this after the website code that uses it has been removed.
ALTER TABLE "EmailCampaign" DROP COLUMN IF EXISTS "sendVia";
ALTER TABLE "EmailCampaign" DROP COLUMN IF EXISTS "sendFrom";
ALTER TABLE "EmailCampaign" DROP COLUMN IF EXISTS "replyTo";
