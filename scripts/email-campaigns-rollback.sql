-- scripts/email-campaigns-rollback.sql
-- Undoes scripts/email-campaigns.sql: removes the campaign tables and every
-- campaign in them (which people were sent what is lost). Only run this after
-- the website code that uses them has been removed.
DROP TABLE IF EXISTS "EmailCampaignRecipient";
DROP TABLE IF EXISTS "EmailCampaign";
