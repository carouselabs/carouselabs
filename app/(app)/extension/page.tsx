// app/(app)/extension/page.tsx — Extension → Overview: plan at a glance,
// this month's activity, how to get started, and the signed-in browsers.
import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowRight, ExternalLink, MessageSquare, MessagesSquare, Reply, UserPlus } from "lucide-react"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { extAccessSummary } from "@/lib/extAccess"
import { EXTENSION_CHECKOUT_PATH, EXTENSION_PLAN, EXTENSION_STORE_URL, X_EXTENSION_CHECKOUT_PATH, X_EXTENSION_PLAN } from "@/lib/plans"
import { extensionStatusLine } from "@/components/extension/ExtensionPlanSection"
import { DevicesList } from "@/components/extension/DevicesList"

export const dynamic = "force-dynamic"

const ACTIVITY = [
  { kind: "comment", label: "Comments", icon: MessageSquare },
  { kind: "reply", label: "Replies", icon: Reply },
  { kind: "connection_note", label: "Connection notes", icon: UserPlus },
  { kind: "message", label: "Messages", icon: MessagesSquare },
] as const

const card = "rounded-2xl border border-[#E5E3DE] bg-white p-5 flex flex-col gap-4"

export default async function ExtensionOverviewPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")

  // Calendar month, the same window /api/ext/me counts in.
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [ext, xExt, byKind] = await Promise.all([
    extAccessSummary(user.id),
    extAccessSummary(user.id, "x"),
    db.commentHistory.groupBy({
      by: ["kind"],
      where: { userId: user.id, createdAt: { gte: monthStart } },
      _count: { _all: true },
    }),
  ])
  const countFor = (kind: string) => byKind.find((row) => row.kind === kind)?._count._all ?? 0

  return (
    <div className="flex flex-col gap-6">
      {/* Plan */}
      <div className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#7C3AED]">Your plan</p>
            <p className="text-[16px] font-bold text-[#0A0A0A]">
              {ext.access === "unlimited" ? "Unlimited" : ext.access === "testing" ? "Testing" : "Free"}
            </p>
            <p className="text-[13px] text-[#6B7280]">{extensionStatusLine(ext)}</p>
          </div>
          {ext.access === "free" ? (
            <a
              href={EXTENSION_CHECKOUT_PATH}
              className="inline-flex items-center gap-2 rounded-xl bg-[#7C3AED] px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-[#6D28D9] transition-colors"
            >
              Get unlimited — ${EXTENSION_PLAN.price}/month
              <ArrowRight size={14} />
            </a>
          ) : (
            <Link
              href="/extension/billing"
              className="inline-flex items-center gap-2 rounded-xl border border-[#E5E3DE] px-5 py-2.5 text-[13px] font-semibold text-[#0A0A0A] hover:bg-[#F9F7F2] transition-colors"
            >
              Plan &amp; payments
              <ArrowRight size={14} />
            </Link>
          )}
        </div>
      </div>

      {/* CarouseLabs Engage for X: a separate extension, with its own plan. */}
      <div className="rounded-2xl border border-black/10 bg-black p-5 text-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-white/60">Also on X</p>
          <p className="text-[16px] font-bold">CarouseLabs Engage for X</p>
          <p className="text-[13px] text-white/70">
            {xExt.access === "unlimited" ? "Unlimited" : xExt.access === "testing" ? "Testing" : "Free"} ·{" "}
            {extensionStatusLine(xExt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {xExt.access === "free" && (
            <a
              href={X_EXTENSION_CHECKOUT_PATH}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-[13px] font-semibold text-black hover:bg-white/90 transition-colors"
            >
              Get unlimited — ${X_EXTENSION_PLAN.price}/month
              <ArrowRight size={14} />
            </a>
          )}
          <Link
            href="/extension/x"
            className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-white/10 transition-colors"
          >
            Open X settings
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* This month */}
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[14px] font-semibold text-[#0A0A0A]">This month</h2>
          <Link href="/extension/history" className="text-[12.5px] font-medium text-[#7C3AED] hover:underline">
            See history →
          </Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {ACTIVITY.map((a) => (
            <div key={a.kind} className="flex flex-col gap-2 rounded-2xl border border-[#E5E3DE] bg-white p-4">
              <a.icon size={16} className="text-[#7C3AED]" />
              <p className="text-[24px] font-bold leading-none tabular-nums text-[#0A0A0A]">{countFor(a.kind)}</p>
              <p className="text-[12px] text-[#6B7280]">{a.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Get started */}
      <div className={card}>
        <h2 className="text-[14px] font-semibold text-[#0A0A0A]">Using the extension</h2>
        <ol className="flex flex-col gap-2.5 text-[13px] text-[#374151] leading-[1.6] list-decimal pl-5">
          <li>
            Install CarouseLabs Engage from the Chrome Web Store
            {EXTENSION_STORE_URL && (
              <>
                {" — "}
                <a
                  href={EXTENSION_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-[#7C3AED] hover:underline"
                >
                  open the listing <ExternalLink size={12} />
                </a>
              </>
            )}
            .
          </li>
          <li>Open LinkedIn, click the extension icon to open its side panel, and click Sign in.</li>
          <li>
            Click Comment, Reply or Connect on LinkedIn, or open a conversation, and the side panel writes it in
            your voice. Set up that voice in{" "}
            <Link href="/extension/profiles" className="font-semibold text-[#7C3AED] hover:underline">
              Custom tones
            </Link>
            .
          </li>
        </ol>
      </div>

      {/* Browsers */}
      <div className={card}>
        <div className="flex flex-col gap-1">
          <h2 className="text-[14px] font-semibold text-[#0A0A0A]">Signed-in browsers</h2>
          <p className="text-[12.5px] text-[#6B7280]">
            Where the extension is signed in to this account. Sign one out if it isn&apos;t yours any more.
          </p>
        </div>
        <DevicesList />
      </div>
    </div>
  )
}
