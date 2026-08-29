// POST /api/admin/interns/broadcast — email all active interns, or a
// specific selection, with an admin-authored subject/body announcement.
// body: { subject, body, recipientType: "all" | "specific", specificInternIds?: string[], test?: boolean }
//   test: true → sends ONLY to the admin's own email, bypasses the rate
//                limit and isn't written to the audit log (mirrors the
//                general /api/admin/broadcasts test-send behavior)
import { NextResponse } from "next/server"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { db } from "@/lib/db"
import { logAdminAction, getRequestIp } from "@/lib/auditLog"
import { sendInternBroadcastEmail } from "@/lib/email"

// Per-admin limit (unlike the general user broadcast's single global key) —
// each admin gets their own 5-per-hour budget against accidental spam.
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "1 h"),
  analytics: false,
})

async function safeEmail(fn: () => Promise<unknown>): Promise<boolean> {
  try {
    await fn()
    return true
  } catch (err) {
    console.error("[admin/interns/broadcast] email failed:", err)
    return false
  }
}

export async function POST(req: Request) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  let subject: string
  let body: string
  let recipientType: "all" | "specific"
  let specificInternIds: string[] = []
  let test = false
  try {
    const json = await req.json()
    subject = String(json.subject ?? "").trim()
    body = String(json.body ?? "").trim()
    test = json.test === true

    if (json.recipientType === "all") {
      recipientType = "all"
    } else if (json.recipientType === "specific") {
      if (!Array.isArray(json.specificInternIds) || json.specificInternIds.length === 0) throw new Error()
      if (!json.specificInternIds.every((v: unknown) => typeof v === "string")) throw new Error()
      recipientType = "specific"
      specificInternIds = json.specificInternIds
    } else {
      throw new Error()
    }

    if (!subject || !body) throw new Error()
  } catch {
    return NextResponse.json(
      {
        error:
          'Expected { subject, body, recipientType: "all" | "specific", specificInternIds?: string[] }',
      },
      { status: 400 },
    )
  }

  if (test) {
    const ok = await safeEmail(() => sendInternBroadcastEmail(admin.email, "there", subject, body))
    if (!ok) return NextResponse.json({ error: "Failed to send test email" }, { status: 502 })
    return NextResponse.json({ ok: true, test: true, sentTo: admin.email })
  }

  const interns =
    recipientType === "all"
      ? await db.intern.findMany({
          where: { active: true },
          select: { id: true, name: true, email: true },
        })
      : await db.intern.findMany({
          where: { id: { in: specificInternIds } },
          select: { id: true, name: true, email: true },
        })

  if (interns.length === 0) {
    return NextResponse.json({ error: "No recipients match that selection" }, { status: 400 })
  }

  const { success } = await ratelimit.limit(`admin-intern-broadcast:${admin.email}`)
  if (!success) {
    return NextResponse.json(
      { error: "Only 5 intern broadcasts are allowed per hour. Try again later." },
      { status: 429 },
    )
  }

  let sent = 0
  const failedEmails: string[] = []
  for (const intern of interns) {
    const ok = await safeEmail(() => sendInternBroadcastEmail(intern.email, intern.name, subject, body))
    if (ok) sent++
    else failedEmails.push(intern.email)
  }

  await logAdminAction({
    adminEmail: admin.email,
    action: "BROADCAST_INTERN_EMAIL",
    details: `"${subject}" → ${
      recipientType === "all" ? "all active interns" : `${interns.length} selected interns`
    } (${sent} sent, ${failedEmails.length} failed)`,
    ipAddress: getRequestIp(req),
  })

  return NextResponse.json({ sent, failed: failedEmails.length, failedEmails })
}
