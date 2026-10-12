import Link from "next/link"
import { ArrowRight, Calendar, Repeat, TrendingUp, ShieldCheck, ImageIcon } from "lucide-react"
import { AnimatedSection, AnimatedScale } from "@/components/marketing/AnimatedSection"

const DIFFERENTIATORS = [
  {
    icon: Calendar,
    text: "Visual calendar with drag-and-drop rescheduling",
  },
  {
    icon: Repeat,
    text: "Recurring slots — set it once, post every week automatically",
  },
  {
    icon: TrendingUp,
    text: "Smart best-time suggestions based on real engagement research",
  },
  {
    icon: ShieldCheck,
    text: "Automatic retries and failure alerts — never lose a scheduled post",
  },
]

export function ContentHubFeature() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-5xl mx-auto flex flex-col gap-14">
        <AnimatedSection className="flex flex-col gap-4 text-center items-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#E5E3DE] text-[12px] font-medium text-[#7C3AED]">
            <Calendar size={12} strokeWidth={2.2} />
            New — Content Hub
          </div>
          <h2 className="max-w-3xl text-[clamp(1.75rem,4vw,2.75rem)] font-bold tracking-[-0.02em] text-[#0A0A0A] leading-[1.15]">
            Plan Your Entire Content Calendar — Not Just One Post
          </h2>
          <p className="max-w-2xl text-[15px] text-[#6B7280] leading-[1.7]">
            Schedule posts weeks in advance, set up recurring slots, and let CarouseLabs publish
            automatically — while you focus on creating, not remembering to hit publish.
          </p>
        </AnimatedSection>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
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

        {/* Calendar mockup — placeholder until a real screenshot is provided.
            Swap this block for a real <Image> once one is available; keep
            the dashed border treatment only for genuinely missing content. */}
        <AnimatedSection>
          <div className="flex flex-col items-center gap-3 p-10 rounded-2xl border border-dashed border-[rgba(124,58,237,0.35)] bg-[rgba(124,58,237,0.03)] text-center">
            <div className="w-11 h-11 rounded-xl bg-[rgba(124,58,237,0.1)] flex items-center justify-center">
              <ImageIcon size={19} className="text-[#7C3AED]" strokeWidth={1.8} />
            </div>
            <p className="text-[14px] font-semibold text-[#0A0A0A]">Calendar preview coming soon</p>
            <p className="max-w-md text-[13px] text-[#9CA3AF] leading-[1.6]">
              A look at the Month/Week calendar — real post thumbnails, drag-and-drop rescheduling,
              and recurring slots at a glance.
            </p>
          </div>
        </AnimatedSection>

        <AnimatedSection className="flex flex-col items-center gap-3">
          <Link
            href="/content-hub"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-[15px] font-semibold text-white transition-colors shadow-[0_10px_30px_rgba(124,58,237,0.25)]"
          >
            Try Content Hub
            <ArrowRight size={16} strokeWidth={2.2} />
          </Link>
        </AnimatedSection>
      </div>
    </section>
  )
}
