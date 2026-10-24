"use client"

// The top of Admin → Broadcasts: the last 30 days in one line (sent, seen,
// clicked; people only) and the latest campaigns, with the full Email report
// one click away (EmailReport.tsx).
import { useEffect, useState } from "react"
import Link from "next/link"
import { BarChart3 } from "lucide-react"
import { percentOf } from "@/lib/campaignRules"

type Summary = {
  totals: { sent: number; seen: number; clicked: number; scanned: number }
  campaigns: { id: string; subject: string; sent: number; seen: number; clicked: number }[]
}

export function EmailReportStrip() {
  const [summary, setSummary] = useState<Summary | null>(null)
  useEffect(() => {
    let live = true
    fetch("/api/admin/email-report?days=30")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Summary | null) => live && data && setSummary(data))
      .catch(() => {})
    return () => {
      live = false
    }
  }, [])

  const t = summary?.totals
  const latest = summary?.campaigns.filter((c) => c.id !== "personal").slice(0, 3) ?? []
  return (
    <section aria-label="Last 30 days" className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <span className="text-caption font-semibold text-muted-foreground">Last 30 days</span>
        {t ? (
          <span className="flex flex-wrap gap-x-5 gap-y-1 text-label tabular-nums text-foreground">
            <span>
              <span className="font-semibold">{t.sent.toLocaleString("en-US")}</span> sent
            </span>
            <span>
              <span className="font-semibold">{percentOf(t.seen, t.sent)}</span> seen
            </span>
            <span>
              <span className="font-semibold">{percentOf(t.clicked, t.sent)}</span> clicked
            </span>
            {t.scanned > 0 && <span className="text-caption text-muted-foreground self-center">{t.scanned} scanner checks left out</span>}
          </span>
        ) : (
          <span className="text-caption text-muted-foreground">Loading…</span>
        )}
        <Link
          href="/admin/broadcasts/report"
          className="ml-auto inline-flex items-center gap-1.5 text-caption font-semibold text-brand hover:underline"
        >
          <BarChart3 className="size-3.5" aria-hidden />
          Full email report
        </Link>
      </div>
      {latest.length > 0 && (
        <ul className="flex flex-col gap-1 border-t border-border pt-3">
          {latest.map((c) => (
            <li key={c.id} className="flex flex-wrap items-baseline gap-x-3 text-caption">
              <Link href={`/admin/broadcasts/campaigns/${c.id}`} className="min-w-0 flex-1 truncate text-foreground hover:underline">
                {c.subject}
              </Link>
              <span className="tabular-nums text-muted-foreground">
                {c.sent} sent · {percentOf(c.seen, c.sent)} seen · {percentOf(c.clicked, c.sent)} clicked
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
