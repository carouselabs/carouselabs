import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { notFound } from "next/navigation"
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Hash,
  Lightbulb,
  Sparkles,
  XCircle,
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

// Only the 112 slugs below are valid; any other /how-to/* path 404s.
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

  const title = `How to Create LinkedIn Content as a ${niche.name} — 2026 Guide`
  const description = `Step-by-step guide for ${niche.name} to create consistent LinkedIn carousels, captions and images. Includes 7 steps, post ideas, and how to do it in under 20 minutes.`
  const url = `https://carouselabs.com/how-to/${niche.slug}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      images: [
        {
          url: "/images/carouselabs-landing.png",
          width: 1920,
          height: 957,
          alt: `How ${niche.name} create LinkedIn content with CarouseLabs`,
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
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `How often should ${niche.name} post on LinkedIn?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Two to three times a week is the sweet spot for ${niche.name}. Consistency beats volume on LinkedIn — a steady rhythm you can actually sustain will outperform a burst of daily posting followed by weeks of silence, because the algorithm rewards reliable creators and your audience needs repeated exposure before they trust you. ${niche.best_posting_times}`,
        },
      },
      {
        "@type": "Question",
        name: `What type of content works best for ${niche.name} on LinkedIn?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `${niche.name} get the best results from ${niche.content_types
            .join(", ")
            .toLowerCase()}. Carousels tend to outperform plain text because they hold attention across multiple slides, and the strongest posts build on these five content pillars: ${niche.content_pillars
            .map((p) => p.split(" — ")[0])
            .join(", ")}.`,
        },
      },
      {
        "@type": "Question",
        name: `How long does it take to create a LinkedIn carousel as a ${niche.name}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Done manually — writing the hook, drafting the caption, and designing slides in Canva — a single carousel typically takes ${niche.name.toLowerCase()} two to three hours. With CarouseLabs it takes about 15 minutes: you pick an idea, add your real detail, and the caption, 7–8 slide carousel, and on-brand visuals are generated for you. ${niche.time_to_first_post}`,
        },
      },
    ],
  }
}

export default async function NicheHowToPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const niche = getNiche(slug)
  if (!niche) notFound()

  const faqJsonLd = buildFaqJsonLd(niche)
  const singular = niche.name.toLowerCase().replace(/s$/, "")

  // Related niches, used for how-to → how-to internal links (3 max).
  const relatedHowTo = niche.related_niches
    .map((s) => getNiche(s))
    .filter((n): n is Niche => Boolean(n))
    .slice(0, 3)

  return (
    <>
      {/* SECTION 12 — FAQ structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* ── SECTION 1 — HERO (clean cream, guide-first, no purple gradient) ── */}
      <section className="relative px-6 pt-20 pb-14 sm:pt-24 sm:pb-16 bg-[#FBFAF6]">
        <div className="relative z-10 max-w-3xl mx-auto text-center flex flex-col items-center gap-6">
          <AnimatedSection delay={0}>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#E5E3DE] text-[12px] font-medium text-[#7C3AED]">
              <Sparkles size={11} strokeWidth={2.2} />
              Complete Guide for {niche.name}
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.05}>
            <h1 className="text-[clamp(2.2rem,5.5vw,3.4rem)] font-extrabold leading-[1.08] tracking-[-0.03em] text-[#0A0A0A]">
              How to Create LinkedIn Content as a {niche.name}: Complete 2026
              Guide
            </h1>
          </AnimatedSection>

          <AnimatedSection delay={0.1}>
            <p className="max-w-2xl text-[18px] text-[#4B5563] leading-[1.6]">
              A step-by-step guide covering everything {niche.name} need to know
              about creating consistent, high-quality LinkedIn content &mdash;
              from finding ideas to posting your first carousel.
            </p>
          </AnimatedSection>

          <AnimatedSection delay={0.15}>
            <div className="inline-flex items-center gap-2 text-[13px] font-medium text-[#6B7280]">
              <BookOpen size={14} strokeWidth={2.2} />
              12 min read
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── SECTION 2 — INTRO ── */}
      <section className="px-6 py-16 sm:py-20">
        <div className="max-w-3xl mx-auto flex flex-col gap-6">
          <AnimatedSection delay={0}>
            <p className="text-[17px] leading-[1.75] text-[#3F3F46]">
              If you&rsquo;re a {singular} who knows LinkedIn matters but never
              quite gets around to posting, this guide is for you. The timing has
              rarely been better: most people in your field either stay silent or
              recycle the same generic updates, which leaves a wide-open lane for
              anyone willing to teach honestly and share what actually works.{" "}
              {niche.why_linkedin} That gap is the opportunity &mdash; the{" "}
              {singular} who publishes specific, useful content becomes the name
              people remember, refer, and reach out to, while equally capable
              peers stay invisible. You already have the expertise; what&rsquo;s
              missing is a repeatable process for turning it into posts without
              sacrificing your actual work. That&rsquo;s exactly what the seven
              steps below give you, along with the post ideas, content pillars,
              and hashtags to start with today.
            </p>
          </AnimatedSection>

          <AnimatedSection delay={0.05}>
            <div className="flex items-start gap-4 p-5 rounded-2xl border border-[#E5DEF7] bg-[#F3F0FF]">
              <div className="shrink-0 w-10 h-10 rounded-xl bg-[#EDE9FE] flex items-center justify-center">
                <Clock size={18} className="text-[#7C3AED]" strokeWidth={2.2} />
              </div>
              <p className="text-[15px] leading-[1.6] text-[#3F3F46] pt-0.5">
                <span className="font-semibold text-[#0A0A0A]">
                  Time to first post with CarouseLabs:{" "}
                </span>
                {niche.time_to_first_post}
              </p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── SECTION 3 — BEFORE AND AFTER ── */}
      <section className="px-6 py-16 sm:py-20 bg-[#FBFAF6]">
        <div className="max-w-5xl mx-auto flex flex-col gap-10">
          <AnimatedSection className="text-center">
            <h2 className="text-[clamp(1.7rem,3.8vw,2.6rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              What Content Creation Looks Like for {niche.name}
            </h2>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 gap-6">
            <AnimatedSection delay={0}>
              <div className="h-full flex flex-col gap-4 p-7 rounded-2xl border border-[#F0D9CE] bg-[#FFF8F5]">
                <div className="flex items-center gap-3">
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-[#FDE7DD] flex items-center justify-center">
                    <XCircle
                      size={18}
                      className="text-[#EA580C]"
                      strokeWidth={2.2}
                    />
                  </div>
                  <h3 className="text-[18px] font-bold text-[#0A0A0A]">
                    The Old Way
                  </h3>
                </div>
                <p className="text-[15px] leading-[1.7] text-[#4B5563]">
                  {niche.before_carouselabs}
                </p>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={0.08}>
              <div className="h-full flex flex-col gap-4 p-7 rounded-2xl border border-[#CDEBD8] bg-[#F4FBF6]">
                <div className="flex items-center gap-3">
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-[#DCF5E4] flex items-center justify-center">
                    <CheckCircle2
                      size={18}
                      className="text-[#16A34A]"
                      strokeWidth={2.2}
                    />
                  </div>
                  <h3 className="text-[18px] font-bold text-[#0A0A0A]">
                    The CarouseLabs Way
                  </h3>
                </div>
                <p className="text-[15px] leading-[1.7] text-[#4B5563]">
                  {niche.after_carouselabs}
                </p>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ── SECTION 4 — 7 STEP GUIDE (main section) ── */}
      <section className="px-6 py-16 sm:py-20">
        <div className="max-w-3xl mx-auto flex flex-col gap-10">
          <AnimatedSection className="text-center">
            <h2 className="text-[clamp(1.7rem,3.8vw,2.6rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              Step-by-Step: How to Create LinkedIn Content as a {niche.name}
            </h2>
          </AnimatedSection>

          <ol className="flex flex-col gap-6">
            {niche.how_to_steps.map((step, i) => (
              <AnimatedSection key={step.step_number} delay={i * 0.04}>
                <li className="flex flex-col gap-5 p-7 rounded-2xl border border-[#E5E3DE] bg-[#FFFDF8]">
                  <div className="flex items-start gap-5">
                    <span className="shrink-0 w-12 h-12 rounded-2xl bg-[#7C3AED] text-white text-[19px] font-extrabold flex items-center justify-center shadow-[0_8px_20px_rgba(124,58,237,0.25)]">
                      {step.step_number}
                    </span>
                    <div className="flex-1 flex flex-col gap-3 pt-1">
                      <h3 className="text-[20px] font-bold leading-snug tracking-[-0.015em] text-[#0A0A0A]">
                        {step.title}
                      </h3>
                      <p className="text-[16px] leading-[1.7] text-[#3F3F46]">
                        {step.description}
                      </p>
                      <div>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F0EEE8] text-[12px] font-semibold text-[#6B7280]">
                          <Clock size={12} strokeWidth={2.4} />
                          {step.time_required}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 rounded-xl bg-[#F3F0FF] border border-[#E5DEF7]">
                    <Lightbulb
                      size={17}
                      className="shrink-0 mt-0.5 text-[#7C3AED]"
                      strokeWidth={2.2}
                    />
                    <p className="text-[14px] leading-[1.6] text-[#4B5563]">
                      <span className="font-semibold text-[#7C3AED]">
                        CarouseLabs Tip:{" "}
                      </span>
                      {step.carouselabs_tip}
                    </p>
                  </div>
                </li>
              </AnimatedSection>
            ))}
          </ol>
        </div>
      </section>

      {/* ── SECTION 5 — PRODUCT SCREENSHOT 1 ── */}
      <section className="px-6 py-16">
        <AnimatedFadeIn className="max-w-[900px] mx-auto">
          <figure className="flex flex-col items-center gap-4">
            <div className="w-full rounded-2xl overflow-hidden border border-[#E5E3DE] shadow-[0_24px_60px_rgba(10,10,10,0.14)] bg-[#FFFDF8]">
              <Image
                src="/images/carouselabs-landing.png"
                alt={`CarouseLabs AI content studio, used by ${niche.name} to work through every step of this guide faster`}
                width={1920}
                height={957}
                priority
                sizes="(max-width: 900px) 100vw, 900px"
                className="w-full h-auto"
              />
            </div>
            <figcaption className="text-[13px] text-[#6B7280]">
              CarouseLabs makes every step in this guide faster for {niche.name}
            </figcaption>
          </figure>
        </AnimatedFadeIn>
      </section>

      {/* ── SECTION 6 — QUICK WINS ── */}
      <section className="px-6 py-16 sm:py-20 bg-[#FBFAF6]">
        <div className="max-w-5xl mx-auto flex flex-col gap-10">
          <AnimatedSection className="text-center">
            <h2 className="text-[clamp(1.7rem,3.8vw,2.6rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              What {niche.name} Achieve in Their First Week with CarouseLabs
            </h2>
          </AnimatedSection>

          <div className="grid sm:grid-cols-3 gap-5">
            {niche.quick_wins.map((win, i) => (
              <AnimatedSection key={i} delay={i * 0.06}>
                <div className="h-full flex flex-col gap-4 p-7 rounded-2xl border border-[#CDEBD8] bg-white">
                  <div className="w-12 h-12 rounded-xl bg-[#DCF5E4] flex items-center justify-center">
                    <CheckCircle2
                      size={22}
                      className="text-[#16A34A]"
                      strokeWidth={2.2}
                    />
                  </div>
                  <p className="text-[15px] leading-[1.6] text-[#3F3F46] font-medium">
                    {win}
                  </p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 7 — CONTENT PILLARS ── */}
      <section className="px-6 py-16 sm:py-20">
        <div className="max-w-4xl mx-auto flex flex-col gap-10">
          <AnimatedSection className="text-center flex flex-col gap-4">
            <h2 className="text-[clamp(1.7rem,3.8vw,2.6rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              The 5 Topics {niche.name} Should Build Their Content Around
            </h2>
            <p className="max-w-2xl mx-auto text-[16px] leading-[1.7] text-[#4B5563]">
              The hardest part of posting consistently isn&rsquo;t writing
              &mdash; it&rsquo;s deciding what to write about every single time.
              Content pillars solve that. Instead of starting from a blank page,
              you rotate through a small set of themes you&rsquo;ve already
              committed to, so every post has a home before you write a word.
              These five pillars are the ones that work for {niche.name}{" "}
              specifically: together they balance teaching, credibility, and
              personality, which is the mix that grows an audience rather than
              just filling a feed. Pick one pillar per post and rotate through
              them over a fortnight. You&rsquo;ll never run dry, your audience
              will know what to expect from you, and your feed will build a
              coherent reputation instead of reading as scattered thoughts.
            </p>
          </AnimatedSection>

          <ol className="flex flex-col gap-5">
            {niche.content_pillars.map((pillar, i) => (
              <AnimatedSection key={i} delay={i * 0.05}>
                <li className="flex items-start gap-5 p-6 rounded-2xl border border-[#E5E3DE] bg-[#FFFDF8]">
                  <span className="shrink-0 w-9 h-9 rounded-xl bg-[#7C3AED] text-white text-[15px] font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <p className="flex-1 text-[16px] leading-[1.6] text-[#3F3F46]">
                    {pillar}
                  </p>
                </li>
              </AnimatedSection>
            ))}
          </ol>
        </div>
      </section>

      {/* ── SECTION 8 — PRODUCT SCREENSHOT 2 ── */}
      <section className="px-6 py-16">
        <AnimatedFadeIn className="max-w-[900px] mx-auto">
          <figure className="flex flex-col items-center gap-4">
            <div className="w-full rounded-2xl overflow-hidden border border-[#E5E3DE] shadow-[0_24px_60px_rgba(10,10,10,0.14)] bg-[#FFFDF8]">
              <Image
                src="/images/carouselabs-ideas.png"
                alt={`CarouseLabs generate dashboard producing 10 trending post ideas daily for ${niche.name}`}
                width={1920}
                height={957}
                sizes="(max-width: 900px) 100vw, 900px"
                className="w-full h-auto"
              />
            </div>
            <figcaption className="text-[13px] text-[#6B7280]">
              CarouseLabs generates 10 trending post ideas daily for{" "}
              {niche.name}
            </figcaption>
          </figure>
        </AnimatedFadeIn>
      </section>

      {/* ── SECTION 9 — EXAMPLE POST IDEAS ── */}
      <section className="px-6 py-16 sm:py-20 bg-[#FBFAF6]">
        <div className="max-w-5xl mx-auto flex flex-col gap-10">
          <AnimatedSection className="text-center">
            <h2 className="text-[clamp(1.7rem,3.8vw,2.6rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              10 LinkedIn Post Ideas to Get You Started as a {niche.name}
            </h2>
          </AnimatedSection>

          <div className="grid sm:grid-cols-2 gap-4">
            {niche.example_post_ideas.map((idea, i) => (
              <AnimatedSection key={i} delay={(i % 2) * 0.05}>
                <Link
                  href={SIGNUP_URL}
                  className="group h-full flex flex-col justify-between gap-4 p-5 rounded-2xl bg-white border border-[#E5E3DE] hover:border-[#C4B5FD] transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <span className="shrink-0 w-7 h-7 rounded-lg bg-[#7C3AED] text-white text-[13px] font-semibold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-[15px] leading-[1.5] text-[#1F2937] font-medium">
                      {idea}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 pl-11 text-[13px] font-semibold text-[#7C3AED]">
                    Create this post
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

      {/* ── SECTION 10 — HASHTAGS ── */}
      <section className="px-6 py-16 sm:py-20">
        <div className="max-w-4xl mx-auto flex flex-col gap-8">
          <AnimatedSection className="text-center">
            <h2 className="text-[clamp(1.7rem,3.8vw,2.6rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              Hashtags {niche.name} Should Use
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

      {/* ── SECTION 11 — CTA ── */}
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
              Ready to Create Your First Post as a {niche.name}?
            </h2>
            <p className="max-w-xl text-[16px] text-white/85 leading-[1.65]">
              Stop spending hours on content. CarouseLabs handles the ideas,
              captions, and visuals &mdash; you just hit publish.
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

      {/* ── SECTION 13 — RELATED RESOURCES (internal linking hub) ── */}
      <section className="px-6 pb-24 -mt-6">
        <div className="max-w-5xl mx-auto flex flex-col gap-8">
          <AnimatedSection className="text-center">
            <h2 className="text-[clamp(1.5rem,3.2vw,2.1rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              Related Resources for {niche.name}
            </h2>
          </AnimatedSection>

          {/* Same-niche siblings — completes the for ↔ ideas ↔ how-to triangle */}
          <AnimatedSection className="grid sm:grid-cols-2 gap-4">
            <Link
              href={`/for/${niche.slug}`}
              className="group flex items-center justify-between gap-4 p-6 rounded-2xl border border-[#E5DEF7] bg-[#F3F0FF] hover:border-[#C4B5FD] transition-colors"
            >
              <span className="text-[15px] font-semibold text-[#7C3AED]">
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
              className="group flex items-center justify-between gap-4 p-6 rounded-2xl border border-[#E5DEF7] bg-[#F3F0FF] hover:border-[#C4B5FD] transition-colors"
            >
              <span className="text-[15px] font-semibold text-[#7C3AED]">
                LinkedIn carousel ideas for {niche.name}
              </span>
              <ArrowRight
                size={16}
                strokeWidth={2.2}
                className="shrink-0 text-[#7C3AED] group-hover:translate-x-0.5 transition-transform"
              />
            </Link>
          </AnimatedSection>

          {/* Related niches — same page type */}
          {relatedHowTo.length > 0 && (
            <div className="flex flex-col gap-4">
              <AnimatedSection>
                <p className="text-[13px] font-semibold text-[#6B7280] text-center">
                  Guides for related niches
                </p>
              </AnimatedSection>
              <div className="grid sm:grid-cols-3 gap-4">
                {relatedHowTo.map((r, i) => (
                  <AnimatedSection key={r.slug} delay={i * 0.05}>
                    <Link
                      href={`/how-to/${r.slug}`}
                      className="group h-full flex flex-col justify-between gap-5 p-6 rounded-2xl border border-[#E5E3DE] bg-[#FFFDF8] hover:border-[#C4B5FD] hover:shadow-[0_12px_30px_rgba(124,58,237,0.12)] transition-all"
                    >
                      <span className="text-[15px] font-semibold text-[#0A0A0A] leading-snug">
                        How to create LinkedIn content as a {r.name}
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
          )}

          {/* Comparison pages */}
          <AnimatedSection className="flex flex-col items-center gap-3 pt-2">
            <p className="text-[13px] font-semibold text-[#6B7280]">
              Choosing a tool?
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/vs/taplio"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold text-[#7C3AED] bg-[#F3F0FF] hover:bg-[#EDE9FE] transition-colors"
              >
                See how CarouseLabs compares to Taplio
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
            </div>
          </AnimatedSection>
        </div>
      </section>
    </>
  )
}
