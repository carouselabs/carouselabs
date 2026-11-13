// app/(app)/extension/layout.tsx — the website's home for the Engage
// extensions: CarouseLabs Engage for LinkedIn (/extension/*), for X
// (/extension/x/*) and for Reddit (/extension/reddit/*). Engage's own menu
// (EngageRail) sits beside every page: the extensions with their plans, then
// Home, Voices, Agents, Activity and Plan & setup. The section has its own
// look (.engage-root in app/globals.css). Nothing here generates text;
// generation only happens in the extensions.
import type { ReactNode } from "react"
import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { instrumentSans } from "@/lib/fonts"
import { ENGAGE_PLATFORMS, type EngagePlatform } from "@/lib/engage/features"
import { engageAccess } from "@/lib/engage/pageData"
import { EngageRail } from "@/components/extension/EngageRail"
import { planStatus, type PlanStatus } from "@/components/extension/engageStatus"

export const metadata: Metadata = {
  title: "Engage for LinkedIn",
  description: "Your CarouseLabs Engage for LinkedIn extension: install it, voices, agents, activity, plan and setup.",
}

export default async function ExtensionLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")

  // Every extension's plan for the menu. One that can't be read just shows
  // no line, rather than taking the page down.
  const statuses: Partial<Record<EngagePlatform, PlanStatus>> = Object.fromEntries(
    (
      await Promise.all(
        ENGAGE_PLATFORMS.map(async (p) => {
          try {
            return [p, planStatus(await engageAccess(user.id, p))] as const
          } catch (err) {
            console.error(`[engage] plan for ${p} unavailable`, err)
            return null
          }
        }),
      )
    ).filter((e) => e !== null),
  )

  return (
    <div className={`engage-root ${instrumentSans.variable}`}>
      <div className="mx-auto flex max-w-[88rem] flex-col gap-5 lg:flex-row lg:items-start">
        <EngageRail statuses={statuses} />
        <div className="flex min-w-0 flex-1 flex-col gap-6">{children}</div>
      </div>
    </div>
  )
}
