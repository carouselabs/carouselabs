-- scripts/engage-price.sql
-- Special prices: an admin sets one person's price for an Engage extension
-- (Admin → Engage → a user, or Admin → Users → a user), e.g. $5/month
-- instead of $15. prisma/schema.prisma's EngagePrice: one row per person and
-- extension ("linkedin" or "x"), with an optional last day to buy at it.
--
-- One new table: nothing existing changes. Idempotent: safe to re-run.
-- Run in Supabase BEFORE the website code that uses it is deployed (until
-- then everyone simply sees the usual price).
-- Undo: scripts/engage-price-rollback.sql.

CREATE TABLE IF NOT EXISTS "EngagePrice" (
  "id"         TEXT PRIMARY KEY,
  "userId"     TEXT NOT NULL,
  "platform"   TEXT NOT NULL,
  "priceCents" INTEGER NOT NULL,
  "endsAt"     TIMESTAMP(3),
  "reason"     TEXT NOT NULL,
  "setBy"      TEXT NOT NULL,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "EngagePrice_userId_platform_key" ON "EngagePrice"("userId", "platform");

-- Deleting an account removes its prices, as in Prisma.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EngagePrice_userId_fkey') THEN
    ALTER TABLE "EngagePrice" ADD CONSTRAINT "EngagePrice_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
