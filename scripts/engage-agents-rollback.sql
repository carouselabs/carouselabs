-- scripts/engage-agents-rollback.sql
-- Undoes scripts/engage-agents.sql. DELETES every saved agent. Only for
-- backing the feature out: deploy website code without agents first.
-- Conversations that used an agent fall back to the default reason (their
-- "choice" stays 'agent', which every panel treats as unset).
ALTER TABLE "ContactContext" DROP COLUMN IF EXISTS "agentId";
DROP TABLE IF EXISTS "EngageAgent";
