-- scripts/leads.sql
-- Leads (Admin → Broadcasts → Leads, lib/leads.ts): people who don't use
-- CarouseLabs yet, uploaded from a CSV and kept to send campaigns to.
--   "Lead"           one row per email address, with its name, the file's
--                    other columns (fields) and whether they unsubscribed
--   "LeadList"       one upload, named by the admin
--   "LeadListMember" which leads came in on which list
--
-- Three new tables and two new empty columns: nothing existing changes.
-- Idempotent: safe to re-run.
-- Run in Supabase BEFORE the website code that uses it is deployed (until
-- then the Leads page says to run it, and campaigns work as before).
-- Undo: scripts/leads-rollback.sql.
--
-- Added for Brevo (leads' emails go through Brevo, lib/brevo.ts): two new
-- columns at the end. Running this whole file again is safe.

CREATE TABLE IF NOT EXISTS "Lead" (
  "id"             TEXT PRIMARY KEY,
  "email"          TEXT NOT NULL,
  "firstName"      TEXT,
  "lastName"       TEXT,
  "name"           TEXT,
  "fields"         JSONB NOT NULL DEFAULT '{}',
  "unsubscribedAt" TIMESTAMP(3),
  "lastEmailedAt"  TIMESTAMP(3),
  "emailCount"     INTEGER NOT NULL DEFAULT 0,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "Lead_email_key" ON "Lead"("email");
CREATE INDEX IF NOT EXISTS "Lead_createdAt_idx" ON "Lead"("createdAt");

CREATE TABLE IF NOT EXISTS "LeadList" (
  "id"        TEXT PRIMARY KEY,
  "name"      TEXT NOT NULL,
  "fileName"  TEXT,
  "columns"   JSONB NOT NULL DEFAULT '[]',
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "LeadList_createdAt_idx" ON "LeadList"("createdAt");

CREATE TABLE IF NOT EXISTS "LeadListMember" (
  "listId"    TEXT NOT NULL,
  "leadId"    TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeadListMember_pkey" PRIMARY KEY ("listId", "leadId")
);
CREATE INDEX IF NOT EXISTS "LeadListMember_leadId_idx" ON "LeadListMember"("leadId");

-- Deleting a list or a lead removes its memberships, as in Prisma.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LeadListMember_listId_fkey') THEN
    ALTER TABLE "LeadListMember" ADD CONSTRAINT "LeadListMember_listId_fkey"
      FOREIGN KEY ("listId") REFERENCES "LeadList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LeadListMember_leadId_fkey') THEN
    ALTER TABLE "LeadListMember" ADD CONSTRAINT "LeadListMember_leadId_fkey"
      FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ── Brevo ───────────────────────────────────────────────────────────────
-- Why a lead stopped getting emails, when Brevo told us (bounced, spam...).
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "stopReason" TEXT;
-- What sent each campaign email: empty = Resend, 'brevo' = Brevo. Each has
-- its own daily limit; everything sent before this was Resend.
ALTER TABLE "EmailCampaignRecipient" ADD COLUMN IF NOT EXISTS "provider" TEXT;
