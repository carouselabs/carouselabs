import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { AnimatedFadeIn } from "@/components/marketing/AnimatedSection"
import { getFeaturedTapHoldArticles } from "@/app/(marketing)/tap-hold/data"
import { GENERATOR_PAGES } from "@/app/(marketing)/generators/data"
import { BEST_OF_PAGES } from "@/app/(marketing)/best/data"
import { ANSWER_PAGES } from "@/app/(marketing)/answers/data"
import { FORMAT_PAGES } from "@/app/(marketing)/formats/data"
import { FORMAT_LABELS } from "@/app/(marketing)/formats/types"
import { SPEED_PAGES } from "@/app/(marketing)/speed/data"

const FOOTER_LINKS = [
  { href: "/#pricing", label: "Pricing" },
  { href: "/#contact", label: "Contact" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/refund", label: "Refund" },
]

const NICHE_LINKS = [
  { href: "/for/saas-founders", label: "SaaS Founders" },
  { href: "/for/business-coaches", label: "Business Coaches" },
  { href: "/for/digital-marketers", label: "Digital Marketers" },
  { href: "/for/content-creators", label: "Content Creators" },
  { href: "/for/freelancers", label: "Freelancers" },
  { href: "/for/startup-founders", label: "Startup Founders" },
  { href: "/for/social-media-managers", label: "Social Media Managers" },
  { href: "/for/copywriters", label: "Copywriters" },
  { href: "/for/real-estate-agents", label: "Real Estate Agents" },
  { href: "/for/personal-trainers", label: "Personal Trainers" },
]

// Derived from NICHE_LINKS (same 10 niches, different destination route) so
// these two groups never drift out of sync with the niche list above.
const IDEAS_LINKS = NICHE_LINKS.map((l) => ({
  href: l.href.replace("/for/", "/ideas/"),
  label: l.label,
}))
const HOW_TO_LINKS = NICHE_LINKS.map((l) => ({
  href: l.href.replace("/for/", "/how-to/"),
  label: l.label,
}))

const COMPARE_LINKS = [
  { href: "/vs/taplio", label: "vs Taplio" },
  { href: "/vs/supergrow", label: "vs Supergrow" },
  { href: "/vs/canva", label: "vs Canva" },
  { href: "/vs/chatgpt", label: "vs ChatGPT" },
  { href: "/vs/postnitro", label: "vs PostNitro" },
]

// Data-driven — pulled from the /tap-hold SEO article set, not hardcoded, so
// this list stays in sync as articles are added or reworded.
const TAP_HOLD_LINKS = [
  { href: "/tools/tap-hold-maker", label: "Tap & Hold Maker (Free)" },
  ...getFeaturedTapHoldArticles().map((article) => ({
    href: `/tap-hold/${article.slug}`,
    label: article.h1,
  })),
]

// AI Tools / Best Of / Answers link groups are pulled from their respective
// data files rather than hardcoded, so labels stay accurate as those SEO
// systems grow or get reworded.
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

// One page per format type, all on the "networking" topic, as a
// representative cross-section of the /formats system.
const FORMAT_SLUGS = [
  "carousel-ideas-for-networking",
  "caption-examples-for-networking",
  "hook-examples-for-networking",
  "post-ideas-for-networking",
  "content-calendar-for-networking",
  "linkedin-post-examples-for-networking",
]

// One page per format type, all for SaaS founders or real-estate investors, as
// a representative cross-section of the /speed system.
const SPEED_SLUGS = [
  "carousel-in-5-minutes-for-saas-founders",
  "caption-in-5-minutes-for-real-estate-investors",
  "hook-in-5-minutes-for-real-estate-investors",
  "content-calendar-in-5-minutes-for-saas-founders",
  "post-ideas-in-5-minutes-for-saas-founders",
  "image-in-5-minutes-for-saas-founders",
]

const generatorBySlug = new Map(GENERATOR_PAGES.map((p) => [p.slug, p]))
const bestOfBySlug = new Map(BEST_OF_PAGES.map((p) => [p.slug, p]))
const answerBySlug = new Map(ANSWER_PAGES.map((p) => [p.slug, p]))
const formatBySlug = new Map(FORMAT_PAGES.map((p) => [p.slug, p]))
const speedBySlug = new Map(SPEED_PAGES.map((p) => [p.slug, p]))

const FORMAT_LINKS = FORMAT_SLUGS.map((slug) => {
  const page = formatBySlug.get(slug)
  return page
    ? { href: `/formats/${page.slug}`, label: `${FORMAT_LABELS[page.formatType]} — ${page.topic}` }
    : null
}).filter((l): l is { href: string; label: string } => Boolean(l))

const AI_TOOL_LINKS = AI_TOOL_SLUGS.map((slug) => {
  const page = generatorBySlug.get(slug)
  return page ? { href: `/generators/${page.slug}`, label: page.keyword } : null
}).filter((l): l is { href: string; label: string } => Boolean(l))

const BEST_OF_LINKS = BEST_OF_SLUGS.map((slug) => {
  const page = bestOfBySlug.get(slug)
  return page ? { href: `/best/${page.slug}`, label: page.title } : null
}).filter((l): l is { href: string; label: string } => Boolean(l))

const ANSWER_LINKS = ANSWER_SLUGS.map((slug) => {
  const page = answerBySlug.get(slug)
  return page ? { href: `/answers/${page.slug}`, label: page.question } : null
}).filter((l): l is { href: string; label: string } => Boolean(l))

const SPEED_LINKS = SPEED_SLUGS.map((slug) => {
  const page = speedBySlug.get(slug)
  return page ? { href: `/speed/${page.slug}`, label: page.headline } : null
}).filter((l): l is { href: string; label: string } => Boolean(l))

// The 9 link groups below render in a responsive grid (1 col mobile, 2 cols
// tablet, 3 cols desktop — so 3 rows of 3 rather than a single tall stack).
const LINK_GROUPS = [
  { heading: "For Your Niche", links: NICHE_LINKS, viewAllHref: "/for" },
  { heading: "Carousel Ideas", links: IDEAS_LINKS, viewAllHref: "/ideas" },
  { heading: "How-To Guides", links: HOW_TO_LINKS, viewAllHref: "/how-to" },
  { heading: "AI Tools", links: AI_TOOL_LINKS, viewAllHref: "/generators" },
  { heading: "Best Of", links: BEST_OF_LINKS, viewAllHref: "/best" },
  { heading: "Answers", links: ANSWER_LINKS, viewAllHref: "/answers" },
  { heading: "Compare", links: COMPARE_LINKS, viewAllHref: "/vs" },
  { heading: "Content Formats", links: FORMAT_LINKS, viewAllHref: "/formats" },
  { heading: "Speed", links: SPEED_LINKS, viewAllHref: "/speed" },
  { heading: "Tap & Hold Guides", links: TAP_HOLD_LINKS, viewAllHref: "/tap-hold" },
]

export function Footer() {
  return (
    <footer className="py-12 px-6 border-t border-[#E5E3DE] bg-[#F9F7F2]">
      <AnimatedFadeIn className="max-w-6xl mx-auto flex flex-col gap-10">
        {/* Hub links — reachable from every marketing page, so crawlers can
            always get to the full niche and comparison indexes in one hop. */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pb-8 border-b border-[#E5E3DE]">
          <Link
            href="/for"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold text-[#7C3AED] bg-[#F3F0FF] hover:bg-[#EDE9FE] transition-colors"
          >
            Browse All Niches
            <ArrowRight size={13} strokeWidth={2.4} />
          </Link>
          <Link
            href="/tools"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold text-[#7C3AED] bg-[#F3F0FF] hover:bg-[#EDE9FE] transition-colors"
          >
            AI Tools by Niche
            <ArrowRight size={13} strokeWidth={2.4} />
          </Link>
          <Link
            href="/vs"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold text-[#7C3AED] bg-[#F3F0FF] hover:bg-[#EDE9FE] transition-colors"
          >
            Compare Tools
            <ArrowRight size={13} strokeWidth={2.4} />
          </Link>
          <Link
            href="/best"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold text-[#7C3AED] bg-[#F3F0FF] hover:bg-[#EDE9FE] transition-colors"
          >
            Best Of Lists
            <ArrowRight size={13} strokeWidth={2.4} />
          </Link>
          <Link
            href="/answers"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold text-[#7C3AED] bg-[#F3F0FF] hover:bg-[#EDE9FE] transition-colors"
          >
            Answers
            <ArrowRight size={13} strokeWidth={2.4} />
          </Link>
          <Link
            href="/formats"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold text-[#7C3AED] bg-[#F3F0FF] hover:bg-[#EDE9FE] transition-colors"
          >
            Content Formats
            <ArrowRight size={13} strokeWidth={2.4} />
          </Link>
          <Link
            href="/speed"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold text-[#7C3AED] bg-[#F3F0FF] hover:bg-[#EDE9FE] transition-colors"
          >
            Speed
            <ArrowRight size={13} strokeWidth={2.4} />
          </Link>
        </div>

        {/* Link groups — 3 rows of 3 columns on desktop instead of one long
            vertical stack, now that there are 9 groups instead of 7. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10 pb-8 border-b border-[#E5E3DE]">
          {LINK_GROUPS.map((group) => (
            <div key={group.heading} className="flex flex-col items-start gap-3">
              <span className="text-[13px] font-semibold text-[#0A0A0A]">{group.heading}</span>
              <nav className="flex flex-col items-start gap-2">
                {group.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-[12px] text-[#6B7280] hover:text-[#7C3AED] transition-colors leading-snug"
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  href={group.viewAllHref}
                  className="text-[12px] font-semibold text-[#7C3AED] hover:text-[#6D28D9] transition-colors"
                >
                  View all {"→"}
                </Link>
              </nav>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/favicon.ico" alt="CarouseLabs" className="w-6 h-6 rounded-md object-cover" />
            <span className="text-[14px] font-semibold text-[#0A0A0A]">CarouseLabs</span>
          </Link>

          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-[12px] text-[#6B7280] hover:text-[#1A1A1A] transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-[#E5E3DE]">
          <p className="text-[11px] text-[#9CA3AF]">© 2026 CarouseLabs. All rights reserved.</p>
          <a
            href="mailto:support@carouselabs.com"
            className="text-[11px] text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
          >
            support@carouselabs.com
          </a>
        </div>
      </AnimatedFadeIn>
    </footer>
  )
}
