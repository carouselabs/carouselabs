// app/(app)/extension/x/billing/page.tsx — Engage for X → Plan & setup:
// the X extension's plan (bought separately), installing it, its
// signed-in browsers, its preferences (what Settings held) and its payments.
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { PlanAndSetup } from "@/components/extension/PlanAndSetup"

// Fresh on every visit: a purchase lands by webhook while the buyer is on the
// Lemon Squeezy tab, and BillingRefresher re-renders when they come back.
export const dynamic = "force-dynamic"

export default async function ExtensionXPlanPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")
  return <PlanAndSetup platform="x" user={user} />
}
