-- scripts/my-cta-rollback.sql — undoes scripts/my-cta.sql. Deletes every saved
-- CTA and every creator's CTA photo choice (the photos themselves stay in R2
-- under cta/).
DROP TABLE IF EXISTS "CtaCard";
DROP TABLE IF EXISTS "CtaProfile";
