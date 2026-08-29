-- ScheduledEmail: shared "send later" queue for both broadcast features
-- (Intern Broadcast and the regular-user Broadcast). Run this manually
-- against the database (Supabase SQL editor or psql) if
-- `npx prisma db push` can't reach the DB from your environment.

CREATE TABLE "ScheduledEmail" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "recipientType" TEXT NOT NULL,
    "recipientIds" TEXT[],
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "sentCount" INTEGER,
    "failedCount" INTEGER,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledEmail_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ScheduledEmail_status_scheduledFor_idx" ON "ScheduledEmail"("status", "scheduledFor");
