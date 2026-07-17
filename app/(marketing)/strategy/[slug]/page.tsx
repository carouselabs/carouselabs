import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { notFound } from "next/navigation"
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Clock,
  Layers,
  Lightbulb,
  Rocket,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Wrench,
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

// Only the 112 slugs below are valid; any other /strategy/* path 404s.
export const dynamicParams = false

export function generateStaticParams() {
  return niches.map((n) => ({ slug: n.slug }))
}

/**
 * Visual treatment for each posting-schedule format. Carousel / Caption / Image
 * are real posting days; Engagement / Planning / Rest are the deliberate
 * non-posting days that make the weekly cadence realistic.
 */
function formatStyle(format: string): { className: string } {
  const f = format.toLowerCase()
  if (f === "carousel") return { className: "bg-[#EDE9FE] text-[#6D28D9]" }
  if (f === "caption") return { className: "bg-[#E0F2FE] text-[#0369A1]" }
  if (f === "image") return { className: "bg-[#DCF5E4] text-[#15803D]" }
  // Engagement / Planning / Rest — muted, since nothing is published.
  return { className: "bg-[#F0EEE8] text-[#6B7280]" }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const niche = getNiche(slug)
  if (!niche) return {}

  const title = `LinkedIn Content Strategy for ${niche.name} — Complete 2026 Playbook`
  const description = `Complete LinkedIn content strategy for ${niche.name}. Includes 5 content pillars, 7-day posting schedule, growth tactics, and a 4-week content calendar.`
  const url = `https://carouselabs.com/strategy/${niche.slug}`

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
          alt: `LinkedIn content strategy playbook for ${niche.name}`,
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

/** SECTION 13 — FAQ structured data (rendered as JSON-LD in the page). */
function buildFaqJsonLd(niche: Niche) {
  const pillarNames = niche.strategy_pillars.map((p) => p.pillar).join(", ")
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `What is the best LinkedIn content strategy for ${niche.name}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `The best LinkedIn strategy for ${niche.name} is built on five content pillars — ${pillarNames} — rotated across a consistent weekly schedule. Rather than posting at random, you balance teaching, credibility, and personality so your feed builds a coherent reputation. Pair the pillars with a realistic cadence of three to five posts a week plus deliberate engagement days, and every post has a purpose before you write a word.`,
        },
      },
      {
        "@type": "Question",
        name: `How many times a week should ${niche.name} post on LinkedIn?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `${niche.name} should aim for three to five posts a week — enough to stay top of mind without burning out or diluting quality. Consistency matters far more than volume: a steady rhythm you can sustain beats a burst of daily posting followed by silence, because the algorithm rewards reliable creators. The 7-day schedule in this playbook builds in engagement and planning days so the cadence is realistic. ${niche.best_posting_times}`,
        },
      },
      {
        "@type": "Question",
        name: `What type of content gets the most engagement for ${niche.name} on LinkedIn?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `For ${niche.name}, carousels typically drive the most engagement because they hold attention across multiple slides and earn saves and shares. The highest-performing posts come from the strategy pillars in this playbook — especially ${niche.strategy_pillars[0].pillar.toLowerCase()} and ${(niche.strategy_pillars[1] ?? niche.strategy_pillars[0]).pillar.toLowerCase()} — paired with a strong hook and a genuine point of view that invites comments.`,
        },
      },
    ],
  }
}

export default async function NicheStrategyPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const niche = getNiche(slug)
  if (!niche) notFound()

  const faqJsonLd = buildFaqJsonLd(niche)
  const singular = niche.name.toLowerCase().replace(/s$/, "")

  // Related niches, used for strategy → strategy internal links (3 max).
  const relatedStrategy = niche.related_niches
    .map((s) => getNiche(s))
    .filter((n): n is Niche => Boolean(n))
    .slice(0, 3)

  return (
    <>
      {/* SECTION 13 — FAQ structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* ── SECTION 1 — HERO (clean cream, strategy-first) ── */}
      <section className="relative px-6 pt-20 pb-14 sm:pt-24 sm:pb-16 bg-[#FBFAF6]">
        <div className="relative z-10 max-w-3xl mx-auto text-center flex flex-col items-center gap-6">
          <AnimatedSection delay={0}>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#E5E3DE] text-[12px] font-medium text-[#7C3AED]">
              <Sparkles size={11} strokeWidth={2.2} />
              Complete Playbook for {niche.name}
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.05}>
            <h1 className="text-[clamp(2.2rem,5.5vw,3.4rem)] font-extrabold leading-[1.08] tracking-[-0.03em] text-[#0A0A0A]">
              LinkedIn Content Strategy for {niche.name}: Complete 2026 Playbook
            </h1>
          </AnimatedSection>

          <AnimatedSection delay={0.1}>
            <p className="max-w-2xl text-[18px] text-[#4B5563] leading-[1.6]">
              A proven LinkedIn content strategy built specifically for{" "}
              {niche.name} &mdash; covering what to post, when to post, how to
              grow, and how to turn content into clients.
            </p>
          </AnimatedSection>

          <AnimatedSection delay={0.15}>
            <div className="inline-flex items-center gap-2 text-[13px] font-medium text-[#6B7280]">
              <BookOpen size={14} strokeWidth={2.2} />
              15 min read
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── SECTION 2 — IDEAL AUDIENCE ── */}
      <section className="px-6 py-16 sm:py-20">
        <div className="max-w-3xl mx-auto flex flex-col gap-6">
          <AnimatedSection className="text-center">
            <h2 className="text-[clamp(1.7rem,3.8vw,2.6rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              Who This Strategy Is For
            </h2>
          </AnimatedSection>

          <AnimatedSection delay={0.05}>
            <div className="flex items-start gap-4 p-6 rounded-2xl border border-[#E5DEF7] bg-[#F3F0FF]">
              <div className="shrink-0 w-10 h-10 rounded-xl bg-[#EDE9FE] flex items-center justify-center">
                <Target size={18} className="text-[#7C3AED]" strokeWidth={2.2} />
              </div>
              <p className="text-[16px] leading-[1.7] text-[#3F3F46] pt-0.5">
                <span className="font-semibold text-[#0A0A0A]">
                  Your ideal audience:{" "}
                </span>
                {niche.ideal_audience}
              </p>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.1}>
            <p className="text-[17px] leading-[1.75] text-[#3F3F46]">
              {niche.why_linkedin} This is why a real strategy &mdash; not
              random posting &mdash; matters so much for {niche.name}: the
              opportunity is there, but only for the {singular} who shows up with
              a system. The rest of this playbook gives you that system: five
              content pillars to rotate through, a realistic weekly schedule,
              growth tactics, and the mistakes to avoid.
            </p>
          </AnimatedSection>

          <AnimatedSection delay={0.15}>
            <div className="flex items-start gap-4 p-5 rounded-2xl border border-[#E5E3DE] bg-[#FFFDF8]">
              <div className="shrink-0 w-10 h-10 rounded-xl bg-[#F0EEE8] flex items-center justify-center">
                <Clock size={18} className="text-[#7C3AED]" strokeWidth={2.2} />
              </div>
              <p className="text-[15px] leading-[1.6] text-[#3F3F46] pt-0.5">
                <span className="font-semibold text-[#0A0A0A]">
                  Best posting times:{" "}
                </span>
                {niche.best_posting_times}
              </p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── SECTION 3 — 5 STRATEGY PILLARS ── */}
      <section className="px-6 py-16 sm:py-20 bg-[#FBFAF6]">
        <div className="max-w-4xl mx-auto flex flex-col gap-10">
          <AnimatedSection className="text-center flex flex-col gap-4">
            <h2 className="text-[clamp(1.7rem,3.8vw,2.6rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              The 5 Content Pillars for {niche.name} on LinkedIn
            </h2>
            <p className="max-w-2xl mx-auto text-[16px] leading-[1.7] text-[#4B5563]">
              Content pillars are the backbone of a strategy that lasts. Instead
              of inventing something new every time you sit down to post, you
              rotate through a small set of themes you&rsquo;ve already committed
              to &mdash; so every post has a home before you write a word. These
              five pillars are built specifically for {niche.name}: together they
              balance teaching, credibility, and personality, which is the exact
              mix that grows an audience of the right people rather than just
              filling a feed. Each pillar below comes with how often to post it
              and a real example to model. Rotate through all five over a
              fortnight and you&rsquo;ll never run dry.
            </p>
          </AnimatedSection>

          <ol className="flex flex-col gap-5">
            {niche.strategy_pillars.map((pillar, i) => (
              <AnimatedSection key={pillar.pillar} delay={i * 0.05}>
                <li className="flex flex-col gap-4 p-7 rounded-2xl border border-[#E5E3DE] bg-white">
                  <div className="flex items-start gap-5">
                    <span className="shrink-0 w-11 h-11 rounded-2xl bg-[#7C3AED] text-white text-[17px] font-extrabold flex items-center justify-center shadow-[0_8px_20px_rgba(124,58,237,0.25)]">
                      {i + 1}
                    </span>
                    <div className="flex-1 flex flex-col gap-3 pt-0.5">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-[20px] font-bold leading-snug tracking-[-0.015em] text-[#0A0A0A]">
                          {pillar.pillar}
                        </h3>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EDE9FE] text-[12px] font-semibold text-[#6D28D9]">
                          <TrendingUp size={12} strokeWidth={2.4} />
                          {pillar.post_frequency}
                        </span>
                      </div>
                      <p className="text-[16px] leading-[1.7] text-[#3F3F46]">
                        {pillar.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-[#F9F7F2] border border-[#E5E3DE] ml-0 sm:ml-16">
                    <Lightbulb
                      size={16}
                      className="shrink-0 mt-0.5 text-[#7C3AED]"
                      strokeWidth={2.2}
                    />
                    <p className="text-[14px] leading-[1.6] text-[#4B5563] italic">
                      <span className="font-semibold not-italic text-[#6B7280]">
                        Example topic:{" "}
                      </span>
                      {pillar.example_topic}
                    </p>
                  </div>
                </li>
              </AnimatedSection>
            ))}
          </ol>
        </div>
      </section>

      {/* ── SECTION 4 — 7-DAY POSTING SCHEDULE ── */}
      <section className="px-6 py-16 sm:py-20">
        <div className="max-w-5xl mx-auto flex flex-col gap-10">
          <AnimatedSection className="text-center flex flex-col gap-4">
            <h2 className="text-[clamp(1.7rem,3.8vw,2.6rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              Your 7-Day LinkedIn Posting Schedule for {niche.name}
            </h2>
            <p className="max-w-2xl mx-auto text-[16px] leading-[1.7] text-[#4B5563]">
              A strategy only works if it survives a busy week, so this schedule
              is built to be realistic for {niche.name} &mdash; not seven daily
              posts you&rsquo;ll abandon by Wednesday. It pairs a sustainable
              cadence of high-value posts with deliberate engagement and planning
              days, because replying to comments and batching ahead are part of
              the strategy, not an afterthought. Each day tells you what to post,
              a topic to run with, and which format to use. Follow it as written
              for a month, then adjust the days to fit your own calendar &mdash;
              the point is the rhythm, not the specific weekday.
            </p>
          </AnimatedSection>

          <AnimatedFadeIn>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {niche.posting_schedule.map((day, i) => {
                const style = formatStyle(day.format)
                return (
                  <div
                    key={day.day}
                    className="h-full flex flex-col gap-3 p-5 rounded-2xl border border-[#E5E3DE] bg-[#FFFDF8]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[#0A0A0A]">
                        <CalendarDays
                          size={13}
                          strokeWidth={2.4}
                          className="text-[#7C3AED]"
                        />
                        {day.day}
                      </span>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${style.className}`}
                      >
                        {day.format}
                      </span>
                    </div>
                    <p className="text-[14px] font-semibold text-[#1F2937] leading-snug">
                      {day.content_type}
                    </p>
                    <p className="text-[13px] leading-[1.55] text-[#6B7280]">
                      {day.topic_idea}
                    </p>
                  </div>
                )
              })}
            </div>
          </AnimatedFadeIn>
        </div>
      </section>

      {/* ── SECTION 5 — PRODUCT SCREENSHOT 1 ── */}
      <section className="px-6 py-16 bg-[#FBFAF6]">
        <AnimatedFadeIn className="max-w-[900px] mx-auto">
          <figure className="flex flex-col items-center gap-4">
            <div className="w-full rounded-2xl overflow-hidden border border-[#E5E3DE] shadow-[0_24px_60px_rgba(10,10,10,0.14)] bg-[#FFFDF8]">
              <Image
                src="/images/carouselabs-landing.png"
                alt={`CarouseLabs AI content studio executing the LinkedIn strategy for ${niche.name} automatically`}
                width={1920}
                height={957}
                priority
                sizes="(max-width: 900px) 100vw, 900px"
                className="w-full h-auto"
              />
            </div>
            <figcaption className="text-[13px] text-[#6B7280]">
              CarouseLabs executes this entire strategy for {niche.name}{" "}
              automatically
            </figcaption>
          </figure>
        </AnimatedFadeIn>
      </section>

      {/* ── SECTION 6 — GROWTH TACTICS ── */}
      <section className="px-6 py-16 sm:py-20">
        <div className="max-w-4xl mx-auto flex flex-col gap-10">
          <AnimatedSection className="text-center flex flex-col gap-4">
            <h2 className="text-[clamp(1.7rem,3.8vw,2.6rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              5 LinkedIn Growth Tactics for {niche.name}
            </h2>
            <p className="max-w-2xl mx-auto text-[16px] leading-[1.7] text-[#4B5563]">
              Great content is only half the strategy &mdash; how you distribute
              and amplify it decides whether it reaches anyone. These five
              tactics are chosen specifically for how {niche.name} grow on
              LinkedIn, from where their audience actually spends time to the
              moves that turn a post into a conversation. None of them require
              tricks or engagement pods; they&rsquo;re the compounding habits
              that build a genuine following over months. Work them into the
              weekly schedule above and your reach grows because the right people
              keep seeing you show up with something worth their attention.
            </p>
          </AnimatedSection>

          <ol className="flex flex-col gap-5">
            {niche.growth_tactics.map((tactic, i) => (
              <AnimatedSection key={i} delay={i * 0.05}>
                <li className="flex items-start gap-5 p-6 rounded-2xl border border-[#E5E3DE] bg-[#FFFDF8]">
                  <span className="shrink-0 w-10 h-10 rounded-xl bg-[#EDE9FE] flex items-center justify-center">
                    <Rocket
                      size={18}
                      className="text-[#7C3AED]"
                      strokeWidth={2.2}
                    />
                  </span>
                  <p className="flex-1 text-[16px] leading-[1.65] text-[#3F3F46] pt-1.5">
                    {tactic}
                  </p>
                </li>
              </AnimatedSection>
            ))}
          </ol>
        </div>
      </section>

      {/* ── SECTION 7 — COMMON STRATEGY MISTAKES ── */}
      <section className="px-6 py-16 sm:py-20 bg-[#FBFAF6]">
        <div className="max-w-4xl mx-auto flex flex-col gap-10">
          <AnimatedSection className="text-center">
            <h2 className="text-[clamp(1.7rem,3.8vw,2.6rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              4 LinkedIn Strategy Mistakes {niche.name} Make
            </h2>
          </AnimatedSection>

          <div className="grid sm:grid-cols-2 gap-5">
            {niche.common_strategy_mistakes.map((mistake, i) => (
              <AnimatedSection key={i} delay={(i % 2) * 0.05}>
                <div className="h-full flex items-start gap-4 p-6 rounded-2xl border border-[#F0D9CE] bg-[#FFF8F5]">
                  <div className="shrink-0 w-9 h-9 rounded-xl bg-[#FDE7DD] flex items-center justify-center">
                    <XCircle
                      size={17}
                      className="text-[#EA580C]"
                      strokeWidth={2.2}
                    />
                  </div>
                  <p className="flex-1 text-[15px] leading-[1.65] text-[#4B5563] pt-1">
                    {mistake}
                  </p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 8 — 4-WEEK CONTENT CALENDAR ── */}
      <section className="px-6 py-16 sm:py-20">
        <div className="max-w-5xl mx-auto flex flex-col gap-10">
          <AnimatedSection className="text-center flex flex-col gap-4">
            <h2 className="text-[clamp(1.7rem,3.8vw,2.6rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              Your 4-Week Content Calendar
            </h2>
            <p className="max-w-2xl mx-auto text-[16px] leading-[1.7] text-[#4B5563]">
              The pillars and schedule above tell you how to post; this calendar
              tells you what to post for the next month. Each week has a theme
              that groups your content around a single idea, so your feed builds
              a narrative instead of jumping around. Work down one week at a time,
              pulling from the post ideas under each theme, and by the end of the
              month you&rsquo;ll have a full, coherent body of content &mdash; and
              a repeatable template you can run again with fresh angles.
            </p>
          </AnimatedSection>

          <AnimatedFadeIn>
            <div className="grid sm:grid-cols-2 gap-5">
              {niche.content_calendar.map((week, i) => (
                <div
                  key={week.week}
                  className="h-full flex flex-col gap-4 p-6 rounded-2xl border border-[#E5E3DE] bg-[#FFFDF8]"
                >
                  <div className="flex items-center gap-3 pb-3 border-b border-[#F0EEE8]">
                    <span className="shrink-0 w-9 h-9 rounded-xl bg-[#7C3AED] text-white text-[14px] font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-[12px] font-semibold text-[#7C3AED] uppercase tracking-wide">
                        {week.week}
                      </span>
                      <span className="text-[16px] font-bold text-[#0A0A0A] leading-snug">
                        {week.theme}
                      </span>
                    </div>
                  </div>
                  <ul className="flex flex-col gap-2.5">
                    {week.post_ideas.map((idea, j) => (
                      <li
                        key={j}
                        className="flex items-start gap-2.5 text-[14px] leading-[1.55] text-[#4B5563]"
                      >
                        <Layers
                          size={13}
                          strokeWidth={2.4}
                          className="shrink-0 mt-1 text-[#C4B5FD]"
                        />
                        {idea}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </AnimatedFadeIn>
        </div>
      </section>

      {/* ── SECTION 9 — PRODUCT SCREENSHOT 2 ── */}
      <section className="px-6 py-16 bg-[#FBFAF6]">
        <AnimatedFadeIn className="max-w-[900px] mx-auto">
          <figure className="flex flex-col items-center gap-4">
            <div className="w-full rounded-2xl overflow-hidden border border-[#E5E3DE] shadow-[0_24px_60px_rgba(10,10,10,0.14)] bg-[#FFFDF8]">
              <Image
                src="/images/carouselabs-ideas.png"
                alt={`CarouseLabs generating strategic LinkedIn content ideas daily for ${niche.name}`}
                width={1920}
                height={957}
                sizes="(max-width: 900px) 100vw, 900px"
                className="w-full h-auto"
              />
            </div>
            <figcaption className="text-[13px] text-[#6B7280]">
              CarouseLabs generates strategic content ideas daily for{" "}
              {niche.name}
            </figcaption>
          </figure>
        </AnimatedFadeIn>
      </section>

      {/* ── SECTION 10 — EXAMPLE POST IDEAS ── */}
      <section className="px-6 py-16 sm:py-20">
        <div className="max-w-5xl mx-auto flex flex-col gap-10">
          <AnimatedSection className="text-center">
            <h2 className="text-[clamp(1.7rem,3.8vw,2.6rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              10 Strategic Post Ideas for {niche.name}
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

      {/* ── SECTION 11 — RELATED RESOURCES (internal linking hub) ── */}
      <section className="px-6 py-16 sm:py-20 bg-[#FBFAF6]">
        <div className="max-w-5xl mx-auto flex flex-col gap-8">
          <AnimatedSection className="text-center">
            <h2 className="text-[clamp(1.5rem,3.2vw,2.1rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              Related Resources for {niche.name}
            </h2>
          </AnimatedSection>

          {/* Same-niche siblings — completes the for/ideas/how-to/tools/strategy set */}
          <AnimatedSection className="grid sm:grid-cols-2 gap-4">
            <Link
              href={`/for/${niche.slug}`}
              className="group flex items-center justify-between gap-4 p-6 rounded-2xl border border-[#E5DEF7] bg-white hover:border-[#C4B5FD] transition-colors"
            >
              <span className="inline-flex items-center gap-2.5 text-[15px] font-semibold text-[#7C3AED]">
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
              className="group flex items-center justify-between gap-4 p-6 rounded-2xl border border-[#E5DEF7] bg-white hover:border-[#C4B5FD] transition-colors"
            >
              <span className="inline-flex items-center gap-2.5 text-[15px] font-semibold text-[#7C3AED]">
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
              className="group flex items-center justify-between gap-4 p-6 rounded-2xl border border-[#E5DEF7] bg-white hover:border-[#C4B5FD] transition-colors"
            >
              <span className="inline-flex items-center gap-2.5 text-[15px] font-semibold text-[#7C3AED]">
                <BookOpen size={16} strokeWidth={2.2} />
                How-to guide for {niche.name}
              </span>
              <ArrowRight
                size={16}
                strokeWidth={2.2}
                className="shrink-0 text-[#7C3AED] group-hover:translate-x-0.5 transition-transform"
              />
            </Link>
            <Link
              href={`/tools/${niche.slug}`}
              className="group flex items-center justify-between gap-4 p-6 rounded-2xl border border-[#E5DEF7] bg-white hover:border-[#C4B5FD] transition-colors"
            >
              <span className="inline-flex items-center gap-2.5 text-[15px] font-semibold text-[#7C3AED]">
                <Wrench size={16} strokeWidth={2.2} />
                AI tools for {niche.name}
              </span>
              <ArrowRight
                size={16}
                strokeWidth={2.2}
                className="shrink-0 text-[#7C3AED] group-hover:translate-x-0.5 transition-transform"
              />
            </Link>
          </AnimatedSection>

          {/* Related niches — same page type */}
          {relatedStrategy.length > 0 && (
            <div className="flex flex-col gap-4">
              <AnimatedSection>
                <p className="text-[13px] font-semibold text-[#6B7280] text-center">
                  Strategies for related niches
                </p>
              </AnimatedSection>
              <div className="grid sm:grid-cols-3 gap-4">
                {relatedStrategy.map((r, i) => (
                  <AnimatedSection key={r.slug} delay={i * 0.05}>
                    <Link
                      href={`/strategy/${r.slug}`}
                      className="group h-full flex flex-col justify-between gap-5 p-6 rounded-2xl border border-[#E5E3DE] bg-[#FFFDF8] hover:border-[#C4B5FD] hover:shadow-[0_12px_30px_rgba(124,58,237,0.12)] transition-all"
                    >
                      <span className="text-[15px] font-semibold text-[#0A0A0A] leading-snug">
                        LinkedIn strategy for {r.name}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#7C3AED]">
                        View playbook
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

          {/* Comparison + hubs */}
          <AnimatedSection className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/vs/taplio"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold text-[#7C3AED] bg-[#F3F0FF] hover:bg-[#EDE9FE] transition-colors"
            >
              CarouseLabs vs Taplio
            </Link>
            <Link
              href="/for"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold text-[#6B7280] bg-white border border-[#E5E3DE] hover:text-[#7C3AED] hover:border-[#C4B5FD] transition-colors"
            >
              Browse all niches
            </Link>
            <Link
              href="/strategy"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold text-[#6B7280] bg-white border border-[#E5E3DE] hover:text-[#7C3AED] hover:border-[#C4B5FD] transition-colors"
            >
              All strategies
            </Link>
          </AnimatedSection>
        </div>
      </section>

      {/* ── SECTION 12 — CTA ── */}
      <section className="px-6 pb-24 pt-4">
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
            <h2 className="max-w-2xl text-[clamp(1.9rem,4.5vw,3rem)] font-bold leading-[1.1] tracking-[-0.025em] text-white">
              Execute This Strategy in Minutes, Not Hours
            </h2>
            <p className="max-w-xl text-[16px] text-white/85 leading-[1.65]">
              CarouseLabs handles the content creation side of this strategy
              automatically &mdash; ideas, captions, carousels, and images
              generated in minutes so you can focus on the strategy, not the
              production.
            </p>
            <Link
              href={SIGNUP_URL}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white hover:bg-[#F3F0FF] text-[16px] font-semibold text-[#7C3AED] transition-colors shadow-[0_10px_30px_rgba(0,0,0,0.18)]"
            >
              Start creating for free
              <ArrowRight size={17} strokeWidth={2.2} />
            </Link>
            <p className="text-[12px] text-white/70">
              No credit card required &middot; Free tier available
            </p>
          </div>
        </AnimatedSection>
      </section>
    </>
  )
}
