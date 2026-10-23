-- scripts/reddit-extension-schema-rollback.sql — undoes
-- scripts/reddit-extension-schema.sql: drops the Reddit extension's tables
-- and the "User"."redditTrialUsed" column. Deletes every Reddit profile,
-- setting and subscription record, and how many free Reddit generations each
-- person used. Deploy code that no longer reads them FIRST.

DROP TABLE IF EXISTS "RedditProfile";
DROP TABLE IF EXISTS "RedditUserSettings";
DROP TABLE IF EXISTS "RedditSubscription";
ALTER TABLE "User" DROP COLUMN IF EXISTS "redditTrialUsed";
