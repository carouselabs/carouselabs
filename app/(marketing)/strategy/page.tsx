import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Sparkles, Target } from "lucide-react"
import {
  AnimatedSection,
  AnimatedFadeIn,
} from "@/components/marketing/AnimatedSection"
import { niches } from "../for/data"

const SIGNUP_URL = "https://carouselabs.com/signup"

const TITLE = "LinkedIn Content Strategies for Every Professional"
const DESCRIPTION = `Complete LinkedIn content strategy playbooks for ${niches.length} professions. Each includes 5 content pillars, a 7-day posting schedule, growth tactics, and a 4-week content calendar.`

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://carouselabs.com/strategy" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://carouselabs.com/strategy",
    type: "website",
    images: [
      {
        url: "/images/carouselabs-landing.png",
        width: 1920,
        height: 957,
        alt: "LinkedIn content strategy playbooks for every profession",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/images/carouselabs-landing.png"],
  },
}

export default function StrategyIndexPage() {
  const sorted = [...niches].sort((a, b) => a.name.localeCompare(b.name))

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: TITLE,
    description: DESCRIPTION,
    numberOfItems: sorted.length,
    itemListElement: sorted.map((niche, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `LinkedIn Content Strategy for ${niche.name}`,
      url: `https://carouselabs.com/strategy/${niche.slug}`,
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />

      {/* ── HERO ── */}
      <section className="relative px-6 pt-20 pb-14 sm:pt-24 sm:pb-16 bg-[#FBFAF6]">
        <div className="relative z-10 max-w-3xl mx-auto text-center flex flex-col items-center gap-6">
          <AnimatedSection delay={0}>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#E5E3DE] text-[12px] font-medium text-[#7C3AED]">
              <Sparkles size={11} strokeWidth={2.2} />
              {niches.length} complete playbooks
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.05}>
            <h1 className="text-[clamp(2.2rem,5.5vw,3.4rem)] font-extrabold leading-[1.08] tracking-[-0.03em] text-[#0A0A0A]">
              LinkedIn Content Strategies for Every Professional
            </h1>
          </AnimatedSection>

          <AnimatedSection delay={0.1}>
            <p className="max-w-2xl text-[18px] text-[#4B5563] leading-[1.6]">
              A complete, profession-specific LinkedIn playbook for every niche
              &mdash; five content pillars, a realistic 7-day posting schedule,
              growth tactics, and a 4-week content calendar. Find yours below.
            </p>
          </AnimatedSection>

          <AnimatedSection delay={0.15}>
            <Link
              href={SIGNUP_URL}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-[15px] font-semibold text-white transition-colors shadow-[0_10px_30px_rgba(124,58,237,0.28)]"
            >
              Start creating for free
              <ArrowRight size={16} strokeWidth={2.2} />
            </Link>
          </AnimatedSection>
        </div>
      </section>

      {/* ── ALL STRATEGIES ── */}
      <section className="px-6 py-16 sm:py-20">
        <div className="max-w-6xl mx-auto flex flex-col gap-10">
          <AnimatedSection className="text-center flex flex-col gap-3">
            <h2 className="text-[clamp(1.6rem,3.5vw,2.4rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              Browse All {niches.length} Strategy Playbooks
            </h2>
            <p className="max-w-xl mx-auto text-[15px] text-[#6B7280] leading-[1.6]">
              Each playbook is built specifically for that profession &mdash;
              what to post, when, and how to turn content into clients.
            </p>
          </AnimatedSection>

          <AnimatedFadeIn>
            <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sorted.map((niche) => (
                <li key={niche.slug} className="h-full">
                  <Link
                    href={`/strategy/${niche.slug}`}
                    className="group h-full flex items-center justify-between gap-3 p-6 rounded-2xl border border-[#E5E3DE] bg-[#FFFDF8] hover:border-[#C4B5FD] hover:shadow-[0_12px_30px_rgba(124,58,237,0.10)] transition-all"
                  >
                    <span className="flex items-center gap-3">
                      <span className="shrink-0 w-9 h-9 rounded-xl bg-[#EDE9FE] flex items-center justify-center">
                        <Target
                          size={16}
                          className="text-[#7C3AED]"
                          strokeWidth={2.2}
                        />
                      </span>
                      <span className="text-[15px] font-semibold text-[#0A0A0A] leading-snug">
                        {niche.name}
                      </span>
                    </span>
                    <ArrowRight
                      size={15}
                      strokeWidth={2.2}
                      className="shrink-0 text-[#7C3AED] group-hover:translate-x-0.5 transition-transform"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </AnimatedFadeIn>
        </div>
      </section>

      {/* ── CTA + NICHE HUB LINK ── */}
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
              A Strategy Is Only as Good as Its Execution
            </h2>
            <p className="max-w-xl text-[16px] text-white/85 leading-[1.65]">
              CarouseLabs turns any of these playbooks into published posts
              &mdash; generating the ideas, captions, carousels, and images so
              you focus on strategy, not production.
            </p>
            <Link
              href={SIGNUP_URL}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white hover:bg-[#F3F0FF] text-[16px] font-semibold text-[#7C3AED] transition-colors shadow-[0_10px_30px_rgba(0,0,0,0.18)]"
            >
              Start creating for free
              <ArrowRight size={17} strokeWidth={2.2} />
            </Link>
          </div>
        </AnimatedSection>

        <AnimatedSection className="max-w-4xl mx-auto mt-6 flex justify-center">
          <Link
            href="/for"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold text-[#6B7280] bg-white border border-[#E5E3DE] hover:text-[#7C3AED] hover:border-[#C4B5FD] transition-colors"
          >
            See how CarouseLabs works for your niche
            <ArrowRight size={14} strokeWidth={2.2} />
          </Link>
        </AnimatedSection>
      </section>
    </>
  )
}
