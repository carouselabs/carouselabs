// app/(app)/settings/billing/page.tsx
import type { ReactNode } from "react"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { availableCredits, FREE_LIFETIME_POSTS, MONTHLY_CREDITS } from "@/lib/credits"
import { SettingsTabs } from "@/components/settings/SettingsTabs"
import { LemonSqueezyButton } from "@/components/billing/LemonSqueezyButton"
import { CancelSubscriptionButton } from "@/components/billing/CancelSubscriptionButton"
import { PlanCard } from "@/components/marketing/PlanCard"
import { FREE_PLAN, PRO_PLAN, GROWTH_PLAN } from "@/lib/plans"

function CreditsProgressBar({ percentUsed, low }: { percentUsed: number; low: boolean }) {
  return (
    <div className="h-2 w-full rounded-full bg-[#ECEAE4] overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${low ? "bg-[#D97706]" : "bg-[#7C3AED]"}`}
        style={{ width: `${Math.min(100, Math.max(0, percentUsed))}%` }}
      />
    </div>
  )
}

// Static "you're already here" state for the plan card CTA slot, so the
// comparison grid keeps the same button height across all 3 cards.
function CurrentPlanCTA() {
  return (
    <div className="w-full inline-flex items-center justify-center px-5 py-3 rounded-xl border border-[#7C3AED]/30 bg-[#7C3AED]/5 text-[13.5px] font-semibold text-[#7C3AED]">
      Your Current Plan
    </div>
  )
}

function NoteCTA({ children }: { children: ReactNode }) {
  return (
    <div className="w-full inline-flex items-center justify-center px-5 py-3 rounded-xl border border-dashed border-[#E5E3DE] text-[12.5px] text-[#9CA3AF] text-center">
      {children}
    </div>
  )
}

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
  const isPro = plan === "PRO"
  const isGrowth = plan === "GROWTH"
  const planLabel = isGrowth ? "Growth" : isPro ? "Pro" : "Free"

  const creditSub = {
    plan,
    creditsUsed: sub?.creditsUsed ?? 0,
    creditsTotal: sub?.creditsTotal ?? MONTHLY_CREDITS,
    extraCredits: sub?.extraCredits ?? 0,
    extraCreditsExpiry: sub?.extraCreditsExpiry ?? null,
  }
  const remaining = availableCredits(creditSub)
  const lowCredits = remaining <= 100
  const renewal = sub?.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd).toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null

  // Free plan has no real "credits" concept — its progress bar tracks the
  // single lifetime post instead of a monthly allowance.
  const effectiveTotal = isPaid ? creditSub.creditsTotal : FREE_LIFETIME_POSTS
  const percentUsed = effectiveTotal > 0 ? (creditSub.creditsUsed / effectiveTotal) * 100 : 0

  const growthCheckoutUrl = process.env.NEXT_PUBLIC_LEMONSQUEEZY_GROWTH_CHECKOUT_URL

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-10">
      <SettingsTabs />

      {/* Current plan summary */}
      <div className="flex flex-col gap-3">
        <h2 className="text-[14px] font-semibold text-[#0A0A0A]">Plan &amp; credits</h2>
        <div className="rounded-2xl border border-[#E5E3DE] bg-white p-5 flex flex-col gap-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <span
                className={[
                  "text-[12px] font-bold px-3 py-1 rounded-full tracking-wide uppercase",
                  isGrowth
                    ? "text-white bg-gradient-to-r from-[#D97706] to-[#F59E0B]"
                    : isPro
                      ? "text-white bg-gradient-to-r from-[#7C3AED] to-[#A78BFA]"
                      : "text-[#4B5563] bg-[#ECEAE4] border border-[#E5E3DE]",
                ].join(" ")}
              >
                {planLabel} plan
              </span>
              {renewal && (
                <span className="text-[12.5px] text-[#6B7280]">
                  {sub?.cancelAtPeriodEnd ? "Access ends" : "Renews"} {renewal}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-end justify-between gap-4">
              <span className="text-[13px] text-[#6B7280]">Credits remaining</span>
              <span
                className={[
                  "text-[20px] font-bold tabular-nums leading-none",
                  lowCredits ? "text-[#D97706]" : "text-[#0A0A0A]",
                ].join(" ")}
              >
                {remaining}
                {isPaid && (
                  <span className="text-[13px] text-[#9CA3AF] font-normal">
                    {" "}
                    / {creditSub.creditsTotal}
                    {creditSub.extraCredits > 0 ? ` +${creditSub.extraCredits} extra` : ""}
                  </span>
                )}
              </span>
            </div>
            <CreditsProgressBar percentUsed={percentUsed} low={lowCredits} />
          </div>

          {lowCredits && (
            <div className="px-4 py-3 rounded-xl bg-[rgba(252,211,77,0.08)] border border-[rgba(252,211,77,0.22)] text-[13px] text-[#D97706]">
              {remaining === 0
                ? "You're out of credits. " +
                  (isPaid ? "Buy extra credits to keep creating." : "Upgrade to Pro for 1,000 monthly credits.")
                : `Only ${remaining} credit${remaining === 1 ? "" : "s"} left.`}
            </div>
          )}
        </div>
      </div>

      {/* Upgrade / manage */}
      {!isPaid ? (
        <div className="flex flex-col gap-3">
          <h2 className="text-[14px] font-semibold text-[#0A0A0A]">Upgrade to Pro</h2>
          <div className="flex flex-col gap-3 p-5 rounded-2xl border border-[#7C3AED]/20 bg-[#7C3AED]/5">
            <p className="text-[13px] text-[#374151] leading-[1.6]">
              <strong className="text-[#0A0A0A]">$24.99/month</strong> — 1,000 content credits every month,
              unlimited ideas, full image &amp; carousel generation, and PDF downloads.
            </p>
            <div className="max-w-xs">
              <LemonSqueezyButton email={user.email} />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <h2 className="text-[14px] font-semibold text-[#0A0A0A]">Manage subscription</h2>
          {sub?.cancelAtPeriodEnd ? (
            <p className="text-[13px] text-[#6B7280]">
              Your subscription is set to cancel at the end of the current period.
            </p>
          ) : (
            <CancelSubscriptionButton />
          )}
        </div>
      )}

      {/* Plan comparison */}
      <div className="flex flex-col gap-5">
        <h2 className="text-[14px] font-semibold text-[#0A0A0A]">Compare plans</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-5 items-stretch">
          <PlanCard
            plan={FREE_PLAN}
            isCurrent={plan === "FREE"}
            cta={
              plan === "FREE" ? (
                <CurrentPlanCTA />
              ) : (
                <NoteCTA>Manage via Cancel Subscription above</NoteCTA>
              )
            }
          />
          <PlanCard
            plan={PRO_PLAN}
            isCurrent={isPro}
            cta={
              isPro ? (
                <CurrentPlanCTA />
              ) : (
                <LemonSqueezyButton email={user.email} label="Start Creating" />
              )
            }
          />
          <PlanCard
            plan={GROWTH_PLAN}
            isCurrent={isGrowth}
            cta={
              isGrowth ? (
                <CurrentPlanCTA />
              ) : (
                <LemonSqueezyButton
                  email={user.email}
                  label="Go Growth"
                  variant="amber"
                  checkoutUrl={growthCheckoutUrl}
                />
              )
            }
          />
        </div>
      </div>
    </div>
  )
}
