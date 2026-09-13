// app/api/cron/weekly-summary-email/route.ts
// Weekly cron (see vercel.json): sends every user with
// Profile.notifyWeeklySummary === true (Settings > Account > Notifications)
// a personalized recap — posts published this week, what's coming up next
// week, referral earnings this month, and current plan/credits (see
// lib/weeklySummary.ts). Users with zero activity across all of that are
// skipped entirely rather than emailed an empty digest.
//
// Manual preview: an authenticated admin hitting ?test=<userId> generates
// that user's real data but delivers it to the ADMIN's own inbox, never the
// user's — mirrors app/api/cron/intern-weekly-performance-email's same
// pattern, so content/formatting can be checked without waiting for Monday.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAdminUser } from "@/lib/adminAuth"
import { generateWeeklySummaryData } from "@/lib/weeklySummary"
import { sendWeeklySummaryEmail } from "@/lib/email"

async function safeEmail(fn: () => Promise<unknown>): Promise<boolean> {
  try {
    await fn()
    return true
  } catch (err) {
    console.error("[cron/weekly-summary-email] email failed:", err)
    return false
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const testUserId = url.searchParams.get("test")

  if (testUserId) {
    const admin = await getAdminUser()
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const user = await db.user.findUnique({ where: { id: testUserId } })
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

    try {
      const data = await generateWeeklySummaryData(user.id)
      await sendWeeklySummaryEmail(admin.email, data)
    } catch (err) {
      console.error("[cron/weekly-summary-email] test send failed:", err)
      return NextResponse.json({ error: "Failed to send test email" }, { status: 502 })
    }
    return NextResponse.json({ ok: true, test: true, sentTo: admin.email, previewedUser: user.email })
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

  // Prisma's relation filter on an optional one-to-one naturally excludes
  // users with no Profile row at all (nothing to match against), so this
  // never needs a separate null-check.
  const users = await db.user.findMany({
    where: { deletedAt: null, profile: { notifyWeeklySummary: true } },
    select: { id: true, email: true },
  })

  let sent = 0
  let skipped = 0
  let failed = 0
  const failedEmails: string[] = []

  for (const user of users) {
    let data: Awaited<ReturnType<typeof generateWeeklySummaryData>>
    try {
      data = await generateWeeklySummaryData(user.id)
    } catch (err) {
      console.error(`[cron/weekly-summary-email] failed to generate data for ${user.email}:`, err)
      failed++
      failedEmails.push(user.email)
      continue
    }

    if (!data.hasAnyActivity) {
      skipped++
      continue
    }

    const ok = await safeEmail(() => sendWeeklySummaryEmail(user.email, data))
    if (ok) sent++
    else {
      failed++
      failedEmails.push(user.email)
    }
  }

  console.log(
    `[cron/weekly-summary-email] sent=${sent} skipped=${skipped} failed=${failed}` +
      (failedEmails.length ? ` (failed: ${failedEmails.join(", ")})` : ""),
  )

  return NextResponse.json({ ok: true, eligible: users.length, sent, skipped, failed, failedEmails })
}
