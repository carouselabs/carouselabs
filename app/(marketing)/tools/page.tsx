import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowRight,
  BookOpen,
  Lightbulb,
  Sparkles,
  Target,
  Users,
  Wrench,
} from "lucide-react"
import {
  AnimatedSection,
  AnimatedFadeIn,
} from "@/components/marketing/AnimatedSection"
import { niches } from "../for/data"

const SIGNUP_URL = "https://carouselabs.com/signup"

const TITLE = "AI Content Tools for Every Professional — Find Your Niche"
const DESCRIPTION = `CarouseLabs gives every professional a complete AI content toolkit — caption writer, carousel creator, and image generator — tailored to your niche. Browse all ${niches.length} professions.`

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://carouselabs.com/tools" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://carouselabs.com/tools",
    type: "website",
    images: [
      {
        url: "/images/carouselabs-landing.png",
        width: 1920,
        height: 957,
        alt: "CarouseLabs AI content tools for every profession",
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

export default function ToolsIndexPage() {
  // Alphabetical so the index is scannable rather than in arbitrary data order.
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
      name: `AI Content Tools for ${niche.name}`,
      url: `https://carouselabs.com/tools/${niche.slug}`,
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
              {niches.length} professions covered
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.05}>
            <h1 className="text-[clamp(2.2rem,5.5vw,3.4rem)] font-extrabold leading-[1.08] tracking-[-0.03em] text-[#0A0A0A]">
              AI Content Tools for Every Professional &mdash; Find Your Niche
            </h1>
          </AnimatedSection>

          <AnimatedSection delay={0.1}>
            <p className="max-w-2xl text-[18px] text-[#4B5563] leading-[1.6]">
              CarouseLabs gives every professional a complete AI content toolkit
              &mdash; caption writer, carousel creator, and image generator
              &mdash; tailored to your specific niche.
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

      {/* ── ALL NICHES ── */}
      <section className="px-6 py-16 sm:py-20">
        <div className="max-w-6xl mx-auto flex flex-col gap-10">
          <AnimatedSection className="text-center flex flex-col gap-3">
            <h2 className="text-[clamp(1.6rem,3.5vw,2.4rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              AI Tools for All {niches.length} Niches
            </h2>
            <p className="max-w-xl mx-auto text-[15px] text-[#6B7280] leading-[1.6]">
              Each card links to the full AI toolkit for that profession, plus
              its niche page, content ideas, step-by-step guide, and strategy.
            </p>
          </AnimatedSection>

          <AnimatedFadeIn>
            <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sorted.map((niche) => (
                <li
                  key={niche.slug}
                  className="h-full flex flex-col gap-4 p-6 rounded-2xl border border-[#E5E3DE] bg-[#FFFDF8] hover:border-[#C4B5FD] hover:shadow-[0_12px_30px_rgba(124,58,237,0.10)] transition-all"
                >
                  <Link
                    href={`/tools/${niche.slug}`}
                    className="group flex items-start justify-between gap-3"
                  >
                    <h3 className="text-[16px] font-semibold text-[#0A0A0A] leading-snug">
                      {niche.name}
                    </h3>
                    <ArrowRight
                      size={15}
                      strokeWidth={2.2}
                      className="shrink-0 mt-1 text-[#7C3AED] group-hover:translate-x-0.5 transition-transform"
                    />
                  </Link>

                  <Link
                    href={`/tools/${niche.slug}`}
                    className="group inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#7C3AED]"
                  >
                    <Wrench size={13} strokeWidth={2.4} />
                    Explore the AI toolkit
                    <ArrowRight
                      size={13}
                      strokeWidth={2.2}
                      className="group-hover:translate-x-0.5 transition-transform"
                    />
                  </Link>

                  <div className="flex flex-wrap gap-2 pt-1 border-t border-[#F0EEE8] mt-auto">
                    <Link
                      href={`/for/${niche.slug}`}
                      className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full text-[12px] font-semibold text-[#7C3AED] bg-[#F3F0FF] hover:bg-[#EDE9FE] transition-colors"
                    >
                      <Users size={11} strokeWidth={2.4} />
                      Overview
                    </Link>
                    <Link
                      href={`/ideas/${niche.slug}`}
                      className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full text-[12px] font-semibold text-[#7C3AED] bg-[#F3F0FF] hover:bg-[#EDE9FE] transition-colors"
                    >
                      <Lightbulb size={11} strokeWidth={2.4} />
                      Ideas
                    </Link>
                    <Link
                      href={`/how-to/${niche.slug}`}
                      className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full text-[12px] font-semibold text-[#7C3AED] bg-[#F3F0FF] hover:bg-[#EDE9FE] transition-colors"
                    >
                      <BookOpen size={11} strokeWidth={2.4} />
                      Guide
                    </Link>
                    <Link
                      href={`/strategy/${niche.slug}`}
                      className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full text-[12px] font-semibold text-[#7C3AED] bg-[#F3F0FF] hover:bg-[#EDE9FE] transition-colors"
                    >
                      <Target size={11} strokeWidth={2.4} />
                      Strategy
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </AnimatedFadeIn>
        </div>
      </section>

      {/* ── CTA + HUB LINKS ── */}
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
              One Toolkit for Every Kind of Content
            </h2>
            <p className="max-w-xl text-[16px] text-white/85 leading-[1.65]">
              Captions, carousels, and on-brand images &mdash; all generated in
              minutes and tailored to your niche. Try the full toolkit free.
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

        <AnimatedSection className="max-w-4xl mx-auto mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/for"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold text-[#6B7280] bg-white border border-[#E5E3DE] hover:text-[#7C3AED] hover:border-[#C4B5FD] transition-colors"
          >
            Browse all niches
            <ArrowRight size={14} strokeWidth={2.2} />
          </Link>
          <Link
            href="/strategy"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold text-[#6B7280] bg-white border border-[#E5E3DE] hover:text-[#7C3AED] hover:border-[#C4B5FD] transition-colors"
          >
            Content strategies for every niche
            <ArrowRight size={14} strokeWidth={2.2} />
          </Link>
        </AnimatedSection>
      </section>
    </>
  )
}
