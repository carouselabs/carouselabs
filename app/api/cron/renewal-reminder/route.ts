// app/api/cron/renewal-reminder/route.ts
// Daily cron (see vercel.json): emails Pro users ~3 days before their
// subscription renews. Fires from a schedule, not user action.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { sendRenewalReminderEmail } from "@/lib/email"
import { PRO_MONTHLY_PRICE_CENTS } from "@/lib/lemonsqueezy"

const DAY_MS = 24 * 60 * 60 * 1000

export async function GET(req: Request) {
  // Secret gate. Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` when
  // CRON_SECRET is set; we also accept a ?secret= query param for manual runs.
  const secret = process.env.CRON_SECRET
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  const provided = bearer ?? new URL(req.url).searchParams.get("secret")
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Renewals landing in the now+2.5d .. now+3.5d window. The 1-day spread means a
  // once-daily run catches every subscription's "3 days out" exactly once.
  const now = Date.now()
  const windowStart = new Date(now + 2.5 * DAY_MS)
  const windowEnd = new Date(now + 3.5 * DAY_MS)

  const subs = await db.subscription.findMany({
    where: {
      plan: "PRO",
      status: "ACTIVE",
      // Skip subscriptions already set to cancel — they won't renew.
      cancelAtPeriodEnd: false,
      currentPeriodEnd: { gte: windowStart, lte: windowEnd },
    },
    include: { user: { include: { profile: true } } },
  })

  const amount = `$${Math.round(PRO_MONTHLY_PRICE_CENTS / 100)}` // "$24"

  let sent = 0
  for (const sub of subs) {
    const user = sub.user
    if (!user?.email || user.deletedAt || !sub.currentPeriodEnd) continue

    const name = user.profile?.name ?? ""
    const renewalDate = sub.currentPeriodEnd.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    try {
      await sendRenewalReminderEmail(user.email, name, renewalDate, amount)
      sent++
    } catch (err) {
      console.error(`[cron/renewal-reminder] send failed for ${user.email}:`, err)
    }
  }

  console.log(`[cron/renewal-reminder] candidates=${subs.length} sent=${sent}`)
  return NextResponse.json({ ok: true, candidates: subs.length, sent })
}
