import { Suspense, type ReactNode } from "react"
import { auth } from "@clerk/nextjs/server"
import { notFound } from "next/navigation"

import { fontVariables, geist } from "@/lib/fonts"
import { ToastProvider } from "@/components/admin/Toast"
import { AdminShell } from "@/components/admin/AdminShell"
import { Spinner } from "@/components/admin/ui"
import { AdminDashboardView } from "@/components/admin/AdminDashboardView"
import { UserProfileView } from "@/components/admin/UserProfileView"
import { SubscriptionsView } from "@/components/admin/SubscriptionsView"
import { UsersTable } from "@/components/admin/UsersTable"
import { PostsGallery } from "@/components/admin/PostsGallery"
import { CreditsManager } from "@/components/admin/CreditsManager"
import { ReferralsTable } from "@/components/admin/ReferralsTable"
import { TasksTable } from "@/components/admin/TasksTable"
import { AnalyticsTabs } from "@/components/admin/AnalyticsTabs"
import { AuditLogsTable } from "@/components/admin/AuditLogsTable"
import { SettingsForm } from "@/components/admin/SettingsForm"
import { PrefillUserForm } from "@/components/admin/PrefillUserForm"
import type { OverviewStats } from "@/lib/adminStats"
import { PHASE_5B_PAGES } from "./phase5b"
import { CampaignsList } from "@/components/admin/CampaignsList"
import { CampaignView } from "@/components/admin/CampaignView"
import { EmailWriter } from "@/components/admin/EmailWriter"

// Development-only: the admin pages in the real admin frame (dark theme,
// sidebar), with example data, without signing in. Pages that load their own
// data in the browser get it from the browser checks (every /api/admin
// request answered with example data); the three server-loaded pages render
// their display component with example props. Signed in it would read and
// change the real admin data, so the preview refuses to run then.
//   /design-preview/admin                → Dashboard
//   /design-preview/admin/users[/u1]     → Users, User Profile
//   /design-preview/admin/[subscriptions|posts|credits|referrals|tasks|analytics|audit-logs|settings|prefill-user]
//   Phase 5b: engage[/users[/eu1]|access|controls|ai|errors|health|sessions|audit], interns[/i1[/checklist]|broadcast],
//   broadcasts, sequences[/new|/q1], scheduled-emails
//   Campaigns: broadcasts/campaigns[/c1], broadcasts/writer, users/u1/email (personal email)

// Example "now", read once when the module loads.
const NOW = new Date()
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86400000)

const STATS: OverviewStats = {
  totalUsers: 1284,
  proUsers: 212,
  growthUsers: 64,
  freeUsers: 1008,
  totalPosts: 9640,
  totalCarousels: 3120,
  totalImages: 2875,
  totalCreditsUsed: 182400,
  estApiCost: 4560,
  recentUsers: Array.from({ length: 6 }, (_, i) => ({
    id: `u${i + 1}`,
    email: `example.user${i + 1}@example.com`,
    name: i % 2 === 0 ? `Example User ${i + 1}` : null,
    plan: (["PRO", "FREE", "GROWTH", "FREE", "FREE", "PRO"] as const)[i],
    createdAt: daysAgo(i * 0.7),
  })),
  recentPosts: Array.from({ length: 6 }, (_, i) => ({
    id: `p${i + 1}`,
    email: `example.user${i + 1}@example.com`,
    title: `Example post ${i + 1}`,
    format: (["CAROUSEL", "SINGLE_IMAGE", "TEXT_ONLY", "CAROUSEL", "THUMBNAIL", "TEXT_ONLY"] as const)[i],
    status: "PUBLISHED" as const,
    createdAt: daysAgo(i * 0.3),
  })),
}

function UserProfile() {
  return (
    <UserProfileView
      user={{
        id: "u1",
        email: "example.user1@example.com",
        createdAt: daysAgo(90),
        updatedAt: daysAgo(1),
        suspendedAt: null,
        adminNote: "Example note: asked about team plans.",
        profile: { name: "Example User 1", headline: "Founder at Example Studio" },
      }}
      sub={{
        creditsUsed: 412,
        creditsTotal: 1000,
        extraCredits: 50,
        currentPeriodEnd: daysAgo(-18),
        cancelAtPeriodEnd: false,
        status: "ACTIVE",
      }}
      plan="PRO"
      creditsRemaining={638}
      posts={[
        { id: "p1", title: "Example: Hiring your first designer", format: "CAROUSEL", status: "PUBLISHED", createdAt: daysAgo(1), idea: { title: "Hiring", hook: "The first designer you hire shapes everything" } },
        { id: "p2", title: "Example: Launch week notes", format: "SINGLE_IMAGE", status: "DRAFT", createdAt: daysAgo(3), idea: null },
        { id: "p3", title: "Example: Pricing story", format: "TEXT_ONLY", status: "PUBLISHED", createdAt: daysAgo(6), idea: { title: "Pricing", hook: null } },
      ]}
    />
  )
}

function Subscriptions() {
  const row = (i: number, plan: string, status: string, extra: Partial<{ cancelAtPeriodEnd: boolean; extraCredits: number }> = {}) => ({
    id: `s${i}`,
    plan,
    status,
    creditsUsed: 120 * i,
    creditsTotal: plan === "GROWTH" ? 2000 : 1000,
    extraCredits: extra.extraCredits ?? 0,
    currentPeriodEnd: daysAgo(-10 - i),
    cancelAtPeriodEnd: extra.cancelAtPeriodEnd ?? false,
    lsSubscriptionId: `ls_example_${i}`,
    razorpaySubId: null,
    user: { id: `u${i}`, email: `example.user${i}@example.com` },
  })
  return (
    <SubscriptionsView
      subs={[
        row(1, "GROWTH", "ACTIVE", { extraCredits: 200 }),
        row(2, "PRO", "ACTIVE"),
        row(3, "PRO", "PAST_DUE"),
        row(4, "PRO", "ACTIVE", { cancelAtPeriodEnd: true }),
        row(5, "PRO", "CANCELLED"),
      ]}
    />
  )
}

const PAGES: Record<string, () => ReactNode> = {
  "": () => <AdminDashboardView s={STATS} />,
  users: () => (
    <Suspense fallback={<Spinner label="Loading users…" />}>
      <UsersTable />
    </Suspense>
  ),
  "users/u1": () => <UserProfile />,
  subscriptions: () => <Subscriptions />,
  posts: () => (
    <Suspense fallback={<Spinner />}>
      <PostsGallery />
    </Suspense>
  ),
  credits: () => <CreditsManager />,
  referrals: () => <ReferralsTable />,
  tasks: () => (
    <Suspense fallback={<Spinner />}>
      <TasksTable />
    </Suspense>
  ),
  analytics: () => <AnalyticsTabs />,
  "audit-logs": () => <AuditLogsTable />,
  settings: () => <SettingsForm />,
  "prefill-user": () => <PrefillUserForm />,
  ...PHASE_5B_PAGES,
  "broadcasts/campaigns": () => <CampaignsList />,
  "broadcasts/campaigns/c1": () => <CampaignView id="c1" />,
  "broadcasts/writer": () => <EmailWriter />,
  "users/u1/email": () => (
    <EmailWriter recipient={{ id: "u1", email: "priya@example.com", name: "Priya Sharma", firstName: "Priya" }} />
  ),
}

export default async function AdminPreview({ params }: { params: Promise<{ path?: string[] }> }) {
  if (process.env.NODE_ENV !== "development") notFound()
  const { userId } = await auth()
  if (userId) {
    return (
      <p className="p-8 font-sans text-[#211F1C]">
        Preview disabled while signed in: it would read and change real admin data. Open it in a private window.
      </p>
    )
  }
  const { path = [] } = await params
  const key = path.join("/")
  const page = PAGES[key]
  if (!page) notFound()

  // Same wrapper as app/(admin)/layout.tsx
  return (
    <div data-theme="dark" className={`${fontVariables} bg-background font-ui text-foreground`}>
      <style
        dangerouslySetInnerHTML={{
          __html: `body{background-color:#171614;color:#F5F0E7;font-family:${geist.style.fontFamily},system-ui,sans-serif}`,
        }}
      />
      <ToastProvider>
        <AdminShell email="admin@example.com" pathname={key ? `/admin/${key}` : "/admin"}>
          {page()}
        </AdminShell>
      </ToastProvider>
    </div>
  )
}
