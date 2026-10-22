-- scripts/email-art-library.sql
-- The AI email writer's saved art (prisma/schema.prisma's EmailArt): every
-- painted picture (without its headline) and sticker, with what it shows, so
-- later emails reuse them instead of paying to paint new ones
-- (lib/emailArtLibrary.ts).
--   1. The EmailArt table.
--   2. Brings in the pictures and stickers of every campaign made so far.
--
-- One new table: nothing existing changes. Idempotent: safe to re-run (art
-- already in the library is skipped). Run in Supabase BEFORE the website code
-- that uses it is deployed (until then the writer simply has no saved art).
-- Undo: scripts/email-art-library-rollback.sql.

-- ── 1. EmailArt ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "EmailArt" (
  "id"          TEXT PRIMARY KEY,
  "kind"        TEXT NOT NULL,
  "url"         TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "createdBy"   TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "EmailArt_url_key" ON "EmailArt"("url");
CREATE INDEX IF NOT EXISTS "EmailArt_kind_createdAt_idx" ON "EmailArt"("kind", "createdAt");

-- ── 2. Art from campaigns made so far ───────────────────────────────────
-- A campaign's design keeps its bare painting (hero.paintingUrl) with what it
-- shows (hero.scene), and each sticker's picture with its idea. Only our own
-- art folder counts.
INSERT INTO "EmailArt" ("id", "kind", "url", "description", "createdBy", "createdAt")
SELECT 'art_' || md5(url), 'picture', url, LEFT(description, 300), "createdBy", "createdAt"
FROM (
  SELECT DISTINCT ON (c."design"->'hero'->>'paintingUrl')
    c."design"->'hero'->>'paintingUrl' AS url,
    c."design"->'hero'->>'scene' AS description,
    c."createdBy",
    c."createdAt"
  FROM "EmailCampaign" c
  WHERE c."design"->'hero'->>'paintingUrl' LIKE 'https://%/email-art/%'
    AND COALESCE(c."design"->'hero'->>'scene', '') <> ''
  ORDER BY c."design"->'hero'->>'paintingUrl', c."createdAt"
) pictures
ON CONFLICT ("url") DO NOTHING;

INSERT INTO "EmailArt" ("id", "kind", "url", "description", "createdBy", "createdAt")
SELECT 'art_' || md5(url), 'sticker', url, LEFT(description, 120), "createdBy", "createdAt"
FROM (
  SELECT DISTINCT ON (item->'sticker'->>'imageUrl')
    item->'sticker'->>'imageUrl' AS url,
    item->'sticker'->>'idea' AS description,
    c."createdBy",
    c."createdAt"
  FROM "EmailCampaign" c
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(c."design"->'blocks') = 'array' THEN c."design"->'blocks' ELSE '[]'::jsonb END
  ) block
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN block->>'type' = 'features' AND jsonb_typeof(block->'items') = 'array' THEN block->'items' ELSE '[]'::jsonb END
  ) item
  WHERE item->'sticker'->>'imageUrl' LIKE 'https://%/email-art/%'
    AND COALESCE(item->'sticker'->>'idea', '') <> ''
  ORDER BY item->'sticker'->>'imageUrl', c."createdAt"
) stickers
ON CONFLICT ("url") DO NOTHING;
