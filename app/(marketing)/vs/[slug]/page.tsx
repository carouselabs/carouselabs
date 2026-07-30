import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { notFound } from "next/navigation"
import {
  ArrowRight,
  Check,
  X,
  Info,
  CheckCircle2,
  Scale,
  DollarSign,
  Layers,
  Sparkles,
  Swords,
} from "lucide-react"
import {
  AnimatedSection,
  AnimatedFadeIn,
  AnimatedSlideLeft,
  AnimatedSlideRight,
} from "@/components/marketing/AnimatedSection"
import { competitors, getRelatedCompetitors, type Competitor } from "../data"
import { niches } from "../../for/data"

const SIGNUP_URL = "https://carouselabs.com/signup"

const bySlug = new Map<string, Competitor>(competitors.map((c) => [c.slug, c]))

function getCompetitor(slug: string): Competitor | undefined {
  return bySlug.get(slug)
}

/**
 * Resolve a niche slug to its `{ slug, name }` for internal linking. Throws at
 * build time on an unknown slug so a typo can never ship as a broken link.
 */
function nicheLink(slug: string): { slug: string; name: string } {
  const niche = niches.find((n) => n.slug === slug)
  if (!niche) {
    throw new Error(
      `Unknown niche slug "${slug}" referenced in vs/[slug] internal links`,
    )
  }
  return { slug: niche.slug, name: niche.name }
}

/** Top 6 niche pages surfaced from every comparison page. */
const POPULAR_NICHES = [
  "saas-founders",
  "business-coaches",
  "digital-marketers",
  "content-creators",
  "freelancers",
  "startup-founders",
].map(nicheLink)

/** Top 3 how-to guides surfaced from every comparison page. */
const POPULAR_GUIDES = [
  "saas-founders",
  "business-coaches",
  "digital-marketers",
].map(nicheLink)

// Only the slugs in `competitors` are valid; any other /vs/* path 404s.
export const dynamicParams = false

export function generateStaticParams() {
  return competitors.map((c) => ({ slug: c.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const competitor = getCompetitor(slug)
  if (!competitor) return {}

  return {
    title: competitor.seo_title,
    description: competitor.seo_description,
    alternates: { canonical: `https://carouselabs.com/vs/${competitor.slug}` },
    openGraph: {
      title: competitor.seo_title,
      description: competitor.seo_description,
      url: `https://carouselabs.com/vs/${competitor.slug}`,
      type: "article",
      images: [
        {
          url: "/images/carouselabs-landing.png",
          width: 1920,
          height: 957,
          alt: `CarouseLabs vs ${competitor.name}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: competitor.seo_title,
      description: competitor.seo_description,
      images: ["/images/carouselabs-landing.png"],
    },
  }
}

/** FAQ structured data (rendered as JSON-LD in the page). */
function buildFaqJsonLd(competitor: Competitor) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: competitor.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  }
}

/** Render a comparison-cell value: green check / red X for booleans, text otherwise. */
function ComparisonCell({
  value,
  positive,
}: {
  value: string | boolean
  positive: boolean
}) {
  if (typeof value === "boolean") {
    return value ? (
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#E7F6EC]">
        <Check size={17} className="text-[#15803D]" strokeWidth={3} />
      </span>
    ) : (
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#FDECEC]">
        <X size={17} className="text-[#DC2626]" strokeWidth={3} />
      </span>
    )
  }
  return (
    <span
      className={`text-[13.5px] font-medium ${
        positive ? "text-[#15803D]" : "text-[#4B5563]"
      }`}
    >
      {value}
    </span>
  )
}

/** A small circular "VS" / "OR" badge meant to overlap the seam of a split layout. */
function SplitBadge({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white border-[3px] border-[#F3F0FF] shadow-[0_8px_24px_rgba(10,10,10,0.16)] flex items-center justify-center">
        <span className="text-[13px] sm:text-[14px] font-extrabold text-[#7C3AED] tracking-tight">
          {label}
        </span>
      </div>
    </div>
  )
}

export default async function CompetitorVsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const competitor = getCompetitor(slug)
  if (!competitor) notFound()

  const faqJsonLd = buildFaqJsonLd(competitor)

  // Related comparisons for internal linking (same category, 3 max).
  const relatedCompetitors = getRelatedCompetitors(slug, 3)

  // Quick-stat strip
  const platformsStat = competitor.feature_comparison.some((r) =>
    /instagram|multi-platform|twitter/i.test(r.feature),
  )
    ? "LinkedIn, Instagram, X"
    : "LinkedIn-first"

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* ── SECTION 1 — HERO: head-to-head split panels with a VS badge ── */}
      <section className="relative px-6 pt-16 pb-14 sm:pt-20 sm:pb-16 bg-white overflow-hidden">
        <div className="relative z-10 max-w-3xl mx-auto text-center flex flex-col items-center gap-5 pb-11 sm:pb-12">
          <AnimatedSection delay={0}>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F3F0FF] text-[12px] font-medium text-[#7C3AED]">
              <Swords size={12} strokeWidth={2.2} />
              Head-to-Head Comparison
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.05}>
            <h1 className="text-[clamp(2.1rem,5vw,3.2rem)] font-extrabold leading-[1.1] tracking-[-0.03em] text-[#0A0A0A]">
              {competitor.hero_headline}
            </h1>
          </AnimatedSection>

          <AnimatedSection delay={0.1}>
            <p className="max-w-2xl text-[17px] text-[#4B5563] leading-[1.65]">
              {competitor.hero_subheadline}
            </p>
          </AnimatedSection>
        </div>

        <div className="relative max-w-4xl mx-auto">
          <div className="relative flex flex-col sm:flex-row rounded-3xl overflow-hidden border border-[#E5E3DE] shadow-[0_20px_60px_rgba(10,10,10,0.10)]">
            <AnimatedSlideLeft
              delay={0.1}
              className="flex-1 flex flex-col items-center gap-3 px-8 py-11 sm:py-14 text-center bg-gradient-to-br from-[#7C3AED] to-[#5B21B6]"
            >
              <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/70">
                CarouseLabs
              </span>
              <span className="text-[14.5px] font-medium text-white/90 max-w-[220px]">
                AI carousel &amp; content studio
              </span>
              <span className="text-[32px] sm:text-[36px] font-extrabold tracking-[-0.02em] text-white">
                {competitor.our_price}
              </span>
              <span className="inline-flex items-center gap-1.5 mt-1 px-3 py-1.5 rounded-full bg-white/15 text-[12px] font-medium text-white leading-snug max-w-[260px]">
                <Sparkles size={12} strokeWidth={2.2} className="shrink-0" />
                {competitor.carouselabs_advantages[0]}
              </span>
            </AnimatedSlideLeft>

            <AnimatedSlideRight
              delay={0.1}
              className="flex-1 flex flex-col items-center gap-3 px-8 py-11 sm:py-14 text-center bg-[#FBFAF6]"
            >
              <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#9CA3AF]">
                {competitor.name}
              </span>
              <span className="text-[14.5px] font-medium text-[#6B7280] max-w-[220px]">
                {competitor.tagline}
              </span>
              <span className="text-[32px] sm:text-[36px] font-extrabold tracking-[-0.02em] text-[#0A0A0A]">
                {competitor.price}
              </span>
              <span className="inline-flex items-center gap-1.5 mt-1 px-3 py-1.5 rounded-full bg-[#EEEBE3] text-[12px] font-medium text-[#4B5563] leading-snug max-w-[260px]">
                <Info size={12} strokeWidth={2.2} className="shrink-0" />
                {competitor.competitor_strengths[0]}
              </span>
            </AnimatedSlideRight>
          </div>

          <SplitBadge label="VS" />
        </div>
      </section>

      {/* ── SECTION 2 — QUICK VERDICT (answers-style snippet callout) + stat strip ── */}
      <section className="px-6 pb-16 sm:pb-20">
        <div className="max-w-3xl mx-auto flex flex-col gap-6">
          <AnimatedSection>
            <div className="border-l-[3px] border-[#7C3AED] bg-[#F7F5FF] rounded-r-xl px-6 py-6 sm:px-7 sm:py-7">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-[#7C3AED] mb-2.5">
                The Quick Verdict
              </span>
              <p className="text-[17px] sm:text-[18px] font-semibold leading-[1.55] text-[#0A0A0A]">
                {competitor.verdict}
              </p>
            </div>
          </AnimatedSection>

          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                icon: <DollarSign size={17} className="text-[#7C3AED]" strokeWidth={2.2} />,
                label: "Monthly price",
                value: `${competitor.our_price} vs ${competitor.price}`,
              },
              {
                icon: <Layers size={17} className="text-[#7C3AED]" strokeWidth={2.2} />,
                label: "Platforms",
                value: platformsStat,
              },
              {
                icon: <Sparkles size={17} className="text-[#7C3AED]" strokeWidth={2.2} />,
                label: "Key advantage",
                value: competitor.carouselabs_advantages[0],
              },
            ].map((stat, i) => (
              <AnimatedSection key={stat.label} delay={0.05 + i * 0.05}>
                <div className="h-full flex flex-col gap-2.5 p-4 rounded-xl border border-[#E5E3DE] bg-white">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#F3F0FF] flex items-center justify-center shrink-0">
                      {stat.icon}
                    </div>
                    <span className="text-[11.5px] font-semibold uppercase tracking-wide text-[#6B7280]">
                      {stat.label}
                    </span>
                  </div>
                  <span className="text-[13.5px] leading-[1.45] font-semibold text-[#0A0A0A]">
                    {stat.value}
                  </span>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── OVERVIEW — educational intro prose ── */}
      <section className="px-6 pb-16 sm:pb-20">
        <div className="max-w-3xl mx-auto flex flex-col gap-5">
          <AnimatedSection>
            <h2 className="text-[clamp(1.5rem,3.2vw,2rem)] font-bold tracking-[-0.02em] text-[#0A0A0A]">
              CarouseLabs vs {competitor.name}: The Overview
            </h2>
          </AnimatedSection>
          {[...competitor.overview.split("\n\n"), competitor.deep_dive].map((para, i) => (
            <AnimatedSection key={i} delay={0.05 + i * 0.05}>
              <p className="text-[17px] leading-[1.75] text-[#3F3F46]">{para}</p>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* ── SECTION 3 — FEATURE COMPARISON: sticky-header table ── */}
      <section className="px-6 py-16 sm:py-20 bg-[#FBFAF6]">
        <div className="max-w-4xl mx-auto flex flex-col gap-10">
          <AnimatedSection className="text-center">
            <h2 className="text-[clamp(1.8rem,4vw,2.75rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              Every Feature, Head-to-Head
            </h2>
            <p className="mt-3 max-w-2xl mx-auto text-[16px] text-[#6B7280]">
              Scroll through the full breakdown — the header stays put so you always
              know which column is which.
            </p>
          </AnimatedSection>

          <AnimatedFadeIn>
            <div className="rounded-2xl border border-[#E5E3DE] bg-white overflow-hidden shadow-[0_10px_30px_rgba(10,10,10,0.06)]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse">
                  <thead className="sticky top-16 z-10">
                    <tr>
                      <th className="text-left px-5 py-4 text-[12px] font-semibold uppercase tracking-wide text-[#6B7280] bg-white/95 backdrop-blur-sm border-b border-[#E5E3DE]">
                        Feature
                      </th>
                      <th className="px-5 py-4 text-center text-[13.5px] font-bold text-white bg-[#7C3AED] border-b border-[#7C3AED]">
                        CarouseLabs
                      </th>
                      <th className="px-5 py-4 text-center text-[13.5px] font-bold text-[#4B5563] bg-[#EEEBE3] border-b border-[#E5E3DE]">
                        {competitor.name}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {competitor.feature_comparison.map((row, i) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-[#FBFAF6]"}>
                        <td className="px-5 py-4 text-[14.5px] font-medium text-[#1F2937] align-middle border-b border-[#F0EEE8]">
                          {row.feature}
                        </td>
                        <td className="px-5 py-4 text-center align-middle bg-[#FAF8FF] border-b border-[#F0EEE8]">
                          <ComparisonCell value={row.carouselabs} positive />
                        </td>
                        <td className="px-5 py-4 text-center align-middle border-b border-[#F0EEE8]">
                          <ComparisonCell value={row.competitor} positive={false} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </AnimatedFadeIn>
        </div>
      </section>

      {/* ── SECTION 4 — WHAT THE COMPETITOR DOES WELL ── */}
      <section className="px-6 py-16 sm:py-20">
        <div className="max-w-5xl mx-auto flex flex-col gap-10">
          <AnimatedSection className="text-center">
            <h2 className="text-[clamp(1.8rem,4vw,2.75rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              What {competitor.name} Does Well
            </h2>
            <p className="mt-3 max-w-2xl mx-auto text-[16px] text-[#6B7280]">
              We believe in honest comparisons. Here&rsquo;s where {competitor.name}{" "}
              genuinely shines.
            </p>
          </AnimatedSection>
          <div className="grid sm:grid-cols-2 gap-5">
            {competitor.competitor_strengths.map((strength, i) => (
              <AnimatedSection key={i} delay={(i % 2) * 0.05}>
                <div className="h-full flex items-start gap-4 p-6 rounded-2xl border border-[#E3E7EE] bg-[#F7F9FC]">
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-white border border-[#E3E7EE] flex items-center justify-center">
                    <Info size={18} className="text-[#4B6DA8]" strokeWidth={2.2} />
                  </div>
                  <p className="text-[15px] leading-[1.55] text-[#3F3F46] pt-1.5">
                    {strength}
                  </p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 5 — WHERE CAROUSELABS WINS ── */}
      <section className="px-6 py-16 sm:py-20 bg-[#FBFAF6]">
        <div className="max-w-5xl mx-auto flex flex-col gap-10">
          <AnimatedSection className="text-center">
            <h2 className="text-[clamp(1.8rem,4vw,2.75rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              Where CarouseLabs Has the Edge
            </h2>
          </AnimatedSection>
          <div className="grid sm:grid-cols-2 gap-5">
            {competitor.carouselabs_advantages.map((advantage, i) => (
              <AnimatedSection key={i} delay={(i % 2) * 0.05}>
                <div className="h-full flex items-start gap-4 p-6 rounded-2xl border border-[#E5DEF7] bg-white">
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-[#EDE9FE] flex items-center justify-center">
                    <CheckCircle2 size={18} className="text-[#7C3AED]" strokeWidth={2.2} />
                  </div>
                  <p className="text-[15px] leading-[1.55] text-[#3F3F46] pt-1.5">
                    {advantage}
                  </p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 6 — PRODUCT SCREENSHOT ── */}
      <section className="px-6 py-20">
        <AnimatedFadeIn className="max-w-[900px] mx-auto">
          <figure className="flex flex-col items-center gap-4">
            <div className="w-full rounded-2xl overflow-hidden border border-[#E5E3DE] shadow-[0_24px_60px_rgba(10,10,10,0.14)] bg-[#FFFDF8]">
              <Image
                src="/images/carouselabs-landing.png"
                alt={`CarouseLabs — create stunning visual carousels in minutes, an alternative to ${competitor.name}`}
                width={1920}
                height={957}
                sizes="(max-width: 900px) 100vw, 900px"
                className="w-full h-auto"
              />
            </div>
            <figcaption className="text-[13px] text-[#6B7280] text-center">
              CarouseLabs — Create stunning visual carousels in minutes
            </figcaption>
          </figure>
        </AnimatedFadeIn>
      </section>

      {/* ── SECTION 7 — WHO SHOULD CHOOSE WHAT (split panels, echoing the hero) ── */}
      <section className="px-6 py-16 sm:py-20 bg-[#FBFAF6]">
        <div className="max-w-4xl mx-auto flex flex-col gap-10">
          <AnimatedSection className="text-center">
            <h2 className="text-[clamp(1.8rem,4vw,2.75rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              Which One Should You Choose?
            </h2>
          </AnimatedSection>

          <div className="relative">
            <div className="grid md:grid-cols-2 gap-6">
              <AnimatedSlideLeft delay={0}>
                <div className="h-full flex flex-col gap-4 p-7 rounded-2xl border border-[#E5E3DE] bg-white">
                  <h3 className="text-[19px] font-bold text-[#0A0A0A]">
                    Choose {competitor.name} if&hellip;
                  </h3>
                  <p className="text-[15px] leading-[1.65] text-[#4B5563]">
                    {competitor.who_should_choose_competitor}
                  </p>
                </div>
              </AnimatedSlideLeft>
              <AnimatedSlideRight delay={0.05}>
                <div className="h-full flex flex-col gap-4 p-7 rounded-2xl border-2 border-[#7C3AED] bg-[#F3F0FF]">
                  <h3 className="text-[19px] font-bold text-[#7C3AED]">
                    Choose CarouseLabs if&hellip;
                  </h3>
                  <p className="text-[15px] leading-[1.65] text-[#3F3F46]">
                    {competitor.who_should_choose_carouselabs}
                  </p>
                </div>
              </AnimatedSlideRight>
            </div>
            <div className="hidden md:block">
              <SplitBadge label="OR" />
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 8 — FAQ (always-visible Q&A, not a collapsed accordion) ── */}
      <section className="px-6 py-16 sm:py-20">
        <div className="max-w-3xl mx-auto flex flex-col gap-10">
          <AnimatedSection className="text-center">
            <h2 className="text-[clamp(1.8rem,4vw,2.75rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              CarouseLabs vs {competitor.name}: FAQs
            </h2>
          </AnimatedSection>
          <div className="flex flex-col gap-6">
            {competitor.faq.map((item, i) => (
              <AnimatedSection key={i} delay={i * 0.05}>
                <div className="flex gap-4 pb-6 border-b border-[#EEEBE3] last:border-b-0 last:pb-0">
                  <span className="shrink-0 w-8 h-8 rounded-full bg-[#EDE9FE] flex items-center justify-center text-[13px] font-bold text-[#7C3AED]">
                    Q{i + 1}
                  </span>
                  <div className="flex flex-col gap-2 pt-0.5">
                    <p className="text-[16.5px] font-semibold text-[#0A0A0A] leading-snug">
                      {item.question}
                    </p>
                    <p className="text-[15px] leading-[1.7] text-[#4B5563]">{item.answer}</p>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── THE BOTTOM LINE — closing summary prose ── */}
      <section className="px-6 pb-4">
        <AnimatedSection className="max-w-3xl mx-auto">
          <div className="flex flex-col gap-4 p-7 sm:p-8 rounded-2xl border border-[#E5E3DE] bg-[#FBFAF6]">
            <div className="inline-flex items-center gap-2 w-fit px-3 py-1 rounded-full bg-white border border-[#E5E3DE] text-[11px] font-bold uppercase tracking-wide text-[#7C3AED]">
              <Scale size={12} strokeWidth={2.4} />
              The Bottom Line
            </div>
            <p className="text-[16px] leading-[1.75] text-[#3F3F46]">
              {competitor.bottom_line}
            </p>
          </div>
        </AnimatedSection>
      </section>

      {/* ── SECTION 9 — CTA (purple) ── */}
      <section className="px-6 py-20 sm:py-24">
        <AnimatedSection className="relative max-w-4xl mx-auto rounded-3xl overflow-hidden px-8 py-16 sm:py-20 text-center">
          <div
            aria-hidden
            className="absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(500px circle at 50% 0%, rgba(255,255,255,0.18), transparent 70%), linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)",
            }}
          />
          <div className="relative flex flex-col items-center gap-6">
            <h2 className="max-w-2xl text-[clamp(1.9rem,4.5vw,3rem)] font-bold leading-[1.1] tracking-[-0.025em] text-white">
              Try CarouseLabs Free &mdash; No Credit Card Required
            </h2>
            <p className="max-w-xl text-[16px] text-white/85 leading-[1.65]">
              See for yourself why creators are switching. Generate your first
              on-brand carousel, caption, and image in minutes &mdash; then decide
              how it compares to {competitor.name}.
            </p>
            <Link
              href={SIGNUP_URL}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white hover:bg-[#F3F0FF] text-[16px] font-semibold text-[#7C3AED] transition-colors shadow-[0_10px_30px_rgba(0,0,0,0.18)]"
            >
              Start creating for free
              <ArrowRight size={17} strokeWidth={2.2} />
            </Link>
            <p className="text-[12px] text-white/70">
              Free tier available &middot; {competitor.our_price} for Pro
            </p>
          </div>
        </AnimatedSection>
      </section>

      {/* ── WHO USES CAROUSELABS — internal linking into niche pages ── */}
      <section className="px-6 pb-24 -mt-6">
        <div className="max-w-5xl mx-auto flex flex-col gap-10">
          <AnimatedSection className="text-center flex flex-col gap-3">
            <h2 className="text-[clamp(1.5rem,3.2vw,2.1rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              Who Uses CarouseLabs?
            </h2>
            <p className="max-w-xl mx-auto text-[15px] text-[#6B7280] leading-[1.6]">
              CarouseLabs is built for professionals who need consistent LinkedIn
              content without hiring a designer or ghostwriter. See how it works for
              your line of work.
            </p>
          </AnimatedSection>

          {/* Top niche pages */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {POPULAR_NICHES.map((n, i) => (
              <AnimatedSection key={n.slug} delay={i * 0.04}>
                <Link
                  href={`/for/${n.slug}`}
                  className="group h-full flex items-center justify-between gap-3 p-5 rounded-2xl border border-[#E5E3DE] bg-[#FFFDF8] hover:border-[#C4B5FD] hover:shadow-[0_12px_30px_rgba(124,58,237,0.12)] transition-all"
                >
                  <span className="text-[15px] font-semibold text-[#0A0A0A] leading-snug">
                    CarouseLabs for {n.name}
                  </span>
                  <ArrowRight
                    size={15}
                    strokeWidth={2.2}
                    className="shrink-0 text-[#7C3AED] group-hover:translate-x-0.5 transition-transform"
                  />
                </Link>
              </AnimatedSection>
            ))}
          </div>

          {/* Top how-to guides */}
          <div className="flex flex-col gap-4">
            <AnimatedSection>
              <p className="text-[13px] font-semibold text-[#6B7280] text-center">
                Step-by-step guides
              </p>
            </AnimatedSection>
            <div className="grid sm:grid-cols-3 gap-4">
              {POPULAR_GUIDES.map((n, i) => (
                <AnimatedSection key={n.slug} delay={i * 0.05}>
                  <Link
                    href={`/how-to/${n.slug}`}
                    className="group h-full flex flex-col justify-between gap-5 p-6 rounded-2xl border border-[#E5DEF7] bg-[#F3F0FF] hover:border-[#C4B5FD] transition-colors"
                  >
                    <span className="text-[15px] font-semibold text-[#0A0A0A] leading-snug">
                      How to create LinkedIn content as a {n.name}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#7C3AED]">
                      Read the guide
                      <ArrowRight
                        size={14}
                        strokeWidth={2.2}
                        className="group-hover:translate-x-0.5 transition-transform"
                      />
                    </span>
                  </Link>
                </AnimatedSection>
              ))}
            </div>
          </div>

          {/* Related comparisons */}
          {relatedCompetitors.length > 0 && (
            <div className="flex flex-col gap-4">
              <AnimatedSection>
                <p className="text-[13px] font-semibold text-[#6B7280] text-center">
                  Other comparisons
                </p>
              </AnimatedSection>
              <div className="grid sm:grid-cols-3 gap-4">
                {relatedCompetitors.map((c, i) => (
                  <AnimatedSection key={c.slug} delay={i * 0.05}>
                    <Link
                      href={`/vs/${c.slug}`}
                      className="group h-full flex flex-col justify-between gap-5 p-6 rounded-2xl border border-[#E5E3DE] bg-[#FFFDF8] hover:border-[#C4B5FD] hover:shadow-[0_12px_30px_rgba(124,58,237,0.12)] transition-all"
                    >
                      <span className="text-[15px] font-semibold text-[#0A0A0A] leading-snug">
                        CarouseLabs vs {c.name}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#7C3AED]">
                        Compare
                        <ArrowRight
                          size={14}
                          strokeWidth={2.2}
                          className="group-hover:translate-x-0.5 transition-transform"
                        />
                      </span>
                    </Link>
                  </AnimatedSection>
                ))}
              </div>
            </div>
          )}

          <AnimatedSection className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/for"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold text-[#6B7280] bg-white border border-[#E5E3DE] hover:text-[#7C3AED] hover:border-[#C4B5FD] transition-colors"
            >
              Browse all 112 niches
            </Link>
            <Link
              href="/vs"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold text-[#6B7280] bg-white border border-[#E5E3DE] hover:text-[#7C3AED] hover:border-[#C4B5FD] transition-colors"
            >
              Compare all tools
            </Link>
          </AnimatedSection>
        </div>
      </section>
    </>
  )
}
