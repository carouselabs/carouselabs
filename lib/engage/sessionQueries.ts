// lib/engage/sessionQueries.ts — every browser signed in to an extension,
// across all users, for admin → Engage → Sessions: who, which extension and
// version, when it signed in and was last used, and whether it was signed
// out. (One user's own browsers are on their admin page.)
import type { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { X_DEVICE_PREFIX, tokenPlatform, type EngagePlatform } from "@/lib/engage/features"
import { isEngageSchemaMissing } from "@/lib/engage/schemaMissing"

export const SESSION_STATUSES = ["active", "signed_out", "all"] as const
export const SESSION_PLATFORMS = ["any", "linkedin", "x"] as const

export interface SessionRow {
  id: string
  userId: string
  email: string
  device: string | null
  platform: EngagePlatform
  version: string | null
  createdAt: string
  lastUsedAt: string
  revokedAt: string | null
}

export async function listSessions(params: {
  status: (typeof SESSION_STATUSES)[number]
  platform: (typeof SESSION_PLATFORMS)[number]
  q?: string
  page: number
  pageSize: number
}): Promise<{ rows: SessionRow[]; total: number; page: number; pageSize: number }> {
  const and: Prisma.ExtensionTokenWhereInput[] = []
  if (params.status === "active") and.push({ revokedAt: null })
  if (params.status === "signed_out") and.push({ revokedAt: { not: null } })
  if (params.platform === "x") and.push({ device: { startsWith: X_DEVICE_PREFIX } })
  if (params.platform === "linkedin") {
    and.push({ OR: [{ device: null }, { NOT: { device: { startsWith: X_DEVICE_PREFIX } } }] })
  }
  const q = params.q?.trim()
  if (q) and.push({ user: { email: { contains: q, mode: "insensitive" } } })
  const where: Prisma.ExtensionTokenWhereInput = and.length > 0 ? { AND: and } : {}

  const pageSize = Math.min(Math.max(params.pageSize, 1), 100)
  const page = Math.max(params.page, 1)
  const [tokens, total] = await Promise.all([
    db.extensionToken.findMany({
      where,
      orderBy: { lastUsedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, userId: true, device: true, createdAt: true, lastUsedAt: true, revokedAt: true, user: { select: { email: true } } },
    }),
    db.extensionToken.count({ where }),
  ])
  // The version each browser last reported (before 1.3.0: none). Best
  // effort: before the admin tables exist, no versions.
  const versions = await db.engageClientInfo
    .findMany({ where: { tokenId: { in: tokens.map((t) => t.id) } }, select: { tokenId: true, extensionVersion: true } })
    .catch((err) => {
      if (isEngageSchemaMissing(err)) return []
      throw err
    })
  const versionOf = new Map(versions.map((v) => [v.tokenId, v.extensionVersion]))

  return {
    rows: tokens.map((t) => ({
      id: t.id,
      userId: t.userId,
      email: t.user.email,
      device: t.device,
      platform: tokenPlatform(t.device),
      version: versionOf.get(t.id) ?? null,
      createdAt: t.createdAt.toISOString(),
      lastUsedAt: t.lastUsedAt.toISOString(),
      revokedAt: t.revokedAt?.toISOString() ?? null,
    })),
    total,
    page,
    pageSize,
  }
}
