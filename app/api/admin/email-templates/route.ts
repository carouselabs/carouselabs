// /api/admin/email-templates
//   GET  — every saved template (for the Broadcast composer's and Sequence
//          builder's "Load Template" picker)
//   POST — save the current subject+body as a new reusable template, or
//          { name, source: "campaign:<id>"|"personal:<id>" } to star a sent
//          email as a template, the AI-written email included (lib/sentEmails.ts)
import { NextResponse } from "next/server"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { db } from "@/lib/db"
import { TemplateError, parseSource, saveTemplate } from "@/lib/sentEmails"

export async function GET() {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const templates = await db.emailTemplate.findMany({ orderBy: { createdAt: "desc" } })
  return NextResponse.json({ templates })
}

export async function POST(req: Request) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const json = await req.json().catch(() => null)
  if (json && typeof json.source === "string") {
    const source = parseSource(json.source)
    const name = typeof json.name === "string" ? json.name.trim().slice(0, 120) : ""
    if (!source || !name) return NextResponse.json({ error: "Give the template a name" }, { status: 400 })
    try {
      return NextResponse.json({ ok: true, template: await saveTemplate({ source, name, adminEmail: admin.email }) })
    } catch (err) {
      if (err instanceof TemplateError) return NextResponse.json({ error: err.message }, { status: err.status })
      throw err
    }
  }

  let name: string
  let subject: string
  let body: string
  try {
    if (!json) throw new Error()
    name = typeof json.name === "string" ? json.name.trim() : ""
    subject = typeof json.subject === "string" ? json.subject.trim() : ""
    body = typeof json.body === "string" ? json.body.trim() : ""
    if (!name || !subject || !body) throw new Error()
  } catch {
    return NextResponse.json({ error: "Expected { name, subject, body }, all non-empty" }, { status: 400 })
  }

  const template = await db.emailTemplate.create({
    data: { name, subject, body, createdBy: admin.email },
  })

  return NextResponse.json({ ok: true, template })
}
