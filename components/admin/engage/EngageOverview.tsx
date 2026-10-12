"use client"

// Engage → Overview. Every figure is counted from recorded data
// (/api/admin/engage/overview); what isn't recorded yet says so instead of
// showing a number. All, or one extension at a time (LinkedIn or X); plan
// figures are the account's either way, since one plan covers both.
import { useMemo, useState } from "react"
import Link from "next/link"
import { AdminLineChart } from "@/components/admin/charts"
import { AdminButton, AdminInput } from "@/components/admin/ui"
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

function Kpi({ label, value, hint, href }: { label: string; value: string; hint?: string; href?: string }) {
  const body = (
    <>
      <div className="text-[11.5px] font-medium text-[#8A8A8A]">{label}</div>
      <div className="mt-1.5 text-[22px] font-semibold leading-none tabular-nums text-white">{value}</div>
      {hint && <div className="mt-1.5 text-[11.5px] text-[#8A8A8A]">{hint}</div>}
    </>
  )
  const cls = "block rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-3.5"
  return href ? (
    <Link href={href} className={`${cls} transition-colors hover:border-[#3A3A3A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}

function NotTracked({ label, when }: { label: string; when: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[#2A2A2A] px-4 py-3.5">
      <div className="text-[11.5px] font-medium text-[#8A8A8A]">{label}</div>
      <div className="mt-1.5 text-[13px] font-medium text-[#B0B0B0]">Not recorded yet</div>
      <div className="mt-1 text-[11.5px] text-[#8A8A8A]">{when}</div>
    </div>
  )
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

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[18px] font-semibold tracking-tight text-white">CarouseLabs Engage</h1>
          <p className="mt-0.5 text-[12.5px] text-[#8A8A8A]">Who uses the extensions and what they write with them. Days are UTC.</p>
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
              <span className="text-[12px] text-[#8A8A8A]">to</span>
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
        <div className="space-y-6" aria-busy="true" aria-label="Loading overview">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
            {Array.from({ length: 14 }, (_, i) => (
              <SkeletonBlock key={i} className="h-[78px]" />
            ))}
          </div>
          <SkeletonBlock className="h-[300px]" />
        </div>
      ) : (
        <>
          <section aria-labelledby="engage-people" className="space-y-2.5">
            <h2 id="engage-people" className="text-[12px] font-semibold uppercase tracking-wide text-[#8A8A8A]">
              People
            </h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
              <Kpi label="Engage users" value={fmtNumber(data.users.total)} hint="Ever signed in or given access" href="/admin/engage/users" />
              <Kpi
                label="Active in range"
                value={fmtNumber(data.users.active)}
                hint={platform === "all" ? "Generated at least once" : `Generated on ${PLATFORM_LABELS[platform]}`}
              />
              <Kpi
                label="New in range"
                value={fmtNumber(data.users.new)}
                hint={platform === "all" ? "First extension sign-in" : `First sign-in to the ${PLATFORM_LABELS[platform]} extension`}
              />
              <Kpi label="Paid" value={fmtNumber(data.users.paid)} hint="$15/month, covers both" href="/admin/engage/users?access=paid" />
              <Kpi
                label="Free access (granted)"
                value={fmtNumber(data.users.granted)}
                hint={data.users.pendingGrants > 0 ? `+ ${data.users.pendingGrants} waiting for sign-up` : "Given by an admin"}
                href="/admin/engage/access"
              />
              <Kpi label="Free plan" value={fmtNumber(data.users.free)} hint="10 free generations" href="/admin/engage/users?access=free" />
              <Kpi label="Paused or suspended" value={fmtNumber(data.users.suspended)} href="/admin/engage/users?access=suspended" />
            </div>
          </section>

          <section aria-labelledby="engage-output" className="space-y-2.5">
            <h2 id="engage-output" className="text-[12px] font-semibold uppercase tracking-wide text-[#8A8A8A]">
              Generated in range
            </h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
              {features.map((f) => (
                <Kpi key={f} label={FEATURE_LABELS[f]} value={fmtNumber(g?.[f])} />
              ))}
              <Kpi label="Copied or inserted" value={pct(usedAtAll, g?.total ?? 0)} hint={`${fmtNumber(usedAtAll)} of ${fmtNumber(g?.total)} used on ${where}`} />
              <Kpi
                label="Extension errors"
                value={data.clientErrors === null ? "—" : fmtNumber(data.clientErrors)}
                hint={data.clientErrors === null ? "Run the Engage admin SQL" : "Reported by 1.3.0 and later"}
              />
              {!data.ai || !data.ai.recording ? (
                <NotTracked label="AI cost" when="Run the phase C SQL to start recording" />
              ) : (
                <Kpi
                  label="AI cost"
                  value={fmtDollars(data.ai.cost)}
                  hint={
                    data.ai.unpricedModels.length > 0
                      ? `${fmtNumber(data.ai.calls)} AI calls · some prices not set`
                      : `${fmtNumber(data.ai.calls)} AI calls`
                  }
                  href="/admin/engage/ai"
                />
              )}
            </div>
          </section>

          {g && g.total === 0 && data.users.active === 0 ? (
            <EmptyState title="No Engage activity in this range" body="Pick a longer range to see trends." />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              <section className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-4" aria-labelledby="engage-trend">
                <h2 id="engage-trend" className="mb-3 text-[13px] font-semibold text-white">
                  Generations per day
                </h2>
                <AdminLineChart
                  data={data.series}
                  xKey="date"
                  height={260}
                  series={features.map((f) => ({ key: f, label: FEATURE_LABELS[f], color: FEATURE_COLORS[f] }))}
                />
              </section>
              <section className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-4" aria-labelledby="engage-users-trend">
                <h2 id="engage-users-trend" className="mb-3 text-[13px] font-semibold text-white">
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
