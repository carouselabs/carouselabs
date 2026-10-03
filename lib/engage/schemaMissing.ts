// lib/engage/schemaMissing.ts — whether a database error means an Engage
// admin table isn't there yet: the code is deployed but its SQL
// (scripts/engage-admin-schema.sql, engage-admin-phase-b.sql) hasn't been run.
// Callers then fall back to how things worked before that table existed.
import { Prisma } from "@prisma/client"

export function isEngageSchemaMissing(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && (err.code === "P2021" || err.code === "P2022")
  )
}
