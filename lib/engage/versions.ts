// lib/engage/versions.ts — which extension versions are in use, per extension,
// for admin → Engage → Controls: one row per version, counting signed-in
// browsers seen recently (each sends its version on every request:
// EngageClientInfo, lib/extensionCommentAuth.ts). LinkedIn browsers from
// before 1.3.0 send no version; they show as version null.
import { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { X_DEVICE_PREFIX, type EngagePlatform } from "@/lib/engage/features"
import { compareVersions } from "@/lib/engage/settingsRules"

export const VERSIONS_WINDOW_DAYS = 30

export interface VersionRow {
  platform: EngagePlatform
  // null: a browser that hasn't sent a version (LinkedIn before 1.3.0).
  version: string | null
  browsers: number
  people: number
  lastSeenAt: string
}

const PLATFORM_OF_TOKEN = Prisma.sql`CASE WHEN t.device LIKE ${`${X_DEVICE_PREFIX}%`} THEN 'x' ELSE 'linkedin' END`

// Signed-in browsers (not signed out) used in the last VERSIONS_WINDOW_DAYS,
// newest version first, the no-version row last.
export async function extensionVersions(now: Date = new Date()): Promise<VersionRow[]> {
  const since = new Date(now.getTime() - VERSIONS_WINDOW_DAYS * 86_400_000)
  const [reported, unreported] = await Promise.all([
    db.$queryRaw<{ platform: EngagePlatform; version: string; browsers: bigint; people: bigint; lastSeenAt: Date }[]>(Prisma.sql`
      SELECT ${PLATFORM_OF_TOKEN} AS platform, c."extensionVersion" AS version,
             count(*) AS browsers, count(DISTINCT c."userId") AS people, max(c."lastSeenAt") AS "lastSeenAt"
      FROM "EngageClientInfo" c
      JOIN "ExtensionToken" t ON t.id = c."tokenId"
      WHERE c."lastSeenAt" >= ${since} AND t."revokedAt" IS NULL
      GROUP BY 1, 2
    `),
    db.$queryRaw<{ platform: EngagePlatform; browsers: bigint; people: bigint; lastSeenAt: Date | null }[]>(Prisma.sql`
      SELECT ${PLATFORM_OF_TOKEN} AS platform,
             count(*) AS browsers, count(DISTINCT t."userId") AS people, max(t."lastUsedAt") AS "lastSeenAt"
      FROM "ExtensionToken" t
      LEFT JOIN "EngageClientInfo" c ON c."tokenId" = t.id
      WHERE c."tokenId" IS NULL AND t."lastUsedAt" >= ${since} AND t."revokedAt" IS NULL
      GROUP BY 1
    `),
  ])

  const rows: VersionRow[] = reported.map((r) => ({
    platform: r.platform,
    version: r.version,
    browsers: Number(r.browsers),
    people: Number(r.people),
    lastSeenAt: new Date(r.lastSeenAt).toISOString(),
  }))
  rows.sort((a, b) => (a.platform === b.platform ? compareVersions(b.version!, a.version!) : a.platform.localeCompare(b.platform)))
  for (const r of unreported) {
    if (Number(r.browsers) === 0) continue
    rows.push({
      platform: r.platform,
      version: null,
      browsers: Number(r.browsers),
      people: Number(r.people),
      lastSeenAt: new Date(r.lastSeenAt ?? now).toISOString(),
    })
  }
  return rows
}
