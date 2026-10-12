import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { Hero } from "@/components/landing/Hero"
import { FeaturesGrid } from "@/components/landing/FeaturesGrid"
import { EngageSection } from "@/components/landing/EngageSection"
import { ThumbnailFeature } from "@/components/landing/ThumbnailFeature"
import { ContentHubFeature } from "@/components/landing/ContentHubFeature"
import { Pricing } from "@/components/landing/Pricing"
import { ReferralFeature } from "@/components/landing/ReferralFeature"
import { CTA } from "@/components/landing/CTA"
import { ContactSection } from "@/components/landing/ContactSection"

export default async function Home() {
  const { userId } = await auth()
  if (userId) redirect("/dashboard")

  return (
    <>
      {/* Headline + the interactive product demo (#how-it-works) */}
      <Hero />
      <FeaturesGrid />
      {/* Engage for LinkedIn / X behind one switch (#extension, #x-extension) */}
      <EngageSection />
      {/* Supporting tools: two panels of different weight */}
      <section aria-label="More tools" className="border-t border-border">
        <div className="mx-auto grid max-w-showcase gap-4 gutter-x section-y lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <ThumbnailFeature />
          <ContentHubFeature />
        </div>
      </section>
      <Pricing />
      <ReferralFeature />
      <CTA />
      <ContactSection />
    </>
  )
}
