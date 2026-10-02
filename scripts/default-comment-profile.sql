-- scripts/default-comment-profile.sql
-- Makes "CarouseLabs — Simple & Human" the comment profile everyone starts on,
-- in place of "Thoughtful Expert". People who chose their own default
-- (User.defaultCommentProfileId) keep it. Run in Supabase; safe to re-run.
-- The panel and the website read this flag, so no deploy is needed.
UPDATE "CommentProfile"
SET "isDefault" = ("id" = 'sys-carouselabs-simple-human'), "updatedAt" = CURRENT_TIMESTAMP
WHERE "isSystem" = true;

-- Check: exactly one row, Simple & Human.
SELECT "id", "name" FROM "CommentProfile" WHERE "isSystem" = true AND "isDefault" = true;
