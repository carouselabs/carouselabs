// app/api/cron/intern-weekly-performance-email/route.ts
// Weekly cron (see vercel.json): sends every active intern their own
// personalized Weekly Performance email — rank/points this week vs last
// week, attendance, and an adaptively-toned message (see
// lib/internWeeklyEmail.ts). Fires from a schedule, not user action.
//
// Manual preview: an authenticated admin hitting ?test=<internId> (the
// "Send Test Weekly Email to Myself" button in InternsTable) generates that
// intern's real weekly data but delivers it to the ADMIN's own inbox, never
// the intern's — so tone/content can be previewed without waiting for
// Monday and without emailing a real intern a test message.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAdminUser } from "@/lib/adminAuth"
import { generateWeeklyPerformanceData } from "@/lib/internWeeklyEmail"
import { sendInternWeeklyPerformanceEmail } from "@/lib/email"

async function safeEmail(fn: () => Promise<unknown>): Promise<boolean> {
  try {
    await fn()
    return true
  } catch (err) {
    console.error("[cron/intern-weekly-performance-email] email failed:", err)
    return false
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const testInternId = url.searchParams.get("test")

  if (testInternId) {
    const admin = await getAdminUser()
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const intern = await db.intern.findUnique({ where: { id: testInternId } })
    if (!intern) return NextResponse.json({ error: "Intern not found" }, { status: 404 })

    try {
      const data = await generateWeeklyPerformanceData(intern.id)
      await sendInternWeeklyPerformanceEmail(admin.email, data)
    } catch (err) {
      console.error("[cron/intern-weekly-performance-email] test send failed:", err)
      return NextResponse.json({ error: "Failed to send test email" }, { status: 502 })
    }
    return NextResponse.json({ ok: true, test: true, sentTo: admin.email, previewedIntern: intern.name })
  }

  // Secret gate for the real weekly run. Vercel Cron sends
  // `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET is set; we also
  // accept a ?secret= query param for manual runs.
  const secret = process.env.CRON_SECRET
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  const provided = bearer ?? url.searchParams.get("secret")
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const interns = await db.intern.findMany({ where: { active: true } })
  if (interns.length === 0) {
    return NextResponse.json({ ok: true, skipped: "no active interns" })
  }

  let sent = 0
  const failedEmails: string[] = []
  for (const intern of interns) {
    const ok = await safeEmail(async () => {
      const data = await generateWeeklyPerformanceData(intern.id)
      await sendInternWeeklyPerformanceEmail(intern.email, data)
    })
    if (ok) sent++
    else failedEmails.push(intern.email)
  }

  console.log(
    `[cron/intern-weekly-performance-email] sent ${sent}/${interns.length}${
      failedEmails.length ? ` (failed: ${failedEmails.join(", ")})` : ""
    }`,
  )

  return NextResponse.json({ ok: true, sent, failed: failedEmails.length, failedEmails })
}
