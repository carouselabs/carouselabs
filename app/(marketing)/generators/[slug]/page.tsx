import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { notFound } from "next/navigation"
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react"
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
import { GENERATOR_PAGES, type GeneratorPage } from "../data"

const BASE_URL = "https://carouselabs.com"
const SIGNUP_URL = "https://carouselabs.com/signup"

const bySlug = new Map<string, GeneratorPage>(GENERATOR_PAGES.map((p) => [p.slug, p]))

function getPage(slug: string): GeneratorPage | undefined {
  return bySlug.get(slug)
}

function getRelated(page: GeneratorPage): GeneratorPage[] {
  return page.relatedSlugs
    .map((s) => bySlug.get(s))
    .filter((p): p is GeneratorPage => Boolean(p))
    .slice(0, 4)
}

// Only the 40 slugs in GENERATOR_PAGES are valid; any other /generators/* path 404s.
export const dynamicParams = false

export function generateStaticParams() {
  return GENERATOR_PAGES.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const page = getPage(slug)
  if (!page) return {}

  const url = `${BASE_URL}/generators/${page.slug}`

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
          alt: page.h1,
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

function buildFaqJsonLd(page: GeneratorPage) {
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

export default async function GeneratorPageRoute({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const page = getPage(slug)
  if (!page) notFound()

  const related = getRelated(page)
  const faqJsonLd = buildFaqJsonLd(page)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* ── SECTION 1 — HERO (clean cream, no purple gradient) ── */}
      <section className="relative px-6 pt-20 pb-16 sm:pt-24 sm:pb-20 bg-[#FBFAF6]">
        <div className="relative z-10 max-w-3xl mx-auto text-center flex flex-col items-center gap-6">
          <AnimatedSection delay={0}>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#E5E3DE] text-[12px] font-medium text-[#7C3AED]">
              <Sparkles size={11} strokeWidth={2.2} />
              Free to try · No credit card required
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.05}>
            <h1 className="text-[clamp(2.1rem,5.2vw,3.3rem)] font-extrabold leading-[1.1] tracking-[-0.03em] text-[#0A0A0A]">
              {page.h1}
            </h1>
          </AnimatedSection>

          <AnimatedSection delay={0.1}>
            <p className="max-w-2xl text-[17px] text-[#4B5563] leading-[1.7]">{page.intro}</p>
          </AnimatedSection>

          <AnimatedSection delay={0.15}>
            <Link
              href={SIGNUP_URL}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-[15px] font-semibold text-white transition-colors shadow-[0_10px_30px_rgba(124,58,237,0.25)]"
            >
              Try It Free
              <ArrowRight size={16} strokeWidth={2.2} />
            </Link>
          </AnimatedSection>
        </div>
      </section>

      {/* ── SECTION 2 — PRODUCT SCREENSHOT ── */}
      <section className="px-6 py-16">
        <AnimatedFadeIn className="max-w-[900px] mx-auto">
          <figure className="flex flex-col items-center gap-4">
            <div className="w-full rounded-2xl overflow-hidden border border-[#E5E3DE] shadow-[0_24px_60px_rgba(10,10,10,0.14)] bg-[#FFFDF8]">
              <Image
                src="/images/carouselabs-landing.png"
                alt={`CarouseLabs — the AI tool for ${page.keyword.toLowerCase()}`}
                width={1920}
                height={957}
                priority
                sizes="(max-width: 900px) 100vw, 900px"
                className="w-full h-auto"
              />
            </div>
            <figcaption className="text-[13px] text-[#6B7280] text-center">
              CarouseLabs — the AI tool for {page.keyword.toLowerCase()}
            </figcaption>
          </figure>
        </AnimatedFadeIn>
      </section>

      {/* ── SECTION 3 — HOW IT WORKS ── */}
      <section className="px-6 py-16 sm:py-20 bg-[#FBFAF6]">
        <div className="max-w-3xl mx-auto flex flex-col gap-10">
          <AnimatedSection className="text-center">
            <h2 className="text-[clamp(1.7rem,3.8vw,2.6rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              How It Works
            </h2>
          </AnimatedSection>

          <ol className="flex flex-col gap-5">
            {page.howItWorks.map((step, i) => (
              <AnimatedSection key={i} delay={i * 0.05}>
                <li className="flex items-start gap-5 p-6 rounded-2xl border border-[#E5E3DE] bg-[#FFFDF8]">
                  <span className="shrink-0 w-11 h-11 rounded-2xl bg-[#7C3AED] text-white text-[17px] font-extrabold flex items-center justify-center shadow-[0_8px_20px_rgba(124,58,237,0.25)]">
                    {i + 1}
                  </span>
                  <div className="flex-1 flex flex-col gap-1.5 pt-1">
                    <h3 className="text-[17px] font-bold leading-snug tracking-[-0.01em] text-[#0A0A0A]">
                      {step.step}
                    </h3>
                    <p className="text-[15px] leading-[1.7] text-[#3F3F46]">{step.description}</p>
                  </div>
                </li>
              </AnimatedSection>
            ))}
          </ol>
        </div>
      </section>

      {/* ── SECTION 4 — USE CASES / WHO USES THIS ── */}
      <section className="px-6 py-16 sm:py-20">
        <div className="max-w-5xl mx-auto flex flex-col gap-10">
          <AnimatedSection className="text-center">
            <h2 className="text-[clamp(1.7rem,3.8vw,2.6rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              Who Uses This
            </h2>
          </AnimatedSection>

          <div className="grid sm:grid-cols-2 gap-5">
            {page.useCases.map((useCase, i) => (
              <AnimatedSection key={i} delay={i * 0.05}>
                <div className="h-full flex items-start gap-4 p-6 rounded-2xl border border-[#E5E3DE] bg-[#FFFDF8]">
                  <div className="shrink-0 w-9 h-9 rounded-xl bg-[#EDE9FE] flex items-center justify-center">
                    <CheckCircle2 size={18} className="text-[#7C3AED]" strokeWidth={2.2} />
                  </div>
                  <p className="text-[15px] leading-[1.65] text-[#3F3F46] pt-1">{useCase}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 5 — PRODUCT SCREENSHOT 2 ── */}
      <section className="px-6 py-16 bg-[#FBFAF6]">
        <AnimatedFadeIn className="max-w-[900px] mx-auto">
          <figure className="flex flex-col items-center gap-4">
            <div className="w-full rounded-2xl overflow-hidden border border-[#E5E3DE] shadow-[0_24px_60px_rgba(10,10,10,0.14)] bg-white">
              <Image
                src="/images/carouselabs-ideas.png"
                alt={`CarouseLabs idea generation — fueling ${page.keyword.toLowerCase()}`}
                width={1920}
                height={957}
                sizes="(max-width: 900px) 100vw, 900px"
                className="w-full h-auto"
              />
            </div>
            <figcaption className="text-[13px] text-[#6B7280] text-center">
              Never run out of ideas — CarouseLabs surfaces fresh angles daily
            </figcaption>
          </figure>
        </AnimatedFadeIn>
      </section>

      {/* ── SECTION 6 — FAQ ── */}
      <section className="px-6 py-16 sm:py-20">
        <div className="max-w-3xl mx-auto flex flex-col gap-10">
          <AnimatedSection className="text-center">
            <h2 className="text-[clamp(1.7rem,3.8vw,2.6rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              Frequently Asked Questions
            </h2>
          </AnimatedSection>
          <AnimatedSection delay={0.05}>
            <div className="rounded-2xl border border-[#E5E3DE] bg-[#FFFDF8] px-6 sm:px-8">
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

      {/* ── SECTION 7 — RELATED TOOLS ── */}
      {related.length > 0 && (
        <section className="px-6 pb-16 sm:pb-20 bg-[#FBFAF6]">
          <div className="max-w-5xl mx-auto flex flex-col gap-8 pt-16 sm:pt-20">
            <AnimatedSection className="text-center">
              <h2 className="text-[clamp(1.5rem,3.2vw,2.1rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
                Related Tools
              </h2>
            </AnimatedSection>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {related.map((r, i) => (
                <AnimatedSection key={r.slug} delay={i * 0.05}>
                  <Link
                    href={`/generators/${r.slug}`}
                    className="group h-full flex flex-col justify-between gap-4 p-5 rounded-2xl border border-[#E5E3DE] bg-white hover:border-[#C4B5FD] hover:shadow-[0_12px_30px_rgba(124,58,237,0.10)] transition-all"
                  >
                    <span className="text-[14px] font-semibold text-[#0A0A0A] leading-snug">
                      {r.keyword}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#7C3AED]">
                      Explore
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
                href="/generators"
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#7C3AED] hover:text-[#6D28D9] transition-colors"
              >
                Browse all AI tools
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
              Try {page.keyword} Free
            </h2>
            <p className="max-w-xl text-[16px] text-white/85 leading-[1.65]">
              Stop spending hours on content. CarouseLabs handles the ideas, captions, and visuals —
              you just hit publish.
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
