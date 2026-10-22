-- scripts/email-reuse.sql
-- Using emails again (Admin → Broadcasts → Sent emails, lib/sentEmails.ts):
--   1. Personal emails keep their subject and the email itself from now on
--      (two new columns on PersonalEmailTrack), so they can be sent again.
--   2. Templates (the existing EmailTemplate) can also keep an AI-written
--      email and where it was starred from (three new columns).
--
-- Run AFTER scripts/email-tracking.sql, BEFORE the website code that uses it
-- is deployed. Nothing existing changes: new columns start empty, and every
-- template saved so far stays a plain one. Idempotent: safe to re-run.
-- Undo: scripts/email-reuse-rollback.sql.

-- ── 1. Personal emails keep the email ───────────────────────────────────
ALTER TABLE "PersonalEmailTrack" ADD COLUMN IF NOT EXISTS "subject" TEXT;
ALTER TABLE "PersonalEmailTrack" ADD COLUMN IF NOT EXISTS "design" JSONB;

-- ── 2. Templates can keep an AI-written email ───────────────────────────
ALTER TABLE "EmailTemplate" ADD COLUMN IF NOT EXISTS "design" JSONB;
ALTER TABLE "EmailTemplate" ADD COLUMN IF NOT EXISTS "sourceKind" TEXT;
ALTER TABLE "EmailTemplate" ADD COLUMN IF NOT EXISTS "sourceId" TEXT;
CREATE INDEX IF NOT EXISTS "EmailTemplate_sourceKind_sourceId_idx" ON "EmailTemplate"("sourceKind", "sourceId");
