// GET /api/admin/engage/audit — the Engage admin's audit trail: who changed
// what, for whom, when, from what to what, and why. Read-only: nothing in the
// admin edits or deletes audit rows.
//   ?q= target email  ?action=  ?page=
import { NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { requireEngagePermission } from "@/lib/engage/adminAccess"

const PAGE_SIZE = 50

export async function GET(req: Request) {
  const gate = await requireEngagePermission(req, "engage.audit.view")
  if (!gate.ok) return gate.response

  const url = new URL(req.url)
  const q = url.searchParams.get("q")?.trim().slice(0, 200)
  const action = url.searchParams.get("action")?.trim()
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1)

  const where: Prisma.AuditLogWhereInput = {
    product: "engage",
    ...(q ? { targetEmail: { contains: q, mode: "insensitive" } } : {}),
    ...(action && /^ENGAGE_[A-Z_]+$/.test(action) ? { action } : {}),
  }
  const [total, entries] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        adminEmail: true,
        action: true,
        targetUserId: true,
        targetEmail: true,
        details: true,
        oldValue: true,
        newValue: true,
        reason: true,
        ipAddress: true,
        createdAt: true,
      },
    }),
  ])
  return NextResponse.json({ total, page, pageSize: PAGE_SIZE, entries })
}
