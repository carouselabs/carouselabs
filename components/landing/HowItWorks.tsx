import { Newspaper, PenLine, Images } from "lucide-react"
import { AnimatedSection } from "@/components/marketing/AnimatedSection"

const STEPS = [
  {
    number: "01",
    icon: Newspaper,
    title: "Get AI-powered ideas",
    description:
      "Start with fresh post ideas generated from trending news and tailored to your niche, audience, and goals.",
  },
  {
    number: "02",
    icon: PenLine,
    title: "Build your caption",
    description:
      "Turn any idea into a high-performing caption with AI ghostwriting that sounds like you — tone controls and hook variations included.",
  },
  {
    number: "03",
    icon: Images,
    title: "Generate images & carousels",
    description:
      "Produce stunning visuals and multi-slide carousels sized for each platform, then export and publish in a click.",
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 px-6">
      <div className="max-w-6xl mx-auto flex flex-col gap-16">
        <AnimatedSection className="flex flex-col gap-4 text-center">
          <p className="text-[11px] font-semibold text-[#1A1A1A] uppercase tracking-widest">
            How it works
          </p>
          <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-bold tracking-[-0.02em] text-[#0A0A0A]">
            From idea to published post
          </h2>
        </AnimatedSection>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map((step, i) => (
            <AnimatedSection
              key={step.number}
              delay={i * 0.1}
              className="flex flex-col gap-5 p-7 rounded-2xl border border-[#E5E3DE] bg-[#FFFDF8]"
            >
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl bg-[rgba(26,26,26,0.06)] border border-[rgba(26,26,26,0.14)] flex items-center justify-center">
                  <step.icon size={19} className="text-[#1A1A1A]" strokeWidth={1.9} />
                </div>
                <span className="text-[2.4rem] font-bold text-[#E5E3DE] leading-none tabular-nums">
                  {step.number}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-[16px] font-semibold text-[#0A0A0A]">{step.title}</h3>
                <p className="text-[13px] text-[#6B7280] leading-[1.65]">{step.description}</p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  )
}
