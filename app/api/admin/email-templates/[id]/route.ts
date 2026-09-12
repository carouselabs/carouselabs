// DELETE /api/admin/email-templates/[id] — remove a saved template.
import { NextResponse } from "next/server"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { db } from "@/lib/db"

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const { id } = await params
  const existing = await db.emailTemplate.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Template not found" }, { status: 404 })

  await db.emailTemplate.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
