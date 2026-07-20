// GET /api/admin/audit-logs — paginated, filterable audit trail.
// Query: page (1-based, default 1), limit (default 50, max 200),
// action (exact AdminAuditAction), email (matches targetEmail or adminEmail),
// from/to (YYYY-MM-DD, inclusive).
import { NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { db } from "@/lib/db"

export async function GET(req: Request) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const sp = new URL(req.url).searchParams
  const page = Math.max(1, Number(sp.get("page")) || 1)
  const limit = Math.min(200, Math.max(1, Number(sp.get("limit")) || 50))
  const action = sp.get("action")?.trim()
  const email = sp.get("email")?.trim()
  const from = sp.get("from")
  const to = sp.get("to")

  const where: Prisma.AuditLogWhereInput = {}
  if (action) where.action = action
  if (email) {
    where.OR = [
      { targetEmail: { contains: email, mode: "insensitive" } },
      { adminEmail: { contains: email, mode: "insensitive" } },
    ]
  }
  if (from || to) {
    where.createdAt = {}
    if (from && !isNaN(Date.parse(from))) where.createdAt.gte = new Date(from)
    if (to && !isNaN(Date.parse(to))) {
      const end = new Date(to)
      end.setDate(end.getDate() + 1) // inclusive end date
      where.createdAt.lt = end
    }
  }

  const [total, logs] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])

  return NextResponse.json({
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    logs,
  })
}
