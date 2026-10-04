-- scripts/x-natural-profiles-rollback.sql — removes the four plain-English
-- X presets (Short & Simple, Natural (Slang), Simple & Detailed, Funny) that
-- scripts/x-extension-schema.sql adds, and makes "Thoughtful Reply" the
-- starting default again with the original three recommended. Anyone who had
-- picked one of the four as their default goes back to the starting default.
-- Their past replies keep the profile's name in History. Safe to re-run.

UPDATE "XUserSettings" SET "defaultProfileId" = NULL
WHERE "defaultProfileId" IN ('sys-x-short-simple', 'sys-x-natural-slang', 'sys-x-simple-detailed', 'sys-x-funny');

DELETE FROM "XProfile"
WHERE "isSystem" = true AND "id" IN ('sys-x-short-simple', 'sys-x-natural-slang', 'sys-x-simple-detailed', 'sys-x-funny');

UPDATE "XProfile"
SET "isDefault" = ("id" = 'sys-x-thoughtful-reply'), "isRecommended" = true, "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" IN ('sys-x-thoughtful-reply', 'sys-x-quick-reply', 'sys-x-respectful-pushback');

-- Check: the original three, Thoughtful Reply the default.
SELECT "id", "isDefault", "isRecommended" FROM "XProfile" WHERE "isSystem" = true ORDER BY "createdAt";
