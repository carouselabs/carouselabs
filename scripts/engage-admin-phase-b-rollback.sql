-- scripts/engage-admin-phase-b-rollback.sql
-- Undoes scripts/engage-admin-phase-b.sql. Safe at any time: without the
-- table every setting goes back to its default (everything on, no minimum
-- version), so a feature paused in Controls comes back on.

DROP TABLE IF EXISTS "EngageSetting";
