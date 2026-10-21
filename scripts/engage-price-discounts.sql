-- scripts/engage-price-discounts.sql
-- Special prices at checkout become each person's own once-only Lemon
-- Squeezy discount, so the checkout reads "$15 per month, discount, $5"
-- (lib/engage/priceDiscount.ts). Remembers that discount on the price row
-- (prisma/schema.prisma's EngagePrice), so their next checkout reuses it.
--
-- Run AFTER scripts/engage-price.sql, BEFORE the website code that uses
-- these columns is deployed. Three new nullable columns: nothing existing
-- changes. Idempotent: safe to re-run.
-- Undo: scripts/engage-price-discounts-rollback.sql.

ALTER TABLE "EngagePrice" ADD COLUMN IF NOT EXISTS "lemonDiscountId" TEXT;
ALTER TABLE "EngagePrice" ADD COLUMN IF NOT EXISTS "lemonDiscountCode" TEXT;
ALTER TABLE "EngagePrice" ADD COLUMN IF NOT EXISTS "lemonDiscountCents" INTEGER;
