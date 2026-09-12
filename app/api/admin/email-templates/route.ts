// /api/admin/email-templates
//   GET  — every saved template (for the Broadcast composer's and Sequence
//          builder's "Load Template" picker)
//   POST — save the current subject+body as a new reusable template
import { NextResponse } from "next/server"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { db } from "@/lib/db"

export async function GET() {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const templates = await db.emailTemplate.findMany({ orderBy: { createdAt: "desc" } })
  return NextResponse.json({ templates })
}

export async function POST(req: Request) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  let name: string
  let subject: string
  let body: string
  try {
    const json = await req.json()
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
