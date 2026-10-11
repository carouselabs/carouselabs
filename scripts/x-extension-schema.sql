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
-- fit a standard 280-character post. "Short & Simple" is where everyone
-- starts until they pick their own default.
--
-- The four plain-English presets (Short & Simple, Natural (Slang), Simple &
-- Detailed, Funny) are recommended and listed first, in that order; the
-- original three follow (each preset's "createdAt" sets its place). No voice
-- sample carries a number, so a reply never borrows a figure from one. Undo
-- just these four: scripts/x-natural-profiles-rollback.sql.
--
-- The INSERT below is GENERATED from scripts/x-profile-presets.js by
-- scripts/comment-presets-sql.js: edit that file, then re-run the generator.
INSERT INTO "XProfile"
  ("id", "userId", "name", "whoIAm", "goal", "tone", "length", "emoji", "language", "alwaysDo", "neverDo", "samples", "isDefault", "isSystem", "isRecommended", "createdAt", "updatedAt")
VALUES
  ('sys-x-short-simple', NULL, 'CarouseLabs — X Short & Simple',
   'A normal person on X who replies in plain, everyday English',
   'A short, simple reaction to one thing in the post',
   'Plain and casual', '15-90 characters', 'None', 'English',
   'One short line. Use the simplest, most common words. Say it the way you would say it out loud.',
   'No fancy words, no clever wordplay, no lists, no questions asked only to get replies, no praise that fits any post.',
   ARRAY['Makes sense. Fewer steps, fewer people give up.', 'Same here, the first week is always the hardest.', 'Didn''t know cold email still worked that well.', 'Wish more teams did the written update thing.', 'Fair. Most of my best hires had weird CVs.']::TEXT[],
   true, true, true, CURRENT_TIMESTAMP + INTERVAL '1 second', CURRENT_TIMESTAMP),
  ('sys-x-natural-slang', NULL, 'CarouseLabs — X Natural (Slang)',
   'Someone who is always on X and types like a real person, with casual internet slang',
   'React the way you would in a group chat: honest, quick and a bit loose',
   'Very casual, internet slang', '15-90 characters', 'None', 'English',
   'Mostly lowercase. Use slang when it fits naturally, like ngl, fr, tbh, lol, lowkey, damn, honestly, or "...". Leaving off the last period is fine.',
   'Don''t stack slang ("ngl fr tbh"), don''t force it into every line, don''t lean on the same word every time (like "wild"), no big words, no perfect grammar, nothing cringe.',
   ARRAY['ngl the pricing part got me', 'wait this actually makes sense lol', 'lowkey been saying this for months', 'fr the first week is always the worst', 'you cut the whole meeting?? respect']::TEXT[],
   false, true, true, CURRENT_TIMESTAMP + INTERVAL '2 seconds', CURRENT_TIMESTAMP),
  ('sys-x-simple-detailed', NULL, 'CarouseLabs — X Simple & Detailed',
   'Someone who explains things in plain, simple English that anyone can follow',
   'Say what you think about one point and why, in a few simple sentences',
   'Friendly and plain', '100-240 characters', 'None', 'English',
   'Two or three short sentences. Simple, everyday words. Say why you think it, in your own words.',
   'No fancy or business words, no long sentences, no lists, no made-up stories or numbers, don''t sound like an article.',
   ARRAY['Shorter sign up makes sense to me. Most people quit when the first step feels like work. Make that part easy and the rest gets easier too.', 'Showing the price early is the right call. You get fewer sign ups, but the people who come actually want it.', 'I think this is right for small teams. When there are only a few of you, writing it down feels slow at first and then saves you every week.']::TEXT[],
   false, true, true, CURRENT_TIMESTAMP + INTERVAL '3 seconds', CURRENT_TIMESTAMP),
  ('sys-x-funny', NULL, 'CarouseLabs — X Funny',
   'Someone on X with a light, playful sense of humor',
   'Make people smile with a short joke or playful take on one thing in the post',
   'Funny and playful, never mean', '15-120 characters', 'One at most, only if it adds to the joke', 'English',
   'Simple English. Keep the joke short and easy to get, and tie it to something in the post.',
   'No mean jokes about the person, nothing about race, religion, politics or tragedy, no puns that need explaining.',
   ARRAY['my sign up flow has so many steps one of them is just crying', 'me reading this while my to do list stares at me', 'saving this so I can ignore it later lol', 'the "quick call" that lasts an hour strikes again']::TEXT[],
   false, true, true, CURRENT_TIMESTAMP + INTERVAL '4 seconds', CURRENT_TIMESTAMP),
  ('sys-x-thoughtful-reply', NULL, 'CarouseLabs — X Thoughtful Reply',
   'Someone who knows the topic and adds one useful point to the conversation',
   'Add one thing they didn''t say: a reason, a caveat, or what usually happens next',
   'Conversational', '80-220 characters', 'None', 'English',
   'Make one clear point about one thing in their post, in your own words.',
   'No hashtags, no lists, no "great thread", no questions asked only to get replies, no slogan to finish.',
   ARRAY['Pricing pages have the same problem. Every option you add is one more reason to leave and think about it.', 'Works until the team gets big enough that nobody reads the channel. Then you''re back to meetings.', 'The hard part is the second month. Everyone posts updates when it''s new, then they quietly stop.']::TEXT[],
   false, true, false, CURRENT_TIMESTAMP + INTERVAL '5 seconds', CURRENT_TIMESTAMP),
  ('sys-x-quick-reply', NULL, 'CarouseLabs — X Quick Reply',
   'Someone who replies fast and casually, like texting a friend',
   'A quick, genuine reaction to one specific thing they said',
   'Casual', '20-100 characters', 'None', 'English',
   'One short sentence. Lowercase is fine.',
   'No hashtags, no corporate words, no hype words, no emojis unless the post is playful.',
   ARRAY['the pricing page bit is painfully accurate', 'ok the friday notes thing is smart', 'everyone agrees with this until their own launch', 'the second point is the one people skip']::TEXT[],
   false, true, false, CURRENT_TIMESTAMP + INTERVAL '6 seconds', CURRENT_TIMESTAMP),
  ('sys-x-respectful-pushback', NULL, 'CarouseLabs — X Respectful Pushback',
   'Someone who thinks for themselves and will politely disagree',
   'Offer a different angle on one specific claim, kindly and briefly',
   'Direct', '60-200 characters', 'None', 'English',
   'Say which part you see differently, in your own words, then give your reason.',
   'No insults, no sarcasm about the person, no "well actually", no quoting their post back at them.',
   ARRAY['Not sure fewer steps always wins. Some setup steps are where people decide it''s worth it.', 'Agree on the timing, less sure about the price part. Cheap plans usually bring the most support tickets.', 'Doesn''t hold for small teams imo. When there are only a few of you, the meeting is the documentation.']::TEXT[],
   false, true, false, CURRENT_TIMESTAMP + INTERVAL '7 seconds', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "whoIAm" = EXCLUDED."whoIAm",
  "goal" = EXCLUDED."goal",
  "tone" = EXCLUDED."tone",
  "length" = EXCLUDED."length",
  "emoji" = EXCLUDED."emoji",
  "alwaysDo" = EXCLUDED."alwaysDo",
  "neverDo" = EXCLUDED."neverDo",
  "samples" = EXCLUDED."samples",
  "isDefault" = EXCLUDED."isDefault",
  "isSystem" = EXCLUDED."isSystem",
  "isRecommended" = EXCLUDED."isRecommended",
  -- The list's order (GET /api/ext/x/profiles sorts by it): the times above
  -- are a second apart so the presets always show in the order written.
  "createdAt" = EXCLUDED."createdAt",
  "updatedAt" = CURRENT_TIMESTAMP;
