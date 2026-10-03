-- scripts/engage-admin-phase-c-rollback.sql
-- Undoes scripts/engage-admin-phase-c.sql: deletes the record of AI calls
-- (usage and cost history). The extensions keep working; AI calls simply
-- stop being recorded. "EngageSetting" is phase B's and stays.

DROP TABLE IF EXISTS "EngageAiCall";
