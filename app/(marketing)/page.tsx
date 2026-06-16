import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { Hero } from "@/components/landing/Hero"
import { HowItWorks } from "@/components/landing/HowItWorks"
import { FeaturesGrid } from "@/components/landing/FeaturesGrid"
import { Pricing } from "@/components/landing/Pricing"
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
      <Pricing />
      <CTA />
      <ContactSection />
    </>
  )
}
