-- scripts/email-scanners-gmail-fix.sql
-- Gives back Gmail opens that scripts/email-scanners.sql turned into the
-- security scanner's. Those opens were recorded before the scanner checks,
-- so they have no signature to judge by, and the first-minute rule took
-- them. But Gmail loads the image through its own servers only when the
-- person opens the email (and only the first open ever reaches us), so an
-- open to a Gmail address straight after sending was the person.
--
-- Touches only Gmail addresses whose only "scanner" activity is that one
-- recorded-before-checks open in the first minute. Idempotent: safe to
-- re-run. Run after scripts/email-scanners.sql.

-- ── Campaigns ───────────────────────────────────────────────────────────
UPDATE "EmailTrackEvent" e
SET "verdict" = 'person', "reason" = 'Gmail open, recorded before scanner checks'
FROM "EmailCampaignRecipient" r
WHERE e."kind" = 'campaign' AND e."refId" = r."id"
  AND e."verdict" = 'scanner' AND e."reason" = 'Within a minute of sending' AND e."userAgent" IS NULL
  AND lower(split_part(r."email", '@', 2)) IN ('gmail.com', 'googlemail.com')
  AND NOT EXISTS (
    SELECT 1 FROM "EmailTrackEvent" o
    WHERE o."kind" = 'campaign' AND o."refId" = r."id" AND o."verdict" = 'scanner' AND o."userAgent" IS NOT NULL
  );

UPDATE "EmailCampaignRecipient" r
SET "openedAt" = r."scannedAt", "lastOpenedAt" = r."scannedAt", "openCount" = 1, "scannedAt" = NULL, "scanReason" = NULL
WHERE r."openedAt" IS NULL AND r."scanReason" = 'Within a minute of sending'
  AND EXISTS (
    SELECT 1 FROM "EmailTrackEvent" e
    WHERE e."kind" = 'campaign' AND e."refId" = r."id" AND e."reason" = 'Gmail open, recorded before scanner checks'
  )
  AND NOT EXISTS (SELECT 1 FROM "EmailTrackEvent" e WHERE e."kind" = 'campaign' AND e."refId" = r."id" AND e."verdict" = 'scanner');

-- ── Personal emails (the address is the account's) ──────────────────────
UPDATE "EmailTrackEvent" e
SET "verdict" = 'person', "reason" = 'Gmail open, recorded before scanner checks'
FROM "PersonalEmailTrack" p JOIN "User" u ON u."id" = p."userId"
WHERE e."kind" = 'personal' AND e."refId" = p."emailId"
  AND e."verdict" = 'scanner' AND e."reason" = 'Within a minute of sending' AND e."userAgent" IS NULL
  AND lower(split_part(u."email", '@', 2)) IN ('gmail.com', 'googlemail.com')
  AND NOT EXISTS (
    SELECT 1 FROM "EmailTrackEvent" o
    WHERE o."kind" = 'personal' AND o."refId" = p."emailId" AND o."verdict" = 'scanner' AND o."userAgent" IS NOT NULL
  );

UPDATE "PersonalEmailTrack" p
SET "openedAt" = p."scannedAt", "lastOpenedAt" = p."scannedAt", "openCount" = 1, "scannedAt" = NULL, "scanReason" = NULL
WHERE p."openedAt" IS NULL AND p."scanReason" = 'Within a minute of sending'
  AND EXISTS (
    SELECT 1 FROM "EmailTrackEvent" e
    WHERE e."kind" = 'personal' AND e."refId" = p."emailId" AND e."reason" = 'Gmail open, recorded before scanner checks'
  )
  AND NOT EXISTS (SELECT 1 FROM "EmailTrackEvent" e WHERE e."kind" = 'personal' AND e."refId" = p."emailId" AND e."verdict" = 'scanner');
