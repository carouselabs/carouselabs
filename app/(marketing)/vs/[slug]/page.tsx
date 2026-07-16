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
} from "lucide-react"
import {
  AnimatedSection,
  AnimatedFadeIn,
} from "@/components/marketing/AnimatedSection"
import { competitors, type Competitor } from "../data"

const SIGNUP_URL = "https://carouselabs.com/signup"

const bySlug = new Map<string, Competitor>(competitors.map((c) => [c.slug, c]))

function getCompetitor(slug: string): Competitor | undefined {
  return bySlug.get(slug)
}

// Only the 20 slugs below are valid; any other /vs/* path 404s.
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

/** SECTION 8 — FAQ structured data (rendered as JSON-LD in the page). */
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
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#E7F6EC]">
        <Check size={16} className="text-[#15803D]" strokeWidth={3} />
      </span>
    ) : (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#FDECEC]">
        <X size={16} className="text-[#DC2626]" strokeWidth={3} />
      </span>
    )
  }
  return (
    <span
      className={`text-[14px] font-medium ${
        positive ? "text-[#15803D]" : "text-[#4B5563]"
      }`}
    >
      {value}
    </span>
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

  // SECTION 2 quick stats
  const platformsStat = competitor.feature_comparison.some(
    (r) => /instagram|multi-platform|twitter/i.test(r.feature)
  )
    ? "LinkedIn, Instagram, X"
    : "LinkedIn-first"

  return (
    <>
      {/* SECTION 8 — FAQ structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* ── SECTION 1 — HERO (clean white, dual price badges) ── */}
      <section className="relative px-6 pt-20 pb-14 sm:pt-24 sm:pb-16 bg-white">
        <div className="relative z-10 max-w-3xl mx-auto text-center flex flex-col items-center gap-7">
          <AnimatedSection delay={0}>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F3F0FF] text-[12px] font-medium text-[#7C3AED]">
              <Scale size={12} strokeWidth={2.2} />
              Honest Comparison
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.05}>
            <h1 className="text-[clamp(2.2rem,5.5vw,3.4rem)] font-extrabold leading-[1.08] tracking-[-0.03em] text-[#0A0A0A]">
              {competitor.hero_headline}
            </h1>
          </AnimatedSection>

          <AnimatedSection delay={0.1}>
            <p className="max-w-2xl text-[18px] text-[#4B5563] leading-[1.6]">
              {competitor.hero_subheadline}
            </p>
          </AnimatedSection>

          {/* Dual price badges */}
          <AnimatedSection delay={0.15}>
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex flex-col items-center gap-1 px-6 py-4 rounded-2xl border-2 border-[#7C3AED] bg-[#F3F0FF]">
                <span className="text-[13px] font-semibold text-[#7C3AED]">
                  CarouseLabs
                </span>
                <span className="text-[22px] font-extrabold text-[#0A0A0A] tracking-[-0.02em]">
                  {competitor.our_price}
                </span>
              </div>
              <span className="text-[15px] font-bold text-[#9CA3AF]">vs</span>
              <div className="flex flex-col items-center gap-1 px-6 py-4 rounded-2xl border border-[#E5E3DE] bg-[#FBFAF6]">
                <span className="text-[13px] font-semibold text-[#6B7280]">
                  {competitor.name}
                </span>
                <span className="text-[22px] font-extrabold text-[#0A0A0A] tracking-[-0.02em]">
                  {competitor.price}
                </span>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── SECTION 2 — QUICK VERDICT BOX ── */}
      <section className="px-6 pb-16">
        <AnimatedSection className="max-w-4xl mx-auto">
          <div className="rounded-2xl border border-[#E5DEF7] bg-[#F3F0FF] p-7 sm:p-9 flex flex-col gap-7">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-11 h-11 rounded-xl bg-[#7C3AED] flex items-center justify-center">
                <Scale size={20} className="text-white" strokeWidth={2.2} />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[13px] font-semibold uppercase tracking-wide text-[#7C3AED]">
                  The Quick Verdict
                </span>
                <p className="text-[17px] leading-[1.6] text-[#1F2937] font-medium">
                  {competitor.verdict}
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4 pt-1">
              {[
                {
                  icon: <DollarSign size={18} className="text-[#7C3AED]" strokeWidth={2.2} />,
                  label: "CarouseLabs price",
                  value: `${competitor.our_price} vs ${competitor.price}`,
                },
                {
                  icon: <Layers size={18} className="text-[#7C3AED]" strokeWidth={2.2} />,
                  label: "Platforms",
                  value: platformsStat,
                },
                {
                  icon: <Sparkles size={18} className="text-[#7C3AED]" strokeWidth={2.2} />,
                  label: "Key advantage",
                  value: competitor.carouselabs_advantages[0],
                },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-2 p-4 rounded-xl bg-white border border-[#E5DEF7]"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#EDE9FE] flex items-center justify-center">
                      {stat.icon}
                    </div>
                    <span className="text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">
                      {stat.label}
                    </span>
                  </div>
                  <span className="text-[14px] leading-[1.45] font-semibold text-[#0A0A0A]">
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* ── OVERVIEW — educational intro prose ── */}
      <section className="px-6 pb-16">
        <div className="max-w-3xl mx-auto flex flex-col gap-5">
          <AnimatedSection>
            <h2 className="text-[clamp(1.5rem,3.2vw,2rem)] font-bold tracking-[-0.02em] text-[#0A0A0A]">
              CarouseLabs vs {competitor.name}: The Overview
            </h2>
          </AnimatedSection>
          {[...competitor.overview.split("\n\n"), competitor.deep_dive].map(
            (para, i) => (
              <AnimatedSection key={i} delay={0.05 + i * 0.05}>
                <p className="text-[17px] leading-[1.75] text-[#3F3F46]">
                  {para}
                </p>
              </AnimatedSection>
            )
          )}
        </div>
      </section>

      {/* ── SECTION 3 — FEATURE COMPARISON TABLE ── */}
      <section className="px-6 py-16 sm:py-20 bg-[#FBFAF6]">
        <div className="max-w-5xl mx-auto flex flex-col gap-10">
          <AnimatedSection className="text-center">
            <h2 className="text-[clamp(1.8rem,4vw,2.75rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              CarouseLabs vs {competitor.name}: Feature Comparison
            </h2>
            <p className="mt-3 max-w-2xl mx-auto text-[16px] text-[#6B7280]">
              A side-by-side look at how the two tools stack up, feature by
              feature.
            </p>
          </AnimatedSection>

          <AnimatedFadeIn>
            <div className="overflow-x-auto rounded-2xl border border-[#E5E3DE] bg-white shadow-[0_10px_30px_rgba(10,10,10,0.05)]">
              <table className="w-full min-w-[560px] border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E3DE]">
                    <th className="text-left px-5 py-4 text-[13px] font-semibold uppercase tracking-wide text-[#6B7280]">
                      Feature
                    </th>
                    <th className="px-5 py-4 text-center text-[14px] font-bold text-[#7C3AED] bg-[#F3F0FF]">
                      CarouseLabs
                    </th>
                    <th className="px-5 py-4 text-center text-[14px] font-bold text-[#4B5563]">
                      {competitor.name}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {competitor.feature_comparison.map((row, i) => (
                    <tr
                      key={i}
                      className={
                        i % 2 === 0 ? "bg-white" : "bg-[#FBFAF6]"
                      }
                    >
                      <td className="px-5 py-4 text-[15px] font-medium text-[#1F2937] align-middle">
                        {row.feature}
                      </td>
                      <td className="px-5 py-4 text-center align-middle bg-[#FAF8FF]">
                        <ComparisonCell value={row.carouselabs} positive />
                      </td>
                      <td className="px-5 py-4 text-center align-middle">
                        <ComparisonCell value={row.competitor} positive={false} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
              We believe in honest comparisons. Here&rsquo;s where{" "}
              {competitor.name} genuinely shines.
            </p>
          </AnimatedSection>
          <div className="grid sm:grid-cols-2 gap-5">
            {competitor.competitor_strengths.map((strength, i) => (
              <AnimatedSection key={i} delay={(i % 2) * 0.05}>
                <div className="h-full flex items-start gap-4 p-6 rounded-2xl border border-[#D6E4F5] bg-[#F5F9FF]">
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-[#E1EDFB] flex items-center justify-center">
                    <Info size={18} className="text-[#2563EB]" strokeWidth={2.2} />
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
                    <CheckCircle2
                      size={18}
                      className="text-[#7C3AED]"
                      strokeWidth={2.2}
                    />
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

      {/* ── SECTION 7 — WHO SHOULD CHOOSE WHAT ── */}
      <section className="px-6 py-16 sm:py-20 bg-[#FBFAF6]">
        <div className="max-w-5xl mx-auto flex flex-col gap-10">
          <AnimatedSection className="text-center">
            <h2 className="text-[clamp(1.8rem,4vw,2.75rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              Which One Should You Choose?
            </h2>
          </AnimatedSection>
          <div className="grid md:grid-cols-2 gap-6">
            <AnimatedSection delay={0}>
              <div className="h-full flex flex-col gap-4 p-7 rounded-2xl border border-[#E5E3DE] bg-white">
                <h3 className="text-[19px] font-bold text-[#0A0A0A]">
                  Choose {competitor.name} if&hellip;
                </h3>
                <p className="text-[15px] leading-[1.65] text-[#4B5563]">
                  {competitor.who_should_choose_competitor}
                </p>
              </div>
            </AnimatedSection>
            <AnimatedSection delay={0.05}>
              <div className="h-full flex flex-col gap-4 p-7 rounded-2xl border-2 border-[#7C3AED] bg-[#F3F0FF]">
                <h3 className="text-[19px] font-bold text-[#7C3AED]">
                  Choose CarouseLabs if&hellip;
                </h3>
                <p className="text-[15px] leading-[1.65] text-[#3F3F46]">
                  {competitor.who_should_choose_carouselabs}
                </p>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ── SECTION 8 — FAQ ── */}
      <section className="px-6 py-16 sm:py-20">
        <div className="max-w-3xl mx-auto flex flex-col gap-10">
          <AnimatedSection className="text-center">
            <h2 className="text-[clamp(1.8rem,4vw,2.75rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              CarouseLabs vs {competitor.name}: FAQs
            </h2>
          </AnimatedSection>
          <div className="flex flex-col gap-4">
            {competitor.faq.map((item, i) => (
              <AnimatedSection key={i} delay={i * 0.05}>
                <details className="group rounded-2xl border border-[#E5E3DE] bg-[#FFFDF8] p-6 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex items-center justify-between gap-4 cursor-pointer list-none">
                    <span className="text-[17px] font-semibold text-[#0A0A0A]">
                      {item.question}
                    </span>
                    <span className="shrink-0 w-7 h-7 rounded-full bg-[#EDE9FE] flex items-center justify-center transition-transform group-open:rotate-45">
                      <span className="text-[#7C3AED] text-[18px] leading-none font-light">
                        +
                      </span>
                    </span>
                  </summary>
                  <p className="mt-4 text-[15px] leading-[1.7] text-[#4B5563]">
                    {item.answer}
                  </p>
                </details>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── THE BOTTOM LINE — closing summary prose ── */}
      <section className="px-6 pb-4">
        <AnimatedSection className="max-w-3xl mx-auto">
          <div className="flex flex-col gap-4 p-7 sm:p-8 rounded-2xl border border-[#E5E3DE] bg-[#FBFAF6]">
            <h2 className="text-[clamp(1.4rem,3vw,1.9rem)] font-bold tracking-[-0.02em] text-[#0A0A0A]">
              The Bottom Line
            </h2>
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
              on-brand carousel, caption, and image in minutes &mdash; then
              decide how it compares to {competitor.name}.
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
    </>
  )
}
