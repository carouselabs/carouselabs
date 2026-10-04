import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { Hero } from "@/components/landing/Hero"
import { HowItWorks } from "@/components/landing/HowItWorks"
import { FeaturesGrid } from "@/components/landing/FeaturesGrid"
import { ThumbnailFeature } from "@/components/landing/ThumbnailFeature"
import { ContentHubFeature } from "@/components/landing/ContentHubFeature"
import { ExtensionFeature } from "@/components/landing/ExtensionFeature"
import { XExtensionFeature } from "@/components/landing/XExtensionFeature"
import { Pricing } from "@/components/landing/Pricing"
import { ReferralFeature } from "@/components/landing/ReferralFeature"
import { CTA } from "@/components/landing/CTA"
import { ContactSection } from "@/components/landing/ContactSection"

export default async function Home() {
  const { userId } = await auth()
  if (userId) redirect("/dashboard")

  return (
    <>
      <Hero />
      <HowItWorks />
      <FeaturesGrid />
      <ThumbnailFeature />
      <ContentHubFeature />
      <ExtensionFeature />
      <XExtensionFeature />
      <Pricing />
      <ReferralFeature />
      <CTA />
      <ContactSection />
    </>
  )
}
