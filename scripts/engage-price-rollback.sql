-- scripts/engage-price-rollback.sql
-- Undoes scripts/engage-price.sql: removes the special prices table and every
-- special price in it (everyone is back to the usual price for new checkouts;
-- subscriptions already bought keep what they pay). Only run this after the
-- website code that uses it has been removed.
DROP TABLE IF EXISTS "EngagePrice";
