// app/(app)/settings/billing/page.tsx
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { availableCredits, FREE_LIFETIME_CREDITS, MONTHLY_CREDITS } from "@/lib/credits"
import { extAccessSummary } from "@/lib/extAccess"
import { BillingView } from "@/components/settings/BillingView"

// Always fetch fresh data — credit balances change out-of-band (top-up
// webhooks land while the user is on the Lemon Squeezy checkout tab), so a
// cached render would show a stale balance when BillingRefresher refreshes.
export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function BillingPage() {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect("/sign-in")

  const user = await db.user.findUnique({
    where: { clerkId },
    include: { subscription: true },
  })
  if (!user) redirect("/sign-in")

  const sub = user.subscription
  const plan = sub?.plan ?? "FREE"
  const isPaid = plan === "PRO" || plan === "GROWTH"

  const creditSub = {
    plan,
    creditsUsed: sub?.creditsUsed ?? 0,
    creditsTotal: sub?.creditsTotal ?? MONTHLY_CREDITS,
    extraCredits: sub?.extraCredits ?? 0,
    extraCreditsExpiry: sub?.extraCreditsExpiry ?? null,
  }
  const remaining = availableCredits(creditSub)
  const renewal = sub?.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd).toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null

  // Free plan has no monthly allowance — its progress bar tracks the
  // 25-credit lifetime pool instead.
  const effectiveTotal = isPaid ? creditSub.creditsTotal : FREE_LIFETIME_CREDITS
  const percentUsed = effectiveTotal > 0 ? (creditSub.creditsUsed / effectiveTotal) * 100 : 0

  const growthCheckoutUrl = process.env.NEXT_PUBLIC_LEMONSQUEEZY_GROWTH_CHECKOUT_URL
  const [extension, xExtension] = await Promise.all([extAccessSummary(user.id), extAccessSummary(user.id, "x")])

  return (
    <BillingView
      plan={plan}
      email={user.email}
      userId={user.id}
      renewal={renewal}
      cancelAtPeriodEnd={sub?.cancelAtPeriodEnd ?? false}
      upgradeScheduled={sub?.upgradeScheduled ?? false}
      remaining={remaining}
      creditsTotal={creditSub.creditsTotal}
      extraCredits={creditSub.extraCredits}
      extraCreditsExpiry={creditSub.extraCreditsExpiry?.toISOString() ?? null}
      percentUsed={percentUsed}
      growthCheckoutUrl={growthCheckoutUrl}
      extension={extension}
      xExtension={xExtension}
    />
  )
}
