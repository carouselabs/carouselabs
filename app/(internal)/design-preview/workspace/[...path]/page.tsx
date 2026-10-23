import { auth } from "@clerk/nextjs/server"
import { notFound } from "next/navigation"
import type { ReactNode } from "react"

import { AppChrome } from "@/components/shell/AppChrome"
import { AppFrame } from "@/components/shell/AppFrame"
import { ExtensionHeader } from "@/components/extension/ExtensionHeader"
import { ExtensionOverviewView } from "@/components/extension/ExtensionOverview"
import { ENGAGE_EXTENSIONS, otherPlatforms } from "@/components/extension/engageExtensions"
import { ExtensionBillingView } from "@/components/extension/ExtensionBillingView"
import { ProfilesManager } from "@/components/extension/ProfilesManager"
import { AgentsManager } from "@/components/extension/AgentsManager"
import { HistoryList } from "@/components/extension/HistoryList"
import { ExtensionSettingsForm } from "@/components/extension/ExtensionSettingsForm"
import { XReplyProfiles, XSettingsPanel } from "@/components/extension/XExtensionViews"
import { BillingView } from "@/components/settings/BillingView"
import ProfileSettingsPage from "@/app/(app)/settings/profile/page"
import VoicePresetsPage from "@/app/(app)/settings/voice-presets/page"
import ReferralsPage from "@/app/(app)/settings/referrals/page"
import StartPageSettingsPage from "@/app/(app)/settings/start-page/page"
import AccountSettingsPage from "@/app/(app)/settings/account/page"
import { ContentHubClient } from "@/app/(app)/content-hub/_client"
import IdeasBoardPage from "@/app/(app)/content-hub/ideas/page"
import { ThumbnailClient } from "@/app/(app)/thumbnail/_client"
import { ToolkitView } from "@/components/toolkit/ToolkitView"
import { InternPortalView } from "@/components/intern/InternPortalView"
import type { DayCell } from "@/components/intern/PerformanceCalendar"
import { ENGAGE_FEATURES } from "@/lib/engage/features"
import type { ExtAccessSummary } from "@/lib/extAccess"
import { parseDollars, priceFor, standardPrice } from "@/lib/engage/priceRules"

// Development-only: the Engage and Settings pages in the real app frame,
// with example data, without signing in. Pages that load their own data in
// the browser get it from the browser checks (every request answered with
// example data); the two server-loaded pages render their display component
// with example props. Signed in they would read and change the real account,
// so the preview refuses to run then.
//   /design-preview/workspace/engage[/profiles|agents|history|settings|billing]
//   /design-preview/workspace/engage-x[/…]
//   /design-preview/workspace/settings/[profile|voice-presets|billing|referrals|start-page|account]
//   /design-preview/workspace/content-hub[/ideas] · toolkit · thumbnail · intern
//   ?access=unlimited      the extension plan is paid (default: free); also Toolkit
//   ?price=5               a special price an admin set (dollars, until Nov 30); also Toolkit
//   ?ended=1               Intern: the internship has ended
//   ?plan=PRO|GROWTH       the web plan on Settings → Billing (default: FREE)

const features = Object.fromEntries(ENGAGE_FEATURES.map((f) => [f, true])) as ExtAccessSummary["features"]
function examplePrice(price: string | undefined) {
  const cents = price ? parseDollars(price) : null
  return cents
    ? priceFor("linkedin", { priceCents: cents, endsAt: new Date("2026-11-30T23:59:59.000Z") }, new Date("2026-10-21T00:00:00.000Z"))
    : standardPrice("linkedin")
}

function exampleAccess(access: string | undefined, price?: string): ExtAccessSummary {
  const paid = access === "unlimited"
  return {
    access: paid ? "unlimited" : "free",
    freeUsed: 12,
    freeLimit: 30,
    status: paid ? "active" : null,
    renewsAt: paid ? "2026-11-11T00:00:00.000Z" : null,
    endsAt: null,
    manageUrl: paid ? "https://example.com/manage" : null,
    source: paid ? "subscription" : "free",
    grantEndsAt: null,
    suspended: false,
    features,
    price: examplePrice(price),
  }
}

function Engage({ platform, tab, access, price }: { platform: "linkedin" | "x"; tab: string; access?: string; price?: string }) {
  const base = ENGAGE_EXTENSIONS[platform].base
  const ext = exampleAccess(access, price)
  const pages: Record<string, ReactNode> = {
    "": (
      <ExtensionOverviewView
        platform={platform}
        email="example@example.com"
        ext={ext}
        others={otherPlatforms(platform).map((p) => ({ platform: p, ext: exampleAccess(access === "unlimited" ? undefined : "unlimited") }))}
        counts={platform === "x" ? { x_reply: 41, x_message: 6 } : { comment: 128, reply: 37, connection_note: 14, message: 9 }}
        signedInBrowsers={1}
      />
    ),
    profiles: platform === "x" ? <XReplyProfiles /> : <ProfilesManager />,
    agents: <AgentsManager />,
    history: <HistoryList platform={platform} />,
    settings: platform === "x" ? <XSettingsPanel /> : <ExtensionSettingsForm />,
    billing: <ExtensionBillingView ext={ext} platform={platform} />,
  }
  if (!(tab in pages)) notFound()
  // Same wrapper as app/(app)/extension/layout.tsx
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <ExtensionHeader pathname={tab ? `${base}/${tab}` : base} />
      {pages[tab]}
    </div>
  )
}

function Settings({ page, plan }: { page: string; plan?: string }) {
  const p = plan === "PRO" || plan === "GROWTH" ? plan : "FREE"
  switch (page) {
    case "profile":
      return <ProfileSettingsPage />
    case "voice-presets":
      return <VoicePresetsPage />
    case "referrals":
      return <ReferralsPage />
    case "start-page":
      return <StartPageSettingsPage />
    case "account":
      return <AccountSettingsPage />
    case "billing":
      return (
        <BillingView
          plan={p}
          email="example@example.com"
          userId="example-user"
          renewal={p === "FREE" ? null : "Nov 11, 2026"}
          cancelAtPeriodEnd={false}
          upgradeScheduled={false}
          remaining={p === "FREE" ? 9 : 642}
          creditsTotal={p === "GROWTH" ? 3000 : 1000}
          extraCredits={p === "FREE" ? 0 : 50}
          extraCreditsExpiry={p === "FREE" ? null : "2026-12-01T00:00:00.000Z"}
          percentUsed={p === "FREE" ? 64 : 36}
          extension={exampleAccess(undefined)}
          xExtension={exampleAccess("unlimited")}
        />
      )
    default:
      notFound()
  }
}

// The example intern's "today", read once when the module loads.
const PREVIEW_NOW = new Date()

// Example intern: this month's grid with a few recorded days.
function exampleInternCells(): { cells: DayCell[]; monthLabel: string } {
  const now = PREVIEW_NOW
  const first = new Date(now.getFullYear(), now.getMonth(), 1)
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const cells: DayCell[] = Array.from({ length: first.getDay() }, () => ({ day: null, points: null, tasks: [], attendanceStatus: null }))
  for (let d = 1; d <= days; d++) {
    const status = d % 9 === 0 ? "leave" : d % 7 === 0 ? "half-day" : d % 11 === 0 ? "absent" : d < now.getDate() ? "present" : null
    cells.push({
      day: d,
      points: d < now.getDate() && d % 3 !== 0 ? (d % 5 === 0 ? -5 : 10 + (d % 4) * 5) : null,
      tasks: d < now.getDate() && d % 2 === 0 ? ["Example task", "Example review"] : [],
      attendanceStatus: status as DayCell["attendanceStatus"],
    })
  }
  return { cells, monthLabel: first.toLocaleDateString("en-US", { month: "long", year: "numeric" }) }
}

function Intern({ ended }: { ended: boolean }) {
  const { cells, monthLabel } = exampleInternCells()
  const day = (n: number) => new Date(PREVIEW_NOW.getTime() - n * 86400000)
  return (
    <InternPortalView
      intern={{
        id: "intern-1",
        name: "Example Intern",
        status: ended ? "completed" : "active",
        role: "Content intern",
        department: "Marketing",
        email: "intern@example.com",
        phone: "+1 555 0100",
        joinDate: day(60),
        extensions: [{ id: "x1", addedDays: 14, createdAt: day(20) }],
      }}
      endDate={ended ? day(2) : day(-30)}
      progress={ended ? { percentComplete: 100, daysRemaining: 0, isCompleted: true } : { percentComplete: 67, daysRemaining: 30, isCompleted: false }}
      hasEnded={ended}
      total={1240}
      pointsToday={25}
      pointsThisWeek={140}
      attendanceRateLabel="94%"
      leaveBalance={{ remaining: 3, total: 5 }}
      takenDates={[]}
      cells={cells}
      monthLabel={monthLabel}
      recent={[
        { id: "e1", category: "Example task", note: "Example note about the work done.", date: day(0), points: 15 },
        { id: "e2", category: "Example review", note: null, date: day(1), points: 10 },
        { id: "e3", category: "Example custom entry", note: "Late submission", date: day(2), points: -5 },
      ]}
      taskNames={new Set(["Example task", "Example review"])}
    />
  )
}

export default async function WorkspacePreview({
  params,
  searchParams,
}: {
  params: Promise<{ path: string[] }>
  searchParams: Promise<{ access?: string; plan?: string; ended?: string; price?: string }>
}) {
  if (process.env.NODE_ENV !== "development") notFound()
  const { userId } = await auth()
  if (userId) {
    return (
      <p className="p-8 font-sans text-[#211F1C]">
        Preview disabled while signed in: it would read and change your real account. Open it in a private window.
      </p>
    )
  }
  const { path } = await params
  const { access, plan, ended, price } = await searchParams
  const [area, sub = ""] = path

  let pathname: string
  let content: ReactNode
  if (area === "engage" || area === "engage-x") {
    const platform = area === "engage-x" ? "x" : "linkedin"
    pathname = `${platform === "x" ? "/extension/x" : "/extension"}${sub ? `/${sub}` : ""}`
    content = <Engage platform={platform} tab={sub} access={access} price={price} />
  } else if (area === "settings") {
    pathname = `/settings/${sub}`
    content = <Settings page={sub} plan={plan} />
  } else if (area === "content-hub" && (sub === "" || sub === "ideas")) {
    pathname = sub ? "/content-hub/ideas" : "/content-hub"
    content = sub ? <IdeasBoardPage /> : <ContentHubClient />
  } else if (area === "toolkit") {
    pathname = "/toolkit"
    content = (
      <ToolkitView
        unlimited={{ linkedin: access === "unlimited", x: false, reddit: false }}
        prices={{ linkedin: examplePrice(price), x: standardPrice("x"), reddit: standardPrice("reddit") }}
      />
    )
  } else if (area === "thumbnail") {
    pathname = "/thumbnail"
    content = <ThumbnailClient />
  } else if (area === "intern") {
    pathname = "/intern"
    content = <Intern ended={ended === "1"} />
  } else {
    notFound()
  }

  return (
    <AppFrame>
      <AppChrome pathname={pathname}>{content}</AppChrome>
    </AppFrame>
  )
}
