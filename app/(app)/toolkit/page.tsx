import type { Metadata } from "next"
import { getCurrentUser } from "@/lib/auth"
import { extAccessSummary } from "@/lib/extAccess"
import { standardPrice } from "@/lib/engage/priceRules"
import { ENGAGE_PLATFORMS, type EngagePlatform } from "@/lib/engage/features"
import { ToolkitView } from "@/components/toolkit/ToolkitView"

export const metadata: Metadata = {
  title: "Toolkit",
  description: "Every CarouseLabs tool and browser extension in one place.",
}

export default async function ToolkitPage() {
  // The (app) layout has already required a signed-in user.
  const user = await getCurrentUser()
  const summaries = user ? await Promise.all(ENGAGE_PLATFORMS.map((p) => extAccessSummary(user.id, p))) : []
  const perPlatform = <T,>(value: (p: EngagePlatform, i: number) => T) =>
    Object.fromEntries(ENGAGE_PLATFORMS.map((p, i) => [p, value(p, i)])) as Record<EngagePlatform, T>
  const unlimited = perPlatform((_, i) => summaries[i]?.access === "unlimited")
  const prices = perPlatform((p, i) => summaries[i]?.price ?? standardPrice(p))

  return <ToolkitView unlimited={unlimited} prices={prices} />
}
