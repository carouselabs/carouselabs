-- scripts/email-sending.sql
-- Choosing what sends each campaign (Resend, Brevo, or automatic: leads by
-- Brevo, everyone else by Resend), who it's from and where replies go
-- (lib/sendingRules.ts). Three new empty columns on "EmailCampaign": every
-- campaign made so far keeps the defaults (automatic, CarouseLabs
-- <support@carouselabs.com>, replies to the sender).
--
-- Nothing existing changes. Idempotent: safe to re-run. Run in Supabase
-- BEFORE the website code that uses it is deployed (until then campaigns use
-- the defaults, and picking anything else says to run this).
-- Undo: scripts/email-sending-rollback.sql.

ALTER TABLE "EmailCampaign" ADD COLUMN IF NOT EXISTS "sendVia" TEXT;
ALTER TABLE "EmailCampaign" ADD COLUMN IF NOT EXISTS "sendFrom" TEXT;
ALTER TABLE "EmailCampaign" ADD COLUMN IF NOT EXISTS "replyTo" TEXT;
