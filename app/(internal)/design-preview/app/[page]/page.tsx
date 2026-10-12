import { auth } from "@clerk/nextjs/server"
import { notFound } from "next/navigation"

import DashboardPage from "@/app/(app)/dashboard/page"
import OwnIdeaPage from "@/app/(app)/own-idea/page"
import HistoryPage from "@/app/(app)/history/page"
import PinnedPage from "@/app/(app)/pinned/page"
import { AppChrome } from "@/components/shell/AppChrome"
import { AppFrame } from "@/components/shell/AppFrame"
import { MaintenanceBanner } from "@/components/shared/MaintenanceBanner"
import { ProfileReviewBanner } from "@/components/shell/ProfileReviewBanner"
import { UpgradeRequiredBanner } from "@/components/shell/UpgradeRequiredBanner"

// Development-only: real signed-in pages inside the real app frame, without
// signing in. Their requests (/api/me, /api/ideas/*, /api/history, …) answer
// 401 signed out; the browser checks replace them with example data.
// Signed in they would generate, pin and delete for real — so the preview
// refuses to run then.
//   ?banners=1   show the upgrade and profile-review banners
//   ?employee=1  the intern-only subdomain's frame
const PAGES = {
  dashboard: DashboardPage,
  "own-idea": OwnIdeaPage,
  history: HistoryPage,
  pinned: PinnedPage,
} as const

export default async function AppPreview({
  params,
  searchParams,
}: {
  params: Promise<{ page: string }>
  searchParams: Promise<{ banners?: string; employee?: string }>
}) {
  if (process.env.NODE_ENV !== "development") notFound()
  const { userId } = await auth()
  if (userId) {
    return (
      <p className="p-8 font-sans text-[#211F1C]">
        Preview disabled while signed in: it would generate, pin and delete for real. Open it in a private window.
      </p>
    )
  }
  const { page } = await params
  const Page = PAGES[page as keyof typeof PAGES]
  if (!Page) notFound()
  const { banners, employee } = await searchParams
  return (
    <AppFrame>
      <MaintenanceBanner />
      <UpgradeRequiredBanner show={banners === "1"} />
      <ProfileReviewBanner show={banners === "1"} />
      <AppChrome isEmployeeSubdomain={employee === "1"} pathname={`/${page}`}>
        <Page />
      </AppChrome>
    </AppFrame>
  )
}
