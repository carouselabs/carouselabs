import { auth } from "@clerk/nextjs/server"
import { notFound } from "next/navigation"
import type { ReactNode } from "react"

import { AppChrome } from "@/components/shell/AppChrome"
import { AppFrame } from "@/components/shell/AppFrame"
import { EngageRail } from "@/components/extension/EngageRail"
import { ExtensionOverviewView, SPARK_DAYS, type LatestEntry } from "@/components/extension/ExtensionOverview"
import { ENGAGE_EXTENSIONS, otherPlatforms } from "@/components/extension/engageExtensions"
import { PlanAndSetupView } from "@/components/extension/PlanAndSetup"
import { ActivityHead, VoicesHead } from "@/components/extension/EngagePageHead"
import { ActivityHeatmap } from "@/components/extension/ActivityHeatmap"
import { planStatus } from "@/components/extension/engageStatus"
import { ProfilesManager, type ProfilesInitial } from "@/components/extension/ProfilesManager"
import { AgentsManager, type Agent } from "@/components/extension/AgentsManager"
import { HistoryList } from "@/components/extension/HistoryList"
import { XReplyProfiles } from "@/components/extension/XExtensionViews"
import { instrumentSans } from "@/lib/fonts"
import { localDayKey } from "@/lib/engage/heatmap"
import { MAIN_HISTORY_KIND } from "@/lib/extensionHistory"
import type { EngagePlatform } from "@/lib/engage/features"
import { BillingView } from "@/components/settings/BillingView"
import ProfileSettingsPage from "@/app/(app)/settings/profile/page"
import VoicePresetsPage from "@/app/(app)/settings/voice-presets/page"
import MyCtaPage from "@/app/(app)/settings/cta/page"
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
//   /design-preview/workspace/engage[/profiles|agents|history|billing]
//   /design-preview/workspace/engage-x[/…] · engage-reddit[/…]
//   ?setup=1               Engage: not installed yet, nothing written
//   /design-preview/workspace/settings/[profile|voice-presets|cta|billing|referrals|start-page|account]
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

// Example rows for Home's Latest list, newest first.
function exampleLatest(platform: EngagePlatform, now: Date): LatestEntry[] {
  const at = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString()
  const rows: Record<EngagePlatform, Omit<LatestEntry, "id" | "createdAt">[]> = {
    linkedin: [
      { kind: "comment", postAuthor: "Example Author", postSnippet: "Example post about hiring your first designer…", comment: "Example comment: the second point is the one most teams skip.", action: "INSERTED", profileName: "Example: Studio founder" },
      { kind: "reply", postAuthor: "Example Person", postSnippet: "Example launch post", comment: "Example reply: thank you, the checklist is in the comments.", action: "COPIED", profileName: null },
      { kind: "connection_note", postAuthor: "Example Lead", postSnippet: "", comment: "Example note: liked your thread on onboarding.", action: "INSERTED", profileName: null },
      { kind: "message", postAuthor: "Example Contact", postSnippet: "", comment: "Example reply: happy to share the checklist.", action: "NONE", profileName: null },
    ],
    x: [
      { kind: "x_reply", postAuthor: "@example", postSnippet: "Example post about shipping on Fridays", comment: "Example X reply.", action: "INSERTED", profileName: null },
      { kind: "x_message", postAuthor: "@example", postSnippet: "", comment: "Example X message.", action: "COPIED", profileName: null },
    ],
    reddit: [
      { kind: "reddit_comment", postAuthor: "u/example", postSnippet: "Example question in r/example", comment: "Example Reddit comment.", action: "COPIED", profileName: null },
    ],
  }
  return rows[platform].map((r, i) => ({ ...r, id: `e${i}`, createdAt: at([2, 18, 64, 190][i] ?? 300) }))
}

// Example voices for the LinkedIn Voices page, so it renders filled in on
// the server (the page itself loads them on the server too).
function exampleVoices(): ProfilesInitial {
  const voice = (id: string, name: string, over: Record<string, unknown> = {}) => ({
    id,
    userId: "example-user",
    name,
    whoIAm: "Example: founder of a small design studio",
    goal: "Start conversations with potential clients",
    tone: "Warm",
    length: "medium",
    emoji: "none",
    language: "English",
    alwaysDo: "Ask one genuine question",
    neverDo: "Pitch in the first comment",
    samples: [] as string[],
    isSystem: false,
    isRecommended: false,
    ...over,
  })
  const note = (id: string, name: string) => ({ id, name, angle: "", goal: "Get the invite accepted", tone: "Warm", length: "90-180 characters", alwaysDo: null, neverDo: null, samples: [], isSystem: true, isRecommended: false })
  return {
    settings: {
      defaultCommentProfileId: "v1",
      defaultConnectionProfileId: null,
      defaultMessageProfileId: null,
      defaultLanguage: "English",
      connectNoteContext: null,
      connectNoteLength: null,
      linkedinProfile: null,
      insertButtonHidden: false,
    },
    lists: {
      comment: {
        profiles: [
          voice("v1", "Example: Studio founder", { samples: ["Example: the second point is the one most teams skip."] }),
          voice("v2", "Example: Short and punchy", { length: "short", samples: ["Example: hiring late costs more than hiring wrong."] }),
          voice("s1", "Thoughtful peer", { userId: null, isSystem: true, isRecommended: true, samples: ["Example: curious how you decided it was time?"] }),
          voice("s2", "Supportive peer", { userId: null, isSystem: true }),
        ],
      },
      connection: { profiles: [note("c1", "Warm intro")] },
      message: { profiles: [] },
    },
    contacts: [],
  } as unknown as ProfilesInitial
}

// Example agents for the Agents page.
function exampleAgents(now: Date): Agent[] {
  const base = { status: "active" as const, version: 1, updatedAt: now.toISOString() }
  return [
    {
      ...base,
      id: "a1",
      name: "Example: Discovery calls",
      description: "Example: books short discovery calls with founders",
      purpose: "sales",
      isDefault: true,
      config: {
        business: "Example studio",
        offer: "Example: one-week design audits",
        audience: "Example: seed-stage founders",
        goals: "Book a call",
        nextStep: "A 15-minute call",
        strategy: "Ask about their launch first",
        tone: "Warm",
        length: "short",
        language: "Match the conversation",
        facts: ["Example: audits take one week"],
        objections: ["Example: “we have no budget yet”"],
        alwaysDo: "Ask one genuine question",
        neverDo: "Pitch in the first message",
        examples: ["Example: we run one-week audits. What are you launching next?"],
      },
    },
    {
      ...base,
      id: "a2",
      name: "Example: Partner intros",
      description: "",
      purpose: "partnerships",
      status: "draft",
      isDefault: false,
      config: {
        business: "",
        offer: "",
        audience: "",
        goals: "Find a fit with agencies",
        nextStep: "",
        strategy: "",
        tone: "Natural",
        length: "auto",
        language: "English",
        facts: [],
        objections: [],
        alwaysDo: "",
        neverDo: "",
        examples: [],
      },
    },
  ] as unknown as Agent[]
}

// Example "comments per day" for the grid: weekdays busier, a few days off.
function exampleActivity(platform: EngagePlatform, now: Date) {
  const days: { day: string; count: number }[] = []
  for (let i = 90; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    const weekend = d.getDay() === 0 || d.getDay() === 6
    const n = (i * 7 + 3) % 17
    const count = weekend ? (n % 3 === 0 ? n % 5 : 0) : n % 6 === 0 ? 0 : n
    if (count > 0) days.push({ day: localDayKey(d), count })
  }
  return { timeZone: "UTC", ...MAIN_HISTORY_KIND[platform], days }
}

function Engage({
  platform,
  tab,
  access,
  price,
  setup,
}: {
  platform: EngagePlatform
  tab: string
  access?: string
  price?: string
  setup?: boolean
}) {
  const base = ENGAGE_EXTENSIONS[platform].base
  const ext = exampleAccess(setup ? undefined : access, price)
  if (setup) ext.freeUsed = 0
  const now = PREVIEW_NOW
  const others = otherPlatforms(platform).map((p) => ({ platform: p, ext: exampleAccess(access === "unlimited" ? undefined : "unlimited") }))
  const counts: Record<EngagePlatform, Record<string, number>> = {
    linkedin: { comment: 128, reply: 37, connection_note: 14, message: 9 },
    x: { x_reply: 41, x_message: 6 },
    reddit: { reddit_comment: 12, reddit_message: 2 },
  }
  const spark = Object.fromEntries(
    Object.keys(counts[platform]).map((k, j) => [
      k,
      Array.from({ length: SPARK_DAYS }, (_, i) => (setup ? 0 : ((i * 5 + j * 3) % 9) + (i % 4 === 0 ? 0 : 2))),
    ]),
  )
  const otherExt = others[0]?.ext ?? ext
  const pages: Record<string, ReactNode> = {
    "": (
      <ExtensionOverviewView
        platform={platform}
        ext={ext}
        others={others}
        counts={setup ? {} : counts[platform]}
        spark={spark}
        latest={setup ? [] : exampleLatest(platform, now)}
        signedInBrowsers={setup ? 0 : 1}
        now={now}
      />
    ),
    profiles: (
      <>
        <VoicesHead platform={platform} />
        {platform === "x" ? <XReplyProfiles /> : <ProfilesManager initial={exampleVoices()} />}
      </>
    ),
    agents: <AgentsManager initial={exampleAgents(now)} />,
    history: (
      <>
        <ActivityHead platform={platform} />
        <ActivityHeatmap platform={platform} initial={exampleActivity(platform, now)} today={now} />
        <HistoryList platform={platform} />
      </>
    ),
    billing: <PlanAndSetupView platform={platform} email="example@example.com" ext={ext} signedInBrowsers={setup ? 0 : 1} />,
  }
  if (!(tab in pages)) notFound()
  // Same wrapper as app/(app)/extension/layout.tsx
  return (
    <div className={`engage-root ${instrumentSans.variable}`}>
      <div className="mx-auto flex max-w-[88rem] flex-col gap-5 lg:flex-row lg:items-start">
        <EngageRail
          pathname={tab ? `${base}/${tab}` : base}
          statuses={{
            linkedin: planStatus(platform === "linkedin" ? ext : otherExt),
            x: planStatus(platform === "x" ? ext : otherExt),
            reddit: planStatus(platform === "reddit" ? ext : otherExt),
          }}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-6">{pages[tab]}</div>
      </div>
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
    case "cta":
      return <MyCtaPage />
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
  searchParams: Promise<{ access?: string; plan?: string; ended?: string; price?: string; setup?: string }>
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
  const { access, plan, ended, price, setup } = await searchParams
  const [area, sub = ""] = path

  let pathname: string
  let content: ReactNode
  if (area === "engage" || area === "engage-x" || area === "engage-reddit") {
    const platform: EngagePlatform = area === "engage-x" ? "x" : area === "engage-reddit" ? "reddit" : "linkedin"
    pathname = `${ENGAGE_EXTENSIONS[platform].base}${sub ? `/${sub}` : ""}`
    content = <Engage platform={platform} tab={sub} access={access} price={price} setup={setup === "1"} />
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
