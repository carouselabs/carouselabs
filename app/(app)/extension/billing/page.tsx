// app/(app)/extension/billing/page.tsx — Engage → Plan & setup:
// the LinkedIn extension's plan (bought separately), installing it, its
// signed-in browsers, its preferences (what Settings held) and its payments.
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { PlanAndSetup } from "@/components/extension/PlanAndSetup"

// Fresh on every visit: a purchase lands by webhook while the buyer is on the
// Lemon Squeezy tab, and BillingRefresher re-renders when they come back.
export const dynamic = "force-dynamic"

export default async function ExtensionPlanPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")
  return <PlanAndSetup platform="linkedin" user={user} />
}
