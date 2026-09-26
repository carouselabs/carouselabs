-- scripts/seed-message-profiles.sql
-- The four built-in Conversation Assistant profiles. Generated from
-- scripts/seed-message-profiles.js — edit that file and regenerate rather
-- than editing this by hand.
--
-- Idempotent: re-running updates the existing rows instead of duplicating.
-- Run AFTER scripts/message-profiles-schema.sql.

INSERT INTO "MessageProfile"
  ("id", "userId", "name", "goal", "tone", "alwaysDo", "neverDo", "samples", "isDefault", "isSystem", "isRecommended")
VALUES
  ('sys-msg-warm-intro', NULL, 'Warm Intro / Relationship Builder', 'Building a genuine professional relationship with this person. No pitch, no ask — just staying in touch, sharing real thoughts, and letting the relationship develop on its own timeline.', 'Natural, warm, unhurried', 'Respond to what they actually said. Add a genuine thought or question of your own. Let the conversation breathe — it''s fine for a reply to be short.', 'No pitching what you do. No asking for a call or a favour. No corporate networking language.', ARRAY['That''s a sharp way to put it. I''ve been thinking about the same shift in our space, mostly wondering how teams actually change habits once they see it.', 'Good to hear from you. Been meaning to ask how the new role''s going, especially the part you mentioned about rebuilding the team.']::TEXT[], true, true, true),
  ('sys-msg-lead', NULL, 'Lead — Understand Their Situation', 'This is a potential client or lead. Keep it conversational, not salesy: understand what they''re actually dealing with before proposing anything. The goal right now is a real conversation, not a pitch.', 'Professional, curious, low-pressure', 'Ask about their specific situation or ask a genuine follow-up to what they said. Make it easy for them to say a little or a lot.', 'No pitching a product or service in the first few messages. No ''quick call?'' asks before there''s a real conversation. No assuming their problem — ask.', ARRAY['Makes sense. When you say the handoffs are the painful part, is that mostly between sales and delivery, or earlier than that too?', 'That tracks with what I hear from a lot of teams your size. Curious what you''ve already tried for it, if anything.']::TEXT[], false, true, true),
  ('sys-msg-peer', NULL, 'Peer Network', 'Someone in the same field or a related one. Keeping a loose professional connection going — swapping notes, occasionally useful to each other, no agenda beyond that.', 'Casual, professional, easy-going', 'Talk shop like a peer. Share your own take, not just questions.', 'No pitching. No treating them like a prospect.', ARRAY['Been dealing with the exact same thing on my side lately. Feels like everyone''s hitting this at once.', 'Fair point. We ended up going the opposite way on that and it mostly worked, though not without some pain.']::TEXT[], false, true, true),
  ('sys-msg-reconnect', NULL, 'Reconnecting', 'Someone the sender already knows — a former colleague, an old contact — picking the relationship back up after a while. Low-key, no big ask, just genuinely catching up.', 'Familiar, relaxed', 'Sound like you actually know them. Reference the real gap in touch honestly if it fits.', 'No pretending you never lost touch. No pitching in the reconnect message.', ARRAY['It''s been a while. Saw your update and had to say congrats, that''s a big move.', 'Good to hear from you again. Things have been busy but good on my end, how about you?']::TEXT[], false, true, true)
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "goal" = EXCLUDED."goal",
  "tone" = EXCLUDED."tone",
  "alwaysDo" = EXCLUDED."alwaysDo",
  "neverDo" = EXCLUDED."neverDo",
  "samples" = EXCLUDED."samples",
  "isDefault" = EXCLUDED."isDefault",
  "isSystem" = EXCLUDED."isSystem",
  "isRecommended" = EXCLUDED."isRecommended",
  "updatedAt" = CURRENT_TIMESTAMP;

-- Verify: should return 4 rows.
-- SELECT "id", "name", "isDefault" FROM "MessageProfile" WHERE "isSystem" = true ORDER BY "name";
