-- scripts/x-extension-schema.sql
-- CarouseLabs Engage for X (the separate X extension), prisma/schema.prisma's
-- XProfile and XUserSettings:
--   1. XProfile: voice profiles for X replies (the user's own, and the
--      CarouseLabs presets everyone sees), separate from LinkedIn's.
--   2. XUserSettings: the X extension's per-account settings.
--   3. The CarouseLabs presets for X.
--
-- New tables only: no existing table or column changes, so the LinkedIn
-- extension and the website are unaffected. Idempotent: safe to re-run (the
-- presets are updated in place). Run in Supabase before the X extension is
-- used. Undo: scripts/x-extension-schema-rollback.sql.

-- ── 1. XProfile ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "XProfile" (
  "id"            TEXT PRIMARY KEY,
  "userId"        TEXT,
  "name"          TEXT NOT NULL,
  "whoIAm"        TEXT NOT NULL,
  "goal"          TEXT NOT NULL,
  "tone"          TEXT NOT NULL,
  "length"        TEXT NOT NULL,
  "emoji"         TEXT NOT NULL DEFAULT 'None',
  "language"      TEXT NOT NULL DEFAULT 'English',
  "alwaysDo"      TEXT,
  "neverDo"       TEXT,
  "samples"       TEXT[],
  "isDefault"     BOOLEAN NOT NULL DEFAULT false,
  "isSystem"      BOOLEAN NOT NULL DEFAULT false,
  "isRecommended" BOOLEAN NOT NULL DEFAULT false,
  "testsUsed"     INTEGER NOT NULL DEFAULT 0,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "XProfile_userId_idx" ON "XProfile"("userId");

-- ── 2. XUserSettings ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "XUserSettings" (
  "userId"             TEXT PRIMARY KEY,
  "defaultProfileId"   TEXT,
  "maxReplyLength"     INTEGER NOT NULL DEFAULT 280,
  "insertButtonHidden" BOOLEAN NOT NULL DEFAULT false,
  "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Deleting a user removes their X profiles and settings, as in Prisma.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'XProfile_userId_fkey') THEN
    ALTER TABLE "XProfile" ADD CONSTRAINT "XProfile_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'XUserSettings_userId_fkey') THEN
    ALTER TABLE "XUserSettings" ADD CONSTRAINT "XUserSettings_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ── 3. CarouseLabs presets for X ────────────────────────────────────────
-- Lengths are X's own count (a link is 23, an emoji 2; lib/xText.ts), and all
-- fit a standard 280-character post. "Thoughtful Reply" is where everyone
-- starts until they pick their own default.
INSERT INTO "XProfile"
  ("id", "userId", "name", "whoIAm", "goal", "tone", "length", "emoji", "language", "alwaysDo", "neverDo", "samples", "isDefault", "isSystem", "isRecommended", "createdAt", "updatedAt")
VALUES
  ('sys-x-thoughtful-reply', NULL, 'CarouseLabs — X Thoughtful Reply',
   'Someone who knows the topic and adds one useful point to the conversation',
   'Add one specific insight or experience that builds on what they said',
   'Conversational', '80-220 characters', 'None', 'English',
   'Make one clear point, tied to a detail from their post.',
   'No hashtags, no lists, no "great thread", no questions asked only to get replies.',
   ARRAY['Moving the invite step after the first real win is the part most teams miss. Order beats count.',
         'The 31% to 48% jump is the headline, but cutting 9 steps without losing setup is the hard part.',
         'Same thing happened to us: the fewer choices on day one, the more people came back on day two.']::TEXT[],
   true, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sys-x-quick-reply', NULL, 'CarouseLabs — X Quick Reply',
   'Someone who replies fast and casually, like texting a friend',
   'A quick, genuine reaction to one specific point',
   'Casual', '20-100 characters', 'None', 'English',
   'One short sentence. Lowercase is fine.',
   'No hashtags, no corporate words, no emojis unless the post is playful.',
   ARRAY['the invite-after-first-win point is so underrated',
         '14 steps to 5 is wild, most teams never cut that deep',
         'this is the part nobody puts in the case study']::TEXT[],
   false, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sys-x-respectful-pushback', NULL, 'CarouseLabs — X Respectful Pushback',
   'Someone who thinks for themselves and will politely disagree',
   'Offer a different angle on one specific claim, kindly and briefly',
   'Direct', '60-200 characters', 'None', 'English',
   'Name the exact claim you see differently, then give your reason.',
   'No insults, no sarcasm about the person, no "well actually".',
   ARRAY['I''d push back on "fewer steps always wins". We cut to 3 and activation dropped, the setup step was doing real work.',
         'Agree on order, less sure about count. Some steps are where people decide it''s worth it.']::TEXT[],
   false, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "whoIAm" = EXCLUDED."whoIAm",
  "goal" = EXCLUDED."goal",
  "tone" = EXCLUDED."tone",
  "length" = EXCLUDED."length",
  "alwaysDo" = EXCLUDED."alwaysDo",
  "neverDo" = EXCLUDED."neverDo",
  "samples" = EXCLUDED."samples",
  "isDefault" = EXCLUDED."isDefault",
  "isSystem" = EXCLUDED."isSystem",
  "isRecommended" = EXCLUDED."isRecommended",
  "updatedAt" = CURRENT_TIMESTAMP;
