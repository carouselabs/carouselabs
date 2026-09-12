-- Manual fallback for this session's email-marketing schema changes — run
-- this in the Supabase SQL editor if `npx prisma db push` can't reach the DB
-- directly. Matches prisma/schema.prisma exactly:
--   - ScheduledEmail.recipientValue (new column on an existing table)
--   - EmailTemplate (new)
--   - EmailSequence (new)
--   - EmailSequenceStep (new, FK -> EmailSequence)
--   - EmailSequenceEnrollment (new, FK -> EmailSequence, FK -> User)
--   - EmailEngagement (new, FK -> EmailSequence (nullable), FK ->
--     EmailSequenceStep (nullable), FK -> User)
--
-- IDEMPOTENT: every statement below is safe to re-run. CREATE TABLE/INDEX and
-- ALTER TABLE ADD COLUMN use native Postgres "IF NOT EXISTS". Postgres has no
-- "ADD CONSTRAINT IF NOT EXISTS", so each foreign key is wrapped in a
-- DO $$ ... IF NOT EXISTS (SELECT ... pg_constraint) $$ block instead — the
-- standard idiom for that case.
--
-- INDEPENDENT STATEMENTS: each numbered block below is a separate statement
-- (or self-contained DO block) — copy-paste and run them ONE AT A TIME if
-- you want to skip past ones already applied, or run the whole file at once
-- (top to bottom — later tables have foreign keys into earlier ones, and
-- each constraint's DO block assumes its own table already exists).

-- ── 1. ScheduledEmail.recipientValue ─────────────────────────────────
ALTER TABLE "ScheduledEmail" ADD COLUMN IF NOT EXISTS "recipientValue" TEXT;

-- ── 2. EmailTemplate ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "EmailTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- ── 3. EmailSequence (table) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "EmailSequence" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "segmentType" TEXT NOT NULL,
    "segmentValue" TEXT,
    "stopRule" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailSequence_pkey" PRIMARY KEY ("id")
);

-- ── 4. EmailSequence (index) ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "EmailSequence_active_idx" ON "EmailSequence"("active");

-- ── 5. EmailSequenceStep (table) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS "EmailSequenceStep" (
    "id" TEXT NOT NULL,
    "sequenceId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "delayDays" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "subjectB" TEXT,
    "body" TEXT NOT NULL,
    "bodyB" TEXT,

    CONSTRAINT "EmailSequenceStep_pkey" PRIMARY KEY ("id")
);

-- ── 6. EmailSequenceStep (unique index) ──────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS "EmailSequenceStep_sequenceId_stepOrder_key"
    ON "EmailSequenceStep"("sequenceId", "stepOrder");

-- ── 7. EmailSequenceStep -> EmailSequence (FK) ───────────────────────
-- Requires: statement 3 (EmailSequence table) already applied.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'EmailSequenceStep_sequenceId_fkey'
      AND conrelid = '"EmailSequenceStep"'::regclass
  ) THEN
    ALTER TABLE "EmailSequenceStep" ADD CONSTRAINT "EmailSequenceStep_sequenceId_fkey"
        FOREIGN KEY ("sequenceId") REFERENCES "EmailSequence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ── 8. EmailSequenceEnrollment (table) ───────────────────────────────
CREATE TABLE IF NOT EXISTS "EmailSequenceEnrollment" (
    "id" TEXT NOT NULL,
    "sequenceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "variant" TEXT NOT NULL DEFAULT 'A',
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextSendAt" TIMESTAMP(3) NOT NULL,
    "lastSentAt" TIMESTAMP(3),

    CONSTRAINT "EmailSequenceEnrollment_pkey" PRIMARY KEY ("id")
);

-- ── 9. EmailSequenceEnrollment (unique index) ────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS "EmailSequenceEnrollment_sequenceId_userId_key"
    ON "EmailSequenceEnrollment"("sequenceId", "userId");

-- ── 10. EmailSequenceEnrollment (index) ──────────────────────────────
CREATE INDEX IF NOT EXISTS "EmailSequenceEnrollment_status_nextSendAt_idx"
    ON "EmailSequenceEnrollment"("status", "nextSendAt");

-- ── 11. EmailSequenceEnrollment -> EmailSequence (FK) ────────────────
-- Requires: statement 3 (EmailSequence table) already applied.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'EmailSequenceEnrollment_sequenceId_fkey'
      AND conrelid = '"EmailSequenceEnrollment"'::regclass
  ) THEN
    ALTER TABLE "EmailSequenceEnrollment" ADD CONSTRAINT "EmailSequenceEnrollment_sequenceId_fkey"
        FOREIGN KEY ("sequenceId") REFERENCES "EmailSequence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ── 12. EmailSequenceEnrollment -> User (FK) ─────────────────────────
-- Requires: "User" table already exists (it does — this predates this session).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'EmailSequenceEnrollment_userId_fkey'
      AND conrelid = '"EmailSequenceEnrollment"'::regclass
  ) THEN
    ALTER TABLE "EmailSequenceEnrollment" ADD CONSTRAINT "EmailSequenceEnrollment_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ── 13. EmailEngagement (table) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS "EmailEngagement" (
    "id" TEXT NOT NULL,
    "sequenceId" TEXT,
    "stepId" TEXT,
    "broadcastId" TEXT,
    "userId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "resendEmailId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailEngagement_pkey" PRIMARY KEY ("id")
);

-- ── 14. EmailEngagement (unique index) ───────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS "EmailEngagement_resendEmailId_key" ON "EmailEngagement"("resendEmailId");

-- ── 15. EmailEngagement (index: sequenceId) ──────────────────────────
CREATE INDEX IF NOT EXISTS "EmailEngagement_sequenceId_idx" ON "EmailEngagement"("sequenceId");

-- ── 16. EmailEngagement (index: stepId) ──────────────────────────────
CREATE INDEX IF NOT EXISTS "EmailEngagement_stepId_idx" ON "EmailEngagement"("stepId");

-- ── 17. EmailEngagement (index: userId) ──────────────────────────────
CREATE INDEX IF NOT EXISTS "EmailEngagement_userId_idx" ON "EmailEngagement"("userId");

-- ── 18. EmailEngagement -> EmailSequence (FK, nullable) ──────────────
-- Requires: statement 3 (EmailSequence table) already applied.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'EmailEngagement_sequenceId_fkey'
      AND conrelid = '"EmailEngagement"'::regclass
  ) THEN
    ALTER TABLE "EmailEngagement" ADD CONSTRAINT "EmailEngagement_sequenceId_fkey"
        FOREIGN KEY ("sequenceId") REFERENCES "EmailSequence"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ── 19. EmailEngagement -> EmailSequenceStep (FK, nullable) ──────────
-- Requires: statement 5 (EmailSequenceStep table) already applied.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'EmailEngagement_stepId_fkey'
      AND conrelid = '"EmailEngagement"'::regclass
  ) THEN
    ALTER TABLE "EmailEngagement" ADD CONSTRAINT "EmailEngagement_stepId_fkey"
        FOREIGN KEY ("stepId") REFERENCES "EmailSequenceStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ── 20. EmailEngagement -> User (FK) ─────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'EmailEngagement_userId_fkey'
      AND conrelid = '"EmailEngagement"'::regclass
  ) THEN
    ALTER TABLE "EmailEngagement" ADD CONSTRAINT "EmailEngagement_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
