-- scripts/reddit-extension-schema.sql
-- CarouseLabs Engage for Reddit (the separate Reddit extension),
-- prisma/schema.prisma's RedditProfile, RedditUserSettings and
-- RedditSubscription:
--   1. RedditProfile: voice profiles for Reddit comments and replies (the
--      user's own, and the CarouseLabs presets everyone sees).
--   2. RedditUserSettings: the Reddit extension's per-account settings.
--   3. RedditSubscription: its own $15/month Lemon Squeezy subscription, and
--      "User"."redditTrialUsed": its own 10 free generations (it is sold
--      separately, like X).
--   4. The CarouseLabs presets for Reddit.
--
-- Additive only: new tables and one new column with a default, so LinkedIn,
-- X and the website are unaffected. Idempotent: safe to re-run (the presets
-- are updated in place). Run in Supabase BEFORE deploying the code that uses
-- it. Undo: scripts/reddit-extension-schema-rollback.sql.

-- ── 1. RedditProfile ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "RedditProfile" (
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
CREATE INDEX IF NOT EXISTS "RedditProfile_userId_idx" ON "RedditProfile"("userId");

-- ── 2. RedditUserSettings ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "RedditUserSettings" (
  "userId"             TEXT PRIMARY KEY,
  "defaultProfileId"   TEXT,
  "insertButtonHidden" BOOLEAN NOT NULL DEFAULT false,
  "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── 3. RedditSubscription and the free generations ──────────────────────
CREATE TABLE IF NOT EXISTS "RedditSubscription" (
  "id"                TEXT PRIMARY KEY,
  "userId"            TEXT NOT NULL,
  "lsSubscriptionId"  TEXT NOT NULL,
  "lsCustomerId"      TEXT,
  "lsVariantId"       TEXT,
  "status"            TEXT NOT NULL,
  "renewsAt"          TIMESTAMP(3),
  "endsAt"            TIMESTAMP(3),
  "customerPortalUrl" TEXT,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "RedditSubscription_userId_key" ON "RedditSubscription"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "RedditSubscription_lsSubscriptionId_key" ON "RedditSubscription"("lsSubscriptionId");

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "redditTrialUsed" INTEGER NOT NULL DEFAULT 0;

-- Deleting a user removes their Reddit profiles, settings and subscription
-- record, as in Prisma.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RedditProfile_userId_fkey') THEN
    ALTER TABLE "RedditProfile" ADD CONSTRAINT "RedditProfile_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RedditUserSettings_userId_fkey') THEN
    ALTER TABLE "RedditUserSettings" ADD CONSTRAINT "RedditUserSettings_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RedditSubscription_userId_fkey') THEN
    ALTER TABLE "RedditSubscription" ADD CONSTRAINT "RedditSubscription_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ── 4. CarouseLabs presets for Reddit ───────────────────────────────────
-- "Reddit Helpful" is where everyone starts until they pick their own
-- default. Recommended presets are listed first (each preset's "createdAt"
-- sets its place). No voice sample carries a number, so a comment never
-- borrows a figure from one.
--
-- The INSERT below is GENERATED from scripts/reddit-profile-presets.js by
-- scripts/comment-presets-sql.js: edit that file, then re-run the generator.
INSERT INTO "RedditProfile"
  ("id", "userId", "name", "whoIAm", "goal", "tone", "length", "emoji", "language", "alwaysDo", "neverDo", "samples", "isDefault", "isSystem", "isRecommended", "createdAt", "updatedAt")
VALUES
  ('sys-reddit-helpful', NULL, 'CarouseLabs — Reddit Helpful',
   'A regular Redditor who has been through something like this and wants to help',
   'Actually help the person: answer what they asked, from your own experience, in plain words',
   'Friendly and down to earth', '120-500 characters', 'None', 'English',
   'Answer the question or the problem first. Say what worked or didn''t for you, simply. Short paragraphs.',
   'No intro like "Great question", no lists unless they asked for steps, no sign-off, no lecturing, nothing that sounds like an ad.',
   ARRAY['I had the same thing last year. What fixed it for me was writing everything down for a week before changing anything, so I could actually see where the time was going.', 'Honestly I''d talk to them before deciding anything. Half the time it turns out they didn''t even know it was bothering you.', 'Same boat here. The thing that helped most was stopping the daily check-ins and doing one longer catch up on Fridays instead.']::TEXT[],
   true, true, true, CURRENT_TIMESTAMP + INTERVAL '1 second', CURRENT_TIMESTAMP),
  ('sys-reddit-casual', NULL, 'CarouseLabs — Reddit Casual',
   'Someone who spends a lot of time on Reddit and comments like a normal person',
   'A quick, honest reaction to one thing in the post or comment',
   'Casual, like talking to a friend', '20-160 characters', 'None', 'English',
   'One or two short sentences. Lowercase is fine. Say it the way you''d say it out loud.',
   'No fancy words, no lists, no hashtags, no questions asked only to get replies, nothing that fits every post.',
   ARRAY['ok this is exactly what happened to me last month lol', 'honestly same, the first week back is always the worst', 'wait you did all that and they still said no?', 'good for you for actually saying something, most people just put up with it']::TEXT[],
   false, true, true, CURRENT_TIMESTAMP + INTERVAL '2 seconds', CURRENT_TIMESTAMP),
  ('sys-reddit-detailed', NULL, 'CarouseLabs — Reddit Detailed',
   'Someone who knows the topic well and takes the time to explain it properly',
   'Give a full, useful answer someone could act on, built on real experience',
   'Clear and practical', '400-1500 characters', 'None', 'English',
   'Start with the direct answer, then explain why. Use short paragraphs. A short list is fine when you''re giving steps.',
   'No filler opening, no summary at the end, no made-up stories or numbers, don''t sound like a blog post.',
   ARRAY['Short answer: yes, but not the way most people do it.

What worked for me was picking one thing to fix first instead of changing everything at once. When you change five things together you never find out which one helped.

The other thing I''d do is ask the people who left, not the ones who stayed. The ones who stayed will tell you it''s fine.', 'I went through this when we moved teams around. A few things that made a real difference:

- writing down who owns what, even if it feels obvious
- one place for decisions instead of three chats
- a weekly check on what''s stuck, not on what''s done

None of it is clever, it just stops things falling through the cracks.', 'It depends a lot on how big the team is.

With a small team I''d keep it simple: one shared doc, one person who owns it, and a quick look at it every week. Anything fancier and people stop updating it.

Once you have a few teams it''s worth setting up something proper, mostly so new people can find answers without asking around.']::TEXT[],
   false, true, true, CURRENT_TIMESTAMP + INTERVAL '3 seconds', CURRENT_TIMESTAMP),
  ('sys-reddit-funny', NULL, 'CarouseLabs — Reddit Funny',
   'Someone on Reddit with a dry, playful sense of humor',
   'Get a laugh with a short, clever take on one thing in the post or comment',
   'Dry and playful, never mean', '15-150 characters', 'None', 'English',
   'Keep it short and tie the joke to something specific in the thread.',
   'No mean jokes about the person, nothing about race, religion, politics or tragedy, no jokes that need explaining.',
   ARRAY['the meeting that could have been an email, but make it a whole quarter', 'me reading this with my own unfinished project open in another tab', 'plot twist: the shortcut was the long way all along', 'saving this so I can ignore it later']::TEXT[],
   false, true, true, CURRENT_TIMESTAMP + INTERVAL '4 seconds', CURRENT_TIMESTAMP),
  ('sys-reddit-pushback', NULL, 'CarouseLabs — Reddit Respectful Pushback',
   'Someone who thinks for themselves and will disagree politely',
   'Offer a different view on one specific point, with a reason, without starting a fight',
   'Direct but respectful', '80-400 characters', 'None', 'English',
   'Say which part you see differently, then give your reason in your own words.',
   'No insults, no sarcasm about the person, no "well actually", don''t quote their whole comment back at them.',
   ARRAY['I get the idea but I don''t think it holds for small teams. When there are only a few of you, the meeting kind of is the documentation.', 'Not sure I agree on the price part. Cheaper plans brought us the most support work, not the most customers.', 'This works until it doesn''t. The first month everyone sticks to it, then people quietly stop and nobody notices.']::TEXT[],
   false, true, false, CURRENT_TIMESTAMP + INTERVAL '5 seconds', CURRENT_TIMESTAMP)
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
  -- The list's order (GET /api/ext/reddit/profiles sorts by it): the times above
  -- are a second apart so the presets always show in the order written.
  "createdAt" = EXCLUDED."createdAt",
  "updatedAt" = CURRENT_TIMESTAMP;

-- Check: the tables, the column and the presets are there.
SELECT
  (SELECT count(*) FROM "RedditProfile" WHERE "isSystem" = true) AS reddit_presets,
  (SELECT count(*) FROM "RedditSubscription") AS reddit_subscriptions,
  (SELECT count(*) FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'redditTrialUsed') AS reddit_trial_column;
