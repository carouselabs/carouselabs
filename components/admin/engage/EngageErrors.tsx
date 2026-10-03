"use client"

// Engage → Errors: what's failing (/api/admin/engage/errors) — errors the
// extensions report (Insert couldn't find the box, a chat couldn't be read)
// and AI calls that failed or timed out, grouped, with how many people each
// hit and on which versions, the latest ones and who they happened to.
import { useState } from "react"
import Link from "next/link"
import { AdminLineChart } from "@/components/admin/charts"
import { fmtDateTime } from "@/components/admin/ui"
import { modelLabel } from "@/lib/ai/models"
import { FEATURE_LABELS, PLATFORM_LABELS, type EngageFeature, type EngagePlatform } from "@/lib/engage/features"
import { RANGE_KEYS, RANGE_LABELS, type RangeKey } from "@/lib/engage/ranges"
import type { EngageErrors as ErrorsData, RecentError } from "@/lib/engage/errorQueries"
import { CsvLink, EmptyState, ErrorState, Pill, Segmented, SkeletonBlock, Tabs, fmtNumber, fmtRelative, useAdminApi, useStoredState } from "./shared"

type PlatformView = EngagePlatform | "all"
type Tab = "extension" | "ai"
const PRESET_RANGES = RANGE_KEYS.filter((k) => k !== "custom") as Exclude<RangeKey, "custom">[]
const featureName = (f: string) => FEATURE_LABELS[f as EngageFeature] ?? f
const th = "px-3 py-2 font-semibold"

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-3.5">
      <div className="text-[11.5px] font-medium text-[#8A8A8A]">{label}</div>
      <div className="mt-1.5 text-[22px] font-semibold leading-none tabular-nums text-white">{value}</div>
      {hint && <div className="mt-1.5 text-[11.5px] text-[#8A8A8A]">{hint}</div>}
    </div>
  )
}

function Recent({ rows, label }: { rows: RecentError[]; label: string }) {
  if (rows.length === 0) return null
  return (
    <section className="overflow-x-auto rounded-lg border border-[#2A2A2A] bg-[#1A1A1A]" aria-label={label}>
      <h2 className="border-b border-[#2A2A2A] px-4 py-3 text-[13px] font-semibold text-white">{label}</h2>
      <table className="w-full text-[12.5px]">
        <tbody className="text-[#D0D0D0]">
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-[#232323] first:border-t-0">
              <td className="whitespace-nowrap px-3 py-2 text-[#8A8A8A]" title={fmtDateTime(r.at)}>
                {fmtRelative(r.at)}
              </td>
              <td className="px-3 py-2">
                {r.userId ? (
                  <Link href={`/admin/engage/users/${r.userId}`} className="text-[#C4B5FD] hover:underline">
                    {r.email ?? r.userId}
                  </Link>
                ) : (
                  <span className="text-[#8A8A8A]">Unknown</span>
                )}
              </td>
              <td className="px-3 py-2">{featureName(r.feature)}</td>
              <td className="px-3 py-2 font-mono text-[11.5px]">{r.what}</td>
              <td className="px-3 py-2 text-[#8A8A8A]">{r.version ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

export function EngageErrors() {
  const [range, setRange] = useStoredState<Exclude<RangeKey, "custom">>("engage-admin:errors-range", "7d")
  const [platform, setPlatform] = useStoredState<PlatformView>("engage-admin:errors-platform", "all")
  const [tab, setTab] = useState<Tab>("extension")
  const query = `range=${range}${platform === "all" ? "" : `&platform=${platform}`}`
  const { data, error, loading, reload } = useAdminApi<ErrorsData>(`/api/admin/engage/errors?${query}`)

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[18px] font-semibold tracking-tight text-white">Errors</h1>
          <p className="mt-0.5 text-[12.5px] text-[#8A8A8A]">What&apos;s failing, for whom, and on which version. Days are UTC.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            label="Extension"
            options={[
              { value: "all", label: "All" },
              { value: "linkedin", label: PLATFORM_LABELS.linkedin },
              { value: "x", label: PLATFORM_LABELS.x },
            ]}
            value={platform}
            onChange={setPlatform}
          />
          <Segmented label="Date range" options={PRESET_RANGES.map((k) => ({ value: k, label: RANGE_LABELS[k] }))} value={range} onChange={setRange} />
          <CsvLink type="errors" query={query} />
        </div>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data || loading ? (
        <div className="space-y-4" aria-busy="true" aria-label="Loading errors">
          <SkeletonBlock className="h-[78px]" />
          <SkeletonBlock className="h-[260px]" />
        </div>
      ) : (
        <>
          <section aria-label="Error totals" className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi
              label="Extension errors"
              value={data.extension.recording ? fmtNumber(data.extension.total) : "—"}
              hint={data.extension.recording ? "Reported by the extensions" : "Run the Engage admin SQL"}
            />
            <Kpi
              label="AI failures"
              value={data.ai.recording ? fmtNumber(data.ai.total) : "—"}
              hint={data.ai.recording ? "Errors and time-outs" : "Run the phase C SQL"}
            />
            <Kpi label="People affected" value={fmtNumber(data.people)} />
            <Kpi label="Kinds of error" value={fmtNumber(data.extension.groups.length + data.ai.groups.length)} />
          </section>

          <section className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-4" aria-labelledby="errors-trend">
            <h2 id="errors-trend" className="mb-3 text-[13px] font-semibold text-white">
              Errors per day
            </h2>
            <AdminLineChart
              data={data.series.map((d) => ({ ...d }))}
              xKey="date"
              height={220}
              series={[
                { key: "extension", label: "Extension errors", color: "#F59E0B" },
                { key: "ai", label: "AI failures", color: "#EF4444" },
              ]}
            />
          </section>

          <Tabs<Tab>
            label="Error sources"
            value={tab}
            onChange={setTab}
            tabs={[
              { value: "extension", label: "Extension errors", count: data.extension.groups.length },
              { value: "ai", label: "AI failures", count: data.ai.groups.length },
            ]}
          />

          {tab === "extension" ? (
            data.extension.groups.length === 0 ? (
              <EmptyState title="No extension errors in this range" />
            ) : (
              <>
                <section className="overflow-x-auto rounded-lg border border-[#2A2A2A] bg-[#1A1A1A]" aria-label="Extension errors by kind">
                  <table className="w-full text-[12.5px]">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-wide text-[#8A8A8A]">
                        <th className={th}>Feature</th>
                        <th className={th}>What happened</th>
                        <th className={`${th} text-right`}>Times</th>
                        <th className={`${th} text-right`}>People</th>
                        <th className={th}>Versions</th>
                        <th className={`${th} text-right`}>Last</th>
                      </tr>
                    </thead>
                    <tbody className="text-[#D0D0D0]">
                      {data.extension.groups.map((g) => (
                        <tr key={`${g.feature}:${g.code}`} className="border-t border-[#232323]">
                          <td className="px-3 py-2">{featureName(g.feature)}</td>
                          <td className="px-3 py-2">
                            <span className="block">{g.message}</span>
                            <span className="font-mono text-[11px] text-[#8A8A8A]">{g.code}</span>
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">{fmtNumber(g.count)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{fmtNumber(g.people)}</td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-1">
                              {g.versions.map((v) => (
                                <Pill key={v}>{v}</Pill>
                              ))}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-right text-[#8A8A8A]">{fmtRelative(g.lastAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
                <Recent rows={data.extension.recent} label="Latest extension errors" />
              </>
            )
          ) : data.ai.groups.length === 0 ? (
            <EmptyState title="No AI failures in this range" />
          ) : (
            <>
              <section className="overflow-x-auto rounded-lg border border-[#2A2A2A] bg-[#1A1A1A]" aria-label="AI failures by kind">
                <table className="w-full text-[12.5px]">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-[#8A8A8A]">
                      <th className={th}>Feature</th>
                      <th className={th}>Model</th>
                      <th className={th}>How</th>
                      <th className={`${th} text-right`}>Times</th>
                      <th className={`${th} text-right`}>People</th>
                      <th className={`${th} text-right`}>Last</th>
                    </tr>
                  </thead>
                  <tbody className="text-[#D0D0D0]">
                    {data.ai.groups.map((g) => (
                      <tr key={`${g.feature}:${g.model}:${g.outcome}`} className="border-t border-[#232323]">
                        <td className="px-3 py-2">{featureName(g.feature)}</td>
                        <td className="px-3 py-2">{modelLabel(g.model)}</td>
                        <td className="px-3 py-2">{g.outcome === "timeout" ? <Pill tone="amber">Timed out</Pill> : <Pill tone="red">Error</Pill>}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtNumber(g.count)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtNumber(g.people)}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-right text-[#8A8A8A]">{fmtRelative(g.lastAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
              <Recent rows={data.ai.recent} label="Latest AI failures" />
            </>
          )}
        </>
      )}
    </div>
  )
}
