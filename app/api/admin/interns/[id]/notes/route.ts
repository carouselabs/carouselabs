// GET  /api/admin/interns/[id]/notes — list notes, newest first.
// POST /api/admin/interns/[id]/notes — body { content, type? }. Allowed even
// after offboarding — admins can still add a final performance note once an
// intern has left.
import { NextResponse } from "next/server"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { db } from "@/lib/db"
import { logAdminAction, getRequestIp } from "@/lib/auditLog"

const NOTE_TYPES = ["general", "praise", "warning", "review"]

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const { id } = await params
  const notes = await db.internNote.findMany({ where: { internId: id }, orderBy: { createdAt: "desc" } })
  return NextResponse.json({ notes })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const { id } = await params

  let content: string
  let type: string
  try {
    const body = await req.json()
    if (typeof body.content !== "string" || !body.content.trim()) throw new Error()
    content = body.content.trim()
    type = typeof body.type === "string" && NOTE_TYPES.includes(body.type) ? body.type : "general"
  } catch {
    return NextResponse.json({ error: "content is required" }, { status: 400 })
  }

  const intern = await db.intern.findUnique({ where: { id } })
  if (!intern) return NextResponse.json({ error: "Intern not found" }, { status: 404 })

  const note = await db.internNote.create({
    data: { internId: id, content, type, addedBy: admin.email },
  })

  await logAdminAction({
    adminEmail: admin.email,
    action: "ADD_INTERN_NOTE",
    targetEmail: intern.email,
    details: `Added ${type} note: "${content.slice(0, 120)}${content.length > 120 ? "…" : ""}"`,
    ipAddress: getRequestIp(req),
  })

  return NextResponse.json({ note })
}
