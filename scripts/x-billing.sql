-- scripts/x-billing.sql — CarouseLabs Engage for X sold separately from the
-- LinkedIn extension (prisma/schema.prisma):
--   1. XSubscription: the X extension's $15/month Lemon Squeezy subscription.
--   2. "User"."xTrialUsed": the X extension's own 10 free generations.
--   3. "EngageAccessGrant"."platform": which extension an admin's free access
--      covers ("linkedin", "x" or "both"); grants given before are "both".
--
-- Additive only: one new table, two new columns with defaults. Idempotent:
-- safe to re-run. Run in Supabase BEFORE deploying the code. Undo:
-- scripts/x-billing-rollback.sql.

CREATE TABLE IF NOT EXISTS "XSubscription" (
  "id"                TEXT PRIMARY KEY,
  "userId"            TEXT NOT NULL,
  "lsSubscriptionId"  TEXT NOT NULL,
  "lsCustomerId"      TEXT,
  "lsVariantId"       TEXT,
  "status"            TEXT NOT NULL,
  "renewsAt"          TIMESTAMP(3),
  "endsAt"            TIMESTAMP(3),
  "customerPortalUrl" TEXT,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "XSubscription_userId_key" ON "XSubscription"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "XSubscription_lsSubscriptionId_key" ON "XSubscription"("lsSubscriptionId");
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'XSubscription_userId_fkey') THEN
    ALTER TABLE "XSubscription" ADD CONSTRAINT "XSubscription_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "xTrialUsed" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "EngageAccessGrant" ADD COLUMN IF NOT EXISTS "platform" TEXT NOT NULL DEFAULT 'both';

-- Check: the new table and both columns are there.
SELECT
  (SELECT count(*) FROM "XSubscription") AS x_subscriptions,
  (SELECT count(*) FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'xTrialUsed') AS x_trial_column,
  (SELECT count(*) FROM information_schema.columns WHERE table_name = 'EngageAccessGrant' AND column_name = 'platform') AS grant_platform_column;
