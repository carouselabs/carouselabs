-- scripts/lead-lists.sql
-- Your own lead lists (Admin → Broadcasts → Leads → Lists, lib/leads.ts):
-- a list is "static" (the people put on it: an upload, or leads ticked by
-- hand) or "smart" (whoever matches its saved filter now, lib/leadFilters.ts).
-- Two new columns on "LeadList"; every list so far is static.
--
-- Nothing existing changes. Idempotent: safe to re-run. Run in Supabase
-- BEFORE the website code that uses it is deployed (until then the Leads page
-- works with static lists, and making a smart list says to run this).
-- Undo: scripts/lead-lists-rollback.sql.

ALTER TABLE "LeadList" ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'static';
ALTER TABLE "LeadList" ADD COLUMN IF NOT EXISTS "filter" JSONB;
