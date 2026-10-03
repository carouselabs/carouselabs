-- scripts/x-extension-schema-rollback.sql — undoes scripts/x-extension-schema.sql.
-- Deletes every X profile and X setting (the LinkedIn extension's data is not
-- touched). Only run this if the X extension is being removed.
DROP TABLE IF EXISTS "XUserSettings";
DROP TABLE IF EXISTS "XProfile";
