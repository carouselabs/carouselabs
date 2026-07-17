import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { notFound } from "next/navigation"
import {
  ArrowRight,
  ArrowDown,
  BookOpen,
  Check,
  Clock,
  Hash,
  Image as ImageIcon,
  LayoutGrid,
  Lightbulb,
  PenLine,
  Sparkles,
  Target,
  Users,
  X,
} from "lucide-react"
import {
  AnimatedSection,
  AnimatedFadeIn,
} from "@/components/marketing/AnimatedSection"
import { niches, type Niche } from "../../for/data"

const SIGNUP_URL = "https://carouselabs.com/signup"

const bySlug = new Map<string, Niche>(niches.map((n) => [n.slug, n]))

function getNiche(slug: string): Niche | undefined {
  return bySlug.get(slug)
}

// Icons for the four fixed tools, applied in order (idea, caption, carousel, image).
const TOOL_ICONS = [Lightbulb, PenLine, LayoutGrid, ImageIcon] as const

// Only the 112 slugs below are valid; any other /tools/* path 404s.
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

  const title = `AI Content Tools for ${niche.name} — Caption, Image & Carousel Generator`
  const description = `CarouseLabs gives ${niche.name} AI tools to generate captions, images, and carousels in minutes. Save hours every week on LinkedIn and social media content.`
  const url = `https://carouselabs.com/tools/${niche.slug}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      images: [
        {
          url: "/images/carouselabs-landing.png",
          width: 1920,
          height: 957,
          alt: `AI content tools for ${niche.name} — CarouseLabs`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/images/carouselabs-landing.png"],
    },
  }
}

/** SECTION 12 — FAQ structured data (rendered as JSON-LD in the page). */
function buildFaqJsonLd(niche: Niche) {
  const toolList = niche.tool_benefits.map((t) => t.tool_name).join(", ")
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `What AI tools does CarouseLabs offer for ${niche.name}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `CarouseLabs gives ${niche.name} a complete AI content studio in one place: ${toolList}. Together they take you from a trending idea to a finished, on-brand LinkedIn carousel — caption, slides, and visuals — in about 15 minutes, without a designer or a ghostwriter.`,
        },
      },
      {
        "@type": "Question",
        name: `How much time does CarouseLabs save ${niche.name} on content creation?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Done manually, a single carousel typically takes ${niche.name.toLowerCase()} two to three hours — finding an idea, writing the caption, and designing slides in Canva. With CarouseLabs it takes about 15 minutes, which adds up to several hours saved every week once you batch a week of content in one sitting.`,
        },
      },
      {
        "@type": "Question",
        name: `Can ${niche.name} use CarouseLabs for Instagram and Twitter/X too?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Yes. While CarouseLabs is built around LinkedIn carousels, its AI image generator produces visuals sized for Instagram and Twitter/X as well, so ${niche.name} can repurpose one piece of content across all three platforms in a single pass rather than rebuilding it for each.`,
        },
      },
    ],
  }
}

export default async function NicheToolsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const niche = getNiche(slug)
  if (!niche) notFound()

  const faqJsonLd = buildFaqJsonLd(niche)

  // Related niches, used for tools → tools internal links (3 max).
  const relatedTools = niche.related_niches
    .map((s) => getNiche(s))
    .filter((n): n is Niche => Boolean(n))
    .slice(0, 3)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* ── SECTION 1 — HERO (purple gradient) ── */}
      <section className="relative px-6 pt-20 pb-20 sm:pt-24 sm:pb-24 overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(900px circle at 50% -10%, rgba(255,255,255,0.16), transparent 60%), linear-gradient(160deg, #7C3AED 0%, #6D28D9 55%, #5B21B6 100%)",
          }}
        />
        <div className="relative z-10 max-w-3xl mx-auto text-center flex flex-col items-center gap-6">
          <AnimatedSection delay={0}>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/12 border border-white/20 text-[12px] font-medium text-white backdrop-blur-sm">
              <Sparkles size={11} strokeWidth={2.2} />
              AI content studio for {niche.name}
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.05}>
            <h1 className="text-[clamp(2.1rem,5.2vw,3.4rem)] font-extrabold leading-[1.08] tracking-[-0.03em] text-white">
              AI Content Tools for {niche.name} — Generate Captions, Images &amp;
              Carousels
            </h1>
          </AnimatedSection>

          <AnimatedSection delay={0.1}>
            <p className="max-w-2xl text-[18px] text-white/85 leading-[1.6]">
              CarouseLabs gives {niche.name} a complete AI content studio —
              caption writer, image generator, and carousel creator — all in one
              place.
            </p>
          </AnimatedSection>

          <AnimatedSection delay={0.15}>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Link
                href={SIGNUP_URL}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white hover:bg-[#F3F0FF] text-[15px] font-semibold text-[#7C3AED] transition-colors shadow-[0_10px_30px_rgba(0,0,0,0.18)]"
              >
                Try Free
                <ArrowRight size={16} strokeWidth={2.2} />
              </Link>
              <Link
                href={`/how-to/${niche.slug}`}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white/10 hover:bg-white/16 border border-white/25 text-[15px] font-semibold text-white transition-colors"
              >
                See How It Works
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── SECTION 1.5 — INTRO (why an AI content studio for this niche) ── */}
      <section className="px-6 py-16 sm:py-20 bg-[#FBFAF6]">
        <div className="max-w-3xl mx-auto flex flex-col gap-6">
          <AnimatedSection>
            <h2 className="text-[clamp(1.5rem,3.2vw,2.1rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              Why {niche.name} Need an AI Content Studio
            </h2>
          </AnimatedSection>
          <AnimatedSection delay={0.05}>
            <p className="text-[16px] leading-[1.75] text-[#3F3F46]">
              {niche.why_linkedin}
            </p>
          </AnimatedSection>
          <AnimatedSection delay={0.1}>
            <p className="text-[16px] leading-[1.75] text-[#3F3F46]">
              {niche.long_description}
            </p>
          </AnimatedSection>
          <AnimatedSection delay={0.15}>
            <p className="text-[16px] leading-[1.75] text-[#3F3F46]">
              That is exactly what CarouseLabs handles for {niche.name}: the AI
              idea generator, caption writer, carousel creator, and image
              generator turn the work you already do into consistent, on-brand
              content in minutes — so showing up on LinkedIn stops competing with
              the rest of your week.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* ── SECTION 2 — RESULTS (before/after) ── */}
      <section className="px-6 py-16 sm:py-20">
        <div className="max-w-5xl mx-auto flex flex-col gap-10">
          <AnimatedSection className="text-center">
            <h2 className="text-[clamp(1.7rem,3.8vw,2.6rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              What {niche.name} Achieve with CarouseLabs
            </h2>
          </AnimatedSection>

          <div className="grid sm:grid-cols-3 gap-5">
            {niche.results.map((r, i) => (
              <AnimatedSection key={i} delay={i * 0.06}>
                <div className="h-full flex flex-col gap-5 p-7 rounded-2xl border border-[#E5E3DE] bg-[#FFFDF8]">
                  <p className="text-[13px] font-semibold uppercase tracking-[0.04em] text-[#6B7280]">
                    {r.metric}
                  </p>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <X size={15} strokeWidth={2.6} className="shrink-0 text-[#DC2626]" />
                      <span className="text-[15px] text-[#B91C1C] line-through decoration-[#F1B4B4]">
                        {r.before}
                      </span>
                    </div>
                    <ArrowDown size={16} strokeWidth={2.2} className="text-[#9CA3AF]" />
                    <div className="flex items-center gap-2">
                      <Check size={15} strokeWidth={2.6} className="shrink-0 text-[#16A34A]" />
                      <span className="text-[18px] font-bold text-[#15803D]">
                        {r.after}
                      </span>
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 3 — 4 TOOLS IN DETAIL (2x2) ── */}
      <section className="px-6 py-16 sm:py-20 bg-[#FBFAF6]">
        <div className="max-w-5xl mx-auto flex flex-col gap-10">
          <AnimatedSection className="text-center">
            <h2 className="text-[clamp(1.7rem,3.8vw,2.6rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              The CarouseLabs Toolkit for {niche.name}
            </h2>
          </AnimatedSection>

          <div className="grid sm:grid-cols-2 gap-5">
            {niche.tool_benefits.map((tool, i) => {
              const Icon = TOOL_ICONS[i % TOOL_ICONS.length]
              return (
                <AnimatedSection key={i} delay={i * 0.05}>
                  <div className="h-full flex flex-col gap-4 p-7 rounded-2xl border border-[#E5E3DE] bg-white">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-[#EDE9FE] flex items-center justify-center">
                        <Icon size={20} strokeWidth={2.2} className="text-[#7C3AED]" />
                      </div>
                      <h3 className="text-[18px] font-bold tracking-[-0.01em] text-[#0A0A0A]">
                        {tool.tool_name}
                      </h3>
                    </div>

                    <p className="text-[15px] leading-[1.65] text-[#3F3F46]">
                      {tool.benefit}
                    </p>

                    <div className="inline-flex items-center gap-1.5 self-start px-3 py-1.5 rounded-full bg-[#F0FDF4] border border-[#CDEBD8] text-[12px] font-semibold text-[#15803D]">
                      <Clock size={11} strokeWidth={2.4} />
                      {tool.time_saved}
                    </div>

                    <figure className="mt-auto rounded-xl border-l-2 border-[#C4B5FD] bg-[#F7F5FF] px-4 py-3">
                      <figcaption className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#8B5CF6] mb-1">
                        Example output
                      </figcaption>
                      <p className="text-[14px] leading-[1.55] text-[#4B5563]">
                        {tool.example_output}
                      </p>
                    </figure>
                  </div>
                </AnimatedSection>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── SECTION 4 — PRODUCT SCREENSHOT 1 ── */}
      <section className="px-6 py-16">
        <AnimatedFadeIn className="max-w-[900px] mx-auto">
          <figure className="flex flex-col items-center gap-4">
            <div className="w-full rounded-2xl overflow-hidden border border-[#E5E3DE] shadow-[0_24px_60px_rgba(10,10,10,0.14)] bg-[#FFFDF8]">
              <Image
                src="/images/carouselabs-landing.png"
                alt={`CarouseLabs AI content studio — the caption, image, and carousel tools ${niche.name} use`}
                width={1920}
                height={957}
                priority
                sizes="(max-width: 900px) 100vw, 900px"
                className="w-full h-auto"
              />
            </div>
            <figcaption className="text-[13px] text-[#6B7280] text-center">
              Everything {niche.name} need to create content — in one AI-powered
              studio
            </figcaption>
          </figure>
        </AnimatedFadeIn>
      </section>

      {/* ── SECTION 5 — USE CASES ── */}
      <section className="px-6 py-16 sm:py-20 bg-[#FBFAF6]">
        <div className="max-w-4xl mx-auto flex flex-col gap-10">
          <AnimatedSection className="text-center">
            <h2 className="text-[clamp(1.7rem,3.8vw,2.6rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              5 Ways {niche.name} Use CarouseLabs Every Week
            </h2>
          </AnimatedSection>

          <div className="flex flex-col gap-4">
            {niche.use_cases.map((useCase, i) => (
              <AnimatedSection key={i} delay={i * 0.05}>
                <div className="flex items-start gap-5 p-6 rounded-2xl border border-[#E5E3DE] bg-white">
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-[#7C3AED] flex items-center justify-center text-[16px] font-bold text-white">
                    {i + 1}
                  </div>
                  <p className="text-[15px] leading-[1.65] text-[#3F3F46] pt-1.5">
                    {useCase}
                  </p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 6 — EXAMPLE POST IDEAS ── */}
      <section className="px-6 py-16 sm:py-20">
        <div className="max-w-5xl mx-auto flex flex-col gap-10">
          <AnimatedSection className="text-center">
            <h2 className="text-[clamp(1.7rem,3.8vw,2.6rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              Content {niche.name} Create with CarouseLabs
            </h2>
          </AnimatedSection>

          <div className="grid sm:grid-cols-2 gap-4">
            {niche.example_post_ideas.map((idea, i) => (
              <AnimatedSection key={i} delay={(i % 2) * 0.05}>
                <Link
                  href={SIGNUP_URL}
                  className="group h-full flex flex-col justify-between gap-4 p-6 rounded-2xl border border-[#E5E3DE] bg-[#FFFDF8] hover:border-[#C4B5FD] hover:shadow-[0_12px_30px_rgba(124,58,237,0.10)] transition-all"
                >
                  <p className="text-[15px] leading-[1.55] text-[#1F2937]">
                    &ldquo;{idea}&rdquo;
                  </p>
                  <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#7C3AED]">
                    Create this
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

      {/* ── SECTION 7 — PRODUCT SCREENSHOT 2 ── */}
      <section className="px-6 py-16 bg-[#FBFAF6]">
        <AnimatedFadeIn className="max-w-[900px] mx-auto">
          <figure className="flex flex-col items-center gap-4">
            <div className="w-full rounded-2xl overflow-hidden border border-[#E5E3DE] shadow-[0_24px_60px_rgba(10,10,10,0.14)] bg-[#FFFDF8]">
              <Image
                src="/images/carouselabs-ideas.png"
                alt={`CarouseLabs generates 10 AI post ideas daily, tailored to ${niche.name}`}
                width={1920}
                height={957}
                sizes="(max-width: 900px) 100vw, 900px"
                className="w-full h-auto"
              />
            </div>
            <figcaption className="text-[13px] text-[#6B7280] text-center">
              10 AI-generated post ideas daily — tailored to {niche.name}
            </figcaption>
          </figure>
        </AnimatedFadeIn>
      </section>

      {/* ── SECTION 8 — COMPARISON TO DOING IT MANUALLY ── */}
      <section className="px-6 py-16 sm:py-20">
        <div className="max-w-5xl mx-auto flex flex-col gap-10">
          <AnimatedSection className="text-center">
            <h2 className="text-[clamp(1.7rem,3.8vw,2.6rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              CarouseLabs vs Doing It Yourself
            </h2>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 gap-5">
            <AnimatedSection>
              <div className="h-full flex flex-col gap-4 p-7 rounded-2xl border border-[#F1D4D4] bg-[#FEF6F6]">
                <div className="inline-flex items-center gap-2 self-start px-3 py-1.5 rounded-full bg-[#FBE3E3] text-[12px] font-semibold text-[#B91C1C]">
                  <X size={12} strokeWidth={2.6} />
                  Doing it manually
                </div>
                <p className="text-[15px] leading-[1.7] text-[#7F1D1D]">
                  {niche.before_carouselabs}
                </p>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={0.06}>
              <div className="h-full flex flex-col gap-4 p-7 rounded-2xl border border-[#CDEBD8] bg-[#F5FCF7]">
                <div className="inline-flex items-center gap-2 self-start px-3 py-1.5 rounded-full bg-[#DCF5E4] text-[12px] font-semibold text-[#15803D]">
                  <Check size={12} strokeWidth={2.6} />
                  With CarouseLabs
                </div>
                <p className="text-[15px] leading-[1.7] text-[#14532D]">
                  {niche.after_carouselabs}
                </p>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ── SECTION 9 — HASHTAGS ── */}
      <section className="px-6 py-16 sm:py-20 bg-[#FBFAF6]">
        <div className="max-w-4xl mx-auto flex flex-col gap-8">
          <AnimatedSection className="text-center">
            <h2 className="text-[clamp(1.6rem,3.5vw,2.3rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              Hashtags {niche.name} Use with Their CarouseLabs Content
            </h2>
          </AnimatedSection>

          <AnimatedFadeIn className="flex flex-wrap items-center justify-center gap-3">
            {niche.hashtags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#F3F0FF] border border-[#E5DEF7] text-[14px] font-medium text-[#7C3AED]"
              >
                <Hash size={12} strokeWidth={2.4} />
                {tag.replace(/^#/, "")}
              </span>
            ))}
          </AnimatedFadeIn>
        </div>
      </section>

      {/* ── SECTION 10 — RELATED RESOURCES (internal linking) ── */}
      <section className="px-6 py-16 sm:py-20">
        <div className="max-w-5xl mx-auto flex flex-col gap-8">
          <AnimatedSection className="text-center">
            <h2 className="text-[clamp(1.5rem,3.2vw,2.1rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              Related Resources for {niche.name}
            </h2>
          </AnimatedSection>

          {/* Same-niche siblings */}
          <AnimatedSection className="grid sm:grid-cols-3 gap-4">
            <Link
              href={`/for/${niche.slug}`}
              className="group flex items-center justify-between gap-3 p-6 rounded-2xl border border-[#E5DEF7] bg-[#F3F0FF] hover:border-[#C4B5FD] transition-colors"
            >
              <span className="flex items-center gap-2.5 text-[15px] font-semibold text-[#7C3AED]">
                <Users size={16} strokeWidth={2.2} />
                CarouseLabs for {niche.name}
              </span>
              <ArrowRight
                size={16}
                strokeWidth={2.2}
                className="shrink-0 text-[#7C3AED] group-hover:translate-x-0.5 transition-transform"
              />
            </Link>
            <Link
              href={`/ideas/${niche.slug}`}
              className="group flex items-center justify-between gap-3 p-6 rounded-2xl border border-[#E5DEF7] bg-[#F3F0FF] hover:border-[#C4B5FD] transition-colors"
            >
              <span className="flex items-center gap-2.5 text-[15px] font-semibold text-[#7C3AED]">
                <Lightbulb size={16} strokeWidth={2.2} />
                Carousel ideas for {niche.name}
              </span>
              <ArrowRight
                size={16}
                strokeWidth={2.2}
                className="shrink-0 text-[#7C3AED] group-hover:translate-x-0.5 transition-transform"
              />
            </Link>
            <Link
              href={`/how-to/${niche.slug}`}
              className="group flex items-center justify-between gap-3 p-6 rounded-2xl border border-[#E5DEF7] bg-[#F3F0FF] hover:border-[#C4B5FD] transition-colors"
            >
              <span className="flex items-center gap-2.5 text-[15px] font-semibold text-[#7C3AED]">
                <BookOpen size={16} strokeWidth={2.2} />
                How-to guide for {niche.name}
              </span>
              <ArrowRight
                size={16}
                strokeWidth={2.2}
                className="shrink-0 text-[#7C3AED] group-hover:translate-x-0.5 transition-transform"
              />
            </Link>
          </AnimatedSection>

          {/* Emphasized cross-link — full content strategy for this niche */}
          <AnimatedSection>
            <Link
              href={`/strategy/${niche.slug}`}
              className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl border border-[#C4B5FD] bg-white hover:shadow-[0_12px_30px_rgba(124,58,237,0.12)] transition-all"
            >
              <span className="inline-flex items-center gap-2.5 text-[16px] font-medium text-[#1F2937]">
                <Target size={17} strokeWidth={2.2} className="text-[#7C3AED]" />
                See the full strategy &rarr;{" "}
                <span className="font-semibold text-[#7C3AED]">
                  the complete LinkedIn playbook for {niche.name}
                </span>
              </span>
              <ArrowRight
                size={16}
                strokeWidth={2.2}
                className="shrink-0 text-[#7C3AED] group-hover:translate-x-0.5 transition-transform"
              />
            </Link>
          </AnimatedSection>

          {/* Related niches — same page type */}
          {relatedTools.length > 0 && (
            <div className="flex flex-col gap-4">
              <AnimatedSection>
                <p className="text-[13px] font-semibold text-[#6B7280] text-center">
                  AI tools for related niches
                </p>
              </AnimatedSection>
              <div className="grid sm:grid-cols-3 gap-4">
                {relatedTools.map((r, i) => (
                  <AnimatedSection key={r.slug} delay={i * 0.05}>
                    <Link
                      href={`/tools/${r.slug}`}
                      className="group h-full flex items-center justify-between gap-3 p-6 rounded-2xl border border-[#E5E3DE] bg-[#FFFDF8] hover:border-[#C4B5FD] hover:shadow-[0_12px_30px_rgba(124,58,237,0.10)] transition-all"
                    >
                      <span className="text-[15px] font-semibold text-[#0A0A0A] leading-snug">
                        AI tools for {r.name}
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
            </div>
          )}

          {/* Comparisons */}
          <AnimatedSection className="flex flex-wrap items-center justify-center gap-3 pt-2">
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
            <Link
              href="/for"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold text-[#6B7280] bg-white border border-[#E5E3DE] hover:text-[#7C3AED] hover:border-[#C4B5FD] transition-colors"
            >
              Browse all niches
            </Link>
          </AnimatedSection>
        </div>
      </section>

      {/* ── SECTION 11 — CTA (purple) ── */}
      <section className="px-6 pb-24">
        <AnimatedSection className="relative max-w-4xl mx-auto rounded-3xl overflow-hidden px-8 py-16 text-center">
          <div
            aria-hidden
            className="absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(500px circle at 50% 0%, rgba(255,255,255,0.18), transparent 70%), linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)",
            }}
          />
          <div className="relative flex flex-col items-center gap-6">
            <h2 className="max-w-2xl text-[clamp(1.7rem,4vw,2.6rem)] font-bold leading-[1.1] tracking-[-0.025em] text-white">
              Start Using AI Content Tools as a{" "}
              {niche.name.replace(/s$/, "")} — Free
            </h2>
            <p className="max-w-xl text-[16px] text-white/85 leading-[1.65]">
              Stop spending hours on content. CarouseLabs handles the ideas,
              captions, and visuals — you just hit publish.
            </p>
            <Link
              href={SIGNUP_URL}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white hover:bg-[#F3F0FF] text-[16px] font-semibold text-[#7C3AED] transition-colors shadow-[0_10px_30px_rgba(0,0,0,0.18)]"
            >
              Start creating for free
              <ArrowRight size={17} strokeWidth={2.2} />
            </Link>
            <p className="text-[12px] text-white/70">
              Free tier available &middot; No credit card required
            </p>
          </div>
        </AnimatedSection>
      </section>
    </>
  )
}
