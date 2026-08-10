import Link from "next/link"
import { ArrowRight, Wand2, Trophy, MessageCircleQuestion, LayoutGrid, Users, Scale, Lightbulb, BookOpen, Timer } from "lucide-react"
import { AnimatedSection, AnimatedScale } from "@/components/marketing/AnimatedSection"
import { niches } from "@/app/(marketing)/for/data"
import { competitors } from "@/app/(marketing)/vs/data"
import { GENERATOR_PAGES } from "@/app/(marketing)/generators/data"
import { BEST_OF_PAGES } from "@/app/(marketing)/best/data"
import { ANSWER_PAGES } from "@/app/(marketing)/answers/data"
import { FORMAT_PAGES } from "@/app/(marketing)/formats/data"
import { FORMAT_LABELS } from "@/app/(marketing)/formats/types"
import { SPEED_PAGES } from "@/app/(marketing)/speed/data"

const NICHE_SLUGS = [
  "saas-founders",
  "business-coaches",
  "digital-marketers",
  "content-creators",
  "freelancers",
  "startup-founders",
]

const COMPARE_SLUGS = ["taplio", "supergrow", "canva", "chatgpt", "postnitro"]

const AI_TOOL_SLUGS = [
  "linkedin-carousel-maker",
  "ai-caption-generator",
  "linkedin-post-generator",
  "ai-image-generator-for-linkedin",
  "free-linkedin-carousel-maker",
  "linkedin-post-ideas-generator",
]

const BEST_OF_SLUGS = [
  "best-ai-tools-for-linkedin-carousels",
  "best-linkedin-carousel-generators",
  "best-free-linkedin-carousel-tools",
  "best-ai-caption-generators",
]

const ANSWER_SLUGS = [
  "best-time-to-post-on-linkedin-2026",
  "how-to-write-a-linkedin-hook",
  "linkedin-carousel-dimensions",
  "how-to-make-a-linkedin-carousel-without-canva",
  "can-ai-write-good-linkedin-content",
  "how-often-should-i-post-on-linkedin",
]

const FORMAT_SLUGS = [
  "carousel-ideas-for-networking",
  "hook-examples-for-networking",
  "content-calendar-for-networking",
  "caption-examples-for-networking",
]

const SPEED_SLUGS = [
  "carousel-in-5-minutes-for-saas-founders",
  "caption-in-5-minutes-for-real-estate-investors",
  "hook-in-5-minutes-for-real-estate-investors",
  "post-ideas-in-5-minutes-for-saas-founders",
]

const nicheBySlug = new Map(niches.map((n) => [n.slug, n]))
const competitorBySlug = new Map(competitors.map((c) => [c.slug, c]))
const generatorBySlug = new Map(GENERATOR_PAGES.map((p) => [p.slug, p]))
const bestOfBySlug = new Map(BEST_OF_PAGES.map((p) => [p.slug, p]))
const answerBySlug = new Map(ANSWER_PAGES.map((p) => [p.slug, p]))
const formatBySlug = new Map(FORMAT_PAGES.map((p) => [p.slug, p]))
const speedBySlug = new Map(SPEED_PAGES.map((p) => [p.slug, p]))

const COLUMNS = [
  {
    icon: Users,
    title: "For Your Niche",
    description: "Content strategy, ideas, and messaging tailored to your profession.",
    seeAllHref: "/for",
    seeAllLabel: "Browse all niches",
    links: NICHE_SLUGS.map((slug) => {
      const niche = nicheBySlug.get(slug)
      return niche ? { href: `/for/${niche.slug}`, label: niche.name } : null
    }).filter((l): l is { href: string; label: string } => Boolean(l)),
  },
  {
    icon: Lightbulb,
    title: "Carousel Ideas",
    description: "10 proven carousel ideas and a content calendar for your profession.",
    seeAllHref: "/ideas",
    seeAllLabel: "Browse all idea guides",
    links: NICHE_SLUGS.map((slug) => {
      const niche = nicheBySlug.get(slug)
      return niche ? { href: `/ideas/${niche.slug}`, label: niche.name } : null
    }).filter((l): l is { href: string; label: string } => Boolean(l)),
  },
  {
    icon: BookOpen,
    title: "How-To Guides",
    description: "Step-by-step guides to building a LinkedIn presence in your field.",
    seeAllHref: "/how-to",
    seeAllLabel: "Browse all guides",
    links: NICHE_SLUGS.map((slug) => {
      const niche = nicheBySlug.get(slug)
      return niche ? { href: `/how-to/${niche.slug}`, label: niche.name } : null
    }).filter((l): l is { href: string; label: string } => Boolean(l)),
  },
  {
    icon: Wand2,
    title: "AI Tools",
    description: "Generate captions, images, and carousels from a single idea.",
    seeAllHref: "/generators",
    seeAllLabel: "Browse all AI tools",
    links: AI_TOOL_SLUGS.map((slug) => {
      const page = generatorBySlug.get(slug)
      return page ? { href: `/generators/${page.slug}`, label: page.keyword } : null
    }).filter((l): l is { href: string; label: string } => Boolean(l)),
  },
  {
    icon: Trophy,
    title: "Best Of",
    description: "Independently ranked leaderboards for every LinkedIn content tool category.",
    seeAllHref: "/best",
    seeAllLabel: "See all rankings",
    links: BEST_OF_SLUGS.map((slug) => {
      const page = bestOfBySlug.get(slug)
      return page ? { href: `/best/${page.slug}`, label: page.title } : null
    }).filter((l): l is { href: string; label: string } => Boolean(l)),
  },
  {
    icon: MessageCircleQuestion,
    title: "Quick Answers",
    description: "Direct answers to the most common LinkedIn content questions.",
    seeAllHref: "/answers",
    seeAllLabel: "Browse all answers",
    links: ANSWER_SLUGS.map((slug) => {
      const page = answerBySlug.get(slug)
      return page ? { href: `/answers/${page.slug}`, label: page.question } : null
    }).filter((l): l is { href: string; label: string } => Boolean(l)),
  },
  {
    icon: LayoutGrid,
    title: "Content Formats",
    description: "Ready-to-use carousel ideas, hooks, captions, and calendars by topic.",
    seeAllHref: "/formats",
    seeAllLabel: "Browse all formats",
    links: FORMAT_SLUGS.map((slug) => {
      const page = formatBySlug.get(slug)
      return page
        ? { href: `/formats/${page.slug}`, label: `${FORMAT_LABELS[page.formatType]} — ${page.topic}` }
        : null
    }).filter((l): l is { href: string; label: string } => Boolean(l)),
  },
  {
    icon: Timer,
    title: "Speed",
    description: "Carousels, captions, hooks, and more — done in 5 minutes, matched to your brand.",
    seeAllHref: "/speed",
    seeAllLabel: "Browse all speed pages",
    links: SPEED_SLUGS.map((slug) => {
      const page = speedBySlug.get(slug)
      return page ? { href: `/speed/${page.slug}`, label: page.headline } : null
    }).filter((l): l is { href: string; label: string } => Boolean(l)),
  },
  {
    icon: Scale,
    title: "Compare",
    description: "Honest, head-to-head comparisons against every major competitor.",
    seeAllHref: "/vs",
    seeAllLabel: "See all comparisons",
    links: COMPARE_SLUGS.map((slug) => {
      const competitor = competitorBySlug.get(slug)
      return competitor ? { href: `/vs/${competitor.slug}`, label: `vs ${competitor.name}` } : null
    }).filter((l): l is { href: string; label: string } => Boolean(l)),
  },
]

export function ExploreResources() {
  return (
    <section className="py-24 px-6 bg-[#FBFAF6]">
      <div className="max-w-6xl mx-auto flex flex-col gap-16">
        <AnimatedSection className="flex flex-col gap-4 text-center">
          <p className="text-[11px] font-semibold text-[#1A1A1A] uppercase tracking-widest">
            Resources
          </p>
          <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-bold tracking-[-0.02em] text-[#0A0A0A]">
            Explore Our Resources
          </h2>
          <p className="max-w-xl mx-auto text-[15px] text-[#6B7280] leading-[1.65]">
            Free tools, independent rankings, and straight answers — everything we&apos;ve built to
            help you publish better LinkedIn content.
          </p>
        </AnimatedSection>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {COLUMNS.map((column, ci) => (
            <AnimatedScale
              key={column.title}
              delay={ci * 0.08}
              className="flex flex-col gap-5 p-6 rounded-2xl border border-[#E5E3DE] bg-white"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EDE9FE] flex items-center justify-center flex-shrink-0">
                  <column.icon size={17} className="text-[#7C3AED]" strokeWidth={2} />
                </div>
                <div className="flex flex-col gap-1 pt-0.5">
                  <h3 className="text-[15px] font-semibold text-[#0A0A0A]">{column.title}</h3>
                  <p className="text-[12.5px] text-[#6B7280] leading-[1.5]">{column.description}</p>
                </div>
              </div>

              <nav className="flex flex-col gap-2.5 border-t border-[#EEEBE3] pt-4">
                {column.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-[13px] text-[#3F3F46] hover:text-[#7C3AED] transition-colors leading-snug"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              <Link
                href={column.seeAllHref}
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#7C3AED] hover:text-[#6D28D9] transition-colors mt-auto"
              >
                {column.seeAllLabel}
                <ArrowRight size={13} strokeWidth={2.2} />
              </Link>
            </AnimatedScale>
          ))}
        </div>
      </div>
    </section>
  )
}
