import Link from "next/link"
import { Check } from "lucide-react"
import { AnimatedSection } from "@/components/marketing/AnimatedSection"

const FREE_FEATURES = [
  "1 post lifetime",
  "10 idea generations",
  "Post breakdown",
  "Caption generation",
]

const PRO_FEATURES = [
  "Publish consistently every day",
  "Idea generation",
  "Post breakdown",
  "Caption generation",
  "AI carousel builder",
  "PDF export",
  "Priority support",
]

export function Pricing() {
  return (
    <section id="pricing" className="py-24 px-6">
      <div className="max-w-4xl mx-auto flex flex-col gap-16">
        <AnimatedSection className="flex flex-col gap-4 text-center">
          <p className="text-[11px] font-semibold text-[#1A1A1A] uppercase tracking-widest">
            Pricing
          </p>
          <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-bold tracking-[-0.02em] text-[#0A0A0A]">
            Simple, honest pricing
          </h2>
          <p className="max-w-sm mx-auto text-[15px] text-[#6B7280] leading-[1.65]">
            Start free. Upgrade when you&apos;re ready to publish consistently.
          </p>
        </AnimatedSection>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-start">
          {/* Free */}
          <AnimatedSection
            delay={0}
            className="flex flex-col gap-7 p-7 rounded-2xl border border-[#E5E3DE] bg-[#FFFDF8]"
          >
            <div className="flex flex-col gap-1">
              <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-widest">
                Free
              </p>
              <div className="flex items-end gap-1.5 mt-2">
                <span className="text-[2.6rem] font-bold text-[#0A0A0A] leading-none">$0</span>
                <span className="text-[13px] text-[#6B7280] pb-1.5">forever</span>
              </div>
            </div>

            <ul className="flex flex-col gap-3">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <Check size={13} className="text-[#9CA3AF] mt-0.5 flex-shrink-0" strokeWidth={2.5} />
                  <span className="text-[13px] text-[#374151]">{f}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl border border-[#E5E3DE] bg-[#FFFDF8] hover:bg-[#F3F1EB] text-[13px] font-semibold text-[#0A0A0A] transition-colors"
            >
              Get started free
            </Link>
          </AnimatedSection>

          {/* Pro */}
          <AnimatedSection
            delay={0.1}
            className="relative flex flex-col gap-7 p-7 rounded-2xl border-2 border-[#1A1A1A] bg-[#FFFDF8] shadow-[0_12px_40px_rgba(0,0,0,0.10)]"
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <p className="text-[11px] font-semibold text-[#1A1A1A] uppercase tracking-widest">
                  Pro
                </p>
                <span className="px-2 py-0.5 rounded-full bg-[#1A1A1A] text-[10px] font-semibold text-white">
                  Popular
                </span>
              </div>
              <div className="flex items-end gap-1.5 mt-2">
                <span className="text-[2.6rem] font-bold text-[#0A0A0A] leading-none">$24</span>
                <span className="text-[13px] text-[#6B7280] pb-1.5">/ month</span>
              </div>
              <p className="text-[11px] text-[#9CA3AF] mt-0.5">Billed monthly · cancel anytime</p>
            </div>

            <ul className="flex flex-col gap-3">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <Check size={13} className="text-[#1A1A1A] mt-0.5 flex-shrink-0" strokeWidth={2.5} />
                  <span className="text-[13px] text-[#374151]">{f}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[#1A1A1A] hover:bg-black text-[13px] font-semibold text-white transition-colors shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
            >
              Start with Pro
            </Link>
          </AnimatedSection>
        </div>
      </div>
    </section>
  )
}
