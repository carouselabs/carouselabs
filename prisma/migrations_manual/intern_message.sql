-- InternMessage: two-way Support thread between an intern and admin.
-- Run this manually against the database (Supabase SQL editor or psql) if
-- `npx prisma db push` can't reach the DB from your environment.

CREATE TABLE "InternMessage" (
    "id" TEXT NOT NULL,
    "internId" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InternMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InternMessage_internId_idx" ON "InternMessage"("internId");

ALTER TABLE "InternMessage" ADD CONSTRAINT "InternMessage_internId_fkey"
    FOREIGN KEY ("internId") REFERENCES "Intern"("id") ON DELETE CASCADE ON UPDATE CASCADE;
