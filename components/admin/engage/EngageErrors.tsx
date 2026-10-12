"use client"

// Engage → Errors: what's failing (/api/admin/engage/errors) — errors the
// extensions report (Insert couldn't find the box, a chat couldn't be read)
// and AI calls that failed or timed out, grouped, with how many people each
// hit and on which versions, the latest ones and who they happened to.
import { useState } from "react"
import Link from "next/link"
import { AdminLineChart } from "@/components/admin/charts"
import { fmtDateTime } from "@/components/admin/ui"
import { Ledger } from "@/components/admin/Ledger"
import { modelLabel } from "@/lib/ai/models"
import { FEATURE_LABELS, PLATFORM_LABELS, type EngageFeature, type EngagePlatform } from "@/lib/engage/features"
import { RANGE_KEYS, RANGE_LABELS, type RangeKey } from "@/lib/engage/ranges"
import type { EngageErrors as ErrorsData, RecentError } from "@/lib/engage/errorQueries"
import { CsvLink, EmptyState, ErrorState, Pill, Segmented, SkeletonBlock, Tabs, fmtNumber, fmtRelative, useAdminApi, useStoredState } from "./shared"

type PlatformView = EngagePlatform | "all"
type Tab = "extension" | "ai"
const PRESET_RANGES = RANGE_KEYS.filter((k) => k !== "custom") as Exclude<RangeKey, "custom">[]
const featureName = (f: string) => FEATURE_LABELS[f as EngageFeature] ?? f
const th = "whitespace-nowrap bg-surface-muted/60 px-3 py-2.5 font-medium"


function Recent({ rows, label }: { rows: RecentError[]; label: string }) {
  if (rows.length === 0) return null
  return (
    <section className="relative overflow-x-auto rounded-card border border-border bg-surface" aria-label={label}>
      <h2 className="border-b border-border px-4 py-3 text-label font-semibold text-foreground">{label}</h2>
      <table className="w-full text-caption">
        <tbody className="text-foreground/90">
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-border first:border-t-0">
              <td className="whitespace-nowrap px-3 py-2 text-muted-foreground" title={fmtDateTime(r.at)}>
                {fmtRelative(r.at)}
              </td>
              <td className="px-3 py-2">
                {r.userId ? (
                  <Link href={`/admin/engage/users/${r.userId}`} className="text-brand hover:underline">
                    {r.email ?? r.userId}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">Unknown</span>
                )}
              </td>
              <td className="px-3 py-2">{featureName(r.feature)}</td>
              <td className="px-3 py-2 font-mono text-caption">{r.what}</td>
              <td className="px-3 py-2 text-muted-foreground">{r.version ?? ""}</td>
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
          <h2 className="text-lead font-semibold tracking-tight text-foreground">Errors</h2>
          <p className="mt-0.5 text-caption text-muted-foreground">What&apos;s failing, for whom, and on which version. Days are UTC.</p>
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
          <section aria-label="Error totals" className="border-y border-border py-6">
            <Ledger
              size="lg"
              className="grid-cols-2 lg:grid-cols-4"
              items={[
                { label: "Extension errors", value: data.extension.recording ? fmtNumber(data.extension.total) : "—", hint: data.extension.recording ? "Reported by the extensions" : "Run the Engage admin SQL" },
                { label: "AI failures", value: data.ai.recording ? fmtNumber(data.ai.total) : "—", hint: data.ai.recording ? "Errors and time-outs" : "Run the phase C SQL" },
                { label: "People affected", value: fmtNumber(data.people) },
                { label: "Kinds of error", value: fmtNumber(data.extension.groups.length + data.ai.groups.length) },
              ]}
            />
          </section>

          <section className="rounded-card border border-border bg-surface p-4" aria-labelledby="errors-trend">
            <h2 id="errors-trend" className="mb-3 text-label font-semibold text-foreground">
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
                <section className="relative overflow-x-auto rounded-card border border-border bg-surface" aria-label="Extension errors by kind">
                  <table className="w-full text-caption">
                    <thead>
                      <tr className="text-left text-caption text-muted-foreground">
                        <th className={th}>Feature</th>
                        <th className={th}>What happened</th>
                        <th className={`${th} text-right`}>Times</th>
                        <th className={`${th} text-right`}>People</th>
                        <th className={th}>Versions</th>
                        <th className={`${th} text-right`}>Last</th>
                      </tr>
                    </thead>
                    <tbody className="text-foreground/90">
                      {data.extension.groups.map((g) => (
                        <tr key={`${g.feature}:${g.code}`} className="border-t border-border">
                          <td className="px-3 py-2">{featureName(g.feature)}</td>
                          <td className="px-3 py-2">
                            <span className="block">{g.message}</span>
                            <span className="font-mono text-caption text-muted-foreground">{g.code}</span>
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
                          <td className="whitespace-nowrap px-3 py-2 text-right text-muted-foreground">{fmtRelative(g.lastAt)}</td>
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
              <section className="relative overflow-x-auto rounded-card border border-border bg-surface" aria-label="AI failures by kind">
                <table className="w-full text-caption">
                  <thead>
                    <tr className="text-left text-caption text-muted-foreground">
                      <th className={th}>Feature</th>
                      <th className={th}>Model</th>
                      <th className={th}>How</th>
                      <th className={`${th} text-right`}>Times</th>
                      <th className={`${th} text-right`}>People</th>
                      <th className={`${th} text-right`}>Last</th>
                    </tr>
                  </thead>
                  <tbody className="text-foreground/90">
                    {data.ai.groups.map((g) => (
                      <tr key={`${g.feature}:${g.model}:${g.outcome}`} className="border-t border-border">
                        <td className="px-3 py-2">{featureName(g.feature)}</td>
                        <td className="px-3 py-2">{modelLabel(g.model)}</td>
                        <td className="px-3 py-2">{g.outcome === "timeout" ? <Pill tone="amber">Timed out</Pill> : <Pill tone="red">Error</Pill>}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtNumber(g.count)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtNumber(g.people)}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-right text-muted-foreground">{fmtRelative(g.lastAt)}</td>
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
