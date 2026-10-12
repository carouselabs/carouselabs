import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { AnimatedSection } from "@/components/marketing/AnimatedSection"

export function CTA() {
  return (
    <section className="py-24 px-6">
      <AnimatedSection className="relative max-w-4xl mx-auto rounded-3xl border border-[#E5E3DE] bg-[#FFFDF8] px-8 py-16 sm:py-20 overflow-hidden text-center">
        <div className="relative flex flex-col items-center gap-7">
          <p className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-[0.2em]">
            One day or day one
          </p>
          <h2 className="max-w-2xl text-[clamp(2rem,5vw,3.25rem)] font-bold leading-[1.08] tracking-[-0.025em] text-[#0A0A0A]">
            Start creating content that actually gets noticed.
          </h2>
          <p className="max-w-md text-[16px] text-[#6B7280] leading-[1.6]">
            Join 1,000+ creators turning ideas into scroll-stopping posts — starting today.
          </p>
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[#1A1A1A] hover:bg-black text-[15px] font-semibold text-white transition-colors shadow-[0_8px_30px_rgba(0,0,0,0.14)]"
          >
            Get started free
            <ArrowRight size={16} strokeWidth={2.2} />
          </Link>
          <p className="text-[12px] text-[#9CA3AF]">No credit card required</p>
        </div>
      </AnimatedSection>
    </section>
  )
}
