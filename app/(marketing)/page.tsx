import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import Script from "next/script"
import { Hero } from "@/components/landing/Hero"
import { HowItWorks } from "@/components/landing/HowItWorks"
import { FeaturesGrid } from "@/components/landing/FeaturesGrid"
import { EngageSection } from "@/components/landing/EngageSection"
import { ThumbnailFeature } from "@/components/landing/ThumbnailFeature"
import { ContentHubFeature } from "@/components/landing/ContentHubFeature"
import { Pricing } from "@/components/landing/Pricing"
import { ReferralFeature } from "@/components/landing/ReferralFeature"
import { ContactSection } from "@/components/landing/ContactSection"

/*
  The home page in the anantgoyal.in look, planned as screens (taste skill):
  kind software · the owner's own look (lavender, ink, the blue → violet
  gradient, Instrument Sans + Instrument Serif italics) in place of a dealt
  palette · split hero on the gradient frame · night band for Engage ·
  pill buttons · moments: marquee-row (formats, under How it works) and
  counter-rolls (the referral figures), from public/assets/moments.
  hero (canvas) → how it works (white) → features (mist) → Engage (night)
  → more tools (white) → pricing (mist) → referrals (white) → close +
  contact (canvas) → footer (night).
*/
export default async function Home() {
  const { userId } = await auth()
  if (userId) redirect("/dashboard")

  return (
    <>
      <Hero />
      <HowItWorks />
      <FeaturesGrid />
      {/* Engage for LinkedIn / X behind one switch (#extension, #x-extension) */}
      <EngageSection />
      {/* Supporting tools: two linked cards */}
      <section aria-labelledby="tools-title" className="bg-surface font-ui">
        <div className="wrap-site flex flex-col gap-12 py-24 lg:py-[120px]">
          <h2 id="tools-title" className="text-[clamp(2rem,1.1rem+2.5vw,3.25rem)] leading-[1] font-semibold tracking-[-0.04em]">
            More <span className="serif-accent gradient-word pr-[0.04em] text-[1.08em]">tools</span>
          </h2>
          <div className="grid gap-5 lg:grid-cols-2">
            <ThumbnailFeature />
            <ContentHubFeature />
          </div>
        </div>
      </section>
      <Pricing />
      <ReferralFeature />
      <ContactSection />
      {/* The taste skill's moment loader (kit files, unchanged). */}
      <Script id="moments" type="module" src="/assets/moments/moments.js" strategy="afterInteractive" />
    </>
  )
}
