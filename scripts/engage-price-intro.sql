-- scripts/engage-price-intro.sql
-- Intro offers on special prices: an admin's price can be just for the first
-- 1–12 monthly payments, then the usual price (prisma/schema.prisma's
-- EngagePrice.introMonths), and is spent once they buy with it
-- (introUsedAt).
--
-- Run AFTER scripts/engage-price.sql and engage-price-discounts.sql, BEFORE
-- the website code that uses these columns is deployed. Two new nullable
-- columns: nothing existing changes, and every special price set so far
-- stays an every-month price. Idempotent: safe to re-run.
-- Undo: scripts/engage-price-intro-rollback.sql.

ALTER TABLE "EngagePrice" ADD COLUMN IF NOT EXISTS "introMonths" INTEGER;
ALTER TABLE "EngagePrice" ADD COLUMN IF NOT EXISTS "introUsedAt" TIMESTAMP(3);
