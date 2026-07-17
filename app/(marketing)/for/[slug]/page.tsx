import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { notFound } from "next/navigation"
import {
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Hash,
  Users,
  Zap,
  Eye,
  XCircle,
  LayoutGrid,
  Trophy,
  Quote,
} from "lucide-react"
import {
  AnimatedSection,
  AnimatedFadeIn,
} from "@/components/marketing/AnimatedSection"
import { niches, type Niche } from "../data"

const SIGNUP_URL = "https://carouselabs.com/signup"

const bySlug = new Map<string, Niche>(niches.map((n) => [n.slug, n]))

function getNiche(slug: string): Niche | undefined {
  return bySlug.get(slug)
}

// Only the 112 slugs below are valid; any other /for/* path 404s.
export const dynamicParams = false

export function generateStaticParams() {
  return niches.map((n) => ({ slug: n.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const niche = getNiche(slug)
  if (!niche) return {}

  return {
    title: niche.seo_title,
    description: niche.seo_description,
    alternates: { canonical: `https://carouselabs.com/for/${niche.slug}` },
    openGraph: {
      title: niche.seo_title,
      description: niche.seo_description,
      url: `https://carouselabs.com/for/${niche.slug}`,
      type: "website",
      images: [
        {
          url: "/images/carouselabs-landing.png",
          width: 1920,
          height: 957,
          alt: `CarouseLabs — AI content studio for ${niche.name}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: niche.seo_title,
      description: niche.seo_description,
      images: ["/images/carouselabs-landing.png"],
    },
  }
}

/** SECTION 11 — FAQ structured data (rendered as JSON-LD in the page). */
function buildFaqJsonLd(niche: Niche) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `How does CarouseLabs help ${niche.name}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `${niche.subheadline} CarouseLabs ${niche.how_carouselabs_helps[0]
            .charAt(0)
            .toLowerCase()}${niche.how_carouselabs_helps[0].slice(1)}, and ${niche.how_carouselabs_helps[1]
            .charAt(0)
            .toLowerCase()}${niche.how_carouselabs_helps[1].slice(1)}.`,
        },
      },
      {
        "@type": "Question",
        name: `What kind of content can ${niche.name} create with CarouseLabs?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `${niche.name} use CarouseLabs to create ${niche.content_types
            .join(", ")
            .toLowerCase()} — as LinkedIn carousels, captions, and images generated in minutes.`,
        },
      },
      {
        "@type": "Question",
        name: `How long does it take ${niche.name} to create a LinkedIn carousel with CarouseLabs?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Minutes. ${niche.name} go from a trending idea to a finished, on-brand LinkedIn carousel with a written caption and generated images in about 15 minutes — no designer or ghostwriter required.`,
        },
      },
    ],
  }
}

export default async function NicheForPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const niche = getNiche(slug)
  if (!niche) notFound()

  const related = niche.related_niches
    .map((s) => getNiche(s))
    .filter((n): n is Niche => Boolean(n))

  const faqJsonLd = buildFaqJsonLd(niche)

  return (
    <>
      {/* SECTION 11 — FAQ structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* ── SECTION 1 — HERO ── */}
      <section className="relative overflow-hidden px-6 pt-20 pb-24 sm:pt-24 sm:pb-28">
        {/* Purple brand gradient background (#7C3AED) */}
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
              <Sparkles size={11} strokeWidth={2.2} />
              CarouseLabs for {niche.name}
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.05}>
            <h1 className="text-[clamp(2.4rem,6vw,3.75rem)] font-extrabold leading-[1.06] tracking-[-0.03em] text-[#0A0A0A]">
              {niche.headline}
            </h1>
          </AnimatedSection>

          <AnimatedSection delay={0.1}>
            <p className="max-w-xl text-[18px] text-[#4B5563] leading-[1.6]">
              {niche.subheadline}
            </p>
          </AnimatedSection>

          <AnimatedSection delay={0.15}>
            <Link
              href={SIGNUP_URL}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-[15px] font-semibold text-white transition-colors shadow-[0_10px_30px_rgba(124,58,237,0.28)]"
            >
              {niche.cta}
              <ArrowRight size={16} strokeWidth={2.2} />
            </Link>
          </AnimatedSection>
        </div>
      </section>

      {/* ── SECTION 2 — PRODUCT SCREENSHOT 1 ── */}
      <section className="px-6 pb-20">
        <AnimatedFadeIn className="max-w-[900px] mx-auto">
          <figure className="flex flex-col items-center gap-4">
            <div className="w-full rounded-2xl overflow-hidden border border-[#E5E3DE] shadow-[0_24px_60px_rgba(10,10,10,0.14)] bg-[#FFFDF8]">
              <Image
                src="/images/carouselabs-landing.png"
                alt={`CarouseLabs AI content studio landing page, used by ${niche.name} to generate LinkedIn content`}
                width={1920}
                height={957}
                priority
                sizes="(max-width: 900px) 100vw, 900px"
                className="w-full h-auto"
              />
            </div>
            <figcaption className="text-[13px] text-[#6B7280]">
              CarouseLabs — AI Content Studio for {niche.name}
            </figcaption>
          </figure>
        </AnimatedFadeIn>
      </section>

      {/* ── SECTION 3 — PAIN POINTS ── */}
      <section className="px-6 py-16 sm:py-20">
        <div className="max-w-5xl mx-auto flex flex-col gap-10">
          <AnimatedSection className="text-center">
            <h2 className="text-[clamp(1.8rem,4vw,2.75rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              The {niche.name} Content Problem
            </h2>
          </AnimatedSection>
          <div className="grid sm:grid-cols-2 gap-5">
            {niche.pain_points.map((point, i) => (
              <AnimatedSection key={i} delay={i * 0.05}>
                <div className="h-full flex items-start gap-4 p-6 rounded-2xl border border-[#F0D9CE] bg-[#FFF8F5]">
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-[#FDE7DD] flex items-center justify-center">
                    <AlertTriangle size={18} className="text-[#EA580C]" strokeWidth={2.2} />
                  </div>
                  <p className="text-[15px] leading-[1.55] text-[#3F3F46] pt-1.5">{point}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 4 — HOW CAROUSELABS HELPS ── */}
      <section className="px-6 py-16 sm:py-20 bg-[#FBFAF6]">
        <div className="max-w-5xl mx-auto flex flex-col gap-10">
          <AnimatedSection className="text-center">
            <h2 className="text-[clamp(1.8rem,4vw,2.75rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              How CarouseLabs Solves This for {niche.name}
            </h2>
          </AnimatedSection>
          <div className="grid sm:grid-cols-2 gap-5">
            {niche.how_carouselabs_helps.map((help, i) => (
              <AnimatedSection key={i} delay={i * 0.05}>
                <div className="h-full flex items-start gap-4 p-6 rounded-2xl border border-[#E5DEF7] bg-white">
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-[#EDE9FE] flex items-center justify-center">
                    <CheckCircle2 size={18} className="text-[#7C3AED]" strokeWidth={2.2} />
                  </div>
                  <p className="text-[15px] leading-[1.55] text-[#3F3F46] pt-1.5">{help}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 4b — CONTENT STRATEGY ── */}
      <section className="px-6 py-16 sm:py-20">
        <div className="max-w-4xl mx-auto flex flex-col gap-10">
          <AnimatedSection className="text-center">
            <h2 className="text-[clamp(1.8rem,4vw,2.75rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              Proven LinkedIn Content Strategy for {niche.name}
            </h2>
          </AnimatedSection>
          <ol className="flex flex-col gap-5">
            {niche.content_strategy.map((tip, i) => (
              <AnimatedSection key={i} delay={i * 0.05}>
                <li className="flex items-start gap-5 p-6 rounded-2xl border border-[#E5E3DE] bg-[#FFFDF8]">
                  <span className="shrink-0 w-9 h-9 rounded-xl bg-[#7C3AED] text-white text-[15px] font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <p className="flex-1 text-[16px] leading-[1.6] text-[#3F3F46]">{tip}</p>
                </li>
              </AnimatedSection>
            ))}
          </ol>
        </div>
      </section>

      {/* ── SECTION 5 — PRODUCT SCREENSHOT 2 ── */}
      <section className="px-6 py-20">
        <AnimatedFadeIn className="max-w-[900px] mx-auto">
          <figure className="flex flex-col items-center gap-4">
            <div className="w-full rounded-2xl overflow-hidden border border-[#E5E3DE] shadow-[0_24px_60px_rgba(10,10,10,0.14)] bg-[#FFFDF8]">
              <Image
                src="/images/carouselabs-ideas.png"
                alt={`CarouseLabs generate dashboard producing trending post ideas for ${niche.name}`}
                width={1920}
                height={957}
                sizes="(max-width: 900px) 100vw, 900px"
                className="w-full h-auto"
              />
            </div>
            <figcaption className="text-[13px] text-[#6B7280]">
              10 trending post ideas generated daily for {niche.name}
            </figcaption>
          </figure>
        </AnimatedFadeIn>
      </section>

      {/* ── SECTION 5b — WHY GROWING FAST ── */}
      <section className="px-6 py-16 sm:py-20 bg-[#FBFAF6]">
        <div className="max-w-4xl mx-auto flex flex-col gap-8">
          <AnimatedSection className="text-center">
            <h2 className="text-[clamp(1.8rem,4vw,2.75rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              Why {niche.name} Are Growing Fast on LinkedIn
            </h2>
          </AnimatedSection>
          <AnimatedSection delay={0.05}>
            <p className="text-[17px] leading-[1.7] text-[#3F3F46]">{niche.why_linkedin}</p>
          </AnimatedSection>
          <AnimatedSection delay={0.1}>
            <p className="text-[16px] leading-[1.7] text-[#4B5563]">{niche.long_description}</p>
          </AnimatedSection>
          <div className="grid sm:grid-cols-3 gap-4 pt-2">
            {[
              { icon: <Users size={20} className="text-[#7C3AED]" strokeWidth={2} />, stat: "1B+ users", label: "professionals reachable on LinkedIn" },
              { icon: <LayoutGrid size={20} className="text-[#7C3AED]" strokeWidth={2} />, stat: "3x more reach", label: "carousel posts vs. plain text" },
              { icon: <Eye size={20} className="text-[#7C3AED]" strokeWidth={2} />, stat: "5x profile views", label: "from posting consistently" },
            ].map((box, i) => (
              <AnimatedSection key={i} delay={0.15 + i * 0.05}>
                <div className="h-full flex flex-col gap-2 p-6 rounded-2xl border border-[#E5DEF7] bg-white text-center items-center">
                  <div className="w-11 h-11 rounded-xl bg-[#EDE9FE] flex items-center justify-center mb-1">
                    {box.icon}
                  </div>
                  <span className="text-[22px] font-extrabold text-[#0A0A0A] tracking-[-0.02em]">
                    {box.stat}
                  </span>
                  <span className="text-[13px] text-[#6B7280] leading-[1.4]">{box.label}</span>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 6 — EXAMPLE POST IDEAS ── */}
      <section className="px-6 py-16 sm:py-20 bg-[#FBFAF6]">
        <div className="max-w-5xl mx-auto flex flex-col gap-10">
          <AnimatedSection className="text-center">
            <h2 className="text-[clamp(1.8rem,4vw,2.75rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              10 LinkedIn Post Ideas for {niche.name}
            </h2>
          </AnimatedSection>
          <div className="grid sm:grid-cols-2 gap-4">
            {niche.example_post_ideas.map((idea, i) => (
              <AnimatedSection key={i} delay={(i % 2) * 0.05}>
                <Link
                  href={SIGNUP_URL}
                  className="group h-full flex items-start gap-4 p-5 rounded-2xl bg-[#F3F0FF] border border-transparent hover:border-[#C4B5FD] transition-colors"
                >
                  <span className="shrink-0 w-7 h-7 rounded-lg bg-[#7C3AED] text-white text-[13px] font-semibold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-[15px] leading-[1.5] text-[#1F2937] font-medium">
                    {idea}
                  </span>
                  <ArrowRight
                    size={16}
                    strokeWidth={2.2}
                    className="shrink-0 mt-1 text-[#7C3AED] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all"
                  />
                </Link>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 7 — CONTENT TYPES ── */}
      <section className="px-6 py-16 sm:py-20">
        <div className="max-w-4xl mx-auto flex flex-col gap-8">
          <AnimatedSection className="text-center">
            <h2 className="text-[clamp(1.8rem,4vw,2.75rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              Best Content Formats for {niche.name}
            </h2>
          </AnimatedSection>
          <AnimatedSection className="flex flex-wrap justify-center gap-3">
            {niche.content_types.map((type, i) => (
              <span
                key={i}
                className="inline-flex items-center px-4 py-2 rounded-full border border-[#7C3AED] text-[14px] font-medium text-[#7C3AED] bg-transparent"
              >
                {type}
              </span>
            ))}
          </AnimatedSection>
        </div>
      </section>

      {/* ── SECTION 7b — COMMON CONTENT MISTAKES ── */}
      <section className="px-6 py-16 sm:py-20 bg-[#FBFAF6]">
        <div className="max-w-5xl mx-auto flex flex-col gap-10">
          <AnimatedSection className="text-center">
            <h2 className="text-[clamp(1.8rem,4vw,2.75rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              Content Mistakes {niche.name} Make (And How to Avoid Them)
            </h2>
          </AnimatedSection>
          <div className="grid sm:grid-cols-2 gap-5">
            {niche.common_mistakes.map((item, i) => (
              <AnimatedSection key={i} delay={(i % 2) * 0.05}>
                <div className="h-full flex flex-col gap-4 p-6 rounded-2xl border border-[#E5E3DE] bg-white">
                  <div className="flex items-start gap-3">
                    <XCircle size={20} className="shrink-0 mt-0.5 text-[#DC2626]" strokeWidth={2} />
                    <p className="text-[15px] leading-[1.55] text-[#3F3F46] font-medium">
                      {item.mistake}
                    </p>
                  </div>
                  <div className="flex items-start gap-3 pt-4 border-t border-[#F0EEE8]">
                    <CheckCircle2 size={20} className="shrink-0 mt-0.5 text-[#7C3AED]" strokeWidth={2} />
                    <p className="text-[15px] leading-[1.55] text-[#4B5563]">
                      <span className="font-semibold text-[#7C3AED]">CarouseLabs Fix: </span>
                      {item.fix}
                    </p>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 7c — REAL CAROUSEL EXAMPLES ── */}
      <section className="px-6 py-16 sm:py-20">
        <div className="max-w-5xl mx-auto flex flex-col gap-10">
          <AnimatedSection className="text-center">
            <h2 className="text-[clamp(1.8rem,4vw,2.75rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              What Your Carousels Could Look Like
            </h2>
            <p className="mt-3 text-[16px] text-[#6B7280]">
              Two carousels CarouseLabs could generate for {niche.name}, slide by slide.
            </p>
          </AnimatedSection>
          <div className="grid md:grid-cols-2 gap-6">
            {niche.carousel_examples.map((example, i) => (
              <AnimatedSection key={i} delay={i * 0.08}>
                <div className="h-full flex flex-col gap-5 p-7 rounded-2xl border border-[#E5DEF7] bg-[#FFFDF8]">
                  <div className="flex items-center gap-3">
                    <div className="shrink-0 w-10 h-10 rounded-xl bg-[#7C3AED] flex items-center justify-center">
                      <LayoutGrid size={18} className="text-white" strokeWidth={2} />
                    </div>
                    <h3 className="text-[18px] font-bold leading-snug text-[#0A0A0A]">
                      {example.title}
                    </h3>
                  </div>
                  <ol className="flex flex-col gap-3">
                    {example.slides.map((slide, j) => (
                      <li key={j} className="flex items-start gap-3">
                        <span className="shrink-0 w-6 h-6 rounded-md bg-[#EDE9FE] text-[#7C3AED] text-[12px] font-bold flex items-center justify-center mt-0.5">
                          {j + 1}
                        </span>
                        <span className="flex-1 text-[14px] leading-[1.55] text-[#4B5563]">
                          {slide}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 8 — HASHTAGS ── */}
      <section className="px-6 py-16 sm:py-20 bg-[#FBFAF6]">
        <div className="max-w-4xl mx-auto flex flex-col gap-8">
          <AnimatedSection className="text-center">
            <h2 className="text-[clamp(1.8rem,4vw,2.75rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              Top Hashtags for {niche.name} Content
            </h2>
          </AnimatedSection>
          <AnimatedSection className="flex flex-wrap justify-center gap-3">
            {niche.hashtags.map((tag, i) => {
              const keyword = tag.replace(/^#/, "")
              return (
                <a
                  key={i}
                  href={`https://www.linkedin.com/feed/hashtag/?keywords=${keyword}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-[14px] font-semibold text-[#7C3AED] bg-[#F3F0FF] hover:bg-[#EDE9FE] transition-colors"
                >
                  <Hash size={13} strokeWidth={2.4} />
                  {keyword}
                </a>
              )
            })}
          </AnimatedSection>
        </div>
      </section>

      {/* ── SECTION 9 — RELATED NICHES ── */}
      {related.length > 0 && (
        <section className="px-6 py-16 sm:py-20">
          <div className="max-w-5xl mx-auto flex flex-col gap-10">
            <AnimatedSection className="text-center">
              <h2 className="text-[clamp(1.8rem,4vw,2.75rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
                Also Popular With
              </h2>
            </AnimatedSection>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {related.map((r, i) => (
                <AnimatedSection key={r.slug} delay={i * 0.05}>
                  <Link
                    href={`/for/${r.slug}`}
                    className="group h-full flex flex-col justify-between gap-6 p-6 rounded-2xl border border-[#E5E3DE] bg-[#FFFDF8] hover:border-[#C4B5FD] hover:shadow-[0_12px_30px_rgba(124,58,237,0.12)] transition-all"
                  >
                    <span className="text-[16px] font-semibold text-[#0A0A0A] leading-snug">
                      {r.name}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#7C3AED]">
                      View content ideas
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

      {/* ── SECTION 9b — WHAT THEY ACHIEVE ── */}
      <section className="px-6 py-16 sm:py-20 bg-[#FBFAF6]">
        <div className="max-w-5xl mx-auto flex flex-col gap-10">
          <AnimatedSection className="text-center">
            <h2 className="text-[clamp(1.8rem,4vw,2.75rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              What {niche.name} Achieve with CarouseLabs
            </h2>
          </AnimatedSection>
          <div className="grid sm:grid-cols-3 gap-5">
            {niche.success_metrics.map((metric, i) => (
              <AnimatedSection key={i} delay={i * 0.05}>
                <div className="h-full flex flex-col gap-3 p-6 rounded-2xl border border-[#E5DEF7] bg-white">
                  <div className="w-11 h-11 rounded-xl bg-[#EDE9FE] flex items-center justify-center">
                    <Trophy size={20} className="text-[#7C3AED]" strokeWidth={2} />
                  </div>
                  <p className="text-[15px] leading-[1.55] text-[#3F3F46] font-medium">{metric}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
          <AnimatedSection delay={0.15}>
            <figure className="relative rounded-2xl bg-[#7C3AED] px-8 py-10 sm:px-10 overflow-hidden">
              <Quote
                size={44}
                className="absolute top-6 right-6 text-white/15"
                strokeWidth={2}
                aria-hidden
              />
              <blockquote className="relative text-[18px] sm:text-[20px] leading-[1.6] font-medium text-white">
                &ldquo;{niche.testimonial_placeholder}&rdquo;
              </blockquote>
              <figcaption className="relative mt-5 flex items-center gap-2 text-[13px] font-semibold text-white/80">
                <Zap size={14} strokeWidth={2.4} fill="currentColor" />
                Results {niche.name} see with CarouseLabs
              </figcaption>
            </figure>
          </AnimatedSection>
        </div>
      </section>

      {/* ── SECTION 10 — FINAL CTA ── */}
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
              Start Creating {niche.name} Content Today
            </h2>
            <p className="max-w-md text-[16px] text-white/85 leading-[1.6]">
              Join thousands of {niche.name} already using CarouseLabs to turn ideas into
              scroll-stopping LinkedIn carousels, captions, and images.
            </p>
            <Link
              href={SIGNUP_URL}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white hover:bg-[#F3F0FF] text-[15px] font-semibold text-[#7C3AED] transition-colors shadow-[0_10px_30px_rgba(0,0,0,0.18)]"
            >
              {niche.cta}
              <ArrowRight size={16} strokeWidth={2.2} />
            </Link>
            <p className="text-[12px] text-white/70">No credit card required</p>
          </div>
        </AnimatedSection>
      </section>

      {/* ── CROSS-LINK — content ideas for this niche ── */}
      <section className="px-6 pb-6 -mt-6">
        <AnimatedSection className="max-w-4xl mx-auto">
          <Link
            href={`/ideas/${niche.slug}`}
            className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl border border-[#E5DEF7] bg-[#F3F0FF] hover:border-[#C4B5FD] transition-colors"
          >
            <span className="text-[16px] font-medium text-[#1F2937]">
              Looking for content ideas?{" "}
              <span className="font-semibold text-[#7C3AED]">
                See 10 LinkedIn carousel ideas for {niche.name}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5 shrink-0 text-[14px] font-semibold text-[#7C3AED]">
              View ideas
              <ArrowRight
                size={16}
                strokeWidth={2.2}
                className="group-hover:translate-x-0.5 transition-transform"
              />
            </span>
          </Link>
        </AnimatedSection>
      </section>

      {/* ── CROSS-LINK — step-by-step how-to guide for this niche ── */}
      <section className="px-6 pb-6">
        <AnimatedSection className="max-w-4xl mx-auto">
          <Link
            href={`/how-to/${niche.slug}`}
            className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl border border-[#E5DEF7] bg-[#F3F0FF] hover:border-[#C4B5FD] transition-colors"
          >
            <span className="text-[16px] font-medium text-[#1F2937]">
              Learn how &rarr;{" "}
              <span className="font-semibold text-[#7C3AED]">
                Complete guide for {niche.name}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5 shrink-0 text-[14px] font-semibold text-[#7C3AED]">
              Read the guide
              <ArrowRight
                size={16}
                strokeWidth={2.2}
                className="group-hover:translate-x-0.5 transition-transform"
              />
            </span>
          </Link>
        </AnimatedSection>
      </section>

      {/* ── CROSS-LINK — AI tools for this niche ── */}
      <section className="px-6 pb-6">
        <AnimatedSection className="max-w-4xl mx-auto">
          <Link
            href={`/tools/${niche.slug}`}
            className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl border border-[#E5DEF7] bg-[#F3F0FF] hover:border-[#C4B5FD] transition-colors"
          >
            <span className="text-[16px] font-medium text-[#1F2937]">
              Explore AI tools for {niche.name} &rarr;{" "}
              <span className="font-semibold text-[#7C3AED]">
                caption, image &amp; carousel generators
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5 shrink-0 text-[14px] font-semibold text-[#7C3AED]">
              See the tools
              <ArrowRight
                size={16}
                strokeWidth={2.2}
                className="group-hover:translate-x-0.5 transition-transform"
              />
            </span>
          </Link>
        </AnimatedSection>
      </section>

      {/* ── CROSS-LINK — content strategy for this niche ── */}
      <section className="px-6 pb-20">
        <AnimatedSection className="max-w-4xl mx-auto">
          <Link
            href={`/strategy/${niche.slug}`}
            className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl border border-[#E5DEF7] bg-[#F3F0FF] hover:border-[#C4B5FD] transition-colors"
          >
            <span className="text-[16px] font-medium text-[#1F2937]">
              Build your content strategy &rarr;{" "}
              <span className="font-semibold text-[#7C3AED]">
                the complete LinkedIn playbook for {niche.name}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5 shrink-0 text-[14px] font-semibold text-[#7C3AED]">
              See the playbook
              <ArrowRight
                size={16}
                strokeWidth={2.2}
                className="group-hover:translate-x-0.5 transition-transform"
              />
            </span>
          </Link>
        </AnimatedSection>
      </section>

      {/* ── CROSS-LINK — how CarouseLabs compares to alternatives ── */}
      <section className="px-6 pb-24">
        <AnimatedSection className="max-w-4xl mx-auto text-center flex flex-col items-center gap-3">
          <p className="text-[15px] text-[#6B7280]">
            See how CarouseLabs compares to alternatives &rarr;
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/vs/taplio"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold text-[#7C3AED] bg-[#F3F0FF] hover:bg-[#EDE9FE] transition-colors"
            >
              CarouseLabs vs Taplio
            </Link>
            <Link
              href="/vs/canva"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold text-[#7C3AED] bg-[#F3F0FF] hover:bg-[#EDE9FE] transition-colors"
            >
              CarouseLabs vs Canva
            </Link>
          </div>
        </AnimatedSection>
      </section>
    </>
  )
}
