-- scripts/email-scanners.sql
-- Telling people from security scanners in seen and clicked
-- (lib/emailScanners.ts). Company email systems (Microsoft Defender,
-- Mimecast, Proofpoint…) open each email and visit every link before the
-- person gets it, which looked like "Seen, clicked 6×" the minute it was sent.
--   1. Four new columns on "EmailCampaignRecipient" and "PersonalEmailTrack":
--      a scanner's first visit and why, Apple Mail's own opening, and a
--      person's last click.
--   2. "EmailTrackEvent": every open and click with its verdict; seen and
--      clicked are worked out from it.
--   3. Activity in the first minute after an email was sent becomes the
--      scanner's (as chosen), and the rest is copied into the log so nothing
--      real is lost.
--
-- Idempotent: safe to re-run (step 3 only touches what it hasn't already).
-- Run in Supabase BEFORE the website code that uses it is deployed (until
-- then only the first-minute rule applies).
-- Undo: scripts/email-scanners-rollback.sql.

-- ── 1. New columns ──────────────────────────────────────────────────────
ALTER TABLE "EmailCampaignRecipient" ADD COLUMN IF NOT EXISTS "lastClickedAt" TIMESTAMP(3);
ALTER TABLE "EmailCampaignRecipient" ADD COLUMN IF NOT EXISTS "scannedAt" TIMESTAMP(3);
ALTER TABLE "EmailCampaignRecipient" ADD COLUMN IF NOT EXISTS "scanReason" TEXT;
ALTER TABLE "EmailCampaignRecipient" ADD COLUMN IF NOT EXISTS "autoOpenedAt" TIMESTAMP(3);
ALTER TABLE "PersonalEmailTrack" ADD COLUMN IF NOT EXISTS "lastClickedAt" TIMESTAMP(3);
ALTER TABLE "PersonalEmailTrack" ADD COLUMN IF NOT EXISTS "scannedAt" TIMESTAMP(3);
ALTER TABLE "PersonalEmailTrack" ADD COLUMN IF NOT EXISTS "scanReason" TEXT;
ALTER TABLE "PersonalEmailTrack" ADD COLUMN IF NOT EXISTS "autoOpenedAt" TIMESTAMP(3);

-- ── 2. The activity log ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "EmailTrackEvent" (
  "id"        TEXT PRIMARY KEY,
  "kind"      TEXT NOT NULL,
  "refId"     TEXT NOT NULL,
  "type"      TEXT NOT NULL,
  "at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "link"      TEXT,
  "source"    TEXT,
  "userAgent" TEXT,
  "verdict"   TEXT NOT NULL,
  "reason"    TEXT
);
CREATE INDEX IF NOT EXISTS "EmailTrackEvent_kind_refId_at_idx" ON "EmailTrackEvent"("kind", "refId", "at");

-- ── 3. What's been recorded so far ──────────────────────────────────────
-- First seen within a minute of sending: the scanner, not a person.
UPDATE "EmailCampaignRecipient"
SET "scannedAt" = "openedAt", "scanReason" = 'Within a minute of sending',
    "openedAt" = NULL, "lastOpenedAt" = NULL, "openCount" = 0, "clickedAt" = NULL, "clickCount" = 0
WHERE "sentAt" IS NOT NULL AND "openedAt" IS NOT NULL AND "openedAt" < "sentAt" + INTERVAL '1 minute' AND "scannedAt" IS NULL;

UPDATE "PersonalEmailTrack"
SET "scannedAt" = "openedAt", "scanReason" = 'Within a minute of sending',
    "openedAt" = NULL, "lastOpenedAt" = NULL, "openCount" = 0, "clickedAt" = NULL, "clickCount" = 0
WHERE "openedAt" IS NOT NULL AND "openedAt" < "createdAt" + INTERVAL '1 minute' AND "scannedAt" IS NULL;

-- Into the log, once per email (only emails with nothing in it yet): each
-- open and click kept so far as a person's, and each scanner found above.
WITH todo AS (
  SELECT 'campaign' AS kind, r."id" AS ref, r."openedAt", r."lastOpenedAt", r."openCount", r."clickedAt", r."clickCount", r."scannedAt", r."scanReason"
  FROM "EmailCampaignRecipient" r
  WHERE (r."openedAt" IS NOT NULL OR r."scannedAt" IS NOT NULL)
    AND NOT EXISTS (SELECT 1 FROM "EmailTrackEvent" e WHERE e."kind" = 'campaign' AND e."refId" = r."id")
  UNION ALL
  SELECT 'personal', p."emailId", p."openedAt", p."lastOpenedAt", p."openCount", p."clickedAt", p."clickCount", p."scannedAt", p."scanReason"
  FROM "PersonalEmailTrack" p
  WHERE (p."openedAt" IS NOT NULL OR p."scannedAt" IS NOT NULL)
    AND NOT EXISTS (SELECT 1 FROM "EmailTrackEvent" e WHERE e."kind" = 'personal' AND e."refId" = p."emailId")
)
INSERT INTO "EmailTrackEvent" ("id", "kind", "refId", "type", "at", "verdict", "reason")
SELECT gen_random_uuid()::text, kind, ref, 'open', CASE WHEN n = 1 THEN "openedAt" ELSE COALESCE("lastOpenedAt", "openedAt") END, 'person', 'Recorded before scanner checks'
FROM todo, generate_series(1, GREATEST("openCount", 0)) AS n
WHERE "openedAt" IS NOT NULL
UNION ALL
SELECT gen_random_uuid()::text, kind, ref, 'human', "clickedAt", 'person', 'Recorded before scanner checks'
FROM todo, generate_series(1, GREATEST("clickCount", 0)) AS n
WHERE "clickedAt" IS NOT NULL
UNION ALL
SELECT gen_random_uuid()::text, kind, ref, 'open', "scannedAt", 'scanner', "scanReason"
FROM todo
WHERE "scannedAt" IS NOT NULL;
