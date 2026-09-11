// GET /api/referrals/reminder — the once-per-calendar-week dashboard nudge
// about the referral program (see components/dashboard/ReferralReminderBanner
// and STEP 2/3 of the follow-up referral spec). Calendar week = Mon-Sun, the
// same boundary lib/internPoints.ts's getPeriodRange("week") already defines
// for the intern leaderboard — reused here rather than re-deriving Monday
// math a second time.
//
// Stamps Profile.lastReferralReminderShown the moment this decides to show
// the banner (not on a separate dismiss call) — see the field's comment in
// prisma/schema.prisma. That single write is what "on dismiss, or after
// showing once" collapses to: whichever happens, the banner won't show again
// until the following Monday.
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { getPeriodRange } from "@/lib/internPoints"
import { ensureReferralCode, getSiteOrigin } from "@/lib/referral"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const weekStart = getPeriodRange("week")!.start
  const lastShown = user.profile?.lastReferralReminderShown ?? null
  if (lastShown && lastShown >= weekStart) {
    return NextResponse.json({ show: false })
  }

  const referralCode = await ensureReferralCode(user.id)
  const monthStart = getPeriodRange("month")!.start

  const [referralCount, monthCommissions] = await Promise.all([
    db.referral.count({ where: { referrerId: user.id } }),
    db.referralCommission.findMany({
      where: { referrerId: user.id, status: { not: "reversed" }, createdAt: { gte: monthStart } },
      select: { amount: true },
    }),
  ])

  const earnedThisMonth = monthCommissions.reduce((sum, c) => sum + c.amount, 0)
  const siteUrl = await getSiteOrigin()

  // Best-effort: if this write fails, worst case the banner shows again on
  // the next page load today — never a reason to fail the response itself.
  try {
    await db.profile.update({
      where: { userId: user.id },
      data: { lastReferralReminderShown: new Date() },
    })
  } catch (err) {
    console.error("[referrals/reminder] failed to stamp lastReferralReminderShown:", err)
  }

  return NextResponse.json({
    show: true,
    referralLink: `${siteUrl}/?ref=${referralCode}`,
    hasReferrals: referralCount > 0,
    earnedThisMonth,
  })
}
