-- scripts/email-art-library-rollback.sql
-- Undoes scripts/email-art-library.sql: forgets the saved art (the image
-- files themselves stay where they are, and emails already sent keep showing
-- them). Only run this after the website code that uses it has been removed.
DROP TABLE IF EXISTS "EmailArt";
