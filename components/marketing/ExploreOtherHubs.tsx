import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { AnimatedSection } from "@/components/marketing/AnimatedSection"

const ALL_HUBS = [
  { href: "/for", label: "Browse All Niches" },
  { href: "/vs", label: "Compare Tools" },
  { href: "/generators", label: "AI Tools" },
  { href: "/best", label: "Best Of Lists" },
  { href: "/answers", label: "Answers" },
  { href: "/formats", label: "Content Formats" },
] as const

/**
 * Renders a pill row linking to every SEO hub except `current`, so each hub
 * is always one click from every other hub (not just from the footer). Drop
 * this near the bottom of any hub page. `current` accepts any string so it
 * can also be dropped onto pages outside the 6 hubs (e.g. /ideas, /how-to)
 * to render the full unfiltered set of 6.
 */
export function ExploreOtherHubs({ current }: { current?: string }) {
  const hubs = ALL_HUBS.filter((h) => h.href !== current)

  return (
    <section className="px-6 py-12 border-t border-[#EEEBE3]">
      <div className="max-w-4xl mx-auto flex flex-col items-center gap-4">
        <span className="text-[12px] font-semibold text-[#9CA3AF] uppercase tracking-wide">
          Explore More Resources
        </span>
        <nav className="flex flex-wrap items-center justify-center gap-3">
          {hubs.map((h) => (
            <AnimatedSection key={h.href}>
              <Link
                href={h.href}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold text-[#7C3AED] bg-[#F3F0FF] hover:bg-[#EDE9FE] transition-colors"
              >
                {h.label}
                <ArrowRight size={13} strokeWidth={2.4} />
              </Link>
            </AnimatedSection>
          ))}
        </nav>
      </div>
    </section>
  )
}
