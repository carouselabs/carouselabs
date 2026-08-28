-- Fallback for `npx prisma db push` if Supabase connectivity is down when you
-- run this. Not needed this time (db push succeeded directly), kept for the
-- same reason the other files in this directory are kept — a ready-to-run
-- SQL version of the migration, matching prisma/schema.prisma's
-- InternCertificate model exactly.

CREATE TABLE "InternCertificate" (
    "id"               TEXT NOT NULL,
    "internId"         TEXT NOT NULL,
    "verificationCode" TEXT NOT NULL,
    "certificateUrl"   TEXT NOT NULL,
    "issuedFor"        TEXT NOT NULL,
    "issuedDate"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InternCertificate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InternCertificate_verificationCode_key" ON "InternCertificate"("verificationCode");
CREATE INDEX "InternCertificate_internId_idx" ON "InternCertificate"("internId");

ALTER TABLE "InternCertificate" ADD CONSTRAINT "InternCertificate_internId_fkey"
    FOREIGN KEY ("internId") REFERENCES "Intern"("id") ON DELETE CASCADE ON UPDATE CASCADE;
