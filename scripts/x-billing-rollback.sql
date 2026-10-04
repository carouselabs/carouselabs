-- scripts/x-billing-rollback.sql — undoes scripts/x-billing.sql. Deletes every
-- stored X subscription (Lemon Squeezy keeps billing them: cancel there
-- first), the X free-generation counts and the grants' extension choice.
ALTER TABLE "EngageAccessGrant" DROP COLUMN IF EXISTS "platform";
ALTER TABLE "User" DROP COLUMN IF EXISTS "xTrialUsed";
DROP TABLE IF EXISTS "XSubscription";
