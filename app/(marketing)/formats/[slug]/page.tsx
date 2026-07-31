import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { notFound } from "next/navigation"
import { ArrowRight, CalendarDays, Lightbulb, Sparkles } from "lucide-react"
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
import { FORMAT_PAGES, type FormatPage } from "../data"
import { FORMAT_LABELS, FORMAT_EMOJI } from "../types"
import { IDEAS_CROSS_LINK } from "../ideas-cross-link"

const BASE_URL = "https://carouselabs.com"
const SIGNUP_URL = "https://carouselabs.com/signup"

const bySlug = new Map<string, FormatPage>(FORMAT_PAGES.map((p) => [p.slug, p]))

function getPage(slug: string): FormatPage | undefined {
  return bySlug.get(slug)
}

function getRelated(page: FormatPage): FormatPage[] {
  return page.relatedSlugs
    .map((s) => bySlug.get(s))
    .filter((p): p is FormatPage => Boolean(p))
}

interface CalendarWeek {
  label: string
  theme: string
  ideas: string[]
}

/** Parses "Week 1: Theme — Post 1: idea; Post 2: idea" into structured parts. */
function parseCalendarWeek(item: string): CalendarWeek {
  const [head, rest] = item.split(" — ")
  const [label, theme] = (head ?? "").split(": ")
  const ideas = (rest ?? "")
    .split("; ")
    .map((s) => s.trim())
    .filter(Boolean)
  return { label: label ?? "Week", theme: theme ?? "", ideas }
}

function heading(page: FormatPage): string {
  const n = page.items.length
  switch (page.formatType) {
    case "carousel-ideas":
      return `${n} LinkedIn Carousel Ideas for ${page.topic}`
    case "caption-examples":
      return `${n} LinkedIn Caption Examples for ${page.topic}`
    case "hook-examples":
      return `${n} Scroll-Stopping LinkedIn Hooks for ${page.topic}`
    case "post-ideas":
      return `${n} LinkedIn Post Ideas for ${page.topic}`
    case "content-calendar":
      return `Your 4-Week LinkedIn Content Calendar for ${page.topic}`
    case "linkedin-post-examples":
      return `${n} LinkedIn Post Examples for ${page.topic}`
  }
}

function itemsSectionLabel(page: FormatPage): string {
  switch (page.formatType) {
    case "carousel-ideas":
      return "The Carousel Ideas"
    case "caption-examples":
      return "The Caption Examples"
    case "hook-examples":
      return "The Hooks"
    case "post-ideas":
      return "The Post Ideas"
    case "content-calendar":
      return "The 4-Week Plan"
    case "linkedin-post-examples":
      return "The Post Examples"
  }
}

// Only the 216 slugs in FORMAT_PAGES are valid; any other /formats/* path 404s.
export const dynamicParams = false

export function generateStaticParams() {
  return FORMAT_PAGES.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const page = getPage(slug)
  if (!page) return {}

  const url = `${BASE_URL}/formats/${page.slug}`

  return {
    title: page.metaTitle,
    description: page.metaDescription,
    alternates: { canonical: url },
    openGraph: {
      title: page.metaTitle,
      description: page.metaDescription,
      url,
      type: "article",
      images: [
        {
          url: "/images/carouselabs-landing.png",
          width: 1920,
          height: 957,
          alt: page.metaTitle,
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

function buildFaqJsonLd(page: FormatPage) {
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

function buildItemListJsonLd(page: FormatPage) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: heading(page),
    itemListElement: page.items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: page.formatType === "content-calendar" ? parseCalendarWeek(item).theme : item.replace(/^"|"$/g, "").slice(0, 200),
    })),
  }
}

export default async function FormatPageRoute({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const page = getPage(slug)
  if (!page) notFound()

  const related = getRelated(page)
  const topicSlug = page.slug.slice(`${page.formatType}-for-`.length)
  const relatedIdeasNiches = IDEAS_CROSS_LINK[topicSlug] ?? []
  const faqJsonLd = buildFaqJsonLd(page)
  const itemListJsonLd = buildItemListJsonLd(page)
  const emoji = FORMAT_EMOJI[page.formatType]
  const formatLabel = FORMAT_LABELS[page.formatType]

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

      {/* ── SECTION 1 — HERO ── */}
      <section className="relative px-6 pt-20 pb-14 sm:pt-24 sm:pb-16 bg-[#FBFAF6]">
        <div className="relative z-10 max-w-3xl mx-auto text-center flex flex-col items-center gap-6">
          <AnimatedSection delay={0}>
            <nav className="flex items-center justify-center gap-1.5 text-[12.5px] text-[#9CA3AF]">
              <Link href="/" className="hover:text-[#6B7280] transition-colors">
                Home
              </Link>
              <span>/</span>
              <Link href="/formats" className="hover:text-[#6B7280] transition-colors">
                Formats
              </Link>
              <span>/</span>
              <span className="text-[#6B7280]">{page.topic}</span>
            </nav>
          </AnimatedSection>

          <AnimatedSection delay={0.02}>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#E5E3DE] text-[12px] font-semibold text-[#7C3AED]">
                <span aria-hidden>{emoji}</span>
                {formatLabel}
              </div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F3F0FF] border border-[#E5DEF7] text-[12px] font-medium text-[#4B5563]">
                <Sparkles size={11} strokeWidth={2.2} className="text-[#7C3AED]" />
                {page.topic}
              </div>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.05}>
            <h1 className="text-[clamp(2.1rem,5.2vw,3.3rem)] font-extrabold leading-[1.1] tracking-[-0.03em] text-[#0A0A0A]">
              {heading(page)}
            </h1>
          </AnimatedSection>

          <AnimatedSection delay={0.1}>
            <p className="max-w-2xl text-[17px] text-[#4B5563] leading-[1.65]">{page.intro}</p>
          </AnimatedSection>
        </div>
      </section>

      {/* ── SECTION 2 — ITEMS LIST (main content) ── */}
      <section className="px-6 py-16 sm:py-24">
        <div className="max-w-5xl mx-auto flex flex-col gap-12">
          <AnimatedSection className="text-center">
            <h2 className="text-[clamp(1.8rem,4vw,2.75rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              {itemsSectionLabel(page)}
            </h2>
          </AnimatedSection>

          {page.formatType === "content-calendar" ? (
            <div className="grid sm:grid-cols-2 gap-5">
              {page.items.map((item, i) => {
                const week = parseCalendarWeek(item)
                return (
                  <AnimatedSection key={i} delay={(i % 2) * 0.05}>
                    <div className="h-full flex flex-col gap-4 p-6 rounded-2xl border border-[#E5E3DE] bg-[#FFFDF8]">
                      <div className="flex items-center gap-3">
                        <div className="shrink-0 w-10 h-10 rounded-xl bg-[#EDE9FE] flex items-center justify-center">
                          <CalendarDays size={18} className="text-[#7C3AED]" strokeWidth={2.2} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[12px] font-semibold uppercase tracking-wide text-[#7C3AED]">
                            {week.label}
                          </span>
                          <span className="text-[17px] font-bold leading-snug text-[#0A0A0A]">
                            {week.theme}
                          </span>
                        </div>
                      </div>
                      <ul className="flex flex-col gap-2.5 pl-1">
                        {week.ideas.map((idea, j) => (
                          <li key={j} className="flex items-start gap-2.5">
                            <span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-[#7C3AED]" />
                            <span className="text-[14.5px] leading-[1.55] text-[#4B5563]">
                              {idea}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </AnimatedSection>
                )
              })}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {page.items.map((item, i) => (
                <AnimatedSection key={i} delay={(i % 2) * 0.05}>
                  <div className="h-full flex items-start gap-4 p-6 rounded-2xl border border-[#E5E3DE] bg-[#FFFDF8] shadow-[0_10px_30px_rgba(10,10,10,0.05)]">
                    <span className="shrink-0 w-9 h-9 rounded-xl bg-[#7C3AED] text-white text-[15px] font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <p className="text-[15px] leading-[1.65] text-[#3F3F46] pt-0.5">{item}</p>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── SECTION 3 — WHY IT WORKS ── */}
      <section className="px-6 py-16 sm:py-20 bg-[#FBFAF6]">
        <div className="max-w-3xl mx-auto flex flex-col gap-6">
          <AnimatedSection>
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-10 h-10 rounded-xl bg-[#EDE9FE] flex items-center justify-center mt-1">
                <Lightbulb size={18} className="text-[#7C3AED]" strokeWidth={2.2} />
              </div>
              <div className="flex flex-col gap-2">
                <h2 className="text-[13px] font-bold uppercase tracking-wider text-[#7C3AED]">
                  Why It Works
                </h2>
                <p className="text-[16px] leading-[1.75] text-[#3F3F46]">{page.whyItWorks}</p>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── SECTION 4 — TIPS ── */}
      <section className="px-6 py-16 sm:py-20">
        <div className="max-w-3xl mx-auto flex flex-col gap-8">
          <AnimatedSection className="text-center">
            <h2 className="text-[clamp(1.6rem,3.4vw,2.2rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              Tips for {formatLabel} About {page.topic}
            </h2>
          </AnimatedSection>
          <div className="grid sm:grid-cols-2 gap-4">
            {page.tips.map((tip, i) => (
              <AnimatedSection key={i} delay={(i % 2) * 0.05}>
                <div className="h-full flex items-start gap-3 p-5 rounded-2xl border border-[#E5DEF7] bg-[#F3F0FF]">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-[#7C3AED] text-white text-[12px] font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-[14.5px] leading-[1.6] text-[#3F3F46]">{tip}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 5 — PRODUCT SCREENSHOT + SOFT CTA ── */}
      <section className="px-6 py-16 sm:py-20 bg-[#FBFAF6]">
        <AnimatedFadeIn className="max-w-[900px] mx-auto flex flex-col items-center gap-8">
          <figure className="flex flex-col items-center gap-4 w-full">
            <div className="w-full rounded-2xl overflow-hidden border border-[#E5E3DE] shadow-[0_24px_60px_rgba(10,10,10,0.14)] bg-white">
              <Image
                src="/images/carouselabs-landing.png"
                alt={`CarouseLabs generates ${formatLabel.toLowerCase()} like these automatically for ${page.topic}`}
                width={1920}
                height={957}
                sizes="(max-width: 900px) 100vw, 900px"
                className="w-full h-auto"
              />
            </div>
            <figcaption className="text-[13px] text-[#6B7280] text-center">
              CarouseLabs generates {formatLabel.toLowerCase()} like these automatically for{" "}
              {page.topic.toLowerCase()} content
            </figcaption>
          </figure>
          <Link
            href={SIGNUP_URL}
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-[15px] font-semibold text-white transition-colors shadow-[0_10px_30px_rgba(124,58,237,0.25)]"
          >
            Generate {formatLabel} for {page.topic}
            <ArrowRight size={16} strokeWidth={2.2} />
          </Link>
        </AnimatedFadeIn>
      </section>

      {/* ── CROSS-LINK — related /ideas/[niche] pages where the topic overlaps ── */}
      {relatedIdeasNiches.length > 0 && (
        <section className="px-6 pt-16 sm:pt-20">
          <AnimatedSection className="max-w-3xl mx-auto flex flex-wrap items-center gap-x-6 gap-y-2">
            <span className="text-[12.5px] font-semibold text-[#9CA3AF] uppercase tracking-wide">
              More ideas for this topic
            </span>
            {relatedIdeasNiches.map((n) => (
              <Link
                key={n.slug}
                href={`/ideas/${n.slug}`}
                className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-[#7C3AED] hover:text-[#6D28D9] transition-colors"
              >
                Carousel ideas for {n.name}
                <ArrowRight size={12} strokeWidth={2.2} />
              </Link>
            ))}
          </AnimatedSection>
        </section>
      )}

      {/* ── SECTION 6 — FAQ ── */}
      <section className="px-6 py-16 sm:py-20">
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

      {/* ── SECTION 7 — RELATED FORMATS & TOPICS ── */}
      {related.length > 0 && (
        <section className="px-6 py-16 sm:py-20 bg-[#FBFAF6]">
          <div className="max-w-5xl mx-auto flex flex-col gap-8">
            <AnimatedSection className="text-center">
              <h2 className="text-[clamp(1.5rem,3.2vw,2.1rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
                More Formats &amp; Topics
              </h2>
            </AnimatedSection>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {related.map((r, i) => (
                <AnimatedSection key={r.slug} delay={i * 0.04}>
                  <Link
                    href={`/formats/${r.slug}`}
                    className="group h-full flex flex-col justify-between gap-4 p-5 rounded-2xl border border-[#E5E3DE] bg-white hover:border-[#C4B5FD] hover:shadow-[0_12px_30px_rgba(124,58,237,0.10)] transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <span aria-hidden className="text-[15px]">
                        {FORMAT_EMOJI[r.formatType]}
                      </span>
                      <span className="text-[14px] font-semibold text-[#0A0A0A] leading-snug">
                        {FORMAT_LABELS[r.formatType]} for {r.topic}
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#7C3AED]">
                      View page
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
                href="/formats"
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#7C3AED] hover:text-[#6D28D9] transition-colors"
              >
                Browse all 216 format pages
                <ArrowRight size={13} strokeWidth={2.2} />
              </Link>
            </AnimatedSection>
          </div>
        </section>
      )}

      {/* ── SECTION 8 — CTA ── */}
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
              Stop Staring at a Blank Page — Generate These in Seconds
            </h2>
            <p className="max-w-xl text-[16px] text-white/85 leading-[1.65]">
              CarouseLabs turns a topic into a written caption and a fully designed carousel in
              minutes — built for {page.topic.toLowerCase()} content and everything else you post.
            </p>
            <Link
              href={SIGNUP_URL}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white hover:bg-[#F3F0FF] text-[16px] font-semibold text-[#7C3AED] transition-colors shadow-[0_10px_30px_rgba(0,0,0,0.18)]"
            >
              Start creating for free
              <ArrowRight size={17} strokeWidth={2.2} />
            </Link>
            <p className="text-[12px] text-white/70">No credit card required</p>
          </div>
        </AnimatedSection>
      </section>
    </>
  )
}
