// components/extension/ExtensionOverview.tsx — Extension → Overview for one
// of the two Engage extensions (LinkedIn's at /extension, X's at
// /extension/x): its plan at a glance, how to install it, this month's
// activity, the other extension, and the browsers it's signed in on.
// Server component.
import Link from "next/link"
import { ArrowRight, MessageSquare, MessagesSquare, Reply, UserPlus, type LucideIcon } from "lucide-react"
import { db } from "@/lib/db"
import { extAccessSummary, type ExtAccessSummary } from "@/lib/extAccess"
import { tokenPlatform, type EngagePlatform } from "@/lib/engage/features"
import { EXTENSION_CHECKOUT_PATH, EXTENSION_PLAN, X_EXTENSION_CHECKOUT_PATH, X_EXTENSION_PLAN } from "@/lib/plans"
import { BillingRefresher } from "@/components/billing/BillingRefresher"
import { buttonVariants } from "@/components/ui/button"
import { extensionStatusLine } from "./ExtensionPlanSection"
import { DevicesList } from "./DevicesList"
import { InstallSteps } from "./InstallSteps"
import { ENGAGE_EXTENSIONS, EngageIcon } from "./engageExtensions"

const ACTIVITY: Record<EngagePlatform, { kind: string; label: string; icon: LucideIcon }[]> = {
  linkedin: [
    { kind: "comment", label: "Comments", icon: MessageSquare },
    { kind: "reply", label: "Replies", icon: Reply },
    { kind: "connection_note", label: "Connection notes", icon: UserPlus },
    { kind: "message", label: "Messages", icon: MessagesSquare },
  ],
  x: [
    { kind: "x_reply", label: "Replies", icon: Reply },
    { kind: "x_message", label: "Messages", icon: MessagesSquare },
  ],
}

const CHECKOUT = {
  linkedin: { path: EXTENSION_CHECKOUT_PATH, price: EXTENSION_PLAN.price },
  x: { path: X_EXTENSION_CHECKOUT_PATH, price: X_EXTENSION_PLAN.price },
}

const card = "rounded-card border border-border bg-surface-raised p-5 flex flex-col gap-4"
const accessLabel = (ext: ExtAccessSummary) =>
  ext.access === "unlimited" ? "Unlimited" : ext.access === "testing" ? "Testing" : "Free"

// The other extension, sold separately: its status and a way there.
function OtherExtension({ platform, ext }: { platform: EngagePlatform; ext: ExtAccessSummary }) {
  const info = ENGAGE_EXTENSIONS[platform]
  const isX = platform === "x"
  return (
    <div
      className={[
        "flex flex-col gap-4 rounded-card p-5 text-white",
        isX ? "border border-black/10 bg-primary" : "bg-brand",
      ].join(" ")}
    >
      <div className="flex items-center gap-3">
        {/* The icon is the card's own colour: a ring keeps its edge. */}
        <span className="flex flex-shrink-0 rounded-[9px] ring-1 ring-white/35">
          <EngageIcon platform={platform} size={36} />
        </span>
        <div className="flex flex-col gap-1">
          <p className="text-caption font-medium text-white/70">
            Also on {info.site} · sold separately
          </p>
          <p className="text-body font-semibold">{info.name}</p>
          <p className="text-label text-white/75">
            {accessLabel(ext)} · {extensionStatusLine(ext)}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {ext.access === "free" && (
          <a
            href={CHECKOUT[platform].path}
            className={[
              "inline-flex h-10 items-center gap-2 rounded-control-sm bg-white px-4 text-label font-semibold transition-colors hover:bg-white/90",
              isX ? "text-black" : "text-brand",
            ].join(" ")}
          >
            Get unlimited — ${CHECKOUT[platform].price}/month
            <ArrowRight className="size-4" aria-hidden />
          </a>
        )}
        <Link
          href={info.base}
          className="inline-flex h-10 items-center gap-2 rounded-control-sm border border-white/30 px-4 text-label font-semibold text-white transition-colors hover:bg-white/10"
        >
          Install &amp; set up
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </div>
  )
}

export async function ExtensionOverview({
  platform,
  user,
}: {
  platform: EngagePlatform
  user: { id: string; email: string }
}) {
  const other: EngagePlatform = platform === "x" ? "linkedin" : "x"
  const activity = ACTIVITY[platform]
  // Calendar month, the same window /api/ext/me counts in.
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [ext, otherExt, byKind, tokens] = await Promise.all([
    extAccessSummary(user.id, platform),
    extAccessSummary(user.id, other),
    db.commentHistory.groupBy({
      by: ["kind"],
      where: { userId: user.id, createdAt: { gte: monthStart }, kind: { in: activity.map((a) => a.kind) } },
      _count: { _all: true },
    }),
    // The same sign-ins the browsers list below shows (app/api/ext/devices).
    db.extensionToken.findMany({ where: { userId: user.id, revokedAt: null }, select: { device: true } }),
  ])
  const counts = Object.fromEntries(byKind.map((row) => [row.kind, row._count._all]))
  const signedInBrowsers = tokens.filter((t) => tokenPlatform(t.device) === platform).length

  return (
    <ExtensionOverviewView
      platform={platform}
      email={user.email}
      ext={ext}
      otherExt={otherExt}
      counts={counts}
      signedInBrowsers={signedInBrowsers}
    />
  )
}

/**
 * What the overview shows, given its data: the plan, install steps and this
 * month's activity in the main column; the other extension and the signed-in
 * browsers beside it on wide screens.
 */
export function ExtensionOverviewView({
  platform,
  email,
  ext,
  otherExt,
  counts,
  signedInBrowsers,
}: {
  platform: EngagePlatform
  email: string
  ext: ExtAccessSummary
  otherExt: ExtAccessSummary
  /** This calendar month's generations by kind. */
  counts: Record<string, number>
  signedInBrowsers: number
}) {
  const other: EngagePlatform = platform === "x" ? "linkedin" : "x"
  const activity = ACTIVITY[platform]
  const countFor = (kind: string) => counts[kind] ?? 0
  const base = ENGAGE_EXTENSIONS[platform].base

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start xl:grid-cols-[minmax(0,1fr)_22rem]">
      {/* Coming back from the Lemon Squeezy tab, or from installing and
          signing in, shows the new plan and folds the install steps away. */}
      <BillingRefresher />

      <div className="flex min-w-0 flex-col gap-6">
        {/* Plan */}
        <div className={card}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <p className="text-caption font-medium text-brand">Your plan</p>
              <p className="text-title-sm font-semibold text-foreground">{accessLabel(ext)}</p>
              <p className="text-label text-muted-foreground">{extensionStatusLine(ext)}</p>
            </div>
            {ext.access === "free" ? (
              <a href={CHECKOUT[platform].path} className={buttonVariants({ variant: "brand" })}>
                Get unlimited — ${CHECKOUT[platform].price}/month
                <ArrowRight aria-hidden />
              </a>
            ) : (
              <Link href={`${base}/billing`} className={buttonVariants({ variant: "outline" })}>
                Plan &amp; payments
                <ArrowRight aria-hidden />
              </Link>
            )}
          </div>
        </div>

        <InstallSteps platform={platform} email={email} ext={ext} signedInBrowsers={signedInBrowsers} />

        {/* This month */}
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-label font-semibold text-foreground">This month</h2>
            <Link href={`${base}/history`} className="text-label font-medium text-brand hover:underline">
              See history →
            </Link>
          </div>
          <div className={["grid grid-cols-2 gap-3", activity.length > 2 ? "xl:grid-cols-4" : ""].join(" ")}>
            {activity.map((a) => (
              <div key={a.kind} className="flex flex-col gap-2 rounded-card border border-border bg-surface-raised p-4">
                <a.icon className="size-4 text-brand" aria-hidden />
                <p className="text-title-sm font-semibold leading-none text-foreground tabular-nums">{countFor(a.kind)}</p>
                <p className="text-caption text-muted-foreground">{a.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <aside aria-label="More" className="flex min-w-0 flex-col gap-6">
        <OtherExtension platform={other} ext={otherExt} />

        {/* Browsers */}
        <div className={card}>
          <div className="flex flex-col gap-1">
            <h2 className="text-label font-semibold text-foreground">Signed-in browsers</h2>
            <p className="text-caption text-muted-foreground">
              Where {ENGAGE_EXTENSIONS[platform].name} is signed in to this account. Sign one out if it isn&apos;t
              yours any more.
            </p>
          </div>
          {/* A new sign-in (seen on refresh) reloads the list too. */}
          <DevicesList key={signedInBrowsers} platform={platform} />
        </div>
      </aside>
    </div>
  )
}
