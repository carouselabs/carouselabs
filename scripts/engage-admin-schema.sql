-- scripts/engage-admin-schema.sql
-- Engage admin, phase A (prisma/schema.prisma, "Engage admin" section):
--   1. AuditLog: structured columns (product, old/new value, reason).
--   2. EngageUserControl: per-user feature switches, limits, free
--      generations and Engage-only suspension.
--   3. EngageAccessGrant: free (unlimited) access given by an admin.
--   4. EngageUsageCounter: generations per user / feature / day and month.
--   5. EngageClientInfo: extension version per signed-in browser.
--   6. EngageClientError: errors the side panel reports (no content).
--   7. AdminNote and AdminUserTag: internal notes and labels on users.
--
-- Additive only: new tables and new nullable columns, nothing dropped or
-- rewritten. Idempotent: safe to re-run. Run this in Supabase BEFORE
-- deploying the code that uses it — every admin action writes the new
-- AuditLog columns. Undo: scripts/engage-admin-schema-rollback.sql.

-- ── 1. AuditLog ─────────────────────────────────────────────────────────
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "product"  TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "oldValue" JSONB;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "newValue" JSONB;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "reason"   TEXT;
CREATE INDEX IF NOT EXISTS "AuditLog_targetUserId_createdAt_idx" ON "AuditLog"("targetUserId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_product_createdAt_idx" ON "AuditLog"("product", "createdAt");

-- ── 2. EngageUserControl ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "EngageUserControl" (
  "userId"          TEXT PRIMARY KEY,
  "features"        JSONB NOT NULL DEFAULT '{}',
  "limits"          JSONB NOT NULL DEFAULT '{}',
  "freeGenerations" INTEGER,
  "suspendedAt"     TIMESTAMP(3),
  "suspendedBy"     TEXT,
  "suspendReason"   TEXT,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedBy"       TEXT
);

-- ── 3. EngageAccessGrant ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "EngageAccessGrant" (
  "id"           TEXT PRIMARY KEY,
  "userId"       TEXT,
  "email"        TEXT NOT NULL,
  "startsAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endsAt"       TIMESTAMP(3),
  "reason"       TEXT NOT NULL,
  "grantedBy"    TEXT NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt"    TIMESTAMP(3),
  "revokedBy"    TEXT,
  "revokeReason" TEXT
);
CREATE INDEX IF NOT EXISTS "EngageAccessGrant_userId_idx" ON "EngageAccessGrant"("userId");
CREATE INDEX IF NOT EXISTS "EngageAccessGrant_email_idx" ON "EngageAccessGrant"("email");
CREATE INDEX IF NOT EXISTS "EngageAccessGrant_createdAt_idx" ON "EngageAccessGrant"("createdAt");

-- ── 4. EngageUsageCounter ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "EngageUsageCounter" (
  "userId"      TEXT NOT NULL,
  "feature"     TEXT NOT NULL,
  "period"      TEXT NOT NULL,
  "periodStart" DATE NOT NULL,
  "count"       INTEGER NOT NULL DEFAULT 0,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("userId", "feature", "period", "periodStart")
);
CREATE INDEX IF NOT EXISTS "EngageUsageCounter_period_periodStart_idx" ON "EngageUsageCounter"("period", "periodStart");

-- ── 5. EngageClientInfo ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "EngageClientInfo" (
  "tokenId"          TEXT PRIMARY KEY,
  "userId"           TEXT NOT NULL,
  "extensionVersion" TEXT NOT NULL,
  "lastSeenAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "EngageClientInfo_userId_idx" ON "EngageClientInfo"("userId");
CREATE INDEX IF NOT EXISTS "EngageClientInfo_extensionVersion_idx" ON "EngageClientInfo"("extensionVersion");

-- ── 6. EngageClientError ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "EngageClientError" (
  "id"               TEXT PRIMARY KEY,
  "userId"           TEXT,
  "feature"          TEXT NOT NULL,
  "code"             TEXT NOT NULL,
  "message"          TEXT NOT NULL,
  "extensionVersion" TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "EngageClientError_createdAt_idx" ON "EngageClientError"("createdAt");
CREATE INDEX IF NOT EXISTS "EngageClientError_feature_createdAt_idx" ON "EngageClientError"("feature", "createdAt");
CREATE INDEX IF NOT EXISTS "EngageClientError_code_idx" ON "EngageClientError"("code");

-- ── 7. AdminNote, AdminUserTag ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "AdminNote" (
  "id"          TEXT PRIMARY KEY,
  "userId"      TEXT NOT NULL,
  "authorEmail" TEXT NOT NULL,
  "body"        TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "AdminNote_userId_createdAt_idx" ON "AdminNote"("userId", "createdAt");

CREATE TABLE IF NOT EXISTS "AdminUserTag" (
  "userId"    TEXT NOT NULL,
  "tag"       TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("userId", "tag")
);
CREATE INDEX IF NOT EXISTS "AdminUserTag_tag_idx" ON "AdminUserTag"("tag");

-- ── Foreign keys: deleting a user removes their rows, as in Prisma ──────
DO $$
DECLARE
  fk RECORD;
BEGIN
  FOR fk IN
    SELECT * FROM (VALUES
      ('EngageUserControl', 'EngageUserControl_userId_fkey'),
      ('EngageAccessGrant', 'EngageAccessGrant_userId_fkey'),
      ('EngageUsageCounter', 'EngageUsageCounter_userId_fkey'),
      ('EngageClientInfo', 'EngageClientInfo_userId_fkey'),
      ('EngageClientError', 'EngageClientError_userId_fkey'),
      ('AdminNote', 'AdminNote_userId_fkey'),
      ('AdminUserTag', 'AdminUserTag_userId_fkey')
    ) AS t(tbl, name)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = fk.name) THEN
      EXECUTE format(
        'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE',
        fk.tbl, fk.name
      );
    END IF;
  END LOOP;
END $$;
