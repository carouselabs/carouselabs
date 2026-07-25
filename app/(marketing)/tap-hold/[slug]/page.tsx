import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { BookOpen, Lightbulb, Sparkles, XCircle } from "lucide-react"
import {
  AnimatedSection,
  AnimatedFadeIn,
} from "@/components/marketing/AnimatedSection"
import { TapHoldCTA } from "@/components/marketing/tap-hold/TapHoldCTA"
import { TapHoldBreadcrumbs, buildBreadcrumbJsonLd } from "@/components/marketing/tap-hold/TapHoldBreadcrumbs"
import { TapHoldTOC } from "@/components/marketing/tap-hold/TapHoldTOC"
import { TapHoldScreenshot } from "@/components/marketing/tap-hold/TapHoldScreenshot"
import { TapHoldTutorialSteps } from "@/components/marketing/tap-hold/TapHoldTutorialSteps"
import { TapHoldFAQSection } from "@/components/marketing/tap-hold/TapHoldFAQSection"
import { TapHoldRelatedArticles } from "@/components/marketing/tap-hold/TapHoldRelatedArticles"
import { tapHoldArticles, getTapHoldArticle, getRelatedTapHoldArticles } from "../data"

const BASE_URL = "https://carouselabs.com"

// Only the slugs in tapHoldArticles are valid; any other /tap-hold/* path 404s.
export const dynamicParams = false

export function generateStaticParams() {
  return tapHoldArticles.map((a) => ({ slug: a.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const article = getTapHoldArticle(slug)
  if (!article) return {}

  const url = `${BASE_URL}/tap-hold/${article.slug}`

  return {
    title: article.seo_title,
    description: article.seo_description,
    alternates: { canonical: url },
    openGraph: {
      title: article.seo_title,
      description: article.seo_description,
      url,
      type: "article",
      images: [
        {
          url: "/images/carouselabs-landing.png",
          width: 1920,
          height: 957,
          alt: article.h1,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: article.seo_title,
      description: article.seo_description,
      images: ["/images/carouselabs-landing.png"],
    },
  }
}

function buildFaqJsonLd(article: ReturnType<typeof getTapHoldArticle>) {
  if (!article) return null
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: article.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  }
}

function buildHowToJsonLd(article: ReturnType<typeof getTapHoldArticle>) {
  if (!article) return null
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: article.h1,
    description: article.seo_description,
    step: article.tutorial_steps.map((step, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: step.title,
      text: step.description,
    })),
  }
}

export default async function TapHoldArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const article = getTapHoldArticle(slug)
  if (!article) notFound()

  const related = getRelatedTapHoldArticles(article)
  const faqJsonLd = buildFaqJsonLd(article)
  const howToJsonLd = buildHowToJsonLd(article)
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(article.category, article.h1, article.slug)

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <TapHoldBreadcrumbs category={article.category} h1={article.h1} />

      {/* ── HERO ── */}
      <section className="relative px-6 pt-10 pb-14 sm:pb-16">
        <div className="relative z-10 max-w-3xl mx-auto text-center flex flex-col items-center gap-6">
          <AnimatedSection delay={0}>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#E5E3DE] text-[12px] font-medium text-[#7C3AED]">
              <Sparkles size={11} strokeWidth={2.2} />
              {article.hero_badge}
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.05}>
            <h1 className="text-[clamp(2.1rem,5.2vw,3.3rem)] font-extrabold leading-[1.1] tracking-[-0.03em] text-[#0A0A0A]">
              {article.h1}
            </h1>
          </AnimatedSection>

          <AnimatedSection delay={0.1}>
            <p className="max-w-2xl text-[18px] text-[#4B5563] leading-[1.6]">{article.hero_subtitle}</p>
          </AnimatedSection>

          <AnimatedSection delay={0.15}>
            <div className="inline-flex items-center gap-2 text-[13px] font-medium text-[#6B7280]">
              <BookOpen size={14} strokeWidth={2.2} />
              {article.read_time}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Top CTA */}
      <AnimatedFadeIn>
        <TapHoldCTA variant="top" keyword={article.keyword} />
      </AnimatedFadeIn>

      {/* Hero screenshot */}
      <section className="px-6 py-14">
        <AnimatedFadeIn>
          <TapHoldScreenshot
            label="Hero"
            caption={`The CarouseLabs Tap & Hold Image Maker, ready to create your ${article.keyword.toLowerCase()}`}
          />
        </AnimatedFadeIn>
      </section>

      {/* Table of contents */}
      <section className="px-6 pb-14">
        <AnimatedSection>
          <TapHoldTOC />
        </AnimatedSection>
      </section>

      {/* Introduction */}
      <section className="px-6 py-8">
        <div className="max-w-3xl mx-auto flex flex-col gap-6">
          {article.intro.map((paragraph, i) => (
            <AnimatedSection key={i} delay={i * 0.05}>
              <p className="text-[17px] leading-[1.75] text-[#3F3F46]">{paragraph}</p>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* What this keyword means */}
      <section id="what-it-means" className="px-6 py-14 sm:py-16 bg-[#FBFAF6] scroll-mt-20">
        <div className="max-w-3xl mx-auto flex flex-col gap-6">
          <AnimatedSection>
            <h2 className="text-[clamp(1.6rem,3.5vw,2.3rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              What &ldquo;{article.keyword}&rdquo; Means
            </h2>
          </AnimatedSection>
          {article.what_it_means.map((paragraph, i) => (
            <AnimatedSection key={i} delay={0.05 + i * 0.05}>
              <p className="text-[16px] leading-[1.75] text-[#3F3F46]">{paragraph}</p>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* Why people use this effect */}
      <section id="why-popular" className="px-6 py-14 sm:py-16 scroll-mt-20">
        <div className="max-w-3xl mx-auto flex flex-col gap-6">
          <AnimatedSection>
            <h2 className="text-[clamp(1.6rem,3.5vw,2.3rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              Why People Use This Effect
            </h2>
          </AnimatedSection>
          {article.why_popular.map((paragraph, i) => (
            <AnimatedSection key={i} delay={0.05 + i * 0.05}>
              <p className="text-[16px] leading-[1.75] text-[#3F3F46]">{paragraph}</p>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* Step screenshot */}
      <section className="px-6 py-14 bg-[#FBFAF6]">
        <AnimatedFadeIn>
          <TapHoldScreenshot label="Upload step" caption="Uploading an image into the CarouseLabs Tap & Hold Image Maker" />
        </AnimatedFadeIn>
      </section>

      {/* Tutorial: How to Create This with CarouseLabs */}
      <section id="tutorial" className="px-6 py-16 sm:py-20 scroll-mt-20">
        <div className="max-w-3xl mx-auto flex flex-col gap-10">
          <AnimatedSection className="text-center flex flex-col gap-4">
            <h2 className="text-[clamp(1.7rem,3.8vw,2.6rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              How to Create This with CarouseLabs
            </h2>
            <p className="max-w-2xl mx-auto text-[16px] leading-[1.7] text-[#4B5563]">{article.tutorial_intro}</p>
          </AnimatedSection>

          <AnimatedSection delay={0.05}>
            <TapHoldTutorialSteps steps={article.tutorial_steps} />
          </AnimatedSection>
        </div>
      </section>

      {/* Brush screenshot */}
      <section className="px-6 py-14">
        <AnimatedFadeIn>
          <TapHoldScreenshot label="Brush tool" caption="Using the brush tool to paint the areas that stay visible in the timeline" />
        </AnimatedFadeIn>
      </section>

      {/* Middle CTA */}
      <AnimatedFadeIn>
        <TapHoldCTA variant="middle" keyword={article.keyword} />
      </AnimatedFadeIn>

      {/* Tips */}
      <section id="tips" className="px-6 py-16 sm:py-20 bg-[#FBFAF6] scroll-mt-20">
        <div className="max-w-4xl mx-auto flex flex-col gap-10">
          <AnimatedSection className="text-center">
            <h2 className="text-[clamp(1.7rem,3.8vw,2.6rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              Tips for Better Results
            </h2>
          </AnimatedSection>
          <div className="flex flex-col gap-4">
            {article.tips.map((tip, i) => (
              <AnimatedSection key={i} delay={i * 0.05}>
                <div className="flex items-start gap-4 p-6 rounded-2xl border border-[#E5DEF7] bg-white">
                  <div className="shrink-0 w-9 h-9 rounded-xl bg-[#EDE9FE] flex items-center justify-center">
                    <Lightbulb size={16} className="text-[#7C3AED]" strokeWidth={2.2} />
                  </div>
                  <div>
                    <p className="text-[15px] font-semibold text-[#0A0A0A]">{tip.tip}</p>
                    <p className="mt-1.5 text-[14px] leading-[1.65] text-[#4B5563]">{tip.detail}</p>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Preview screenshot */}
      <section className="px-6 py-14">
        <AnimatedFadeIn>
          <TapHoldScreenshot label="Preview" caption="Timeline View and Tap & Hold View previews side by side in CarouseLabs" />
        </AnimatedFadeIn>
      </section>

      {/* Examples */}
      <section id="examples" className="px-6 py-16 sm:py-20 scroll-mt-20">
        <div className="max-w-5xl mx-auto flex flex-col gap-10">
          <AnimatedSection className="text-center">
            <h2 className="text-[clamp(1.7rem,3.8vw,2.6rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              Examples
            </h2>
          </AnimatedSection>
          <div className="grid sm:grid-cols-2 gap-5">
            {article.examples.map((example, i) => (
              <AnimatedSection key={i} delay={(i % 2) * 0.05}>
                <div className="h-full flex flex-col gap-3 p-6 rounded-2xl border border-[#E5E3DE] bg-[#FFFDF8]">
                  <h3 className="text-[16px] font-bold text-[#0A0A0A]">{example.title}</h3>
                  <p className="text-[14px] leading-[1.65] text-[#4B5563]">{example.description}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Final result screenshot */}
      <section className="px-6 py-14 bg-[#FBFAF6]">
        <AnimatedFadeIn>
          <TapHoldScreenshot label="Final result" caption="The finished tap and hold image, downloaded and ready to post on X" />
        </AnimatedFadeIn>
      </section>

      {/* Common mistakes */}
      <section id="mistakes" className="px-6 py-16 sm:py-20 scroll-mt-20">
        <div className="max-w-4xl mx-auto flex flex-col gap-10">
          <AnimatedSection className="text-center">
            <h2 className="text-[clamp(1.7rem,3.8vw,2.6rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              Common Mistakes
            </h2>
          </AnimatedSection>
          <div className="flex flex-col gap-4">
            {article.mistakes.map((item, i) => (
              <AnimatedSection key={i} delay={i * 0.05}>
                <div className="flex flex-col gap-3 p-6 rounded-2xl border border-[#F0D9CE] bg-[#FFF8F5]">
                  <div className="flex items-start gap-3">
                    <XCircle size={17} className="shrink-0 mt-0.5 text-[#EA580C]" strokeWidth={2.2} />
                    <p className="text-[15px] font-semibold text-[#0A0A0A]">{item.mistake}</p>
                  </div>
                  <p className="pl-8 text-[14px] leading-[1.65] text-[#4B5563]">
                    <span className="font-semibold text-[#15803D]">Fix: </span>
                    {item.fix}
                  </p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="px-6 py-16 sm:py-20 bg-[#FBFAF6] scroll-mt-20">
        <div className="max-w-3xl mx-auto flex flex-col gap-10">
          <AnimatedSection className="text-center">
            <h2 className="text-[clamp(1.7rem,3.8vw,2.6rem)] font-bold tracking-[-0.025em] text-[#0A0A0A]">
              Frequently Asked Questions
            </h2>
          </AnimatedSection>
          <AnimatedSection delay={0.05}>
            <TapHoldFAQSection faqs={article.faqs} />
          </AnimatedSection>
        </div>
      </section>

      {/* Conclusion */}
      <section className="px-6 py-16 sm:py-20">
        <div className="max-w-3xl mx-auto flex flex-col gap-6">
          {article.conclusion.map((paragraph, i) => (
            <AnimatedSection key={i} delay={i * 0.05}>
              <p className="text-[16px] leading-[1.75] text-[#3F3F46]">{paragraph}</p>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <TapHoldCTA variant="bottom" keyword={article.keyword} />

      {/* Related articles */}
      <TapHoldRelatedArticles related={related} category={article.category} />
    </>
  )
}
