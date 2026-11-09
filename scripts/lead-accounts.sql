-- scripts/lead-accounts.sql — two lead accounts kept apart (lib/leadAccounts.ts):
-- CarouseLabs' leads (sent through CarouseLabs' Brevo) and Anant Goyal's
-- (sent through anantgoyal.in's Brevo, synced from it: lib/brevoSync.ts).
--
-- Run in Supabase → SQL editor BEFORE deploying the code that uses it.
-- Safe to run twice. Every existing lead and list becomes CarouseLabs'.
-- Undo: scripts/lead-accounts-rollback.sql.

-- Whose lead: the same address can now be a lead of each account.
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "account" TEXT NOT NULL DEFAULT 'carouselabs';
DROP INDEX IF EXISTS "Lead_email_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Lead_account_email_key" ON "Lead"("account", "email");

-- Whose list, and the Brevo list it was copied from (0 = all of Brevo's contacts).
ALTER TABLE "LeadList" ADD COLUMN IF NOT EXISTS "account" TEXT NOT NULL DEFAULT 'carouselabs';
ALTER TABLE "LeadList" ADD COLUMN IF NOT EXISTS "brevoListId" INTEGER;
CREATE UNIQUE INDEX IF NOT EXISTS "LeadList_account_brevoListId_key" ON "LeadList"("account", "brevoListId");
