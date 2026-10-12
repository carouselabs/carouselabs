import Link from "next/link"
import { ArrowRight, Gift, Link2, Repeat, Users } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"

const DIFFERENTIATORS = [
  {
    icon: Link2,
    text: "One link, lifetime tracking — no expiry",
  },
  {
    icon: Repeat,
    text: "Recurring commission, not one-time — earn every month they stay subscribed",
  },
  {
    icon: Gift,
    text: "Free credits even if they don't upgrade",
  },
]

/** A compact band — the referral offer stays secondary to the product. Copy unchanged. */
export function ReferralFeature() {
  return (
    <section id="referrals" aria-labelledby="referrals-title" className="scroll-mt-20 border-t border-border font-ui">
      <div className="mx-auto grid max-w-showcase gap-10 gutter-x py-14 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-16 lg:py-20">
        <div className="flex flex-col gap-4">
          <p className="inline-flex items-center gap-1.5 text-label font-medium text-brand">
            <Users className="size-3.5" strokeWidth={2.2} aria-hidden />
            Referral Program
          </p>
          <h2 id="referrals-title" className="text-title font-semibold text-balance">
            Earn 8% Recurring Commission for Every Referral
          </h2>
          <p className="text-body text-muted-foreground">
            Share CarouseLabs with your network. If they upgrade to Pro or Growth, you earn 8% of their subscription — every month, for as
            long as they stay subscribed. If they stay on the free plan, you get 50 bonus credits instead.
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <Link href="/sign-up" className={buttonVariants({ variant: "outline", size: "lg", className: "self-start" })}>
              Get Your Referral Link
              <ArrowRight aria-hidden />
            </Link>
            <p className="text-caption text-muted-foreground">Free to join — sign up to get your unique link.</p>
          </div>
        </div>
        <ul className="flex flex-col justify-center divide-y divide-border">
          {DIFFERENTIATORS.map((d) => (
            <li key={d.text} className="flex gap-3 py-4 text-body">
              <d.icon className="mt-0.5 size-5 shrink-0 text-muted-foreground" strokeWidth={1.8} aria-hidden />
              <span>{d.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
