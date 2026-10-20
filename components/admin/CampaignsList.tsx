"use client"

// /admin/broadcasts/campaigns — every email campaign with how far it's got.
// A campaign is made from the Broadcasts composer ("Campaign: send in
// batches") and sent from its own page, a batch at a time.
import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { AdminCard, Spinner, fmtDate, tableCls } from "@/components/admin/ui"
import type { CampaignProgress } from "@/lib/campaignRules"
import { audienceLabel } from "./campaignLabels"

type CampaignRow = {
  id: string
  subject: string
  audience: string
  audienceValue: string | null
  status: string
  createdBy: string
  createdAt: string
  progress: CampaignProgress
}

export function ProgressBar({ progress, className = "" }: { progress: CampaignProgress; className?: string }) {
  const pct = (n: number) => (progress.total ? `${(n / progress.total) * 100}%` : "0%")
  return (
    <div
      role="progressbar"
      aria-label={`${progress.sent} of ${progress.total} sent`}
      aria-valuemin={0}
      aria-valuemax={progress.total}
      aria-valuenow={progress.sent}
      className={`flex h-1.5 w-full overflow-hidden rounded-full bg-surface-muted ${className}`}
    >
      <div className="h-full bg-success" style={{ width: pct(progress.sent) }} />
      <div className="h-full bg-danger" style={{ width: pct(progress.failed) }} />
    </div>
  )
}

export function CampaignsList() {
  const [campaigns, setCampaigns] = useState<CampaignRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    fetch("/api/admin/campaigns")
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error ?? "Couldn't load campaigns")
        if (alive) setCampaigns(data.campaigns)
      })
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : "Couldn't load campaigns"))
    return () => {
      alive = false
    }
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lead font-bold text-foreground">Campaigns</h2>
          <p className="mt-0.5 text-caption text-muted-foreground">
            One email, sent to a list in batches you pick. Everyone gets it once, and you can see who has.
          </p>
        </div>
        <Link
          href="/admin/broadcasts"
          className="inline-flex items-center gap-1.5 text-caption font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          New campaign in Broadcasts
        </Link>
      </div>

      <AdminCard>
        {error ? (
          <p className="text-label text-danger">{error}</p>
        ) : campaigns === null ? (
          <Spinner label="Loading campaigns…" />
        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-start gap-2 py-4">
            <p className="text-label font-medium text-foreground">No campaigns yet</p>
            <p className="text-caption text-muted-foreground">
              In Broadcasts, write your email, pick who it&apos;s for, and choose &ldquo;Campaign: send in batches&rdquo;.
            </p>
          </div>
        ) : (
          <div className={tableCls.wrap}>
            <table className={tableCls.table}>
              <thead>
                <tr>
                  <th className={tableCls.th}>Email</th>
                  <th className={tableCls.th}>Who</th>
                  <th className={`${tableCls.th} min-w-[220px]`}>Progress</th>
                  <th className={tableCls.th}>Created</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id} className={tableCls.row}>
                    <td className={`${tableCls.td} max-w-[360px]`}>
                      <Link href={`/admin/broadcasts/campaigns/${c.id}`} className="block truncate font-medium text-foreground hover:underline">
                        {c.subject}
                      </Link>
                      {c.status === "archived" && <span className="text-caption text-muted-foreground">Archived</span>}
                    </td>
                    <td className={`${tableCls.td} text-muted-foreground`}>{audienceLabel(c.audience, c.audienceValue)}</td>
                    <td className={tableCls.td}>
                      <div className="flex flex-col gap-1.5">
                        <span className="tabular-nums">
                          {c.progress.complete ? (
                            <span className="font-medium text-success">All {c.progress.total} sent</span>
                          ) : (
                            <>
                              {c.progress.sent} of {c.progress.total} sent
                              {c.progress.failed > 0 && <span className="text-danger"> · {c.progress.failed} failed</span>}
                            </>
                          )}
                        </span>
                        <ProgressBar progress={c.progress} />
                      </div>
                    </td>
                    <td className={`${tableCls.td} text-muted-foreground`}>
                      {fmtDate(c.createdAt)}
                      <span className="block text-caption">{c.createdBy}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
    </div>
  )
}
