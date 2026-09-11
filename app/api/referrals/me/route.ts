// GET /api/referrals/me — the current user's own referral stats, for
// Settings > Referrals (see app/(app)/settings/referrals). Lazily generates
// a referralCode on first call if the user doesn't have one yet (see
// lib/referral.ts's ensureReferralCode) — this IS "the first time they
// visit their Referrals settings page" the spec asks for, since this route
// is what that page calls on mount.
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { ensureReferralCode } from "@/lib/referral"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const referralCode = await ensureReferralCode(user.id)

  const [referralsMade, commissions, payouts] = await Promise.all([
    db.referral.findMany({
      where: { referrerId: user.id },
      include: { referredUser: { include: { subscription: true } } },
    }),
    db.referralCommission.findMany({ where: { referrerId: user.id } }),
    db.referralPayout.findMany({
      where: { referrerId: user.id },
      orderBy: { createdAt: "desc" },
    }),
  ])

  const totalReferred = referralsMade.length
  const convertedToPaid = referralsMade.filter(
    (r) => r.referredUser.subscription && r.referredUser.subscription.plan !== "FREE",
  ).length
  const stayedFree = totalReferred - convertedToPaid

  // Pending balance explicitly excludes "reversed" (refunded payments never
  // owe the referrer anything) — and, separately from "paid", isn't counted
  // twice into lifetime earned.
  const pendingBalance = commissions
    .filter((c) => c.status === "pending")
    .reduce((sum, c) => sum + c.amount, 0)
  // Lifetime earned = paid + pending, excluding reversed — "reversed" never
  // counted as earned at all, not even transiently.
  const totalLifetimeEarned = commissions
    .filter((c) => c.status !== "reversed")
    .reduce((sum, c) => sum + c.amount, 0)

  const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://carouselabs.com"

  return NextResponse.json({
    referralCode,
    referralLink: `${siteUrl}/?ref=${referralCode}`,
    totalReferred,
    convertedToPaid,
    stayedFree,
    pendingBalance,
    totalLifetimeEarned,
    payouts: payouts.map((p) => ({
      id: p.id,
      amount: p.amount,
      method: p.method,
      createdAt: p.createdAt,
    })),
  })
}
