// /api/admin/engage/grants — every free-access grant ("who did I give access
// to, and until when?"), and giving access by email ("Add user"): the grant
// applies the moment that email signs up, or at once if it already has.
//   GET  ?status=active|expiring|expired|revoked|pending|all &page=
//   POST { email, duration, endsAt?, reason, sendInvite? }
import { NextResponse } from "next/server"
import { z } from "zod"
import type { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { requireEngagePermission } from "@/lib/engage/adminAccess"
import { parseBody } from "@/lib/engage/adminApi"
import { createGrant } from "@/lib/engage/grantActions"
import { grantLengthSchema, grantState } from "@/lib/engage/grants"
import { getRequestIp } from "@/lib/auditLog"

const STATUSES = ["active", "expiring", "expired", "revoked", "pending", "all"] as const
const PAGE_SIZE = 50

export async function GET(req: Request) {
  const gate = await requireEngagePermission(req, "engage.view")
  if (!gate.ok) return gate.response

  const url = new URL(req.url)
  const status = z.enum(STATUSES).catch("active").parse(url.searchParams.get("status") ?? "active")
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1)
  const now = new Date()
  const in14Days = new Date(now.getTime() + 14 * 86_400_000)

  const live: Prisma.EngageAccessGrantWhereInput = {
    revokedAt: null,
    startsAt: { lte: now },
    OR: [{ endsAt: null }, { endsAt: { gt: now } }],
  }
  const where: Prisma.EngageAccessGrantWhereInput = {
    active: live,
    expiring: { revokedAt: null, endsAt: { gt: now, lte: in14Days } },
    expired: { revokedAt: null, endsAt: { lte: now } },
    revoked: { revokedAt: { not: null } },
    pending: { ...live, userId: null },
    all: {},
  }[status]

  const [total, grants] = await Promise.all([
    db.engageAccessGrant.count({ where }),
    db.engageAccessGrant.findMany({
      where,
      orderBy: status === "expiring" ? { endsAt: "asc" } : { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { user: { select: { id: true, email: true, profile: { select: { name: true } } } } },
    }),
  ])

  return NextResponse.json({
    total,
    page,
    pageSize: PAGE_SIZE,
    grants: grants.map((g) => ({
      id: g.id,
      email: g.email,
      userId: g.userId,
      name: g.user?.profile?.name ?? null,
      startsAt: g.startsAt,
      endsAt: g.endsAt,
      reason: g.reason,
      grantedBy: g.grantedBy,
      createdAt: g.createdAt,
      revokedAt: g.revokedAt,
      revokedBy: g.revokedBy,
      revokeReason: g.revokeReason,
      state: grantState(g, now),
      pending: g.userId === null,
    })),
  })
}

const addBody = z.intersection(
  grantLengthSchema,
  z.object({
    email: z.email("Enter a valid email").max(254),
    reason: z.string().trim().min(3, "Say why").max(500),
    sendInvite: z.boolean().default(false),
  }),
)

export async function POST(req: Request) {
  const gate = await requireEngagePermission(req, "engage.access.manage")
  if (!gate.ok) return gate.response

  const parsed = await parseBody(req, addBody)
  if (!parsed.ok) return parsed.response

  try {
    const result = await createGrant({
      admin: gate.admin,
      email: parsed.data.email,
      duration: parsed.data.duration,
      customEndsAt: parsed.data.endsAt,
      reason: parsed.data.reason,
      sendInvite: parsed.data.sendInvite,
      ip: getRequestIp(req),
    })
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't grant access" }, { status: 400 })
  }
}
