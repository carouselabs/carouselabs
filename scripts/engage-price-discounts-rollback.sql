-- scripts/engage-price-discounts-rollback.sql
-- Undoes scripts/engage-price-discounts.sql: forgets which Lemon Squeezy
-- discount belongs to which special price (the discounts themselves stay in
-- Lemon Squeezy). Only run this after the website code that uses these
-- columns has been removed.
ALTER TABLE "EngagePrice" DROP COLUMN IF EXISTS "lemonDiscountCents";
ALTER TABLE "EngagePrice" DROP COLUMN IF EXISTS "lemonDiscountCode";
ALTER TABLE "EngagePrice" DROP COLUMN IF EXISTS "lemonDiscountId";
