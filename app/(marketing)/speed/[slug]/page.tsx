import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { notFound } from "next/navigation"
import {
  ArrowRight,
  Timer,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react"
import {
  AnimatedSection,
  AnimatedFadeIn,
} from "@/components/marketing/AnimatedSection"
import { ExploreOtherHubs } from "@/components/marketing/ExploreOtherHubs"
import { SPEED_PAGES, type SpeedPage } from "../data"

const SIGNUP_URL = "https://carouselabs.com/signup"

const bySlug = new Map<string, SpeedPage>(SPEED_PAGES.map((p) => [p.slug, p]))

function getPage(slug: string): SpeedPage | undefined {
  return bySlug.get(slug)
}

// Only the slugs in SPEED_PAGES are valid; any other /speed/* path 404s.
export const dynamicParams = false

export function generateStaticParams() {
  return SPEED_PAGES.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const page = getPage(slug)
  if (!page) return {}

  return {
    title: page.metaTitle,
    description: page.metaDescription,
    alternates: { canonical: `https://carouselabs.com/speed/${page.slug}` },
    openGraph: {
      title: page.metaTitle,
      description: page.metaDescription,
      url: `https://carouselabs.com/speed/${page.slug}`,
      type: "website",
      images: [
        {
          url: "/images/carouselabs-landing.png",
          width: 1920,
          height: 957,
          alt: `CarouseLabs — ${page.headline}`,
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

function buildFaqJsonLd(page: SpeedPage) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  }
}

export default async function SpeedPageRoute({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const page = getPage(slug)
  if (!page) notFound()

  const related = page.relatedSlugs
    .map((s) => getPage(s))
    .filter((p): p is SpeedPage => Boolean(p))

  const faqJsonLd = buildFaqJsonLd(page)

  return (
    <>
      {/* FAQ structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* ── SECTION 1 — HERO WITH TIME BADGE ── */}
      <section className="relative overflow-hidden px-6 pt-20 pb-24 sm:pt-24 sm:pb-28">
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(600px circle at 50% 0%, rgba(124,58,237,0.18), transparent 70%), linear-gradient(180deg, #F3F0FF 0%, #F9F7F2 60%)",
          }}
        />
        <div className="relative z-10 max-w-3xl mx-auto text-center flex flex-col items-center gap-7">
          <AnimatedSection delay={0}>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#7C3AED] text-[12px] font-medium text-white">
              <Timer size={12} strokeWidth={2.4} />
              {page.timeClaim}
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.05}>
            <h1 className="text-[clamp(2.4rem,6vw,3.75rem)] font-extrabold leading-[1.06] tracking-[-0.03em] text-[#0A0A0A]">
              {page.headline}
            </h1>
          </AnimatedSection>

          <AnimatedSection delay={0.1}>
            <p className="max-w-xl text-[18px] text-[#4B5563] leading-[1.6]">
              {page.hookIntro}
            </p>
          </AnimatedSection>

          <AnimatedSection delay={0.15}>
            <Link
              href={SIGNUP_URL}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-[15px] font-semibold text-white transition-colors shadow-[0_10px_30px_rgba(124,58,237,0.28)]"
            >
              Try it free — {page.timeClaim.toLowerCase()}
              <ArrowRight size={16} strokeWidth={2.2} />
            </Link>
          </AnimatedSection>
        </div>
      </section>

      {/* ── SECTION 2 — BEFORE / AFTER ── */}
      <section className="px-6 py-16 sm:py-20">
        <div className="max-w-4xl mx-auto flex flex-col gap-10">
          <AnimatedSection className="text-center">
            <h2 className="text-[clamp(1.8rem,4vw,2.75rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              Before vs. After
            </h2>
          </AnimatedSection>
          <div className="grid sm:grid-cols-2 gap-5">
            <AnimatedSection delay={0}>
              <div className="h-full flex flex-col gap-4 p-7 rounded-2xl border border-[#F0D9CE] bg-[#FFF8F5]">
                <div className="flex items-center gap-3">
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-[#FDE7DD] flex items-center justify-center">
                    <XCircle size={18} className="text-[#EA580C]" strokeWidth={2.2} />
                  </div>
                  <span className="text-[13px] font-semibold uppercase tracking-wide text-[#EA580C]">
                    Before
                  </span>
                </div>
                <p className="text-[16px] leading-[1.6] text-[#3F3F46]">{page.beforeAfter.before}</p>
              </div>
            </AnimatedSection>
            <AnimatedSection delay={0.08}>
              <div className="h-full flex flex-col gap-4 p-7 rounded-2xl border border-[#E5DEF7] bg-[#F3F0FF]">
                <div className="flex items-center gap-3">
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-[#EDE9FE] flex items-center justify-center">
                    <CheckCircle2 size={18} className="text-[#7C3AED]" strokeWidth={2.2} />
                  </div>
                  <span className="text-[13px] font-semibold uppercase tracking-wide text-[#7C3AED]">
                    After
                  </span>
                </div>
                <p className="text-[16px] leading-[1.6] text-[#1F2937] font-medium">
                  {page.beforeAfter.after}
                </p>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ── SECTION 3 — HOW-FAST TIMELINE ── */}
      <section className="px-6 py-16 sm:py-20 bg-[#FBFAF6]">
        <div className="max-w-3xl mx-auto flex flex-col gap-10">
          <AnimatedSection className="text-center">
            <h2 className="text-[clamp(1.8rem,4vw,2.75rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              How It Happens in {page.timeClaim}
            </h2>
          </AnimatedSection>
          <ol className="relative flex flex-col gap-6 pl-2">
            <div
              aria-hidden
              className="absolute left-[23px] top-4 bottom-4 w-px bg-[#E5DEF7]"
            />
            {page.howFast.map((step, i) => (
              <AnimatedSection key={i} delay={i * 0.08}>
                <li className="relative flex items-start gap-5">
                  <span className="relative z-10 shrink-0 w-11 h-11 rounded-full bg-[#7C3AED] text-white flex items-center justify-center">
                    <Clock size={18} strokeWidth={2.2} />
                  </span>
                  <div className="flex-1 flex flex-col gap-1 pt-2">
                    <span className="text-[13px] font-semibold text-[#7C3AED]">
                      {step.timeEstimate}
                    </span>
                    <p className="text-[16px] leading-[1.55] text-[#3F3F46]">{step.step}</p>
                  </div>
                </li>
              </AnimatedSection>
            ))}
          </ol>
        </div>
      </section>

      {/* ── SECTION 4 — PRODUCT SCREENSHOT ── */}
      <section className="px-6 py-20">
        <AnimatedFadeIn className="max-w-[900px] mx-auto">
          <figure className="flex flex-col items-center gap-4">
            <div className="w-full rounded-2xl overflow-hidden border border-[#E5E3DE] shadow-[0_24px_60px_rgba(10,10,10,0.14)] bg-[#FFFDF8]">
              <Image
                src="/images/carouselabs-landing.png"
                alt={`CarouseLabs AI content studio — ${page.headline}`}
                width={1920}
                height={957}
                priority
                sizes="(max-width: 900px) 100vw, 900px"
                className="w-full h-auto"
              />
            </div>
            <figcaption className="text-[13px] text-[#6B7280]">
              CarouseLabs — {page.timeClaim.toLowerCase()}, no design tool required
            </figcaption>
          </figure>
        </AnimatedFadeIn>
      </section>

      {/* ── SECTION 5 — REAL EXAMPLE ── */}
      <section className="px-6 py-16 sm:py-20 bg-[#FBFAF6]">
        <div className="max-w-3xl mx-auto flex flex-col gap-8">
          <AnimatedSection className="text-center">
            <h2 className="text-[clamp(1.8rem,4vw,2.75rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              A Real Example
            </h2>
          </AnimatedSection>
          <AnimatedSection delay={0.05}>
            <div className="relative rounded-2xl bg-white border border-[#E5DEF7] p-7 sm:p-9">
              <Zap
                size={28}
                className="absolute top-6 right-6 text-[#EDE9FE]"
                strokeWidth={2}
                fill="currentColor"
                aria-hidden
              />
              <p className="relative text-[16px] sm:text-[17px] leading-[1.7] text-[#3F3F46]">
                {page.realExample}
              </p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── SECTION 6 — FAQ ── */}
      <section className="px-6 py-16 sm:py-20">
        <div className="max-w-3xl mx-auto flex flex-col gap-10">
          <AnimatedSection className="text-center">
            <h2 className="text-[clamp(1.8rem,4vw,2.75rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              Frequently Asked Questions
            </h2>
          </AnimatedSection>
          <div className="flex flex-col gap-4">
            {page.faq.map((item, i) => (
              <AnimatedSection key={i} delay={i * 0.05}>
                <div className="p-6 rounded-2xl border border-[#E5E3DE] bg-[#FFFDF8]">
                  <h3 className="text-[16px] font-semibold text-[#0A0A0A] mb-2">
                    {item.question}
                  </h3>
                  <p className="text-[15px] leading-[1.6] text-[#4B5563]">{item.answer}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 7 — RELATED PAGES ── */}
      {related.length > 0 && (
        <section className="px-6 py-16 sm:py-20 bg-[#FBFAF6]">
          <div className="max-w-5xl mx-auto flex flex-col gap-10">
            <AnimatedSection className="text-center">
              <h2 className="text-[clamp(1.8rem,4vw,2.75rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
                Keep Going
              </h2>
            </AnimatedSection>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {related.map((r, i) => (
                <AnimatedSection key={r.slug} delay={i * 0.05}>
                  <Link
                    href={`/speed/${r.slug}`}
                    className="group h-full flex flex-col justify-between gap-6 p-6 rounded-2xl border border-[#E5E3DE] bg-white hover:border-[#C4B5FD] hover:shadow-[0_12px_30px_rgba(124,58,237,0.12)] transition-all"
                  >
                    <div className="flex flex-col gap-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#7C3AED]">
                        <Timer size={11} strokeWidth={2.4} />
                        {r.timeClaim}
                      </span>
                      <span className="text-[15px] font-semibold text-[#0A0A0A] leading-snug">
                        {r.headline}
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#7C3AED]">
                      View page
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
        </section>
      )}

      {/* ── SECTION 8 — URGENT CTA ── */}
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
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 text-[12px] font-medium text-white">
              <Timer size={12} strokeWidth={2.4} />
              Takes {page.timeClaim.toLowerCase()} — start now
            </div>
            <h2 className="max-w-2xl text-[clamp(1.9rem,4.5vw,3rem)] font-bold leading-[1.1] tracking-[-0.025em] text-white">
              Stop Planning to Post. Post.
            </h2>
            <p className="max-w-md text-[16px] text-white/85 leading-[1.6]">
              Every minute spent deciding whether to write it is a minute you could've spent
              already publishing it. CarouseLabs closes that gap.
            </p>
            <Link
              href={SIGNUP_URL}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white hover:bg-[#F3F0FF] text-[15px] font-semibold text-[#7C3AED] transition-colors shadow-[0_10px_30px_rgba(0,0,0,0.18)]"
            >
              Get started free
              <ArrowRight size={16} strokeWidth={2.2} />
            </Link>
            <p className="text-[12px] text-white/70">No credit card required</p>
          </div>
        </AnimatedSection>
      </section>

      <ExploreOtherHubs />
    </>
  )
}
