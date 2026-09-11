import Link from "next/link"
import { ArrowRight, Link2, Repeat, Gift, Users } from "lucide-react"
import { AnimatedSection, AnimatedScale } from "@/components/marketing/AnimatedSection"

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

export function ReferralFeature() {
  return (
    <section id="referrals" className="py-24 px-6">
      <div className="max-w-5xl mx-auto flex flex-col gap-14">
        <AnimatedSection className="flex flex-col gap-4 text-center items-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#E5E3DE] text-[12px] font-medium text-[#7C3AED]">
            <Users size={12} strokeWidth={2.2} />
            Referral Program
          </div>
          <h2 className="max-w-3xl text-[clamp(1.75rem,4vw,2.75rem)] font-bold tracking-[-0.02em] text-[#0A0A0A] leading-[1.15]">
            Earn 8% Recurring Commission for Every Referral
          </h2>
          <p className="max-w-2xl text-[15px] text-[#6B7280] leading-[1.7]">
            Share CarouseLabs with your network. If they upgrade to Pro or Growth, you earn 8% of
            their subscription — every month, for as long as they stay subscribed. If they stay on
            the free plan, you get 50 bonus credits instead.
          </p>
        </AnimatedSection>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {DIFFERENTIATORS.map((d, i) => (
            <AnimatedScale
              key={d.text}
              delay={i * 0.08}
              className="flex flex-col items-start gap-4 p-6 rounded-2xl border border-[#E5E3DE] bg-white"
            >
              <div className="w-11 h-11 rounded-xl bg-[#EDE9FE] flex items-center justify-center flex-shrink-0">
                <d.icon size={19} className="text-[#7C3AED]" strokeWidth={1.8} />
              </div>
              <p className="text-[14px] text-[#3F3F46] leading-[1.6]">{d.text}</p>
            </AnimatedScale>
          ))}
        </div>

        <AnimatedSection className="flex flex-col items-center gap-3">
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-[15px] font-semibold text-white transition-colors shadow-[0_10px_30px_rgba(124,58,237,0.25)]"
          >
            Get Your Referral Link
            <ArrowRight size={16} strokeWidth={2.2} />
          </Link>
          <p className="text-[12.5px] text-[#9CA3AF]">Free to join — sign up to get your unique link.</p>
        </AnimatedSection>
      </div>
    </section>
  )
}
