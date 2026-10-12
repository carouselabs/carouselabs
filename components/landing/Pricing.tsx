import Link from "next/link"
import { ArrowRight, Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { StudioPlanCard } from "@/components/pricing/StudioPlanCard"
import { EngagePlanCard } from "@/components/pricing/EngagePlanCard"
import {
  FREE_PLAN,
  PRO_PLAN,
  GROWTH_PLAN,
  CREDIT_COST_LINES,
  PRICING_FAQ,
  EXTENSION_CHECKOUT_PATH,
  EXTENSION_PLAN,
  X_EXTENSION_CHECKOUT_PATH,
  X_EXTENSION_PLAN,
} from "@/lib/plans"

// Raw checkout links are safe HERE because marketing visitors aren't logged
// in and have no existing subscription to conflict with. Inside the app,
// existing paid subscribers must NOT get these links — a second checkout
// creates a second LS subscription (double-billing); the billing page routes
// them to the customer portal instead (see PortalCTA in settings/billing).
const PRO_CHECKOUT_URL = process.env.NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL
const GROWTH_CHECKOUT_URL = process.env.NEXT_PUBLIC_LEMONSQUEEZY_GROWTH_CHECKOUT_URL

function CheckoutCTA({ label, url, primary = false }: { label: string; url: string | undefined; primary?: boolean }) {
  const className = cn(buttonVariants({ variant: primary ? "default" : "outline" }), "w-full")
  if (!url) {
    return (
      <Link href="/sign-up" className={className}>
        {label}
        <ArrowRight aria-hidden />
      </Link>
    )
  }
  return (
    <a href={url} className={className}>
      {label}
      <ArrowRight aria-hidden />
    </a>
  )
}

export function Pricing() {
  return (
    <section id="pricing" aria-labelledby="pricing-title" className="scroll-mt-20 border-t border-border font-ui">
      <div className="mx-auto flex max-w-showcase flex-col gap-12 gutter-x section-y">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-end lg:gap-16">
          <div className="flex flex-col gap-4">
            <p className="text-label font-medium text-brand">Pricing</p>
            <h2 id="pricing-title" className="text-section font-semibold text-balance">Simple, honest pricing</h2>
            <p className="text-body-lg text-muted-foreground">Start free. Upgrade when you&apos;re ready to publish consistently.</p>
          </div>
          {/* How credits work */}
          <div className="flex flex-col gap-2 rounded-card border border-border bg-surface p-5">
            <p className="text-label font-semibold">How credits work</p>
            {CREDIT_COST_LINES.map((line) => (
              <p key={line} className="text-label text-muted-foreground tabular-nums">
                {line}
              </p>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <StudioPlanCard
            plan={FREE_PLAN}
            cta={
              <Link href="/sign-up" className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
                Get Started Free
              </Link>
            }
          />
          <StudioPlanCard plan={PRO_PLAN} cta={<CheckoutCTA label="Start Creating" url={PRO_CHECKOUT_URL} primary />} />
          <StudioPlanCard plan={GROWTH_PLAN} cta={<CheckoutCTA label="Go Growth" url={GROWTH_CHECKOUT_URL} />} />
        </div>

        {/* The Chrome extensions — separate products, so they sit under the
            web plans rather than in their row. Visitors here are signed out
            (the home page redirects signed-in users), so the checkout route
            takes them through sign-up first. */}
        <div className="grid gap-4 md:grid-cols-2">
          <EngagePlanCard
            plan={EXTENSION_PLAN}
            cta={
              <a href={EXTENSION_CHECKOUT_PATH} className={buttonVariants({ size: "lg" })}>
                Get the extension — ${EXTENSION_PLAN.price}/month
              </a>
            }
          />
          <EngagePlanCard
            plan={X_EXTENSION_PLAN}
            cta={
              <a href={X_EXTENSION_CHECKOUT_PATH} className={buttonVariants({ size: "lg" })}>
                Get Engage for X — ${X_EXTENSION_PLAN.price}/month
              </a>
            }
          />
        </div>

        {/* FAQ */}
        <div className="grid gap-8 border-t border-border pt-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-16">
          <h3 className="text-title-sm font-semibold text-balance">Pricing questions, answered</h3>
          <div className="flex flex-col divide-y divide-border border-y border-border">
            {PRICING_FAQ.map((item) => (
              <details key={item.question} className="group py-1">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-3 text-body font-medium [&::-webkit-details-marker]:hidden">
                  {item.question}
                  <Plus className="size-4 shrink-0 text-muted-foreground transition-transform duration-(--motion-normal) group-open:rotate-45" aria-hidden />
                </summary>
                <p className="pb-4 text-body text-muted-foreground">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
