import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { notFound } from "next/navigation"
import { ArrowRight, Trophy, Scale, Quote } from "lucide-react"
import {
  AnimatedSection,
  AnimatedFadeIn,
} from "@/components/marketing/AnimatedSection"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { BEST_OF_PAGES, type BestOfPage } from "../data"
import { ANSWER_PAGES, type AnswerPage } from "../../answers/data"
import { BEST_TO_ANSWER_SLUGS } from "../../answers/cross-link"
import { GENERATOR_PAGES, type GeneratorPage } from "../../generators/data"
import { BEST_TO_GENERATOR_SLUGS } from "../generators-cross-link"

const BASE_URL = "https://carouselabs.com"
const SIGNUP_URL = "https://carouselabs.com/signup"

const bySlug = new Map<string, BestOfPage>(BEST_OF_PAGES.map((p) => [p.slug, p]))
const answerBySlug = new Map<string, AnswerPage>(ANSWER_PAGES.map((p) => [p.slug, p]))
const generatorBySlug = new Map<string, GeneratorPage>(GENERATOR_PAGES.map((p) => [p.slug, p]))

function getPage(slug: string): BestOfPage | undefined {
  return bySlug.get(slug)
}

function getRelatedAnswers(slug: string): AnswerPage[] {
  return (BEST_TO_ANSWER_SLUGS[slug] ?? [])
    .map((s) => answerBySlug.get(s))
    .filter((p): p is AnswerPage => Boolean(p))
}

function getRelatedGenerators(slug: string): GeneratorPage[] {
  return (BEST_TO_GENERATOR_SLUGS[slug] ?? [])
    .map((s) => generatorBySlug.get(s))
    .filter((p): p is GeneratorPage => Boolean(p))
}

function getRelated(page: BestOfPage): BestOfPage[] {
  return page.relatedSlugs
    .map((s) => bySlug.get(s))
    .filter((p): p is BestOfPage => Boolean(p))
    .slice(0, 4)
}

// Only the 30 slugs in BEST_OF_PAGES are valid; any other /best/* path 404s.
export const dynamicParams = false

export function generateStaticParams() {
  return BEST_OF_PAGES.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const page = getPage(slug)
  if (!page) return {}

  const url = `${BASE_URL}/best/${page.slug}`

  return {
    title: page.metaTitle,
    description: page.metaDescription,
    alternates: { canonical: url },
    openGraph: {
      title: page.metaTitle,
      description: page.metaDescription,
      url,
      type: "website",
      images: [
        {
          url: "/images/carouselabs-landing.png",
          width: 1920,
          height: 957,
          alt: page.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: page.metaTitle,
      description: page.metaDescription,
      images: ["/images/carouselabs-landing.png"],
    },
  }
}

function buildFaqJsonLd(page: BestOfPage) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faq.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  }
}

function buildItemListJsonLd(page: BestOfPage) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: page.title,
    itemListElement: page.tools.map((t) => ({
      "@type": "ListItem",
      position: t.rank,
      name: t.name,
      description: t.strength,
    })),
  }
}

export default async function BestOfPageRoute({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const page = getPage(slug)
  if (!page) notFound()

  const related = getRelated(page)
  const relatedAnswers = getRelatedAnswers(page.slug)
  const relatedGenerators = getRelatedGenerators(page.slug)
  const faqJsonLd = buildFaqJsonLd(page)
  const itemListJsonLd = buildItemListJsonLd(page)
  const updatedMonth = new Date().toLocaleString("en-US", { month: "long" })
  const winner = page.tools.find((t) => t.rank === 1)
  const rest = page.tools.filter((t) => t.rank !== 1).sort((a, b) => a.rank - b.rank)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />

      {/* ── SECTION 1 — HERO (dark, distinct from /generators + /vs) ── */}
      <section className="relative px-6 pt-24 pb-28 sm:pt-28 sm:pb-32 overflow-hidden bg-[#0F0B1A]">
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(700px circle at 15% 0%, rgba(124,58,237,0.35), transparent 60%), radial-gradient(600px circle at 100% 30%, rgba(124,58,237,0.18), transparent 55%), #0F0B1A",
          }}
        />
        {/* faded oversized rank numerals as a background motif */}
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-10 right-0 text-[220px] sm:text-[320px] font-extrabold leading-none text-white/[0.03] select-none"
        >
          #1
        </div>

        <div className="relative z-10 max-w-3xl mx-auto text-center flex flex-col items-center gap-6">
          <AnimatedSection delay={0}>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-[12px] font-medium text-white/80 backdrop-blur-sm">
              <Trophy size={12} strokeWidth={2.2} className="text-[#C4B5FD]" />
              Last updated {updatedMonth} 2026 · Independently ranked
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.05}>
            <h1 className="text-[clamp(2.1rem,5.2vw,3.3rem)] font-extrabold leading-[1.1] tracking-[-0.03em] text-white">
              {page.title}
            </h1>
          </AnimatedSection>

          <AnimatedSection delay={0.1}>
            <p className="max-w-2xl text-[17px] text-white/70 leading-[1.7]">{page.intro}</p>
          </AnimatedSection>

          <AnimatedSection delay={0.15}>
            <Link
              href={`#leaderboard`}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white hover:bg-[#F3F0FF] text-[15px] font-semibold text-[#0F0B1A] transition-colors shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
            >
              See the Rankings
              <ArrowRight size={16} strokeWidth={2.2} />
            </Link>
          </AnimatedSection>
        </div>
      </section>

      {/* ── SECTION 2 — METHODOLOGY (floating card overlapping hero) ── */}
      <section className="px-6 relative">
        <AnimatedFadeIn className="max-w-3xl mx-auto -mt-14 sm:-mt-16 relative z-10">
          <div className="rounded-2xl border border-[#E5E3DE] bg-white shadow-[0_24px_60px_rgba(10,10,10,0.14)] p-7 sm:p-9 flex flex-col sm:flex-row gap-5">
            <div className="shrink-0 w-11 h-11 rounded-2xl bg-[#EDE9FE] flex items-center justify-center">
              <Scale size={20} className="text-[#7C3AED]" strokeWidth={2.2} />
            </div>
            <div className="flex flex-col gap-1.5">
              <h2 className="text-[15px] font-bold text-[#0A0A0A]">How We Ranked These</h2>
              <p className="text-[14.5px] leading-[1.7] text-[#4B5563]">{page.methodology}</p>
            </div>
          </div>
        </AnimatedFadeIn>
      </section>

      {/* ── SECTION 3 — RANKED LEADERBOARD ── */}
      <section id="leaderboard" className="px-6 pt-16 pb-16 sm:pt-20 sm:pb-20 scroll-mt-8">
        <div className="max-w-3xl mx-auto flex flex-col gap-8">
          {/* Winner card — Editor's Choice, visually distinct from the rest */}
          {winner && (
            <AnimatedSection>
              <div className="relative rounded-[28px] p-[2px] bg-gradient-to-br from-[#7C3AED] via-[#A78BFA] to-[#7C3AED] shadow-[0_25px_70px_rgba(124,58,237,0.35)]">
                <div className="rounded-[26px] bg-[#0F0B1A] px-7 py-9 sm:px-10 sm:py-11 flex flex-col sm:flex-row items-start gap-7">
                  <div className="shrink-0 flex sm:flex-col items-center gap-3 sm:gap-2">
                    <span className="text-[clamp(3.2rem,8vw,4.5rem)] font-extrabold leading-none tracking-[-0.03em] bg-gradient-to-b from-[#C4B5FD] to-[#7C3AED] bg-clip-text text-transparent">
                      #1
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#7C3AED]/20 border border-[#A78BFA]/40 text-[11px] font-bold uppercase tracking-wide text-[#C4B5FD]">
                      <Trophy size={11} strokeWidth={2.4} />
                      Editor&apos;s Choice
                    </span>
                  </div>
                  <div className="flex-1 flex flex-col gap-3">
                    <div>
                      <h3 className="text-[22px] font-extrabold text-white tracking-[-0.01em]">
                        {winner.name}
                      </h3>
                      <p className="text-[14.5px] text-[#C4B5FD] font-medium">{winner.tagline}</p>
                    </div>
                    <p className="text-[15px] leading-[1.7] text-white/80">{winner.strength}</p>
                    <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2 border-t border-white/10 text-[13px]">
                      <span className="text-white/60">
                        <span className="text-white/40">Best for </span>
                        {winner.bestFor}
                      </span>
                      <span className="text-white/60">
                        <span className="text-white/40">Pricing </span>
                        {winner.pricing}
                      </span>
                    </div>
                    <Link
                      href={SIGNUP_URL}
                      className="mt-2 inline-flex items-center gap-2 w-fit px-5 py-2.5 rounded-xl bg-white hover:bg-[#F3F0FF] text-[13.5px] font-semibold text-[#0F0B1A] transition-colors"
                    >
                      Try CarouseLabs Free
                      <ArrowRight size={14} strokeWidth={2.2} />
                    </Link>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          )}

          {/* Ranks 2-7 — plain leaderboard rows */}
          <div className="flex flex-col gap-4">
            {rest.map((tool, i) => (
              <AnimatedSection key={tool.name} delay={0.05 + i * 0.04}>
                <div className="flex items-start gap-5 sm:gap-6 p-6 rounded-2xl border border-[#E5E3DE] bg-[#FFFDF8] hover:border-[#D9D4E8] transition-colors">
                  <span className="shrink-0 w-12 text-[clamp(1.8rem,4vw,2.4rem)] font-extrabold leading-none tracking-[-0.02em] text-[#D1D5DB]">
                    #{tool.rank}
                  </span>
                  <div className="flex-1 flex flex-col gap-2 pt-1">
                    <div>
                      <h3 className="text-[16.5px] font-bold text-[#0A0A0A]">{tool.name}</h3>
                      <p className="text-[13.5px] text-[#7C3AED] font-medium">{tool.tagline}</p>
                    </div>
                    <p className="text-[14.5px] leading-[1.65] text-[#4B5563]">{tool.strength}</p>
                    <div className="flex flex-wrap gap-x-5 gap-y-1.5 pt-1.5 text-[12.5px] text-[#6B7280]">
                      <span>
                        <span className="text-[#9CA3AF]">Best for </span>
                        {tool.bestFor}
                      </span>
                      <span>
                        <span className="text-[#9CA3AF]">Pricing </span>
                        {tool.pricing}
                      </span>
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 4 — PRODUCT SCREENSHOT ── */}
      <section className="px-6 py-16 bg-[#FBFAF6]">
        <AnimatedFadeIn className="max-w-[900px] mx-auto">
          <figure className="flex flex-col items-center gap-4">
            <div className="w-full rounded-2xl overflow-hidden border border-[#E5E3DE] shadow-[0_24px_60px_rgba(10,10,10,0.14)] bg-white">
              <Image
                src="/images/carouselabs-landing.png"
                alt={`CarouseLabs — the #1 ranked tool in ${page.title}`}
                width={1920}
                height={957}
                priority
                sizes="(max-width: 900px) 100vw, 900px"
                className="w-full h-auto"
              />
            </div>
            <figcaption className="text-[13px] text-[#6B7280] text-center">
              CarouseLabs — ranked #1 in {page.title}
            </figcaption>
          </figure>
        </AnimatedFadeIn>
      </section>

      {/* ── SECTION 5 — VERDICT ── */}
      <section className="px-6 py-16 sm:py-20">
        <AnimatedSection className="max-w-3xl mx-auto">
          <div className="relative rounded-2xl bg-[#F3F0FF] border border-[#E5DFFF] px-7 py-9 sm:px-10 sm:py-11">
            <Quote size={32} className="text-[#C4B5FD] mb-3" strokeWidth={2} />
            <h2 className="text-[13px] font-bold uppercase tracking-wide text-[#7C3AED] mb-3">
              The Verdict
            </h2>
            <p className="text-[16px] leading-[1.75] text-[#3F3F46]">{page.verdict}</p>
          </div>
        </AnimatedSection>
      </section>

      {/* ── RELATED TOOL (cross-link to /generators where category-matched) ── */}
      {relatedGenerators.length > 0 && (
        <section className="px-6 pb-4 sm:pb-6">
          <div className="max-w-3xl mx-auto flex flex-wrap items-center gap-x-6 gap-y-2">
            <span className="text-[12.5px] font-semibold text-[#9CA3AF] uppercase tracking-wide">
              Related tool
            </span>
            {relatedGenerators.map((g) => (
              <Link
                key={g.slug}
                href={`/generators/${g.slug}`}
                className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-[#7C3AED] hover:text-[#6D28D9] transition-colors"
              >
                {g.keyword}
                <ArrowRight size={12} strokeWidth={2.2} />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── RELATED ANSWER (cross-link to /answers where topically relevant) ── */}
      {relatedAnswers.length > 0 && (
        <section className="px-6 pb-16 sm:pb-20">
          <div className="max-w-3xl mx-auto flex flex-wrap items-center gap-x-6 gap-y-2">
            <span className="text-[12.5px] font-semibold text-[#9CA3AF] uppercase tracking-wide">
              Related answer
            </span>
            {relatedAnswers.map((a) => (
              <Link
                key={a.slug}
                href={`/answers/${a.slug}`}
                className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-[#7C3AED] hover:text-[#6D28D9] transition-colors"
              >
                {a.question}
                <ArrowRight size={12} strokeWidth={2.2} />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── SECTION 6 — FAQ ── */}
      <section className="px-6 py-16 sm:py-20 bg-[#FBFAF6]">
        <div className="max-w-3xl mx-auto flex flex-col gap-10">
          <AnimatedSection className="text-center">
            <h2 className="text-[clamp(1.7rem,3.8vw,2.6rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              Frequently Asked Questions
            </h2>
          </AnimatedSection>
          <AnimatedSection delay={0.05}>
            <div className="rounded-2xl border border-[#E5E3DE] bg-white px-6 sm:px-8">
              <Accordion multiple>
                {page.faq.map((f, i) => (
                  <AccordionItem key={i} value={`faq-${i}`}>
                    <AccordionTrigger className="text-[15px] font-semibold text-[#0A0A0A] py-5">
                      {f.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-[14px] leading-[1.7] text-[#4B5563]">
                      {f.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── SECTION 7 — RELATED COMPARISONS ── */}
      {related.length > 0 && (
        <section className="px-6 py-16 sm:py-20">
          <div className="max-w-5xl mx-auto flex flex-col gap-8">
            <AnimatedSection className="text-center">
              <h2 className="text-[clamp(1.5rem,3.2vw,2.1rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
                More Rankings
              </h2>
            </AnimatedSection>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {related.map((r, i) => (
                <AnimatedSection key={r.slug} delay={i * 0.05}>
                  <Link
                    href={`/best/${r.slug}`}
                    className="group h-full flex flex-col justify-between gap-4 p-5 rounded-2xl border border-[#E5E3DE] bg-[#FFFDF8] hover:border-[#C4B5FD] hover:shadow-[0_12px_30px_rgba(124,58,237,0.10)] transition-all"
                  >
                    <span className="text-[14px] font-semibold text-[#0A0A0A] leading-snug">
                      {r.title}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#7C3AED]">
                      See rankings
                      <ArrowRight
                        size={13}
                        strokeWidth={2.2}
                        className="group-hover:translate-x-0.5 transition-transform"
                      />
                    </span>
                  </Link>
                </AnimatedSection>
              ))}
            </div>
            <AnimatedSection className="text-center">
              <Link
                href="/best"
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#7C3AED] hover:text-[#6D28D9] transition-colors"
              >
                Browse all rankings
                <ArrowRight size={13} strokeWidth={2.2} />
              </Link>
            </AnimatedSection>
          </div>
        </section>
      )}

      {/* ── SECTION 8 — CTA (purple) ── */}
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
              Try the #1 Rated Tool Free
            </h2>
            <p className="max-w-xl text-[16px] text-white/85 leading-[1.65]">
              CarouseLabs handles the ideas, captions, and visuals — you just hit publish. See why
              it topped this list.
            </p>
            <Link
              href={SIGNUP_URL}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white hover:bg-[#F3F0FF] text-[16px] font-semibold text-[#7C3AED] transition-colors shadow-[0_10px_30px_rgba(0,0,0,0.18)]"
            >
              Try It Free
              <ArrowRight size={17} strokeWidth={2.2} />
            </Link>
            <p className="text-[12px] text-white/70">No credit card required</p>
          </div>
        </AnimatedSection>
      </section>
    </>
  )
}
