// lib/engage/platformQueries.ts — how the database tells the extensions'
// records apart. The newer extensions mark theirs: sign-ins by a device label
// (DEVICE_PREFIXES), generations and errors by feature (PLATFORM_FEATURES).
// LinkedIn's are everything else, so unlabelled sign-ins and errors that name
// no extension (insert, read, auth) stay LinkedIn's.
import { Prisma } from "@prisma/client"
import {
  DEVICE_PREFIXES,
  NEWER_FEATURES,
  NEWER_PLATFORMS,
  PLATFORM_FEATURES,
  type EngageFeature,
  type EngagePlatform,
} from "@/lib/engage/features"

// One extension's sign-ins (ExtensionToken), as a Prisma filter.
export function tokenWhere(platform: EngagePlatform): Prisma.ExtensionTokenWhereInput {
  if (platform !== "linkedin") return { device: { startsWith: DEVICE_PREFIXES[platform] } }
  return {
    OR: [{ device: null }, { NOT: { OR: NEWER_PLATFORMS.map((p) => ({ device: { startsWith: DEVICE_PREFIXES[p] } })) } }],
  }
}

// The same in SQL, over an ExtensionToken aliased t.
export function tokenSql(platform: EngagePlatform): Prisma.Sql {
  if (platform !== "linkedin") return Prisma.sql`t.device LIKE ${`${DEVICE_PREFIXES[platform]}%`}`
  return Prisma.sql`(t.device IS NULL OR NOT (${Prisma.join(NEWER_PLATFORMS.map(tokenSql), " OR ")}))`
}

// Which extension a token (t) belongs to, as a SQL value ('linkedin', 'x').
export const TOKEN_PLATFORM_SQL = Prisma.sql`CASE ${Prisma.join(
  NEWER_PLATFORMS.map((p) => Prisma.sql`WHEN ${tokenSql(p)} THEN ${Prisma.raw(`'${p}'`)}`),
  " ",
)} ELSE 'linkedin' END`

// The features one extension's generations, AI calls and errors are filed
// under, as a Prisma filter on a `feature` column.
export function featureWhere(platform: EngagePlatform): { feature: { in: EngageFeature[] } | { notIn: EngageFeature[] } } {
  return platform === "linkedin" ? { feature: { notIn: NEWER_FEATURES } } : { feature: { in: PLATFORM_FEATURES[platform] } }
}

// The same in SQL: "AND <column> [NOT] IN (…)".
export function featureSql(platform: EngagePlatform, column: Prisma.Sql): Prisma.Sql {
  return platform === "linkedin"
    ? Prisma.sql`AND ${column} NOT IN (${Prisma.join(NEWER_FEATURES)})`
    : Prisma.sql`AND ${column} IN (${Prisma.join(PLATFORM_FEATURES[platform])})`
}
