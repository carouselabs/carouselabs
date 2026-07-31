import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Sparkles } from "lucide-react"
import { AnimatedSection } from "@/components/marketing/AnimatedSection"
import { VsFilterGrid } from "@/components/marketing/VsFilterGrid"
import { ExploreOtherHubs } from "@/components/marketing/ExploreOtherHubs"
import {
  competitors,
  COMPETITOR_CATEGORIES,
  COMPETITOR_CATEGORY_LABELS,
  COMPETITOR_CATEGORY_ORDER,
} from "./data"

const SIGNUP_URL = "https://carouselabs.com/signup"

const TITLE = "CarouseLabs vs Every Alternative — Honest Comparisons"
const DESCRIPTION = `Honest, side-by-side comparisons of CarouseLabs against ${competitors.length} alternatives — including where each competitor is genuinely the better choice.`

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://carouselabs.com/vs" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://carouselabs.com/vs",
    type: "website",
    images: [
      {
        url: "/images/carouselabs-landing.png",
        width: 1920,
        height: 957,
        alt: "CarouseLabs compared to every LinkedIn content alternative",
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

export default function ComparisonIndexPage() {
  const sorted = [...competitors].sort((a, b) => a.name.localeCompare(b.name))

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: TITLE,
    description: DESCRIPTION,
    numberOfItems: sorted.length,
    itemListElement: sorted.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `CarouseLabs vs ${c.name}`,
      url: `https://carouselabs.com/vs/${c.slug}`,
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
              {competitors.length} honest comparisons
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.05}>
            <h1 className="text-[clamp(2.2rem,5.5vw,3.4rem)] font-extrabold leading-[1.08] tracking-[-0.03em] text-[#0A0A0A]">
              CarouseLabs vs Every Alternative &mdash; Honest Comparisons
            </h1>
          </AnimatedSection>

          <AnimatedSection delay={0.1}>
            <p className="max-w-2xl text-[18px] text-[#4B5563] leading-[1.6]">
              No tool is right for everyone. Each comparison below covers real
              strengths, real weaknesses, and exactly when the other tool is the
              better choice.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* ── ALL COMPARISONS — filterable by category ── */}
      <section className="px-6 py-16 sm:py-20">
        <div className="max-w-6xl mx-auto flex flex-col gap-10">
          <AnimatedSection className="text-center">
            <h2 className="text-[clamp(1.6rem,3.5vw,2.4rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              All {competitors.length} Comparisons
            </h2>
            <p className="mt-3 max-w-xl mx-auto text-[15px] text-[#6B7280]">
              Filter by category to find the closest comparison to what you're
              already using.
            </p>
          </AnimatedSection>

          <VsFilterGrid
            competitors={sorted.map((c) => ({
              slug: c.slug,
              name: c.name,
              tagline: c.tagline,
              price: c.price,
              our_price: c.our_price,
            }))}
            categoryBySlug={COMPETITOR_CATEGORIES}
            categoryLabels={COMPETITOR_CATEGORY_LABELS}
            categoryOrder={COMPETITOR_CATEGORY_ORDER}
          />
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
              Try It Yourself &mdash; No Credit Card Required
            </h2>
            <p className="max-w-xl text-[16px] text-white/85 leading-[1.65]">
              The honest answer is that comparisons only get you so far. Generate
              your first on-brand carousel, caption, and image in minutes, then
              decide for yourself.
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

      <ExploreOtherHubs current="/vs" />
    </>
  )
}
