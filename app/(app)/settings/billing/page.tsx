// app/(app)/settings/billing/page.tsx
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { availableCredits } from "@/lib/credits"
import { SettingsTabs } from "@/components/settings/SettingsTabs"
import { LemonSqueezyButton } from "@/components/billing/LemonSqueezyButton"
import { BuyCreditsCard } from "@/components/billing/BuyCreditsCard"
import { CancelSubscriptionButton } from "@/components/billing/CancelSubscriptionButton"

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
  const isPro = plan === "PRO"

  const creditSub = {
    plan,
    creditsUsed: sub?.creditsUsed ?? 0,
    creditsTotal: sub?.creditsTotal ?? 30,
    extraCredits: sub?.extraCredits ?? 0,
    extraCreditsExpiry: sub?.extraCreditsExpiry ?? null,
  }
  const remaining = availableCredits(creditSub)
  const lowCredits = remaining <= 5
  const renewal = sub?.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd).toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-8">
      <SettingsTabs />

      {/* Current plan */}
      <div className="flex flex-col gap-3">
        <h2 className="text-[14px] font-semibold text-[#0A0A0A]">Plan &amp; credits</h2>
        <div className="rounded-xl border border-[#E5E3DE] bg-[#F4F2EC] divide-y divide-[#E9E7E1]">
          <div className="flex items-center justify-between gap-4 px-4 py-3.5">
            <span className="text-[13px] text-[#6B7280]">Current plan</span>
            <span
              className={[
                "text-[11px] font-semibold px-2.5 py-1 rounded-full tracking-wide",
                isPro
                  ? "text-[#1A1A1A] bg-[rgba(26,26,26,0.14)] border border-[rgba(26,26,26,0.3)]"
                  : "text-[#4B5563] bg-[#ECEAE4] border border-[#E5E3DE]",
              ].join(" ")}
            >
              {isPro ? "Pro" : "Free"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 px-4 py-3.5">
            <span className="text-[13px] text-[#6B7280]">Credits remaining</span>
            <span
              className={[
                "text-[15px] font-semibold tabular-nums",
                lowCredits ? "text-[#D97706]" : "text-[#0A0A0A]",
              ].join(" ")}
            >
              {remaining}
              {isPro && <span className="text-[#9CA3AF] font-normal"> / {creditSub.creditsTotal}{creditSub.extraCredits > 0 ? ` +${creditSub.extraCredits} extra` : ""}</span>}
            </span>
          </div>
          {renewal && (
            <div className="flex items-center justify-between gap-4 px-4 py-3.5">
              <span className="text-[13px] text-[#6B7280]">
                {sub?.cancelAtPeriodEnd ? "Access ends" : "Next renewal"}
              </span>
              <span className="text-[13px] text-[#0A0A0A]">{renewal}</span>
            </div>
          )}
        </div>

        {lowCredits && (
          <div className="px-4 py-3 rounded-xl bg-[rgba(252,211,77,0.08)] border border-[rgba(252,211,77,0.22)] text-[13px] text-[#D97706]">
            {remaining === 0
              ? "You're out of credits. " + (isPro ? "Buy extra credits to keep creating." : "Upgrade to Pro for 30 monthly credits.")
              : `Only ${remaining} credit${remaining === 1 ? "" : "s"} left.`}
          </div>
        )}
      </div>

      {/* Free → upgrade */}
      {!isPro && (
        <div className="flex flex-col gap-3">
          <h2 className="text-[14px] font-semibold text-[#0A0A0A]">Upgrade to Pro</h2>
          <div className="flex flex-col gap-3 p-4 rounded-xl border border-[rgba(26,26,26,0.2)] bg-[rgba(26,26,26,0.05)]">
            <p className="text-[13px] text-[#374151] leading-[1.6]">
              <strong className="text-[#0A0A0A]">$34/month</strong> — 30 content credits every month,
              unlimited ideas, full image &amp; carousel generation, and PDF downloads.
            </p>
            <LemonSqueezyButton email={user.email} />
          </div>
        </div>
      )}

      {/* Pro → buy credits + cancel */}
      {isPro && (
        <>
          <div className="flex flex-col gap-3">
            <h2 className="text-[14px] font-semibold text-[#0A0A0A]">Extra credits</h2>
            <BuyCreditsCard email={user.email} />
          </div>

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
        </>
      )}
    </div>
  )
}
