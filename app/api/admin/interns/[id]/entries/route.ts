// POST /api/admin/interns/[id]/entries — add a manual point entry.
// body: { points: number, category: string, note?: string }
import { NextResponse } from "next/server"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { db } from "@/lib/db"
import { logAdminAction, getRequestIp } from "@/lib/auditLog"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const { id } = await params

  let points: number
  let category: string
  let note: string | null
  try {
    const body = await req.json()
    if (typeof body.points !== "number" || !Number.isInteger(body.points)) throw new Error()
    if (typeof body.category !== "string" || !body.category.trim()) throw new Error()
    points = body.points
    category = body.category.trim()
    note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null
  } catch {
    return NextResponse.json({ error: "points (integer) and category are required" }, { status: 400 })
  }

  const intern = await db.intern.findUnique({ where: { id } })
  if (!intern) return NextResponse.json({ error: "Intern not found" }, { status: 404 })

  const entry = await db.internPointEntry.create({
    data: { internId: id, points, category, note, source: "manual", addedBy: admin.email },
  })

  await logAdminAction({
    adminEmail: admin.email,
    action: "ADD_INTERN_ENTRY",
    targetEmail: intern.email,
    details: `${points >= 0 ? "+" : ""}${points} pts — ${category}${note ? ` (${note})` : ""}`,
    ipAddress: getRequestIp(req),
  })

  return NextResponse.json({ entry })
}
