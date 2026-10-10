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

const card = "rounded-2xl border border-[#E5E3DE] bg-white p-5 flex flex-col gap-4"
const accessLabel = (ext: ExtAccessSummary) =>
  ext.access === "unlimited" ? "Unlimited" : ext.access === "testing" ? "Testing" : "Free"

// The other extension, sold separately: its status and a way there.
function OtherExtension({ platform, ext }: { platform: EngagePlatform; ext: ExtAccessSummary }) {
  const info = ENGAGE_EXTENSIONS[platform]
  const isX = platform === "x"
  return (
    <div
      className={[
        "rounded-2xl p-5 text-white flex flex-wrap items-center justify-between gap-3",
        isX ? "border border-black/10 bg-black" : "bg-[#7C3AED]",
      ].join(" ")}
    >
      <div className="flex items-center gap-3">
        {/* The icon is the card's own colour: a ring keeps its edge. */}
        <span className="flex flex-shrink-0 rounded-[9px] ring-1 ring-white/35">
          <EngageIcon platform={platform} size={36} />
        </span>
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-white/60">
            Also on {info.site} · sold separately
          </p>
          <p className="text-[16px] font-bold">{info.name}</p>
          <p className="text-[13px] text-white/70">
            {accessLabel(ext)} · {extensionStatusLine(ext)}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {ext.access === "free" && (
          <a
            href={CHECKOUT[platform].path}
            className={[
              "inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-[13px] font-semibold transition-colors hover:bg-white/90",
              isX ? "text-black" : "text-[#7C3AED]",
            ].join(" ")}
          >
            Get unlimited — ${CHECKOUT[platform].price}/month
            <ArrowRight size={14} />
          </a>
        )}
        <Link
          href={info.base}
          className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-white/10 transition-colors"
        >
          Install &amp; set up
          <ArrowRight size={14} />
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
  const countFor = (kind: string) => byKind.find((row) => row.kind === kind)?._count._all ?? 0
  const signedInBrowsers = tokens.filter((t) => tokenPlatform(t.device) === platform).length
  const base = ENGAGE_EXTENSIONS[platform].base

  return (
    <div className="flex flex-col gap-6">
      {/* Coming back from the Lemon Squeezy tab, or from installing and
          signing in, shows the new plan and folds the install steps away. */}
      <BillingRefresher />

      {/* Plan */}
      <div className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#7C3AED]">Your plan</p>
            <p className="text-[16px] font-bold text-[#0A0A0A]">{accessLabel(ext)}</p>
            <p className="text-[13px] text-[#6B7280]">{extensionStatusLine(ext)}</p>
          </div>
          {ext.access === "free" ? (
            <a
              href={CHECKOUT[platform].path}
              className="inline-flex items-center gap-2 rounded-xl bg-[#7C3AED] px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-[#6D28D9] transition-colors"
            >
              Get unlimited — ${CHECKOUT[platform].price}/month
              <ArrowRight size={14} />
            </a>
          ) : (
            <Link
              href={`${base}/billing`}
              className="inline-flex items-center gap-2 rounded-xl border border-[#E5E3DE] px-5 py-2.5 text-[13px] font-semibold text-[#0A0A0A] hover:bg-[#F9F7F2] transition-colors"
            >
              Plan &amp; payments
              <ArrowRight size={14} />
            </Link>
          )}
        </div>
      </div>

      <InstallSteps platform={platform} email={user.email} ext={ext} signedInBrowsers={signedInBrowsers} />

      {/* This month */}
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[14px] font-semibold text-[#0A0A0A]">This month</h2>
          <Link href={`${base}/history`} className="text-[12.5px] font-medium text-[#7C3AED] hover:underline">
            See history →
          </Link>
        </div>
        <div className={["grid grid-cols-2 gap-3", activity.length > 2 ? "lg:grid-cols-4" : ""].join(" ")}>
          {activity.map((a) => (
            <div key={a.kind} className="flex flex-col gap-2 rounded-2xl border border-[#E5E3DE] bg-white p-4">
              <a.icon size={16} className="text-[#7C3AED]" />
              <p className="text-[24px] font-bold leading-none tabular-nums text-[#0A0A0A]">{countFor(a.kind)}</p>
              <p className="text-[12px] text-[#6B7280]">{a.label}</p>
            </div>
          ))}
        </div>
      </div>

      <OtherExtension platform={other} ext={otherExt} />

      {/* Browsers */}
      <div className={card}>
        <div className="flex flex-col gap-1">
          <h2 className="text-[14px] font-semibold text-[#0A0A0A]">Signed-in browsers</h2>
          <p className="text-[12.5px] text-[#6B7280]">
            Where {ENGAGE_EXTENSIONS[platform].name} is signed in to this account. Sign one out if it isn&apos;t
            yours any more.
          </p>
        </div>
        {/* A new sign-in (seen on refresh) reloads the list too. */}
        <DevicesList key={signedInBrowsers} platform={platform} />
      </div>
    </div>
  )
}
