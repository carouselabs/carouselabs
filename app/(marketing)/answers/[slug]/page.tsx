import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowRight, ArrowUpRight, CheckCircle2 } from "lucide-react"
import { ANSWER_PAGES, type AnswerPage } from "../data"
import { ANSWER_TO_GENERATOR_SLUGS, ANSWER_TO_BEST_SLUGS } from "../cross-link"
import { GENERATOR_PAGES, type GeneratorPage } from "../../generators/data"
import { BEST_OF_PAGES, type BestOfPage } from "../../best/data"

const BASE_URL = "https://carouselabs.com"
const SIGNUP_URL = "https://carouselabs.com/signup"

const bySlug = new Map<string, AnswerPage>(ANSWER_PAGES.map((p) => [p.slug, p]))
const generatorBySlug = new Map<string, GeneratorPage>(GENERATOR_PAGES.map((p) => [p.slug, p]))
const bestOfBySlug = new Map<string, BestOfPage>(BEST_OF_PAGES.map((p) => [p.slug, p]))

function getPage(slug: string): AnswerPage | undefined {
  return bySlug.get(slug)
}

function getRelated(page: AnswerPage): AnswerPage[] {
  return page.relatedSlugs
    .map((s) => bySlug.get(s))
    .filter((p): p is AnswerPage => Boolean(p))
    .slice(0, 4)
}

function getRelatedGenerators(slug: string): GeneratorPage[] {
  return (ANSWER_TO_GENERATOR_SLUGS[slug] ?? [])
    .map((s) => generatorBySlug.get(s))
    .filter((p): p is GeneratorPage => Boolean(p))
}

function getRelatedBestOf(slug: string): BestOfPage[] {
  return (ANSWER_TO_BEST_SLUGS[slug] ?? [])
    .map((s) => bestOfBySlug.get(s))
    .filter((p): p is BestOfPage => Boolean(p))
}

function categorySlug(category: string): string {
  return category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
}

// Only the 100 slugs in ANSWER_PAGES are valid; any other /answers/* path 404s.
export const dynamicParams = false

export function generateStaticParams() {
  return ANSWER_PAGES.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const page = getPage(slug)
  if (!page) return {}

  const url = `${BASE_URL}/answers/${page.slug}`

  return {
    title: page.metaTitle,
    description: page.metaDescription,
    alternates: { canonical: url },
    openGraph: {
      title: page.metaTitle,
      description: page.metaDescription,
      url,
      type: "article",
    },
    twitter: {
      card: "summary",
      title: page.metaTitle,
      description: page.metaDescription,
    },
  }
}

function buildQAPageJsonLd(page: AnswerPage) {
  return {
    "@context": "https://schema.org",
    "@type": "QAPage",
    mainEntity: {
      "@type": "Question",
      name: page.question,
      text: page.question,
      answerCount: 1,
      acceptedAnswer: {
        "@type": "Answer",
        text: page.directAnswer,
      },
    },
  }
}

function buildFaqJsonLd(page: AnswerPage) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.relatedFaq.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  }
}

export default async function AnswerPageRoute({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const page = getPage(slug)
  if (!page) notFound()

  const related = getRelated(page)
  const relatedGenerators = getRelatedGenerators(page.slug)
  const relatedBestOf = getRelatedBestOf(page.slug)
  const qaJsonLd = buildQAPageJsonLd(page)
  const faqJsonLd = buildFaqJsonLd(page)
  const catSlug = categorySlug(page.category)
  const mentionsCarouseLabs =
    page.directAnswer.includes("CarouseLabs") || page.explanation.includes("CarouseLabs")
  const explanationParagraphs = page.explanation.split("\n\n")

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(qaJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <article className="px-6 py-14 sm:py-16 bg-white">
        <div className="max-w-[640px] mx-auto flex flex-col gap-10">
          {/* ── SECTION 1 — BREADCRUMB + H1 ── */}
          <div className="flex flex-col gap-4">
            <nav className="flex items-center gap-1.5 text-[12.5px] text-[#9CA3AF]">
              <Link href="/" className="hover:text-[#6B7280] transition-colors">
                Home
              </Link>
              <span>/</span>
              <Link href="/answers" className="hover:text-[#6B7280] transition-colors">
                Answers
              </Link>
              <span>/</span>
              <Link href={`/answers#${catSlug}`} className="hover:text-[#6B7280] transition-colors">
                {page.category}
              </Link>
            </nav>
            <h1 className="text-[clamp(1.5rem,3.6vw,2.1rem)] font-bold leading-[1.25] tracking-[-0.02em] text-[#0A0A0A]">
              {page.question}
            </h1>
          </div>

          {/* ── SECTION 2 — DIRECT ANSWER BOX (first content block, snippet-bait) ── */}
          <div className="border-l-[3px] border-[#7C3AED] bg-[#F7F5FF] rounded-r-xl px-6 py-6 sm:px-7 sm:py-7">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-[#7C3AED] mb-2.5">
              Direct Answer
            </span>
            <p className="text-[18px] sm:text-[19px] font-semibold leading-[1.55] text-[#0A0A0A]">
              {page.directAnswer}
            </p>
          </div>

          {/* ── SECTION 3 — EXPLANATION ── */}
          <div className="flex flex-col gap-4">
            {explanationParagraphs.map((para, i) => (
              <p key={i} className="text-[15.5px] leading-[1.75] text-[#3F3F46]">
                {para}
              </p>
            ))}
          </div>

          {/* ── SECTION 4 — KEY POINTS ── */}
          <div className="flex flex-col gap-3">
            <h2 className="text-[13px] font-bold uppercase tracking-wider text-[#6B7280]">
              Key Points
            </h2>
            <ul className="flex flex-col gap-2.5">
              {page.keyPoints.map((point, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <CheckCircle2
                    size={16}
                    strokeWidth={2.2}
                    className="text-[#7C3AED] shrink-0 mt-[3px]"
                  />
                  <span className="text-[14.5px] leading-[1.6] text-[#3F3F46]">{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* ── SECTION 5 — EXAMPLE ── */}
          <div className="flex flex-col gap-3">
            <h2 className="text-[13px] font-bold uppercase tracking-wider text-[#6B7280]">
              Example
            </h2>
            <div className="bg-[#FAFAF9] border border-[#EEEBE3] rounded-xl px-5 py-5">
              <p className="text-[14.5px] leading-[1.7] text-[#3F3F46]">{page.example}</p>
            </div>
          </div>

          {/* ── SECTION 6 — RELATED QUESTIONS (visible text, not collapsed, for AI-citation crawlability) ── */}
          <div className="flex flex-col gap-5">
            <h2 className="text-[13px] font-bold uppercase tracking-wider text-[#6B7280]">
              Related Questions
            </h2>
            <div className="flex flex-col gap-5">
              {page.relatedFaq.map((f, i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <p className="text-[14.5px] font-semibold text-[#0A0A0A]">{f.question}</p>
                  <p className="text-[14px] leading-[1.65] text-[#4B5563]">{f.answer}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── RELATED TOOL / RANKING (cross-category, where a topical match exists) ── */}
          {(relatedGenerators.length > 0 || relatedBestOf.length > 0) && (
            <div className="flex flex-col gap-2 pt-6 border-t border-[#EEEBE3]">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                {relatedGenerators.map((g) => (
                  <Link
                    key={g.slug}
                    href={`/generators/${g.slug}`}
                    className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-[#7C3AED] hover:text-[#6D28D9] transition-colors"
                  >
                    Try {g.keyword}
                    <ArrowRight size={12} strokeWidth={2.2} />
                  </Link>
                ))}
                {relatedBestOf.map((b) => (
                  <Link
                    key={b.slug}
                    href={`/best/${b.slug}`}
                    className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-[#7C3AED] hover:text-[#6D28D9] transition-colors"
                  >
                    {b.title}
                    <ArrowRight size={12} strokeWidth={2.2} />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ── SECTION 7 — MORE QUESTIONS IN CATEGORY ── */}
          {related.length > 0 && (
            <div className="flex flex-col gap-3 pt-2 border-t border-[#EEEBE3]">
              <h2 className="text-[13px] font-bold uppercase tracking-wider text-[#6B7280] pt-6">
                More Questions in {page.category}
              </h2>
              <ul className="flex flex-col gap-1">
                {related.map((r) => (
                  <li key={r.slug}>
                    <Link
                      href={`/answers/${r.slug}`}
                      className="group inline-flex items-center gap-1.5 py-1.5 text-[14.5px] text-[#3F3F46] hover:text-[#7C3AED] transition-colors"
                    >
                      <ArrowUpRight
                        size={14}
                        strokeWidth={2.2}
                        className="text-[#C4B5FD] shrink-0 group-hover:text-[#7C3AED] transition-colors"
                      />
                      {r.question}
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href="/answers"
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#7C3AED] hover:text-[#6D28D9] transition-colors mt-1"
              >
                Browse all answers
                <ArrowRight size={13} strokeWidth={2.2} />
              </Link>
            </div>
          )}

          {/* ── SECTION 8 — SOFT CTA ── */}
          {mentionsCarouseLabs ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0F0B1A] rounded-2xl px-6 py-6 sm:px-7">
              <p className="text-[14.5px] leading-[1.6] text-white/85">
                Ready to put this into practice? CarouseLabs turns a topic into a written caption
                and a fully designed carousel in minutes.
              </p>
              <Link
                href={SIGNUP_URL}
                className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white hover:bg-[#F3F0FF] text-[14px] font-semibold text-[#0F0B1A] transition-colors"
              >
                Try It Free
                <ArrowRight size={14} strokeWidth={2.2} />
              </Link>
            </div>
          ) : (
            <div className="pt-2">
              <Link
                href="/answers"
                className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[#7C3AED] hover:text-[#6D28D9] transition-colors"
              >
                Explore more LinkedIn guides
                <ArrowRight size={13} strokeWidth={2.2} />
              </Link>
            </div>
          )}
        </div>
      </article>
    </>
  )
}
