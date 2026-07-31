import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Trophy, Wand2 } from "lucide-react"
import {
  AnimatedSection,
  AnimatedFadeIn,
} from "@/components/marketing/AnimatedSection"
import { BEST_OF_PAGES } from "./data"
import { ExploreOtherHubs } from "@/components/marketing/ExploreOtherHubs"

const BASE_URL = "https://carouselabs.com"
const SIGNUP_URL = "https://carouselabs.com/signup"
const TITLE = "Best AI Tools for LinkedIn — Ranked (2026) | CarouseLabs"
const DESCRIPTION = `${BEST_OF_PAGES.length} independently ranked comparisons of the best AI tools for LinkedIn content — carousels, captions, images, and more — with honest, specific competitor strengths.`

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${BASE_URL}/best` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${BASE_URL}/best`,
    type: "website",
    images: [
      {
        url: "/images/carouselabs-landing.png",
        width: 1920,
        height: 957,
        alt: "CarouseLabs — Best-Of Rankings",
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

export default function BestOfIndexPage() {
  const updatedMonth = new Date().toLocaleString("en-US", { month: "long" })

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: TITLE,
    description: DESCRIPTION,
    numberOfItems: BEST_OF_PAGES.length,
    itemListElement: BEST_OF_PAGES.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: p.title,
      url: `${BASE_URL}/best/${p.slug}`,
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />

      {/* ── HERO (dark, matches /best/[slug] leaderboard styling) ── */}
      <section className="relative px-6 pt-24 pb-20 sm:pt-28 sm:pb-24 overflow-hidden bg-[#0F0B1A]">
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(700px circle at 85% 0%, rgba(124,58,237,0.32), transparent 60%), radial-gradient(600px circle at 0% 40%, rgba(124,58,237,0.16), transparent 55%), #0F0B1A",
          }}
        />
        <div className="relative z-10 max-w-3xl mx-auto text-center flex flex-col items-center gap-6">
          <AnimatedSection delay={0}>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-[12px] font-medium text-white/80 backdrop-blur-sm">
              <Trophy size={12} strokeWidth={2.2} className="text-[#C4B5FD]" />
              {BEST_OF_PAGES.length} rankings · Updated {updatedMonth} 2026
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.05}>
            <h1 className="text-[clamp(2.2rem,5.5vw,3.4rem)] font-extrabold leading-[1.08] tracking-[-0.03em] text-white">
              Best AI Tools for LinkedIn, Ranked
            </h1>
          </AnimatedSection>

          <AnimatedSection delay={0.1}>
            <p className="max-w-2xl text-[18px] text-white/70 leading-[1.6]">
              Honest, specific comparisons across carousels, captions, images, and content strategy
              — every competitor gets real credit for what it does well.
            </p>
          </AnimatedSection>

          <AnimatedSection delay={0.15}>
            <Link
              href={SIGNUP_URL}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white hover:bg-[#F3F0FF] text-[15px] font-semibold text-[#0F0B1A] transition-colors shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
            >
              <Wand2 size={16} strokeWidth={2.2} />
              Try CarouseLabs Free
            </Link>
          </AnimatedSection>
        </div>
      </section>

      {/* ── RANKINGS GRID ── */}
      <section className="px-6 py-16 sm:py-20">
        <div className="max-w-6xl mx-auto flex flex-col gap-10">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {BEST_OF_PAGES.map((p, i) => (
              <AnimatedSection key={p.slug} delay={(i % 6) * 0.04}>
                <Link
                  href={`/best/${p.slug}`}
                  className="group h-full flex flex-col justify-between gap-5 p-6 rounded-2xl border border-[#E5E3DE] bg-[#FFFDF8] hover:border-[#C4B5FD] hover:shadow-[0_12px_30px_rgba(124,58,237,0.10)] transition-all"
                >
                  <div className="flex flex-col gap-3">
                    <span className="inline-flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-full bg-[#EDE9FE] text-[10.5px] font-bold uppercase tracking-wide text-[#7C3AED]">
                      <Trophy size={10} strokeWidth={2.4} />
                      CarouseLabs #1
                    </span>
                    <span className="text-[15px] font-semibold text-[#0A0A0A] leading-snug">
                      {p.title}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#7C3AED]">
                    See the ranking
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
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-6 py-20 sm:py-24">
        <AnimatedFadeIn className="relative max-w-4xl mx-auto rounded-3xl overflow-hidden px-8 py-16 sm:py-20 text-center">
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
              See why CarouseLabs tops the list
            </h2>
            <p className="max-w-xl text-[16px] text-white/85 leading-[1.65]">
              Captions, images, and carousels — generated from one idea, in one place. Try it free.
            </p>
            <Link
              href={SIGNUP_URL}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white hover:bg-[#F3F0FF] text-[16px] font-semibold text-[#7C3AED] transition-colors shadow-[0_10px_30px_rgba(0,0,0,0.18)]"
            >
              Try It Free
              <ArrowRight size={17} strokeWidth={2.2} />
            </Link>
          </div>
        </AnimatedFadeIn>
      </section>

      <ExploreOtherHubs current="/best" />
    </>
  )
}
