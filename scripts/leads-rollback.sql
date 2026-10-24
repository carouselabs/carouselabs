-- scripts/leads-rollback.sql
-- Undoes scripts/leads.sql: removes the leads tables and every lead, list and
-- unsubscribe in them. Campaigns already sent keep their lists (they're
-- copied onto each campaign). Only run this after the website code that uses
-- it has been removed.
ALTER TABLE "EmailCampaignRecipient" DROP COLUMN IF EXISTS "provider";
DROP TABLE IF EXISTS "LeadListMember";
DROP TABLE IF EXISTS "LeadList";
DROP TABLE IF EXISTS "Lead";
