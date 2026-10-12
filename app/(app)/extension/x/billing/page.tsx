// app/(app)/extension/x/billing/page.tsx — Extension → Engage for X → Plan &
// payments: X's $15/month plan (sold separately from the LinkedIn
// extension), its status, and every payment made for it.
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { extAccessSummary } from "@/lib/extAccess"
import { ExtensionBillingView } from "@/components/extension/ExtensionBillingView"

// Fresh on every visit: a purchase lands by webhook while the buyer is on the
// Lemon Squeezy tab, and BillingRefresher re-renders when they come back.
export const dynamic = "force-dynamic"

export default async function ExtensionXBillingPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")
  const ext = await extAccessSummary(user.id, "x")

  return <ExtensionBillingView ext={ext} platform="x" />
}
