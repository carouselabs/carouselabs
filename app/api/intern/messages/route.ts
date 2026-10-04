// GET   /api/intern/messages — the logged-in intern's own Support thread.
// POST  /api/intern/messages — intern sends a new Support message; notifies
//        ADMIN_EMAIL by email (best-effort, doesn't block or fail the send).
// PATCH /api/intern/messages — mark all admin-sent replies as read (called
//        when the intern opens the Support section).
import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { getOwnedInternId } from "@/lib/internAuth"
import { sendAdminNewSupportMessageEmail } from "@/lib/email"
import { ADMIN_URL } from "@/emails/EmailLayout"

async function safeEmail(fn: () => Promise<unknown>) {
  try {
    await fn()
  } catch {
    console.error("[intern/messages] email delivery failed")
  }
}

async function findMyIntern() {
  const { userId: clerkId } = await auth()
  if (!clerkId) return null
  const user = await getCurrentUser()
  if (!user) return null
  const internId = await getOwnedInternId(user)
  return internId ? db.intern.findUnique({ where: { id: internId } }) : null
}

export async function GET() {
  const intern = await findMyIntern()
  if (!intern) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const messages = await db.internMessage.findMany({
    where: { internId: intern.id },
    orderBy: { createdAt: "asc" },
  })
  return NextResponse.json({ messages })
}

export async function POST(req: Request) {
  const intern = await findMyIntern()
  if (!intern) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let message: string
  try {
    const body = await req.json()
    if (typeof body.message !== "string" || body.message.length > 4000) throw new Error()
    message = body.message.trim()
    if (!message) throw new Error()
  } catch {
    return NextResponse.json({ error: "A message of 1 to 4000 characters is required" }, { status: 400 })
  }

  const created = await db.internMessage.create({
    data: { internId: intern.id, sender: "intern", message },
  })

  const adminEmail = process.env.ADMIN_EMAIL
  if (adminEmail) {
    await safeEmail(() =>
      sendAdminNewSupportMessageEmail(
        adminEmail,
        intern.name,
        message,
        `${ADMIN_URL}/interns/${intern.id}?tab=support`,
      ),
    )
  }

  return NextResponse.json({ message: created })
}

export async function PATCH() {
  const intern = await findMyIntern()
  if (!intern) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await db.internMessage.updateMany({
    where: { internId: intern.id, sender: "admin", read: false },
    data: { read: true },
  })
  return NextResponse.json({ ok: true })
}
