-- scripts/engage-admin-phase-c.sql
-- Engage admin, phase C (prisma/schema.prisma, model EngageAiCall): one row
-- per AI model call the extensions make — who, which feature, which model,
-- tokens in and out, time taken and how it ended — for admin → Engage → AI
-- (usage and cost). No text the user wrote or the AI answered is stored.
-- The AI model per feature and the prices per model are stored in
-- "EngageSetting" (phase B's table), so that table must exist too.
--
-- One new table. Nothing existing changes. Idempotent: safe to re-run.
-- Run in Supabase before deploying the phase C code (without it the code
-- works, it just doesn't record AI calls). Undo:
-- scripts/engage-admin-phase-c-rollback.sql.

CREATE TABLE IF NOT EXISTS "EngageSetting" (
  "key"       TEXT PRIMARY KEY,
  "value"     JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedBy" TEXT
);

CREATE TABLE IF NOT EXISTS "EngageAiCall" (
  "id"           TEXT PRIMARY KEY,
  "userId"       TEXT,
  "kind"         TEXT NOT NULL,
  "feature"      TEXT NOT NULL,
  "route"        TEXT NOT NULL,
  "model"        TEXT NOT NULL,
  "fallback"     BOOLEAN NOT NULL DEFAULT false,
  "streamed"     BOOLEAN NOT NULL DEFAULT false,
  "outcome"      TEXT NOT NULL,
  "inputTokens"  INTEGER,
  "outputTokens" INTEGER,
  "firstTokenMs" INTEGER,
  "ms"           INTEGER NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "EngageAiCall_createdAt_idx" ON "EngageAiCall"("createdAt");
CREATE INDEX IF NOT EXISTS "EngageAiCall_userId_createdAt_idx" ON "EngageAiCall"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "EngageAiCall_feature_createdAt_idx" ON "EngageAiCall"("feature", "createdAt");

-- Check: both tables are there (no rows yet is correct).
SELECT (SELECT count(*) FROM "EngageAiCall") AS ai_calls, (SELECT count(*) FROM "EngageSetting") AS settings;
