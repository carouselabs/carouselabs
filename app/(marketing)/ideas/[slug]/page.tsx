import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { notFound } from "next/navigation"
import {
  ArrowRight,
  Sparkles,
  Hash,
  Clock,
  CalendarDays,
  Quote,
  Flame,
  TrendingUp,
  Zap,
} from "lucide-react"
import {
  AnimatedSection,
  AnimatedFadeIn,
} from "@/components/marketing/AnimatedSection"
import { niches, type Niche, type CarouselIdea } from "../../for/data"

const SIGNUP_URL = "https://carouselabs.com/signup"

const bySlug = new Map<string, Niche>(niches.map((n) => [n.slug, n]))

function getNiche(slug: string): Niche | undefined {
  return bySlug.get(slug)
}

// Only the 112 slugs below are valid; any other /ideas/* path 404s.
export const dynamicParams = false

export function generateStaticParams() {
  return niches.map((n) => ({ slug: n.slug }))
}

/** Split a "Name — description" pillar string into its two parts. */
function splitPillar(pillar: string): { name: string; description: string } {
  const idx = pillar.indexOf(" — ")
  if (idx === -1) return { name: pillar, description: "" }
  return { name: pillar.slice(0, idx), description: pillar.slice(idx + 3) }
}

/** Colour-coded styles for the engagement badge. */
function engagementStyle(level: CarouselIdea["engagement"]): {
  bg: string
  text: string
  icon: typeof Flame
} {
  switch (level) {
    case "Viral Potential":
      return { bg: "#FFF1E6", text: "#EA580C", icon: Flame } // orange
    case "Very High":
      return { bg: "#EDE9FE", text: "#7C3AED", icon: TrendingUp } // purple
    case "High":
    default:
      return { bg: "#E7F6EC", text: "#15803D", icon: Zap } // green
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const niche = getNiche(slug)
  if (!niche) return {}

  const title = `10 LinkedIn Carousel Ideas for ${niche.name} (+ 4-Week Content Calendar)`
  const description = `Discover 10 proven LinkedIn carousel ideas for ${niche.name}. Includes hooks, why each works, and a free 4-week content calendar. Create these carousels in minutes with CarouseLabs.`

  return {
    title,
    description,
    alternates: { canonical: `https://carouselabs.com/ideas/${niche.slug}` },
    openGraph: {
      title,
      description,
      url: `https://carouselabs.com/ideas/${niche.slug}`,
      type: "article",
      images: [
        {
          url: "/images/carouselabs-landing.png",
          width: 1920,
          height: 957,
          alt: `LinkedIn carousel ideas for ${niche.name}`,
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

/** SECTION 11 — FAQ structured data (rendered as JSON-LD in the page). */
function buildFaqJsonLd(niche: Niche) {
  const pillarNames = niche.content_pillars
    .slice(0, 3)
    .map((p) => splitPillar(p).name.toLowerCase())
    .join(", ")
  const contentTypes = niche.content_types.slice(0, 3).join(", ").toLowerCase()

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `What should ${niche.name} post on LinkedIn?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `${niche.name} should post carousel content built around a few clear pillars — ${pillarNames}. Proven ideas include "${niche.carousel_post_ideas[0].title}" and "${niche.carousel_post_ideas[1].title}". The goal is to share genuine expertise through teaching, stories, and frameworks rather than selling. A handful of pillars repeated consistently builds authority and gives your audience a reason to follow and engage.`,
        },
      },
      {
        "@type": "Question",
        name: `How often should ${niche.name} post on LinkedIn?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Aim for three to five posts a week and stay consistent — consistency beats volume on LinkedIn. ${niche.best_posting_times} Pick a sustainable cadence, batch your carousels in advance, and show up regularly. For ${niche.name}, a steady rhythm of valuable posts compounds into reach, authority, and inbound opportunities far faster than occasional bursts.`,
        },
      },
      {
        "@type": "Question",
        name: `What type of content works best for ${niche.name} on LinkedIn?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Carousels are the highest-performing format for ${niche.name} because they let you break an idea down step by step and earn more reach than plain text. Focus on ${contentTypes}. Story-driven and educational posts — real results, honest lessons, and practical frameworks — consistently outperform promotional content and earn the saves, comments, and shares that grow your audience.`,
        },
      },
    ],
  }
}

export default async function NicheIdeasPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const niche = getNiche(slug)
  if (!niche) notFound()

  const relatedIdeas = niche.related_niches
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

      {/* ── SECTION 1 — HERO (clean cream, content-first, no CTA) ── */}
      <section className="relative px-6 pt-20 pb-14 sm:pt-24 sm:pb-16 bg-[#FBFAF6]">
        <div className="relative z-10 max-w-3xl mx-auto text-center flex flex-col items-center gap-6">
          <AnimatedSection delay={0}>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#E5E3DE] text-[12px] font-medium text-[#7C3AED]">
              <Sparkles size={11} strokeWidth={2.2} />
              LinkedIn Content Ideas for {niche.name}
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.05}>
            <h1 className="text-[clamp(2.2rem,5.5vw,3.4rem)] font-extrabold leading-[1.08] tracking-[-0.03em] text-[#0A0A0A]">
              10 LinkedIn Carousel Ideas for {niche.name} That Actually Get
              Engagement
            </h1>
          </AnimatedSection>

          <AnimatedSection delay={0.1}>
            <p className="max-w-2xl text-[18px] text-[#4B5563] leading-[1.6]">
              Struggling with what to post? Here are 10 proven carousel ideas
              specifically for {niche.name}, plus a 4-week content calendar you
              can start using today.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* ── SECTION 2 — INTRO ── */}
      <section className="px-6 py-16 sm:py-20">
        <div className="max-w-3xl mx-auto flex flex-col gap-6">
          <AnimatedSection delay={0}>
            <p className="text-[17px] leading-[1.75] text-[#3F3F46]">
              If you&rsquo;re a {niche.name.toLowerCase().replace(/s$/, "")} who
              knows LinkedIn matters but freezes at the blank page, you&rsquo;re
              not alone. The feed rewards people who show up consistently with
              genuine expertise &mdash; and right now there has never been a
              better moment for {niche.name} to claim that space. Most people in
              your field either stay silent or post the same generic updates,
              which leaves a wide-open lane for anyone willing to teach, tell
              real stories, and share what actually works. The professionals
              who publish thoughtful, specific content become the name people
              remember, refer, and reach out to. {niche.why_linkedin} You already
              have the knowledge; the only thing standing between you and a
              LinkedIn presence that compounds is a steady flow of ideas worth
              posting &mdash; which is exactly what the rest of this guide gives
              you.
            </p>
          </AnimatedSection>

          <AnimatedSection delay={0.05}>
            <div className="flex items-start gap-4 p-5 rounded-2xl border border-[#E5DEF7] bg-[#F3F0FF]">
              <div className="shrink-0 w-10 h-10 rounded-xl bg-[#EDE9FE] flex items-center justify-center">
                <Clock size={18} className="text-[#7C3AED]" strokeWidth={2.2} />
              </div>
              <p className="text-[15px] leading-[1.6] text-[#3F3F46] pt-0.5">
                <span className="font-semibold text-[#0A0A0A]">
                  Best time to post for {niche.name}:{" "}
                </span>
                {niche.best_posting_times}
              </p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── SECTION 3 — CONTENT PILLARS ── */}
      <section className="px-6 py-16 sm:py-20 bg-[#FBFAF6]">
        <div className="max-w-5xl mx-auto flex flex-col gap-10">
          <AnimatedSection className="text-center">
            <h2 className="text-[clamp(1.7rem,3.8vw,2.6rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              The 5 Content Pillars Every {niche.name} Should Build Their Brand
              Around
            </h2>
            <p className="mt-3 max-w-2xl mx-auto text-[16px] text-[#6B7280]">
              Stop guessing what to post. Anchor everything you publish to these
              five themes and your feed will feel focused, credible, and worth
              following.
            </p>
          </AnimatedSection>
          <div className="grid sm:grid-cols-2 gap-5">
            {niche.content_pillars.map((pillar, i) => {
              const { name, description } = splitPillar(pillar)
              return (
                <AnimatedSection key={i} delay={(i % 2) * 0.05}>
                  <div className="h-full flex items-start gap-4 p-6 rounded-2xl border border-[#E5DEF7] bg-white">
                    <span className="shrink-0 w-9 h-9 rounded-xl bg-[#7C3AED] text-white text-[15px] font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <div className="flex flex-col gap-1.5">
                      <h3 className="text-[17px] font-bold leading-snug text-[#0A0A0A]">
                        {name}
                      </h3>
                      <p className="text-[15px] leading-[1.6] text-[#4B5563]">
                        {description} For {niche.name}, this is one of the
                        highest-leverage themes to post about consistently. It
                        builds authority with the exact people you want to
                        reach and gives your audience a reason to keep following,
                        engaging, and eventually reaching out.
                      </p>
                    </div>
                  </div>
                </AnimatedSection>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── SECTION 4 — 10 CAROUSEL IDEAS (main event) ── */}
      <section className="px-6 py-16 sm:py-24">
        <div className="max-w-6xl mx-auto flex flex-col gap-12">
          <AnimatedSection className="text-center">
            <h2 className="text-[clamp(1.8rem,4vw,2.75rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              10 LinkedIn Carousel Ideas for {niche.name}
            </h2>
            <p className="mt-3 max-w-2xl mx-auto text-[16px] text-[#6B7280]">
              Each one includes the exact opening line to hook your audience and
              why it works. Steal them, make them yours, and start posting.
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 gap-6">
            {niche.carousel_post_ideas.map((idea, i) => {
              const eng = engagementStyle(idea.engagement)
              const EngIcon = eng.icon
              return (
                <AnimatedSection key={i} delay={(i % 2) * 0.05}>
                  <div className="h-full flex flex-col gap-5 p-7 rounded-2xl border border-[#E5E3DE] bg-[#FFFDF8] shadow-[0_10px_30px_rgba(10,10,10,0.05)]">
                    <div className="flex items-center justify-between gap-3">
                      <span className="shrink-0 w-11 h-11 rounded-xl bg-[#7C3AED] text-white text-[18px] font-extrabold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold"
                        style={{ backgroundColor: eng.bg, color: eng.text }}
                      >
                        <EngIcon size={12} strokeWidth={2.4} />
                        {idea.engagement}
                      </span>
                    </div>

                    <h3 className="text-[20px] font-bold leading-snug tracking-[-0.01em] text-[#0A0A0A]">
                      {idea.title}
                    </h3>

                    <div>
                      <p className="text-[13px] font-semibold uppercase tracking-wide text-[#7C3AED] mb-1">
                        Why it works
                      </p>
                      <p className="text-[15px] leading-[1.6] text-[#4B5563]">
                        {idea.why_it_works}
                      </p>
                    </div>

                    <div>
                      <p className="text-[13px] font-semibold uppercase tracking-wide text-[#7C3AED] mb-2">
                        Opening line
                      </p>
                      <blockquote className="relative flex items-start gap-3 p-4 rounded-xl bg-[#F3F0FF] border border-[#E5DEF7]">
                        <Quote
                          size={16}
                          className="shrink-0 mt-1 text-[#7C3AED]"
                          strokeWidth={2}
                          aria-hidden
                        />
                        <span className="text-[15px] leading-[1.55] font-medium text-[#1F2937]">
                          {idea.hook}
                        </span>
                      </blockquote>
                    </div>

                    <div className="mt-auto pt-1">
                      <Link
                        href={SIGNUP_URL}
                        className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#7C3AED] hover:gap-2.5 transition-all"
                      >
                        Create this carousel
                        <ArrowRight size={15} strokeWidth={2.4} />
                      </Link>
                    </div>
                  </div>
                </AnimatedSection>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── SECTION 5 — PRODUCT SCREENSHOT 1 ── */}
      <section className="px-6 pb-20">
        <AnimatedFadeIn className="max-w-[900px] mx-auto">
          <figure className="flex flex-col items-center gap-4">
            <div className="w-full rounded-2xl overflow-hidden border border-[#E5E3DE] shadow-[0_24px_60px_rgba(10,10,10,0.14)] bg-[#FFFDF8]">
              <Image
                src="/images/carouselabs-landing.png"
                alt={`CarouseLabs generates carousel ideas like these automatically for ${niche.name}`}
                width={1920}
                height={957}
                sizes="(max-width: 900px) 100vw, 900px"
                className="w-full h-auto"
              />
            </div>
            <figcaption className="text-[13px] text-[#6B7280] text-center">
              CarouseLabs generates carousel ideas like these automatically for{" "}
              {niche.name}
            </figcaption>
          </figure>
        </AnimatedFadeIn>
      </section>

      {/* ── SECTION 6 — 4-WEEK CONTENT CALENDAR ── */}
      <section className="px-6 py-16 sm:py-20 bg-[#FBFAF6]">
        <div className="max-w-5xl mx-auto flex flex-col gap-10">
          <AnimatedSection className="text-center">
            <h2 className="text-[clamp(1.8rem,4vw,2.75rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              Your 4-Week LinkedIn Content Calendar for {niche.name}
            </h2>
            <p className="mt-3 max-w-2xl mx-auto text-[16px] text-[#6B7280]">
              A full month of themed posts, mapped out for you. Follow it as-is
              or use it as a springboard &mdash; either way, you&rsquo;ll never
              open LinkedIn wondering what to say again.
            </p>
          </AnimatedSection>

          <div className="grid sm:grid-cols-2 gap-5">
            {niche.content_calendar.map((week, i) => (
              <AnimatedSection key={i} delay={(i % 2) * 0.05}>
                <div className="h-full flex flex-col gap-4 p-6 rounded-2xl border border-[#E5E3DE] bg-white">
                  <div className="flex items-center gap-3">
                    <div className="shrink-0 w-10 h-10 rounded-xl bg-[#EDE9FE] flex items-center justify-center">
                      <CalendarDays
                        size={18}
                        className="text-[#7C3AED]"
                        strokeWidth={2.2}
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[12px] font-semibold uppercase tracking-wide text-[#7C3AED]">
                        {week.week}
                      </span>
                      <span className="text-[17px] font-bold leading-snug text-[#0A0A0A]">
                        {week.theme}
                      </span>
                    </div>
                  </div>
                  <ul className="flex flex-col gap-2.5 pl-1">
                    {week.post_ideas.map((idea, j) => (
                      <li key={j} className="flex items-start gap-2.5">
                        <span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-[#7C3AED]" />
                        <span className="text-[15px] leading-[1.55] text-[#4B5563]">
                          {idea}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 7 — PRODUCT SCREENSHOT 2 ── */}
      <section className="px-6 py-20">
        <AnimatedFadeIn className="max-w-[900px] mx-auto">
          <figure className="flex flex-col items-center gap-4">
            <div className="w-full rounded-2xl overflow-hidden border border-[#E5E3DE] shadow-[0_24px_60px_rgba(10,10,10,0.14)] bg-[#FFFDF8]">
              <Image
                src="/images/carouselabs-ideas.png"
                alt={`CarouseLabs generates 10 trending post ideas daily tailored to ${niche.name}`}
                width={1920}
                height={957}
                sizes="(max-width: 900px) 100vw, 900px"
                className="w-full h-auto"
              />
            </div>
            <figcaption className="text-[13px] text-[#6B7280] text-center">
              CarouseLabs generates 10 trending post ideas daily &mdash; tailored
              to your niche and industry
            </figcaption>
          </figure>
        </AnimatedFadeIn>
      </section>

      {/* ── SECTION 8 — HASHTAGS ── */}
      <section className="px-6 py-16 sm:py-20 bg-[#FBFAF6]">
        <div className="max-w-4xl mx-auto flex flex-col gap-8">
          <AnimatedSection className="text-center">
            <h2 className="text-[clamp(1.7rem,3.8vw,2.5rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              Best Hashtags for {niche.name} Content
            </h2>
            <p className="mt-3 max-w-2xl mx-auto text-[16px] text-[#6B7280]">
              Using the right hashtags can 2-3x your reach. Here are the top
              hashtags for {niche.name} on LinkedIn:
            </p>
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

      {/* ── SECTION 9 — RELATED IDEAS PAGES ── */}
      {relatedIdeas.length > 0 && (
        <section className="px-6 py-16 sm:py-20">
          <div className="max-w-5xl mx-auto flex flex-col gap-10">
            <AnimatedSection className="text-center">
              <h2 className="text-[clamp(1.7rem,3.8vw,2.5rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
                More Content Ideas For Similar Professionals
              </h2>
            </AnimatedSection>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {relatedIdeas.map((r, i) => (
                <AnimatedSection key={r.slug} delay={i * 0.05}>
                  <Link
                    href={`/ideas/${r.slug}`}
                    className="group h-full flex flex-col justify-between gap-6 p-6 rounded-2xl border border-[#E5E3DE] bg-[#FFFDF8] hover:border-[#C4B5FD] hover:shadow-[0_12px_30px_rgba(124,58,237,0.12)] transition-all"
                  >
                    <span className="text-[16px] font-semibold text-[#0A0A0A] leading-snug">
                      10 Carousel Ideas for {r.name}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#7C3AED]">
                      See the ideas
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

      {/* ── SECTION 10 — CTA (first heavy CarouseLabs mention) ── */}
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
              Stop Staring at a Blank Page &mdash; Generate These Ideas in
              Seconds
            </h2>
            <p className="max-w-xl text-[16px] text-white/85 leading-[1.65]">
              CarouseLabs automatically generates 10 personalized post ideas
              daily based on trending news in your industry. Pick one, generate
              the full carousel, caption, and image &mdash; all in under 15
              minutes.
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

      {/* ── CROSS-LINK — step-by-step how-to guide for this niche ── */}
      <section className="px-6 pb-24 -mt-6">
        <AnimatedSection className="max-w-4xl mx-auto">
          <Link
            href={`/how-to/${niche.slug}`}
            className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl border border-[#E5DEF7] bg-[#F3F0FF] hover:border-[#C4B5FD] transition-colors"
          >
            <span className="text-[16px] font-medium text-[#1F2937]">
              Ready to create? &rarr;{" "}
              <span className="font-semibold text-[#7C3AED]">
                How to get started as a {niche.name}
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
    </>
  )
}
