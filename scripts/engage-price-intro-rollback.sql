-- scripts/engage-price-intro-rollback.sql
-- Undoes scripts/engage-price-intro.sql: every special price becomes an
-- every-month price again (intro offers are forgotten). Only run this after
-- the website code that uses these columns has been removed.
ALTER TABLE "EngagePrice" DROP COLUMN IF EXISTS "introUsedAt";
ALTER TABLE "EngagePrice" DROP COLUMN IF EXISTS "introMonths";
