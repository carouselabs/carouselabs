import { Lightbulb, PenLine, BookOpen, LayoutGrid, Share2, Download } from "lucide-react"
import { AnimatedSection, AnimatedScale } from "@/components/marketing/AnimatedSection"

const FEATURES = [
  {
    icon: Lightbulb,
    title: "AI Idea Engine",
    description:
      "Get 12 post ideas every session, grounded in trending news and shaped by your niche and goals.",
  },
  {
    icon: PenLine,
    title: "AI Ghostwriting",
    description:
      "Full-length captions written in your voice, with a tone selector and multiple hook variations.",
  },
  {
    icon: BookOpen,
    title: "Deep Dive Breakdowns",
    description:
      "Structured breakdowns — objective, emotion, talking points, storytelling angle, and CTA — for every post.",
  },
  {
    icon: LayoutGrid,
    title: "AI Carousels",
    description:
      "Multi-slide carousel decks with AI-generated visuals, sized perfectly for each platform.",
  },
  {
    icon: Share2,
    title: "Built for Every Platform",
    description:
      "Create and adapt content for LinkedIn, Instagram, and Twitter/X from a single workflow.",
  },
  {
    icon: Download,
    title: "Export & Publish",
    description:
      "Download PDF carousels, copy captions, and publish directly — one click away from going live.",
  },
]

export function FeaturesGrid() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-5xl mx-auto flex flex-col gap-16">
        <AnimatedSection className="flex flex-col gap-4 text-center">
          <p className="text-[11px] font-semibold text-[#1A1A1A] uppercase tracking-widest">
            Features
          </p>
          <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-bold tracking-[-0.02em] text-[#0A0A0A]">
            Everything you need to own social media
          </h2>
          <p className="max-w-xl mx-auto text-[15px] text-[#6B7280] leading-[1.65]">
            From idea to published post on LinkedIn, Instagram, and Twitter/X — CarouseLabs handles
            every step of your content workflow.
          </p>
        </AnimatedSection>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {FEATURES.map((f, i) => (
            <AnimatedScale
              key={f.title}
              delay={i * 0.08}
              className="flex items-start gap-4 p-6 rounded-2xl border border-[#E5E3DE] bg-[#FFFDF8] hover:border-[rgba(26,26,26,0.3)] transition-colors duration-200"
            >
              <div className="w-11 h-11 rounded-xl bg-[rgba(26,26,26,0.06)] border border-[rgba(26,26,26,0.14)] flex items-center justify-center flex-shrink-0">
                <f.icon size={19} className="text-[#1A1A1A]" strokeWidth={1.8} />
              </div>
              <div className="flex flex-col gap-1.5">
                <h3 className="text-[15px] font-semibold text-[#0A0A0A]">{f.title}</h3>
                <p className="text-[13px] text-[#6B7280] leading-[1.6]">{f.description}</p>
              </div>
            </AnimatedScale>
          ))}
        </div>
      </div>
    </section>
  )
}
