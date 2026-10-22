// GET /api/admin/sent-emails/content?source=campaign:<id>|personal:<id>|template:<id>
// — one email ready to use again (lib/sentEmails.ts): its subject, plain
// text, the AI-written email (null for plain text), and the name it greets
// someone by outright, if any.
import { NextResponse } from "next/server"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { emailContent, parseSource } from "@/lib/sentEmails"

export async function GET(req: Request) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()
  const source = parseSource(new URL(req.url).searchParams.get("source"))
  if (!source) return NextResponse.json({ error: "Say which email" }, { status: 400 })
  const content = await emailContent(source)
  if (!content) return NextResponse.json({ error: "That email wasn't kept, so it can't be used again" }, { status: 404 })
  return NextResponse.json(content)
}
