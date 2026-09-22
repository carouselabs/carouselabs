-- Manual fallback for scripts/seed-comment-profiles.js — run this in the
-- Supabase SQL editor if that script can't reach the DB directly (same
-- situation as scripts/comment-extension-schema.sql, which must be applied
-- first — this seeds rows into the CommentProfile table it creates).
-- Idempotent: ON CONFLICT (id) means it's safe to re-run.

INSERT INTO "CommentProfile"
  ("id", "userId", "name", "whoIAm", "goal", "tone", "length", "emoji", "language", "isDefault", "isSystem", "testsUsed", "samples", "createdAt", "updatedAt")
VALUES
  ('sys-thoughtful-expert', NULL, 'Thoughtful Expert', 'An experienced professional in this field who adds real value', 'adds one useful insight', 'professional', 'Medium (2-3 lines)', 'None', 'English', true, true, 0, ARRAY[]::TEXT[], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sys-supportive-peer', NULL, 'Supportive Peer', 'A peer in the same field who relates to the poster''s experience', 'agrees and adds a personal angle', 'friendly', 'Short (1-2 lines)', 'None', 'English', false, true, 0, ARRAY[]::TEXT[], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sys-curious-questioner', NULL, 'Curious Questioner', 'A curious professional genuinely interested in learning more', 'asks a smart follow-up question', 'friendly', 'Short (1-2 lines)', 'None', 'English', false, true, 0, ARRAY[]::TEXT[], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sys-respectful-challenger', NULL, 'Respectful Challenger', 'A thoughtful professional unafraid to offer a different perspective', 'offers a different view politely', 'professional', 'Medium (2-3 lines)', 'None', 'English', false, true, 0, ARRAY[]::TEXT[], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sys-storyteller', NULL, 'Storyteller', 'Someone who connects with posts through their own related experiences', 'shares a short related experience', 'friendly', 'Long (3-4 lines)', 'None', 'English', false, true, 0, ARRAY[]::TEXT[], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sys-celebrator', NULL, 'Celebrator', 'An enthusiastic supporter who loves celebrating others'' wins', 'congratulates with a specific detail', 'friendly', 'Short (1 line)', 'None', 'English', false, true, 0, ARRAY[]::TEXT[], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sys-witty', NULL, 'Witty', 'A quick-witted commenter who keeps things light', 'light clean humour tied to the post', 'bold', 'Short (1 line)', 'None', 'English', false, true, 0, ARRAY[]::TEXT[], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET
  "name" = EXCLUDED."name",
  "whoIAm" = EXCLUDED."whoIAm",
  "goal" = EXCLUDED."goal",
  "tone" = EXCLUDED."tone",
  "length" = EXCLUDED."length",
  "isDefault" = EXCLUDED."isDefault",
  "updatedAt" = CURRENT_TIMESTAMP;




-- ── CarouseLabs recommended presets ──
-- Requires scripts/recommended-profiles-schema.sql to have been applied first
-- (writes CommentProfile.isRecommended). Generated from the same data as
-- scripts/seed-comment-profiles.js so the two seeds cannot drift.
-- Idempotent: ON CONFLICT (id) updates in place.

INSERT INTO "CommentProfile"
  ("id", "userId", "name", "whoIAm", "goal", "tone", "length", "emoji", "language", "alwaysDo", "neverDo", "samples", "isDefault", "isSystem", "isRecommended", "testsUsed", "createdAt", "updatedAt")
VALUES
  ('sys-carouselabs-quick-human', NULL, 'CarouseLabs — Quick Human', 'Someone who reacts fast and genuine, like texting a friend. Not someone writing an essay', 'Quick genuine reaction', 'Casual', '15-45 characters', 'None', 'English', 'Use lowercase like a real text message. Use dashes or ''...'' instead of commas. Sound like something typed fast on a phone, not composed. Even though this is a quick reaction, still reference the post''s topic briefly if possible. Don''t be purely generic.', 'No commas, no proper capitalization at the start. No hashtags. No corporate/polished phrasing.', ARRAY['okay this one got me', 'needed this today fr', 'saving this for later', 'no notes... just facts', 'wait why is this so true', 'big one right here']::TEXT[], false, true, true, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sys-carouselabs-simple-human', NULL, 'CarouseLabs — Simple & Human', 'Someone who writes in the simplest possible English. Short words, short sentences, no jargon at all', 'Genuine agreement or reaction, kept dead simple', 'Friendly', '40-110 characters', 'None', 'English', 'Use only simple, everyday words. Keep sentences short.', 'No big/fancy vocabulary. No corporate buzzwords. No complex sentence structures.', ARRAY['This is so true. I feel this every day at work.', 'Yeah, I''ve seen this happen a lot. Good point.', 'This makes sense. Simple but true.']::TEXT[], false, true, true, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sys-carouselabs-top-relevance', NULL, 'CarouseLabs — Top Relevance Format', 'Someone who writes comments LinkedIn''s algorithm favors. Structured, specific, and genuinely adds value to the conversation', 'Build authority and maximize engagement', 'Professional', '120-320 characters', 'None', 'English', 'Follow this exact structure in order: 1) A specific observation about something in the post, 2) Your own unique insight or a brief real example, 3) A practical implication - why this matters, 4) An optional question at the end when it fits naturally. Keep it to a maximum of 3-4 lines total. Use simple, plain English. Adapt specifically to what THIS post actually says.', 'Don''t skip the specific observation. Don''t exceed 3-4 lines. Don''t use complex vocabulary.', ARRAY['The point about hiring for adaptability over experience really stands out. It suggests that listing years of experience in a job post screens for the wrong thing. That changes what a strong candidate actually looks like. Does this hold for senior roles too?', 'The personalized outreach result is the key detail here. It shows relevance beating volume, since a smaller list with real context did better than a bigger generic one. Generic templates are losing ground for a reason.']::TEXT[], false, true, true, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sys-carouselabs-balanced', NULL, 'CarouseLabs — Balanced Conversational', 'A normal, genuine person who writes naturally. Not too short, not too long, simplest form of English', 'Thoughtful but simple reaction, adds a small personal angle', 'Friendly', '100-220 characters', 'None', 'English', 'Keep it conversational, like talking to a colleague. Use simple English throughout, no jargon.', 'Don''t sound formal or corporate. Don''t use complex words when a simple one works.', ARRAY['This is exactly what I''ve noticed too. It''s easy to overlook until it actually happens to you. Good reminder.', 'I''ve been thinking about this a lot lately. Simple changes like this really do add up over time.']::TEXT[], false, true, true, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET
  "name" = EXCLUDED."name",
  "whoIAm" = EXCLUDED."whoIAm",
  "goal" = EXCLUDED."goal",
  "tone" = EXCLUDED."tone",
  "length" = EXCLUDED."length",
  "alwaysDo" = EXCLUDED."alwaysDo",
  "neverDo" = EXCLUDED."neverDo",
  "samples" = EXCLUDED."samples",
  "isSystem" = EXCLUDED."isSystem",
  "isRecommended" = EXCLUDED."isRecommended",
  "updatedAt" = CURRENT_TIMESTAMP;
