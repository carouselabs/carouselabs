-- scripts/email-scanners-rollback.sql
-- Undoes scripts/email-scanners.sql: removes the activity log and the four
-- columns. Seen and clicked keep what they show now. Only run this after the
-- website code that uses it has been removed.
DROP TABLE IF EXISTS "EmailTrackEvent";
ALTER TABLE "EmailCampaignRecipient" DROP COLUMN IF EXISTS "lastClickedAt";
ALTER TABLE "EmailCampaignRecipient" DROP COLUMN IF EXISTS "scannedAt";
ALTER TABLE "EmailCampaignRecipient" DROP COLUMN IF EXISTS "scanReason";
ALTER TABLE "EmailCampaignRecipient" DROP COLUMN IF EXISTS "autoOpenedAt";
ALTER TABLE "PersonalEmailTrack" DROP COLUMN IF EXISTS "lastClickedAt";
ALTER TABLE "PersonalEmailTrack" DROP COLUMN IF EXISTS "scannedAt";
ALTER TABLE "PersonalEmailTrack" DROP COLUMN IF EXISTS "scanReason";
ALTER TABLE "PersonalEmailTrack" DROP COLUMN IF EXISTS "autoOpenedAt";
