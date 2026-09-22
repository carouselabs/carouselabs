-- Manual fallback for the CommentProfile.isRecommended column — run this in the
-- Supabase SQL editor if `npx prisma db push` can't reach the DB directly (same
-- situation as scripts/settings-schema.sql). Matches prisma/schema.prisma:
--   - CommentProfile.isRecommended (new column on an existing table)
--
-- ORDER MATTERS: apply this BEFORE deploying code that reads the column, and
-- BEFORE seed-comment-profiles.sql (its recommended block writes this column).
-- /api/ext/profiles selects every CommentProfile column, so code that expects
-- isRecommended against a database without it returns a 500 for every user —
-- the same failure mode as the earlier defaultLanguage deploy.
--
-- IDEMPOTENT: safe to re-run. NOT NULL with a constant default adds without a
-- table rewrite on Postgres 11+, and every existing row reads as false, so the
-- original seven system profiles and all custom profiles are unaffected.

ALTER TABLE "CommentProfile" ADD COLUMN IF NOT EXISTS "isRecommended" BOOLEAN NOT NULL DEFAULT false;
