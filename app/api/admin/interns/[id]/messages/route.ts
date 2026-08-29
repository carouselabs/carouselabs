// GET   /api/admin/interns/[id]/messages — this intern's Support thread
//        (admin view).
// POST  /api/admin/interns/[id]/messages — admin sends a reply; logs the
//        reply to the audit trail and notifies the intern by email
//        (best-effort, doesn't block or fail the send).
// PATCH /api/admin/interns/[id]/messages — mark all intern-sent messages as
//        read (called when the admin opens the Support tab).
import { NextResponse } from "next/server"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { db } from "@/lib/db"
import { logAdminAction, getRequestIp } from "@/lib/auditLog"
import { sendInternSupportReplyEmail } from "@/lib/email"

async function safeEmail(fn: () => Promise<unknown>) {
  try {
    await fn()
  } catch (err) {
    console.error("[admin/interns/messages] email failed:", err)
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const { id } = await params
  const messages = await db.internMessage.findMany({
    where: { internId: id },
    orderBy: { createdAt: "asc" },
  })
  return NextResponse.json({ messages })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const { id } = await params
  const intern = await db.intern.findUnique({ where: { id } })
  if (!intern) return NextResponse.json({ error: "Intern not found" }, { status: 404 })

  let message: string
  try {
    const body = await req.json()
    message = String(body.message ?? "").trim()
    if (!message) throw new Error()
  } catch {
    return NextResponse.json({ error: "message is required" }, { status: 400 })
  }

  const created = await db.internMessage.create({
    data: { internId: id, sender: "admin", message },
  })

  await logAdminAction({
    adminEmail: admin.email,
    action: "REPLY_INTERN_MESSAGE",
    targetEmail: intern.email,
    details: `Replied in Support: "${message.length > 140 ? `${message.slice(0, 140)}…` : message}"`,
    ipAddress: getRequestIp(req),
  })

  await safeEmail(() => sendInternSupportReplyEmail(intern.email, intern.name))

  return NextResponse.json({ message: created })
}

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const { id } = await params
  await db.internMessage.updateMany({
    where: { internId: id, sender: "intern", read: false },
    data: { read: true },
  })
  return NextResponse.json({ ok: true })
}
