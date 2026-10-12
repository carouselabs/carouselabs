import type { ReactNode } from "react"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { getCurrentUser } from "@/lib/auth"
import { AppChrome } from "@/components/shell/AppChrome"
import { AppFrame } from "@/components/shell/AppFrame"
import { MaintenanceBanner } from "@/components/shared/MaintenanceBanner"
import { ProfileReviewBanner } from "@/components/shell/ProfileReviewBanner"
import { UpgradeRequiredBanner } from "@/components/shell/UpgradeRequiredBanner"
import { FREE_LIFETIME_CREDITS } from "@/lib/credits"

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
  // computed server-side so the app frame renders the restricted nav on
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
  const showUpgradeBanner = sub?.plan === "FREE" && sub.creditsUsed >= FREE_LIFETIME_CREDITS

  return (
    <AppFrame>
      {/* Fetches its own visibility client-side — see MaintenanceBanner for why
          this isn't a server-side getAppSettings() call. */}
      <MaintenanceBanner />
      <UpgradeRequiredBanner show={!!showUpgradeBanner} />
      <ProfileReviewBanner
        show={!!user.profile?.prefilledByAdmin && !user.profile?.profileReviewDismissed}
      />
      <AppChrome isEmployeeSubdomain={isEmployeeSubdomain}>{children}</AppChrome>
    </AppFrame>
  )
}
