import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Sparkles, Wand2 } from "lucide-react"
import {
  AnimatedSection,
  AnimatedFadeIn,
} from "@/components/marketing/AnimatedSection"
import {
  TAP_HOLD_CATEGORY_LABELS,
  TAP_HOLD_CATEGORY_DESCRIPTIONS,
} from "./types"
import { tapHoldArticles, getTapHoldArticlesByCategory, TAP_HOLD_CATEGORY_ORDER } from "./data"

const BASE_URL = "https://carouselabs.com"
const TITLE = "Tap & Hold Image Guides — CarouseLabs"
const DESCRIPTION = `${tapHoldArticles.length} free guides on how to make, understand, and troubleshoot tap and hold images for X — all using the free CarouseLabs Tap & Hold Image Maker.`

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${BASE_URL}/tap-hold` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${BASE_URL}/tap-hold`,
    type: "website",
    images: [
      {
        url: "/images/carouselabs-landing.png",
        width: 1920,
        height: 957,
        alt: "CarouseLabs Tap & Hold Image guides",
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

export default function TapHoldIndexPage() {
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: TITLE,
    description: DESCRIPTION,
    numberOfItems: tapHoldArticles.length,
    itemListElement: tapHoldArticles.map((article, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: article.h1,
      url: `${BASE_URL}/tap-hold/${article.slug}`,
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />

      {/* ── HERO ── */}
      <section className="relative px-6 pt-20 pb-14 sm:pt-24 sm:pb-16 bg-[#FBFAF6]">
        <div className="relative z-10 max-w-3xl mx-auto text-center flex flex-col items-center gap-6">
          <AnimatedSection delay={0}>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#E5E3DE] text-[12px] font-medium text-[#7C3AED]">
              <Sparkles size={11} strokeWidth={2.2} />
              {tapHoldArticles.length} free guides
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.05}>
            <h1 className="text-[clamp(2.2rem,5.5vw,3.4rem)] font-extrabold leading-[1.08] tracking-[-0.03em] text-[#0A0A0A]">
              Tap &amp; Hold Image Guides
            </h1>
          </AnimatedSection>

          <AnimatedSection delay={0.1}>
            <p className="max-w-2xl text-[18px] text-[#4B5563] leading-[1.6]">
              Everything you need to make, understand, and troubleshoot tap and hold images for X — every guide uses
              the free CarouseLabs Tap &amp; Hold Image Maker.
            </p>
          </AnimatedSection>

          <AnimatedSection delay={0.15}>
            <Link
              href="/tools/tap-hold-maker"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-[15px] font-semibold text-white transition-colors shadow-[0_10px_30px_rgba(124,58,237,0.25)]"
            >
              <Wand2 size={16} strokeWidth={2.2} />
              Open the Tap & Hold Image Maker
            </Link>
          </AnimatedSection>
        </div>
      </section>

      {/* ── CATEGORY SECTIONS ── */}
      {TAP_HOLD_CATEGORY_ORDER.map((category, ci) => {
        const articles = getTapHoldArticlesByCategory(category)
        if (articles.length === 0) return null
        return (
          <section
            key={category}
            id={category}
            className={`px-6 py-16 sm:py-20 scroll-mt-20 ${ci % 2 === 1 ? "bg-[#FBFAF6]" : ""}`}
          >
            <div className="max-w-5xl mx-auto flex flex-col gap-10">
              <AnimatedSection className="text-center flex flex-col gap-3">
                <h2 className="text-[clamp(1.6rem,3.5vw,2.3rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
                  {TAP_HOLD_CATEGORY_LABELS[category]}
                </h2>
                <p className="max-w-xl mx-auto text-[15px] text-[#6B7280]">
                  {TAP_HOLD_CATEGORY_DESCRIPTIONS[category]}
                </p>
              </AnimatedSection>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {articles.map((article, i) => (
                  <AnimatedSection key={article.slug} delay={(i % 3) * 0.05}>
                    <Link
                      href={`/tap-hold/${article.slug}`}
                      className="group h-full flex flex-col justify-between gap-4 p-6 rounded-2xl border border-[#E5E3DE] bg-white hover:border-[#C4B5FD] hover:shadow-[0_12px_30px_rgba(124,58,237,0.10)] transition-all"
                    >
                      <span className="text-[15px] font-semibold text-[#0A0A0A] leading-snug">{article.h1}</span>
                      <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#7C3AED]">
                        Read the guide
                        <ArrowRight size={14} strokeWidth={2.2} className="group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </Link>
                  </AnimatedSection>
                ))}
              </div>
            </div>
          </section>
        )
      })}

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
              Ready to make your own tap and hold image?
            </h2>
            <p className="max-w-xl text-[16px] text-white/85 leading-[1.65]">
              Free, no login required — upload, paint, and download in seconds.
            </p>
            <Link
              href="/tools/tap-hold-maker"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white hover:bg-[#F3F0FF] text-[16px] font-semibold text-[#7C3AED] transition-colors shadow-[0_10px_30px_rgba(0,0,0,0.18)]"
            >
              Open the Tap & Hold Image Maker
              <ArrowRight size={17} strokeWidth={2.2} />
            </Link>
          </div>
        </AnimatedFadeIn>
      </section>
    </>
  )
}
