-- scripts/seed-connection-profiles.sql
-- The four built-in CarouseLabs connection-note profiles. Generated from
-- scripts/seed-connection-profiles.js — edit that file and regenerate rather
-- than editing this by hand.
--
-- Idempotent: re-running updates the existing rows instead of duplicating.
-- Run AFTER scripts/connection-profiles-schema.sql.

INSERT INTO "ConnectionProfile"
  ("id", "userId", "name", "angle", "goal", "tone", "length", "alwaysDo", "neverDo", "samples", "isDefault", "isSystem", "isRecommended")
VALUES
  ('sys-conn-acceptance-first', NULL, 'CarouseLabs — Acceptance First', 'Someone who makes it obvious why connecting is worth it, in as few words as possible. Not a fan, not a salesperson', 'Get the invite accepted', 'Plain', '90-180 characters', 'Reference ONE concrete detail from their profile: their role, their company, or a phrase from their About. Then give a plain reason to connect. One or two short sentences.', 'No compliments about them being inspiring, impressive or amazing. No asking for a call, a chat or their time. No pitching what you do.', ARRAY['Saw you run ops for agencies. I work with the same delivery bottlenecks day to day, would be good to stay connected.', 'Your work on activation caught my eye, mostly because we keep hitting the same onboarding drop-off. Connecting for that reason.']::TEXT[], true, true, true),
  ('sys-conn-warm-intro', NULL, 'CarouseLabs — Warm Intro', 'Someone who says what they do in one clause, tied to what the recipient does', 'Introduce yourself and the overlap', 'Friendly', '120-220 characters', 'Say what you do in ONE short clause, then name the overlap with their work, tied to something specific on their profile.', 'No pitching, no offers, no meeting requests, no describing your company at length. Never make the note mostly about you.', ARRAY['I help service businesses tidy up delivery, so your operating-systems angle is squarely in my world. Would be glad to be connected.', 'I work on onboarding for software teams, which is why your note about watching users rather than asking them stuck with me. Connecting for that.']::TEXT[], false, true, true),
  ('sys-conn-peer-angle', NULL, 'CarouseLabs — Peer Angle', 'A peer in the same field, dealing with the same problems, not an outsider admiring them', 'Connect as a peer in the same work', 'Professional', '100-200 characters', 'Name their role or company, and a problem people in that role actually deal with. Write as an equal who does similar work.', 'Never position yourself as an expert above them, and never as a fan below them. No selling, no advice, no questions.', ARRAY['Fellow ops person here. The founder-stuck-in-delivery problem you describe is the one I spend most of my week on. Worth being connected.', 'We work the same side of the table, agency delivery and the systems that hold it together. Sending this so we are connected when it comes up.']::TEXT[], false, true, true),
  ('sys-conn-founder-direct', NULL, 'CarouseLabs — Founder Direct', 'A founder who writes blunt, plain notes with nothing decorative in them', 'Say who you are, what you noticed, why connect', 'Direct', '60-140 characters', 'Plain words and short sentences. What you noticed, then why you are connecting. Nothing else.', 'No adjectives like amazing, impressive or inspiring. No compliments. No questions. No sign-off.', ARRAY['You build operating systems for agencies. I run one. Connecting.', 'Saw the fractional COO work. Same problem I deal with on my side, so connecting.']::TEXT[], false, true, true)
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "angle" = EXCLUDED."angle",
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

-- Verify: should return 4 rows.
-- SELECT "id", "name", "length", "isDefault" FROM "ConnectionProfile" WHERE "isSystem" = true ORDER BY "name";
