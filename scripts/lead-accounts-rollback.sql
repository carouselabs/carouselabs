-- scripts/lead-accounts-rollback.sql — undoes scripts/lead-accounts.sql.
-- Only safe while no address is a lead of both accounts: it deletes Anant
-- Goyal's leads and lists first, then puts the single-account index back.
DELETE FROM "LeadList" WHERE "account" <> 'carouselabs';
DELETE FROM "Lead" WHERE "account" <> 'carouselabs';
DROP INDEX IF EXISTS "LeadList_account_brevoListId_key";
ALTER TABLE "LeadList" DROP COLUMN IF EXISTS "brevoListId";
ALTER TABLE "LeadList" DROP COLUMN IF EXISTS "account";
DROP INDEX IF EXISTS "Lead_account_email_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Lead_email_key" ON "Lead"("email");
ALTER TABLE "Lead" DROP COLUMN IF EXISTS "account";
