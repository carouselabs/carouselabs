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
    <section id="pricing" aria-labelledby="pricing-title" className="scroll-mt-24 font-ui">
      <div className="wrap-site flex flex-col gap-12 py-24 lg:py-[120px]">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-6">
          <div className="flex flex-col gap-4 lg:col-span-7">
            <p className="text-[13px] font-medium text-brand">Pricing</p>
            <h2 id="pricing-title" className="text-[clamp(2rem,1.1rem+2.5vw,3.25rem)] leading-[1] font-semibold tracking-[-0.04em] text-balance">
              Simple, <span className="serif-accent gradient-word pr-[0.04em] text-[1.08em]">honest pricing</span>
            </h2>
            <p className="text-lg leading-[1.6] text-ink-2">Start free. Upgrade when you&apos;re ready to publish consistently.</p>
          </div>
          {/* How credits work */}
          <div className="flex flex-col gap-2 rounded-[24px] bg-surface p-6 shadow-card ring-1 ring-[#100C33]/5 lg:col-span-5">
            <p className="text-label font-semibold">How credits work</p>
            {CREDIT_COST_LINES.map((line) => (
              <p key={line} className="text-label text-muted-foreground tabular-nums">
                {line}
              </p>
            ))}
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
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
        <div className="grid gap-5 md:grid-cols-2">
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
        <div className="grid gap-8 pt-8 lg:grid-cols-12 lg:gap-6">
          <h3 className="text-[clamp(1.6rem,1.2rem+1.2vw,2.25rem)] leading-[1.1] font-semibold tracking-[-0.03em] text-balance lg:col-span-4">
            Pricing questions, <span className="serif-accent gradient-word pr-[0.04em]">answered</span>
          </h3>
          <div className="flex flex-col divide-y divide-border rounded-[24px] bg-surface px-6 shadow-card ring-1 ring-[#100C33]/5 lg:col-span-8">
            {PRICING_FAQ.map((item) => (
              <details key={item.question} className="group py-1">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-3 text-body font-medium [&::-webkit-details-marker]:hidden">
                  {item.question}
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-muted transition-colors group-open:bg-brand-soft">
                    <Plus className="size-4 text-foreground transition-transform duration-(--motion-normal) group-open:rotate-45 group-open:text-brand" aria-hidden />
                  </span>
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
