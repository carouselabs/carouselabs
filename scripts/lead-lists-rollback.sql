-- scripts/lead-lists-rollback.sql
-- Undoes scripts/lead-lists.sql. Delete smart lists first (they have no
-- people of their own, so they'd turn into empty static lists). Only run this
-- after the website code that uses it has been removed.
ALTER TABLE "LeadList" DROP COLUMN IF EXISTS "filter";
ALTER TABLE "LeadList" DROP COLUMN IF EXISTS "kind";
