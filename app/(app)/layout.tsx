import type { ReactNode } from "react"
import { Onest } from "next/font/google"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { getCurrentUser } from "@/lib/auth"
import { Sidebar } from "@/components/shell/Sidebar"
import { Topbar } from "@/components/shell/Topbar"
import { AppStickers } from "@/components/shell/AppStickers"
import { MaintenanceBanner } from "@/components/shared/MaintenanceBanner"
import { ProfileReviewBanner } from "@/components/shell/ProfileReviewBanner"
import { UpgradeRequiredBanner } from "@/components/shell/UpgradeRequiredBanner"
import { FREE_LIFETIME_POSTS } from "@/lib/credits"

const font = Onest({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
})

// KNOWN LIMITATION (loading-state audit): this layout's own auth/db work
// below (auth(), getCurrentUser()) has no Suspense boundary of its own, and
// a child route's loading.tsx does NOT cover a shared layout's fetch above
// it — per Next.js's loading.js semantics, "without Cache Components,
// navigation blocks until the layout finishes rendering." So every
// navigation into anything under (app) — /dashboard, /settings/*, /intern,
// etc. — blocks on this check first, invisibly, before any page-level
// loading.tsx even gets a chance to render. Not fixed here: it's a bigger
// architectural change (move the check later, wrap it in its own Suspense,
// or adopt Cache Components) than a simple loading.tsx addition. Flagging
// for whoever picks this up next.
export default async function AppLayout({ children }: { children: ReactNode }) {
  // Step 1: require a live Clerk session — no session means not logged in
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  // Step 2: get the DB user, creating it if the webhook hasn't fired yet
  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")

  // Step 3: send new users through onboarding
  if (!user.profile?.onboardingDone) {
    redirect("/onboarding")
  }

  // employee.carouselabs.com is the intern-only subdomain (see proxy.ts) —
  // computed server-side so Sidebar/Topbar render the restricted nav on
  // first paint, with no client-side flash of the full app nav.
  const hostname = (await headers()).get("host") || ""
  const isEmployeeSubdomain = hostname.startsWith("employee.")

  // Same fields lib/credits.ts's availableCredits() checks to gate
  // generation itself — this banner is purely the visibility layer on top,
  // not a second source of truth. Computed fresh on every request (this
  // layout has no caching/revalidate config and already uses the dynamic
  // auth()/headers() APIs), so the very next page load after a webhook
  // upgrades the user's plan stops rendering it — no extra invalidation needed.
  const sub = user.subscription
  const showUpgradeBanner = sub?.plan === "FREE" && sub.creditsUsed >= FREE_LIFETIME_POSTS

  return (
    <div className={`${font.className} h-screen overflow-hidden flex flex-col bg-[#F9F7F2] text-[#0A0A0A]`}>
      {/* The root layout sets a dark body background; keep the app on cream. */}
      <style>{`body{background-color:#F9F7F2;color:#0A0A0A}`}</style>
      {/* Fetches its own visibility client-side — see MaintenanceBanner for why
          this isn't a server-side getAppSettings() call. */}
      <MaintenanceBanner />
      <UpgradeRequiredBanner show={!!showUpgradeBanner} />
      <ProfileReviewBanner
        show={!!user.profile?.prefilledByAdmin && !user.profile?.profileReviewDismissed}
      />
      {/* Grid lives in its own flex-1 wrapper (rather than h-screen directly)
          so the banner above can take its own height without breaking the
          56px-topbar/1fr-main row template. */}
      <div className="flex-1 min-h-0 flex flex-col md:grid md:grid-cols-[230px_1fr] md:grid-rows-[56px_1fr]">
        <Sidebar isEmployeeSubdomain={isEmployeeSubdomain} />
        <Topbar isEmployeeSubdomain={isEmployeeSubdomain} />
        <main className="relative flex-1 min-h-0 overflow-y-auto bg-[#F9F7F2] px-6 py-8 md:px-10 pb-24 md:pb-10">
          {/* Page-aware floating stickers in the cream margins, behind content */}
          <AppStickers />
          <div className="relative z-10 h-full">{children}</div>
        </main>
      </div>
    </div>
  )
}
