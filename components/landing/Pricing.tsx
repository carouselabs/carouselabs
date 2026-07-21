import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { AnimatedSection } from "@/components/marketing/AnimatedSection"
import { PlanCard } from "@/components/marketing/PlanCard"
import { FREE_PLAN, PRO_PLAN, GROWTH_PLAN, CREDIT_COST_LINES, PRICING_FAQ } from "@/lib/plans"

// Raw checkout links are safe HERE because marketing visitors aren't logged
// in and have no existing subscription to conflict with. Inside the app,
// existing paid subscribers must NOT get these links — a second checkout
// creates a second LS subscription (double-billing); the billing page routes
// them to the customer portal instead (see PortalCTA in settings/billing).
const PRO_CHECKOUT_URL = process.env.NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL
const GROWTH_CHECKOUT_URL = process.env.NEXT_PUBLIC_LEMONSQUEEZY_GROWTH_CHECKOUT_URL

function FreeCTA() {
  return (
    <Link
      href="/sign-up"
      className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-[#E5E3DE] bg-white hover:bg-[#F9F7F2] text-[13.5px] font-semibold text-[#0A0A0A] transition-colors"
    >
      Get Started Free
    </Link>
  )
}

function CheckoutCTA({
  label,
  variant,
  url,
}: {
  label: string
  variant: "purple" | "amber"
  url: string | undefined
}) {
  if (!url) {
    return (
      <Link
        href="/sign-up"
        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-[13.5px] font-semibold text-white transition-colors"
      >
        {label}
        <ArrowRight size={14} strokeWidth={2.5} />
      </Link>
    )
  }
  return (
    <a
      href={url}
      className={[
        "w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-[13.5px] font-semibold text-white transition-all",
        variant === "purple"
          ? "bg-[#7C3AED] hover:bg-[#6D28D9] shadow-[0_8px_30px_rgba(124,58,237,0.35)]"
          : "bg-[#F59E0B] hover:bg-[#D97706] shadow-[0_8px_30px_rgba(245,158,11,0.25)]",
      ].join(" ")}
    >
      {label}
      <ArrowRight size={14} strokeWidth={2.5} />
    </a>
  )
}

export function Pricing() {
  return (
    <section id="pricing" className="py-24 px-6">
      <div className="max-w-6xl mx-auto flex flex-col gap-16">
        <AnimatedSection className="flex flex-col gap-4 text-center">
          <p className="text-[11px] font-semibold text-[#7C3AED] uppercase tracking-widest">
            Pricing
          </p>
          <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-bold tracking-[-0.02em] text-[#0A0A0A]">
            Simple, honest pricing
          </h2>
          <p className="max-w-sm mx-auto text-[15px] text-[#6B7280] leading-[1.65]">
            Start free. Upgrade when you&apos;re ready to publish consistently.
          </p>
        </AnimatedSection>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-5 items-stretch">
          <AnimatedSection delay={0} className="h-full">
            <PlanCard plan={FREE_PLAN} cta={<FreeCTA />} />
          </AnimatedSection>

          <AnimatedSection delay={0.1} className="h-full">
            <PlanCard
              plan={PRO_PLAN}
              cta={<CheckoutCTA label="Start Creating" variant="purple" url={PRO_CHECKOUT_URL} />}
            />
          </AnimatedSection>

          <AnimatedSection delay={0.2} className="h-full">
            <PlanCard
              plan={GROWTH_PLAN}
              cta={<CheckoutCTA label="Go Growth" variant="amber" url={GROWTH_CHECKOUT_URL} />}
            />
          </AnimatedSection>
        </div>

        {/* How credits work */}
        <AnimatedSection className="max-w-2xl mx-auto w-full text-center flex flex-col gap-2 p-6 rounded-2xl bg-[#F4F2EC] border border-[#E9E7E1]">
          <p className="text-[12px] font-semibold text-[#0A0A0A] uppercase tracking-wide">
            How credits work
          </p>
          {CREDIT_COST_LINES.map((line) => (
            <p key={line} className="text-[12.5px] text-[#6B7280] leading-relaxed">
              {line}
            </p>
          ))}
        </AnimatedSection>

        {/* FAQ */}
        <AnimatedSection className="max-w-2xl mx-auto w-full flex flex-col gap-6">
          <h3 className="text-[15px] font-bold text-[#0A0A0A] text-center">
            Pricing questions, answered
          </h3>
          <div className="flex flex-col gap-4">
            {PRICING_FAQ.map((item) => (
              <div key={item.question} className="p-5 rounded-xl bg-white border border-[#E5E3DE]">
                <p className="text-[13.5px] font-semibold text-[#0A0A0A] mb-1.5">{item.question}</p>
                <p className="text-[13px] text-[#6B7280] leading-relaxed">{item.answer}</p>
              </div>
            ))}
          </div>
        </AnimatedSection>
      </div>
    </section>
  )
}
