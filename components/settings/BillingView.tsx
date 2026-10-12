// components/settings/BillingView.tsx — Settings → Billing, given its data
// (app/(app)/settings/billing/page.tsx loads it): plan and credits, top-ups,
// upgrade or manage, the plan comparison, and the two extension plans.
import type { ReactNode } from "react"
import { SettingsHeader } from "@/components/settings/SettingsHeader"
import { LemonSqueezyButton } from "@/components/billing/LemonSqueezyButton"
import { CancelSubscriptionButton } from "@/components/billing/CancelSubscriptionButton"
import { UpgradeToGrowthButton } from "@/components/billing/UpgradeToGrowthButton"
import { TopUpCredits } from "@/components/billing/TopUpCredits"
import { BillingRefresher } from "@/components/billing/BillingRefresher"
import { StudioPlanCard } from "@/components/pricing/StudioPlanCard"
import { FREE_PLAN, PRO_PLAN, GROWTH_PLAN } from "@/lib/plans"
import type { ExtAccessSummary } from "@/lib/extAccess"
import { ExtensionPlanSection } from "@/components/extension/ExtensionPlanSection"

function CreditsProgressBar({ percentUsed, low }: { percentUsed: number; low: boolean }) {
  return (
    <div className="h-2 w-full rounded-full bg-surface-muted overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${low ? "bg-warning" : "bg-brand"}`}
        style={{ width: `${Math.min(100, Math.max(0, percentUsed))}%` }}
      />
    </div>
  )
}

// Static "you're already here" state for the plan card CTA slot, so the
// comparison grid keeps the same button height across all 3 cards.
function CurrentPlanCTA() {
  return (
    <div className="inline-flex h-11 w-full items-center justify-center rounded-control border border-brand/30 bg-brand-soft/60 px-5 text-label font-semibold text-brand">
      Your Current Plan
    </div>
  )
}

function NoteCTA({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex min-h-11 w-full items-center justify-center rounded-control border border-dashed border-border px-5 py-2 text-center text-caption text-muted-foreground">
      {children}
    </div>
  )
}

// Plan-change CTA for users who ALREADY have a paid subscription. Opening a
// raw Lemon Squeezy checkout would create a second, independent subscription
// (double-billing — LS checkout never cancels the old one), so existing
// subscribers are sent to the LS customer portal to swap their plan in place
// instead. That swap arrives as a subscription_updated webhook, which now
// retiers the plan + credits.
function PortalCTA({ label, variant }: { label: string; variant: "purple" | "amber" }) {
  return (
    <div className="flex flex-col gap-1.5">
      <a
        href="https://app.lemonsqueezy.com/my-orders"
        target="_blank"
        rel="noopener noreferrer"
        className={[
          "inline-flex h-11 w-full items-center justify-center gap-2 rounded-control px-5 text-label font-semibold text-white transition-colors duration-(--motion-fast)",
          variant === "amber"
            ? "bg-warning hover:bg-warning/90"
            : "bg-brand hover:bg-brand-hover",
        ].join(" ")}
      >
        {label} →
      </a>
      <p className="text-caption text-muted-foreground text-center leading-snug">
        You&apos;ll be redirected to manage your subscription. Your existing subscription will be
        updated — you won&apos;t be charged twice.
      </p>
    </div>
  )
}

export function BillingView({
  plan,
  email,
  userId,
  renewal,
  cancelAtPeriodEnd,
  upgradeScheduled,
  remaining,
  creditsTotal,
  extraCredits,
  extraCreditsExpiry,
  percentUsed,
  growthCheckoutUrl,
  extension,
  xExtension,
}: {
  plan: "FREE" | "PRO" | "GROWTH"
  email: string
  userId: string
  renewal: string | null
  cancelAtPeriodEnd: boolean
  upgradeScheduled: boolean
  remaining: number
  creditsTotal: number
  extraCredits: number
  extraCreditsExpiry: string | null
  percentUsed: number
  growthCheckoutUrl?: string
  extension: ExtAccessSummary
  xExtension: ExtAccessSummary
}) {
  const isPaid = plan === "PRO" || plan === "GROWTH"
  const isPro = plan === "PRO"
  const isGrowth = plan === "GROWTH"
  const planLabel = isGrowth ? "Growth" : isPro ? "Pro" : "Free"
  const lowCredits = remaining <= 100
  const creditSub = { creditsTotal, extraCredits }
  const sub = { cancelAtPeriodEnd, upgradeScheduled }
  const user = { email, id: userId }

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-10">
      <BillingRefresher />
      <SettingsHeader />

      {/* Current plan summary */}
      <div className="flex flex-col gap-3">
        <h2 className="text-label font-semibold text-foreground">Plan &amp; credits</h2>
        <div className="rounded-card border border-border bg-surface-raised p-5 flex flex-col gap-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <span
                className={[
                  "rounded-full px-3 py-1 text-caption font-semibold",
                  isGrowth
                    ? "bg-warning-soft text-warning"
                    : isPro
                      ? "bg-brand-soft text-brand"
                      : "border border-border bg-surface-muted text-foreground",
                ].join(" ")}
              >
                {planLabel} plan
              </span>
              {renewal && (
                <span className="text-caption text-muted-foreground">
                  {sub?.cancelAtPeriodEnd ? "Access ends" : "Renews"} {renewal}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-end justify-between gap-4">
              <span className="text-label text-muted-foreground">Credits remaining</span>
              <span
                className={[
                  "text-lead font-bold tabular-nums leading-none",
                  lowCredits ? "text-warning" : "text-foreground",
                ].join(" ")}
              >
                {remaining}
                {isPaid && (
                  <span className="text-label text-muted-foreground font-normal">
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
            <div role="status" className="rounded-control border border-warning/30 bg-warning-soft px-4 py-3 text-label text-warning">
              {remaining === 0
                ? "You're out of credits. " +
                  (isPaid ? "Buy extra credits to keep creating." : "Upgrade to Pro for 1,000 monthly credits.")
                : `Only ${remaining} credit${remaining === 1 ? "" : "s"} left.`}
            </div>
          )}
        </div>
      </div>

      {/* Credit top-ups — paid plans only (component also guards internally) */}
      {isPaid && (
        <TopUpCredits
          extraCredits={creditSub.extraCredits}
          extraCreditsExpiry={extraCreditsExpiry}
          userId={user.id}
          plan={plan}
        />
      )}

      {/* Upgrade / manage */}
      {!isPaid ? (
        <div className="flex flex-col gap-3">
          <h2 className="text-label font-semibold text-foreground">Upgrade to Pro</h2>
          <div className="flex flex-col gap-3 rounded-card border border-brand/25 bg-brand-soft/60 p-5">
            <p className="text-label text-foreground leading-[1.6]">
              <strong className="text-foreground">$24.99/month</strong> — 1,000 content credits every month,
              unlimited ideas, full image &amp; carousel generation, and PDF downloads.
            </p>
            <div className="max-w-xs">
              <LemonSqueezyButton email={user.email} />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <h2 className="text-label font-semibold text-foreground">Manage subscription</h2>
          {sub?.cancelAtPeriodEnd ? (
            <p className="text-label text-muted-foreground">
              Your subscription is set to cancel at the end of the current period.
            </p>
          ) : (
            <CancelSubscriptionButton />
          )}
        </div>
      )}

      {/* Plan comparison */}
      <div className="flex flex-col gap-5">
        <h2 className="text-label font-semibold text-foreground">Compare plans</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-5 items-stretch">
          <StudioPlanCard
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
          {/* Free users get a fresh checkout (nothing to conflict with);
              existing paid subscribers get the portal so a plan change
              updates their subscription instead of stacking a second one. */}
          <StudioPlanCard
            plan={PRO_PLAN}
            isCurrent={isPro}
            cta={
              isPro ? (
                <CurrentPlanCTA />
              ) : isGrowth ? (
                <PortalCTA label="Switch to Pro" variant="purple" />
              ) : (
                <LemonSqueezyButton email={user.email} label="Start Creating" />
              )
            }
          />
          <StudioPlanCard
            plan={GROWTH_PLAN}
            isCurrent={isGrowth}
            cta={
              isGrowth ? (
                <CurrentPlanCTA />
              ) : isPro ? (
                // Pro → Growth is scheduled for the next renewal (no charge
                // today) instead of routing through the LS portal.
                <UpgradeToGrowthButton
                  renewalDate={renewal}
                  upgradeScheduled={sub?.upgradeScheduled ?? false}
                />
              ) : (
                <LemonSqueezyButton
                  email={user.email}
                  label="Go Growth"
                  variant="amber"
                  checkoutUrl={growthCheckoutUrl}
                  plan="growth"
                />
              )
            }
          />
        </div>
      </div>

      <div id="extension" className="flex flex-col gap-3 scroll-mt-24">
        <h2 className="text-label font-semibold text-foreground">Chrome extensions</h2>
        <ExtensionPlanSection ext={extension} />
        <a href="/extension/billing" className="text-caption font-medium text-brand hover:underline w-fit">
          Payment history and everything else for the LinkedIn extension →
        </a>
        <ExtensionPlanSection ext={xExtension} platform="x" />
        <a href="/extension/x/billing" className="text-caption font-medium text-brand hover:underline w-fit">
          Payment history and everything else for the X extension →
        </a>
      </div>
    </div>
  )
}
