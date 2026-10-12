// app/(app)/extension/billing/page.tsx — Extension → Plan & payments: the
// $15/month plan (bought separately from the web plans), its status, and
// every payment made for it.
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { extAccessSummary } from "@/lib/extAccess"
import { ExtensionBillingView } from "@/components/extension/ExtensionBillingView"

// Fresh on every visit: a purchase lands by webhook while the buyer is on the
// Lemon Squeezy tab, and BillingRefresher re-renders when they come back.
export const dynamic = "force-dynamic"

export default async function ExtensionBillingPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")

  const ext = await extAccessSummary(user.id)

  return <ExtensionBillingView ext={ext} />
}
