-- scripts/email-tracking-rollback.sql
-- Undoes scripts/email-tracking.sql: forgets who saw and clicked which email.
-- Only run this after the website code that uses it has been removed.
DROP TABLE IF EXISTS "PersonalEmailTrack";
ALTER TABLE "EmailCampaignRecipient" DROP COLUMN IF EXISTS "clickCount";
ALTER TABLE "EmailCampaignRecipient" DROP COLUMN IF EXISTS "clickedAt";
ALTER TABLE "EmailCampaignRecipient" DROP COLUMN IF EXISTS "openCount";
ALTER TABLE "EmailCampaignRecipient" DROP COLUMN IF EXISTS "lastOpenedAt";
ALTER TABLE "EmailCampaignRecipient" DROP COLUMN IF EXISTS "openedAt";
