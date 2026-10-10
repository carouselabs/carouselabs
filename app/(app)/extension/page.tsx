// app/(app)/extension/page.tsx — Extension → Overview for CarouseLabs Engage
// for LinkedIn: plan at a glance, how to install it, this month's activity,
// and the signed-in browsers (components/extension/ExtensionOverview).
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { ExtensionOverview } from "@/components/extension/ExtensionOverview"

export const dynamic = "force-dynamic"

export default async function ExtensionOverviewPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")
  return <ExtensionOverview platform="linkedin" user={user} />
}
