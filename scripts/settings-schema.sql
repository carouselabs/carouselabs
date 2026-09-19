-- Manual fallback for the Comment extension's Settings screen schema change —
-- run this in the Supabase SQL editor if `npx prisma db push` can't reach the
-- DB directly (same situation as scripts/comment-extension-schema.sql).
-- Matches prisma/schema.prisma exactly:
--   - User.defaultLanguage (new nullable column on an existing table)
--
-- Nullable rather than defaulted on purpose: it keeps "never chosen"
-- distinguishable from "chose English", so the Settings screen can show a
-- genuine unset state instead of implying a preference the user never set.
--
-- IDEMPOTENT: safe to re-run. ADD COLUMN IF NOT EXISTS is native Postgres.
-- Additive only — no existing column is altered and no data is rewritten, so
-- this cannot affect any current credit, profile or history row.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "defaultLanguage" TEXT;
