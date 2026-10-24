"use client"

// /admin/broadcasts/report — how the emails the admin sends are doing
// (lib/emailReport.ts): sent, seen, clicked and click-to-open over a date
// range, every campaign side by side, the links people click, when they read
// and with what. People only: security scanners and Apple Mail's own opening
// are left out (lib/emailScanners.ts). Filters in one row above everything.
import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, MailCheck, MousePointerClick, Eye, Send } from "lucide-react"
import { AdminCard, AdminInput, AdminSelect, Spinner, StatCard, fmtDate, tableCls } from "@/components/admin/ui"
import { AdminLineChart, CHART_COLORS } from "@/components/admin/charts"
import { percentOf } from "@/lib/campaignRules"
import { audienceLabel } from "./campaignLabels"
import { BarList, ReadingHeatmap } from "./EmailReportParts"

type Totals = { sent: number; failed: number; seen: number; clicked: number; scanned: number; maybeApple: number; unsubscribed: number; bounced: number; spam: number }
type Line = {
  id: string
  subject: string
  audience: string
  audienceValue: string | null
  createdAt: string
  via: "resend" | "brevo" | "both" | null
  lastSentAt: string | null
  sent: number
  failed: number
  seen: number
  clicked: number
  scanned: number
  maybeApple: number
}
type Report = {
  totals: Totals
  daily: { day: string; sent: number; seen: number; clicked: number }[]
  campaigns: Line[]
  links: { link: string; clicks: number; people: number }[]
  when: number[][]
  apps: { app: string; people: number }[]
}

const RANGES = [
  { key: "7", label: "7 days" },
  { key: "30", label: "30 days" },
  { key: "90", label: "90 days" },
  { key: "all", label: "All time" },
  { key: "custom", label: "Dates" },
] as const
type Range = (typeof RANGES)[number]["key"]

const VIA: Record<string, string> = { resend: "Resend", brevo: "Brevo", both: "Resend + Brevo" }
type SortKey = "date" | "sent" | "seen" | "clicked"
const rate = (part: number, whole: number) => (whole ? part / whole : 0)
// A link as people would recognise it: the page, without the site.
const shortLink = (link: string) => link.replace(/^https:\/\/(www\.)?carouselabs\.com/, "") || "carouselabs.com"

export function EmailReport() {
  const [range, setRange] = useState<Range>("30")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [kind, setKind] = useState("all")
  const [via, setVia] = useState("all")
  const [who, setWho] = useState("all")
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sort, setSort] = useState<SortKey>("date")

  const query = useMemo(() => {
    const p = new URLSearchParams({ kind, via, who })
    if (range === "custom") {
      if (!from || !to) return null
      p.set("from", from)
      p.set("to", to)
    } else if (range !== "all") p.set("days", range)
    return p.toString()
  }, [range, from, to, kind, via, who])

  const load = useCallback(async () => {
    if (!query) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/email-report?${query}`, { cache: "no-store" })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? "Couldn't load the report")
      setReport(body)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load the report")
    } finally {
      setLoading(false)
    }
  }, [query])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- load() sets state after its fetch
  useEffect(() => void load(), [load])

  const lines = useMemo(() => {
    const list = [...(report?.campaigns ?? [])]
    const by: Record<SortKey, (l: Line) => number> = {
      date: (l) => new Date(l.lastSentAt ?? l.createdAt).getTime(),
      sent: (l) => l.sent,
      seen: (l) => rate(l.seen, l.sent),
      clicked: (l) => rate(l.clicked, l.sent),
    }
    return list.sort((a, b) => by[sort](b) - by[sort](a))
  }, [report, sort])

  const t = report?.totals
  const header = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link href="/admin/broadcasts" className="inline-flex items-center gap-1.5 text-caption text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" aria-hidden />
        Broadcasts
      </Link>
      {loading && report && <span className="text-caption text-muted-foreground">Updating…</span>}
    </div>
  )

  const sortHeader = (key: SortKey, label: string) => (
    <th className={tableCls.th} aria-sort={sort === key ? "descending" : "none"}>
      <button type="button" onClick={() => setSort(key)} className={sort === key ? "font-semibold text-foreground" : "hover:text-foreground"}>
        {label}
        {sort === key ? " ↓" : ""}
      </button>
    </th>
  )

  return (
    <div className="flex flex-col gap-6">
      {header}

      {/* Filters: one row above everything */}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filters">
        <div className="flex flex-wrap rounded-control-sm border border-border bg-background p-1" role="group" aria-label="Date range">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              aria-pressed={range === r.key}
              onClick={() => setRange(r.key)}
              className={`rounded-md px-3 py-1.5 text-caption font-semibold ${range === r.key ? "bg-surface-raised text-foreground shadow-card" : "text-muted-foreground hover:text-foreground"}`}
            >
              {r.label}
            </button>
          ))}
        </div>
        {range === "custom" && (
          <>
            <AdminInput type="date" aria-label="From" value={from} onChange={(e) => setFrom(e.target.value)} className="w-auto" />
            <AdminInput type="date" aria-label="To" value={to} onChange={(e) => setTo(e.target.value)} className="w-auto" />
          </>
        )}
        <AdminSelect aria-label="Which emails" value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="all">All emails</option>
          <option value="campaigns">Campaigns</option>
          <option value="personal">Personal emails</option>
        </AdminSelect>
        <AdminSelect aria-label="Sent through" value={via} onChange={(e) => setVia(e.target.value)}>
          <option value="all">Resend and Brevo</option>
          <option value="resend">Resend</option>
          <option value="brevo">Brevo</option>
        </AdminSelect>
        <AdminSelect aria-label="To whom" value={who} onChange={(e) => setWho(e.target.value)}>
          <option value="all">Users and leads</option>
          <option value="users">Users</option>
          <option value="leads">Leads</option>
        </AdminSelect>
      </div>

      {error && (
        <AdminCard>
          <p className="text-label text-danger">{error}</p>
        </AdminCard>
      )}
      {!report && !error && (range !== "custom" || query) && <Spinner label="Loading the report…" />}
      {range === "custom" && !query && <p className="text-caption text-muted-foreground">Pick both dates.</p>}

      {report && t && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Sent" value={t.sent.toLocaleString("en-US")} icon={<Send />} hint={t.failed ? `${t.failed} failed` : "None failed"} />
            <StatCard label="Seen" value={percentOf(t.seen, t.sent)} icon={<Eye />} hint={`${t.seen} of ${t.sent} people opened it`} />
            <StatCard label="Clicked" value={percentOf(t.clicked, t.sent)} icon={<MousePointerClick />} hint={`${t.clicked} people clicked a link`} />
            <StatCard label="Click-to-open" value={percentOf(t.clicked, t.seen)} icon={<MailCheck />} hint="Of those who saw it, how many clicked" />
          </div>
          <p className="-mt-3 text-caption text-muted-foreground">
            People only. Left out: {t.scanned} checked by a security scanner
            {t.maybeApple > 0 ? `, ${t.maybeApple} maybe seen in Apple Mail (it opens emails by itself)` : ""}.
            {who !== "users" && kind !== "personal" && ` Leads: ${t.unsubscribed} unsubscribed, ${t.bounced} bounced, ${t.spam} marked it spam.`}
            {via !== "all" && " Personal emails don't record what sent them, so they're only in “Resend and Brevo”."}
          </p>

          <AdminCard title="Sent, seen and clicked, by the day they were sent">
            {t.sent === 0 ? (
              <p className="text-caption text-muted-foreground">Nothing sent in these dates.</p>
            ) : (
              <>
                <AdminLineChart
                  data={report.daily}
                  xKey="day"
                  series={[
                    { key: "sent", label: "Sent", color: CHART_COLORS.violet },
                    { key: "seen", label: "Seen", color: CHART_COLORS.teal },
                    { key: "clicked", label: "Clicked", color: CHART_COLORS.amber },
                  ]}
                />
                <details className="mt-3 text-caption text-muted-foreground">
                  <summary className="cursor-pointer hover:text-foreground">See the numbers</summary>
                  <div className={`${tableCls.wrap} mt-2`}>
                    <table className={tableCls.table}>
                      <thead>
                        <tr>
                          <th className={tableCls.th}>Day</th>
                          <th className={tableCls.th}>Sent</th>
                          <th className={tableCls.th}>Seen</th>
                          <th className={tableCls.th}>Clicked</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.daily
                          .filter((d) => d.sent > 0)
                          .reverse()
                          .map((d) => (
                            <tr key={d.day} className={tableCls.row}>
                              <td className={tableCls.td}>{fmtDate(`${d.day}T12:00:00`)}</td>
                              <td className={`${tableCls.td} tabular-nums`}>{d.sent}</td>
                              <td className={`${tableCls.td} tabular-nums`}>{d.seen}</td>
                              <td className={`${tableCls.td} tabular-nums`}>{d.clicked}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </>
            )}
          </AdminCard>

          <AdminCard title={`Campaigns side by side (${lines.length})`}>
            {lines.length === 0 ? (
              <p className="text-caption text-muted-foreground">No emails in these dates.</p>
            ) : (
              <div className={tableCls.wrap}>
                <table className={tableCls.table}>
                  <thead>
                    <tr>
                      <th className={tableCls.th}>Email</th>
                      {sortHeader("sent", "Sent")}
                      {sortHeader("seen", "Seen")}
                      {sortHeader("clicked", "Clicked")}
                      <th className={tableCls.th}>Click-to-open</th>
                      <th className={tableCls.th} title="Checked by a security scanner (not counted)">
                        Scanner
                      </th>
                      {sortHeader("date", "Last sent")}
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l) => (
                      <tr key={l.id} className={tableCls.row}>
                        <td className={`${tableCls.td} max-w-[22rem]`}>
                          <span className="flex flex-col">
                            {l.id === "personal" ? (
                              <Link href="/admin/broadcasts/sent" className="truncate font-medium text-foreground hover:underline">
                                Personal emails
                              </Link>
                            ) : (
                              <Link href={`/admin/broadcasts/campaigns/${l.id}`} className="truncate font-medium text-foreground hover:underline">
                                {l.subject}
                              </Link>
                            )}
                            <span className="truncate text-caption text-muted-foreground">
                              {l.id === "personal" ? "One person at a time" : audienceLabel(l.audience, l.audienceValue)}
                              {l.via ? ` · ${VIA[l.via]}` : ""}
                            </span>
                          </span>
                        </td>
                        <td className={`${tableCls.td} tabular-nums`}>
                          {l.sent}
                          {l.failed > 0 && <span className="text-danger"> · {l.failed} failed</span>}
                        </td>
                        <td className={`${tableCls.td} tabular-nums`}>
                          {percentOf(l.seen, l.sent)} <span className="text-muted-foreground">({l.seen})</span>
                        </td>
                        <td className={`${tableCls.td} tabular-nums`}>
                          {percentOf(l.clicked, l.sent)} <span className="text-muted-foreground">({l.clicked})</span>
                        </td>
                        <td className={`${tableCls.td} tabular-nums`}>{percentOf(l.clicked, l.seen)}</td>
                        <td className={`${tableCls.td} tabular-nums text-muted-foreground`}>{l.scanned || "—"}</td>
                        <td className={`${tableCls.td} text-muted-foreground`}>{fmtDate(l.lastSentAt ?? l.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AdminCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <AdminCard title="Links people clicked">
              <BarList
                rows={report.links.map((l) => ({ label: shortLink(l.link), title: l.link, value: l.people, note: l.clicks > l.people ? `${l.clicks} clicks` : undefined }))}
                unit={(n) => `${n} ${n === 1 ? "person" : "people"}`}
                empty="No clicks yet in these dates."
              />
            </AdminCard>
            <AdminCard title="Where they read it">
              <BarList
                rows={report.apps.map((a) => ({ label: a.app, value: a.people }))}
                unit={(n) => `${n} ${n === 1 ? "person" : "people"}`}
                empty="Nothing yet: this fills in as people open and click."
              />
              <p className="mt-3 text-caption text-muted-foreground/80">
                Gmail hides the phone or computer it opened on; a click shows the device.
              </p>
            </AdminCard>
          </div>

          <AdminCard title="When people open and click (India time)">
            <ReadingHeatmap grid={report.when} />
          </AdminCard>

          <p className="text-caption text-muted-foreground/80">
            How it&apos;s counted: Seen is a person opening it (some email apps block images, and Gmail only tells us about the
            first open). Clicked is a person clicking in a real browser. Company security scanners that check every email and
            link, and Apple Mail opening emails by itself, are left out.
          </p>
        </>
      )}
    </div>
  )
}
