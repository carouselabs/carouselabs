-- Manual fallback for `npx prisma db push` when Supabase connectivity is down.
-- Run this once via the Supabase SQL editor (or psql) to rename
-- InternExtension.addedMonths -> addedDays, matching prisma/schema.prisma.
-- This is a pure rename — existing values are preserved as-is (any row
-- created before this migration held a MONTHS count; going forward every
-- row holds DAYS). If you want historical rows to read consistently in days
-- too, run the optional UPDATE below immediately after the rename.

ALTER TABLE "InternExtension" RENAME COLUMN "addedMonths" TO "addedDays";

-- Optional — only run this once, immediately after the rename above, if you
-- want pre-existing rows (which held a MONTHS value) converted to their
-- day-equivalent so old and new rows are on the same unit. Uses the same
-- "1 month = 30 days" convention the app now uses everywhere.
-- UPDATE "InternExtension" SET "addedDays" = "addedDays" * 30;
