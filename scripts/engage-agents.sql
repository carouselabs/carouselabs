-- scripts/engage-agents.sql
-- Custom AI conversation agents for CarouseLabs Engage (both extensions'
-- Messages screens and the website's Extension → AI agents), prisma/
-- schema.prisma's EngageAgent:
--   1. EngageAgent: one person's agents. Their structured setup (business,
--      audience, goals, style, verified facts, rules, examples) is one JSON
--      column, read by lib/engageAgents.ts; the prompt is built from it on
--      every reply, never stored.
--   2. ContactContext."agentId": a conversation that uses an agent remembers
--      which one (its "choice" is then 'agent').
--
-- A new table and one new nullable column: nothing existing changes, and
-- extension versions without agents ignore both. Idempotent: safe to re-run.
-- Run in Supabase BEFORE the website code that uses it is deployed.
-- Undo: scripts/engage-agents-rollback.sql.

-- ── 1. EngageAgent ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "EngageAgent" (
  "id"          TEXT PRIMARY KEY,
  "userId"      TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "purpose"     TEXT NOT NULL DEFAULT 'other',
  "config"      JSONB NOT NULL DEFAULT '{}'::jsonb,
  "status"      TEXT NOT NULL DEFAULT 'active',
  "isDefault"   BOOLEAN NOT NULL DEFAULT false,
  "version"     INTEGER NOT NULL DEFAULT 1,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "EngageAgent_userId_idx" ON "EngageAgent"("userId");

-- Deleting a user removes their agents, as in Prisma.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EngageAgent_userId_fkey') THEN
    ALTER TABLE "EngageAgent" ADD CONSTRAINT "EngageAgent_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ── 2. ContactContext."agentId" ─────────────────────────────────────────
ALTER TABLE "ContactContext" ADD COLUMN IF NOT EXISTS "agentId" TEXT;
