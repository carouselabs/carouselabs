import Link from "next/link"
import { ArrowRight, Gift, Link2, Repeat, Users } from "lucide-react"

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

/**
 * The referral offer: the words on the left, its two real figures on the
 * right (they roll once like an odometer when they come on screen: the
 * taste skill's counter-rolls moment, public/assets/moments). Copy unchanged
 * apart from the two figure labels, which restate the paragraph.
 */
export function ReferralFeature() {
  return (
    <section id="referrals" aria-labelledby="referrals-title" className="scroll-mt-24 bg-surface font-ui">
      <div className="wrap-site grid gap-14 py-24 lg:grid-cols-12 lg:gap-6 lg:py-[120px]">
        <div className="flex flex-col gap-5 lg:col-span-6">
          <p className="inline-flex items-center gap-1.5 self-start rounded-full bg-brand-soft px-3 py-1 text-[13px] font-medium text-brand">
            <Users className="size-3.5" strokeWidth={2.2} aria-hidden />
            Referral Program
          </p>
          <h2 id="referrals-title" className="text-[clamp(2rem,1.1rem+2.5vw,3.25rem)] leading-[1.02] font-semibold tracking-[-0.04em] text-balance">
            Earn <span className="serif-accent gradient-word pr-[0.04em] text-[1.08em]">8% Recurring Commission</span> for Every Referral
          </h2>
          <p className="max-w-[34rem] text-lg leading-[1.6] text-ink-2">
            Share CarouseLabs with your network. If they upgrade to Pro or Growth, you earn 8% of their subscription — every month, for as
            long as they stay subscribed. If they stay on the free plan, you get 50 bonus credits instead.
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <Link
              href="/sign-up"
              className="btn-nudge inline-flex h-14 items-center gap-2 self-start rounded-full border border-control-border bg-surface px-7 text-base font-medium text-foreground transition-[translate,background-color] duration-200 hover:-translate-y-0.5 hover:bg-surface-muted active:translate-y-0 active:scale-[0.97] motion-reduce:hover:translate-y-0"
            >
              Get Your Referral Link
              <ArrowRight aria-hidden className="nudge size-4" />
            </Link>
            <p className="text-[14px] text-muted-foreground">Free to join — sign up to get your unique link.</p>
          </div>
        </div>

        <div className="flex flex-col gap-10 lg:col-span-6">
          <div data-moment="counter-rolls" data-moment-opts='{"duration": 1500}' className="grid grid-cols-2 gap-6">
            <div className="flex flex-col gap-3">
              <p className="t-stat font-display text-[clamp(2rem,1.1rem+2.5vw,3.25rem)] leading-none tracking-[-0.02em] text-brand">8%</p>
              <p className="text-base text-ink-2">recurring commission, every month</p>
            </div>
            <div className="flex flex-col gap-3">
              <p className="t-stat font-display text-[clamp(2rem,1.1rem+2.5vw,3.25rem)] leading-none tracking-[-0.02em] text-foreground">50</p>
              <p className="text-base text-ink-2">bonus credits on the free plan</p>
            </div>
          </div>
          <ul className="flex flex-col">
            {DIFFERENTIATORS.map((d) => (
              <li key={d.text} className="flex gap-4 border-t border-border py-5 text-base leading-[1.5]">
                <span className="grid size-9 shrink-0 place-items-center rounded-[12px] bg-brand-soft">
                  <d.icon className="size-4 text-brand" strokeWidth={1.9} aria-hidden />
                </span>
                <span className="pt-1.5">{d.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
