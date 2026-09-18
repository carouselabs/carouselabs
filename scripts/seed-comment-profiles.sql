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
