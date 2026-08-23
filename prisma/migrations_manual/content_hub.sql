-- Manual fallback for `npx prisma db push` when Supabase connectivity is down.
-- Run this once via the Supabase SQL editor (or psql) to create the two
-- Content Hub tables. Matches prisma/schema.prisma's ScheduledPost and
-- RecurringSlot models exactly — if the schema changes, regenerate this
-- rather than hand-editing it out of sync.

CREATE TABLE "ScheduledPost" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "publishedUrl" TEXT,
    "failureReason" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "recurringRuleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledPost_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ScheduledPost_userId_idx" ON "ScheduledPost"("userId");
CREATE INDEX "ScheduledPost_userId_scheduledFor_idx" ON "ScheduledPost"("userId", "scheduledFor");
CREATE INDEX "ScheduledPost_status_scheduledFor_idx" ON "ScheduledPost"("status", "scheduledFor");
CREATE INDEX "ScheduledPost_postId_idx" ON "ScheduledPost"("postId");

ALTER TABLE "ScheduledPost" ADD CONSTRAINT "ScheduledPost_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScheduledPost" ADD CONSTRAINT "ScheduledPost_postId_fkey"
    FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "RecurringSlot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "daysOfWeek" INTEGER[],
    "timeOfDay" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecurringSlot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RecurringSlot_userId_idx" ON "RecurringSlot"("userId");

ALTER TABLE "RecurringSlot" ADD CONSTRAINT "RecurringSlot_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
