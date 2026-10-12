"use client"

// Engage → Overview. Every figure is counted from recorded data
// (/api/admin/engage/overview); what isn't recorded yet says so instead of
// showing a number. All, or one extension at a time (LinkedIn or X); plan
// figures are the account's either way, since one plan covers both.
import { useMemo, useState } from "react"
import Link from "next/link"
import { AdminLineChart } from "@/components/admin/charts"
import { AdminButton, AdminInput } from "@/components/admin/ui"
import { Ledger, type LedgerItem } from "@/components/admin/Ledger"
import { RANGE_KEYS, RANGE_LABELS, type RangeKey } from "@/lib/engage/ranges"
import {
  ENGAGE_FEATURES,
  FEATURE_LABELS,
  PLATFORM_FEATURES,
  PLATFORM_LABELS,
  type EngageFeature,
  type EngagePlatform,
} from "@/lib/engage/features"
import {
  fmtDollars,
  ErrorState,
  EmptyState,
  FEATURE_COLORS,
  Segmented,
  SkeletonBlock,
  fmtNumber,
  useAdminApi,
  useStoredState,
} from "./shared"

interface Overview {
  range: { from: string; to: string }
  users: { total: number; paid: number; granted: number; free: number; suspended: number; pendingGrants: number; active: number; new: number }
  generations: Record<EngageFeature, number> & { total: number }
  actions: { copied: number; inserted: number; none: number }
  clientErrors: number | null
  ai?: { recording: boolean; cost: number; calls: number; unpricedModels: string[] }
  series: Array<{ date: string; activeUsers: number; newUsers: number } & Record<EngageFeature, number>>
}

type PlatformView = EngagePlatform | "all"
const PLATFORM_VIEWS: { value: PlatformView; label: string }[] = [
  { value: "all", label: "All" },
  { value: "linkedin", label: PLATFORM_LABELS.linkedin },
  { value: "x", label: PLATFORM_LABELS.x },
]

const pct = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : "—")

export function EngageOverview() {
  const [range, setRange] = useStoredState<RangeKey>("engage-admin:range", "30d")
  const [platform, setPlatform] = useStoredState<PlatformView>("engage-admin:platform", "all")
  const [custom, setCustom] = useState({ from: "", to: "" })
  const url = useMemo(() => {
    const only = platform === "all" ? "" : `&platform=${platform}`
    if (range !== "custom") return `/api/admin/engage/overview?range=${range}${only}`
    if (!custom.from || !custom.to) return null
    return `/api/admin/engage/overview?range=custom&from=${custom.from}&to=${custom.to}${only}`
  }, [range, custom, platform])
  const { data, error, loading, reload } = useAdminApi<Overview>(url)

  const g = data?.generations
  const usedAtAll = data ? data.actions.copied + data.actions.inserted : 0
  const features: EngageFeature[] = platform === "all" ? [...ENGAGE_FEATURES] : PLATFORM_FEATURES[platform]
  const where = platform === "all" ? "LinkedIn or X" : PLATFORM_LABELS[platform]

  const people: LedgerItem[] = data
    ? [
        {
          label: "Active in range",
          value: fmtNumber(data.users.active),
          hint: platform === "all" ? "Generated at least once" : `Generated on ${PLATFORM_LABELS[platform]}`,
        },
        {
          label: "New in range",
          value: fmtNumber(data.users.new),
          hint: platform === "all" ? "First extension sign-in" : `First sign-in to the ${PLATFORM_LABELS[platform]} extension`,
        },
        { label: "Paid", value: fmtNumber(data.users.paid), hint: "$15/month, covers both", href: "/admin/engage/users?access=paid" },
        {
          label: "Free access (granted)",
          value: fmtNumber(data.users.granted),
          hint: data.users.pendingGrants > 0 ? `+ ${data.users.pendingGrants} waiting for sign-up` : "Given by an admin",
          href: "/admin/engage/access",
        },
        { label: "Free plan", value: fmtNumber(data.users.free), hint: "10 free generations", href: "/admin/engage/users?access=free" },
        { label: "Paused or suspended", value: fmtNumber(data.users.suspended), href: "/admin/engage/users?access=suspended" },
      ]
    : []

  const generated: LedgerItem[] = data
    ? [
        ...features.map((f) => ({ label: FEATURE_LABELS[f], value: fmtNumber(g?.[f]) })),
        {
          label: "Copied or inserted",
          value: pct(usedAtAll, g?.total ?? 0),
          hint: `${fmtNumber(usedAtAll)} of ${fmtNumber(g?.total)} used on ${where}`,
        },
        {
          label: "Extension errors",
          value: data.clientErrors === null ? "—" : fmtNumber(data.clientErrors),
          hint: data.clientErrors === null ? "Run the Engage admin SQL" : "Reported by 1.3.0 and later",
        },
        !data.ai || !data.ai.recording
          ? { label: "AI cost", value: "Not recorded yet", hint: "Run the phase C SQL to start recording", pending: true }
          : {
              label: "AI cost",
              value: fmtDollars(data.ai.cost),
              hint:
                data.ai.unpricedModels.length > 0
                  ? `${fmtNumber(data.ai.calls)} AI calls · some prices not set`
                  : `${fmtNumber(data.ai.calls)} AI calls`,
              href: "/admin/engage/ai",
            },
      ]
    : []

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lead font-semibold tracking-tight text-foreground">CarouseLabs Engage</h2>
          <p className="mt-0.5 text-caption text-muted-foreground">Who uses the extensions and what they write with them. Days are UTC.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented label="Extension" options={PLATFORM_VIEWS} value={platform} onChange={setPlatform} />
          <Segmented
            label="Date range"
            options={RANGE_KEYS.map((k) => ({ value: k, label: RANGE_LABELS[k] }))}
            value={range}
            onChange={setRange}
          />
          {range === "custom" && (
            <div className="flex items-center gap-1.5">
              <AdminInput type="date" aria-label="From" value={custom.from} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} />
              <span className="text-caption text-muted-foreground">to</span>
              <AdminInput type="date" aria-label="To" value={custom.to} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} />
            </div>
          )}
        </div>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : range === "custom" && !url ? (
        <EmptyState title="Pick a start and end date" body="Custom ranges can cover up to a year." />
      ) : !data || loading ? (
        <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading overview">
          <SkeletonBlock className="h-[220px] rounded-showcase" />
          <SkeletonBlock className="h-[90px]" />
          <SkeletonBlock className="h-[300px]" />
        </div>
      ) : (
        <>
          {/* People: everyone who uses Engage, then how they split */}
          <section
            aria-labelledby="engage-people"
            className="grid gap-8 rounded-showcase border border-border bg-surface p-6 sm:p-8 xl:grid-cols-[auto_minmax(0,1fr)] xl:items-end xl:gap-14"
          >
            <div className="flex flex-col gap-1">
              <h2 id="engage-people" className="text-label font-medium text-muted-foreground">
                People
              </h2>
              <Link
                href="/admin/engage/users"
                className="group flex flex-col gap-1 rounded-control-sm"
                aria-label={`Engage users: ${fmtNumber(data.users.total)}`}
              >
                <span className="font-display text-[4.5rem] leading-[0.85] tracking-[-0.03em] text-foreground tabular-nums transition-colors duration-(--motion-fast) group-hover:text-brand sm:text-[5.5rem]">
                  {fmtNumber(data.users.total)}
                </span>
                <span className="text-label font-medium text-foreground">Engage users</span>
                <span className="text-caption text-muted-foreground/80">Ever signed in or given access</span>
              </Link>
            </div>
            <Ledger items={people} className="grid-cols-2 sm:grid-cols-3" />
          </section>

          <section aria-labelledby="engage-output" className="flex flex-col gap-4 border-y border-border py-6">
            <h2 id="engage-output" className="text-label font-semibold text-foreground">
              Generated in range
            </h2>
            <Ledger items={generated} className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7" />
          </section>

          {g && g.total === 0 && data.users.active === 0 ? (
            <EmptyState title="No Engage activity in this range" body="Pick a longer range to see trends." />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              <section className="rounded-card border border-border bg-surface p-5" aria-labelledby="engage-trend">
                <h2 id="engage-trend" className="mb-3 text-label font-semibold text-foreground">
                  Generations per day
                </h2>
                <AdminLineChart
                  data={data.series}
                  xKey="date"
                  height={260}
                  series={features.map((f) => ({ key: f, label: FEATURE_LABELS[f], color: FEATURE_COLORS[f] }))}
                />
              </section>
              <section className="rounded-card border border-border bg-surface p-5" aria-labelledby="engage-users-trend">
                <h2 id="engage-users-trend" className="mb-3 text-label font-semibold text-foreground">
                  Active and new users per day
                </h2>
                <AdminLineChart
                  data={data.series}
                  xKey="date"
                  height={260}
                  series={[
                    { key: "activeUsers", label: "Active (generated)", color: "#8B5CF6" },
                    { key: "newUsers", label: "New (first sign-in)", color: "#0D9488" },
                  ]}
                />
              </section>
            </div>
          )}

          <div className="flex justify-end">
            <AdminButton variant="ghost" onClick={reload}>
              Refresh
            </AdminButton>
          </div>
        </>
      )}
    </div>
  )
}
