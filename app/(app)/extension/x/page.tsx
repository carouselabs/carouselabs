// app/(app)/extension/x/page.tsx — Extension → Overview for CarouseLabs
// Engage for X (a separate extension with its own plan): plan at a glance,
// how to install it, this month's activity, and the signed-in browsers
// (components/extension/ExtensionOverview).
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { ExtensionOverview } from "@/components/extension/ExtensionOverview"

export const dynamic = "force-dynamic"

export default async function ExtensionXOverviewPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")
  return <ExtensionOverview platform="x" user={user} />
}
