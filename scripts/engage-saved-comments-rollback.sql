-- scripts/engage-saved-comments-rollback.sql
-- Undoes scripts/engage-saved-comments.sql. DELETES every saved comment.
-- Only for backing the feature out: deploy website code without saved
-- comments first.
DROP TABLE IF EXISTS public."EngageSavedComment";
