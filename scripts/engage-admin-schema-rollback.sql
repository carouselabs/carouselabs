-- scripts/engage-admin-schema-rollback.sql
-- Undoes scripts/engage-admin-schema.sql. Deploy the code from before the
-- Engage admin FIRST (it writes these tables and columns), then run this.
--
-- WARNING: deletes every grant, per-user control, usage count, note and tag
-- the Engage admin recorded, and the structured audit fields (the audit rows
-- themselves and their text details stay). Export anything you need first.

DROP TABLE IF EXISTS "AdminUserTag";
DROP TABLE IF EXISTS "AdminNote";
DROP TABLE IF EXISTS "EngageClientError";
DROP TABLE IF EXISTS "EngageClientInfo";
DROP TABLE IF EXISTS "EngageUsageCounter";
DROP TABLE IF EXISTS "EngageAccessGrant";
DROP TABLE IF EXISTS "EngageUserControl";

DROP INDEX IF EXISTS "AuditLog_product_createdAt_idx";
DROP INDEX IF EXISTS "AuditLog_targetUserId_createdAt_idx";
ALTER TABLE "AuditLog" DROP COLUMN IF EXISTS "reason";
ALTER TABLE "AuditLog" DROP COLUMN IF EXISTS "newValue";
ALTER TABLE "AuditLog" DROP COLUMN IF EXISTS "oldValue";
ALTER TABLE "AuditLog" DROP COLUMN IF EXISTS "product";
