// /api/admin/email-templates/[id]
//   PATCH { name } — rename a saved template
//   DELETE        — remove a saved template (unstar it)
import { NextResponse } from "next/server"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { db } from "@/lib/db"
import { TemplateError, renameTemplate } from "@/lib/sentEmails"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()
  const json = await req.json().catch(() => null)
  const name = typeof json?.name === "string" ? json.name.trim().slice(0, 120) : ""
  if (!name) return NextResponse.json({ error: "Give the template a name" }, { status: 400 })
  try {
    await renameTemplate({ id: (await params).id, name, adminEmail: admin.email })
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof TemplateError) return NextResponse.json({ error: err.message }, { status: err.status })
    throw err
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const { id } = await params
  const existing = await db.emailTemplate.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Template not found" }, { status: 404 })

  await db.emailTemplate.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
