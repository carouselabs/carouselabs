-- scripts/email-reuse-rollback.sql
-- Undoes scripts/email-reuse.sql: templates starred from sent emails lose the
-- AI-written email (their plain text stays), and personal emails forget their
-- copy (seen/clicked stays). Only run this after the website code that uses
-- it has been removed.
DROP INDEX IF EXISTS "EmailTemplate_sourceKind_sourceId_idx";
ALTER TABLE "EmailTemplate" DROP COLUMN IF EXISTS "sourceId";
ALTER TABLE "EmailTemplate" DROP COLUMN IF EXISTS "sourceKind";
ALTER TABLE "EmailTemplate" DROP COLUMN IF EXISTS "design";
ALTER TABLE "PersonalEmailTrack" DROP COLUMN IF EXISTS "design";
ALTER TABLE "PersonalEmailTrack" DROP COLUMN IF EXISTS "subject";
