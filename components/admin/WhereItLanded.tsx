"use client"

// "Where it landed" on a campaign's page (lib/placement): where the test
// copy landed at the test Gmail (Primary, Promotions, Updates, Spam…), and
// the column beside each person (lib/placement/landing.ts). The page asks
// again every 20 seconds while a test copy hasn't been found yet.
import { useCallback, useEffect, useState } from "react"
import { Inbox, RefreshCw } from "lucide-react"
import { AdminButton, fmtDateTime } from "@/components/admin/ui"
import { useToast } from "@/components/admin/Toast"
import { landingOf, testResult, type Landing, type LandingPerson, type PlacementTestView } from "@/lib/placement/landing"
import { MAILBOX_LABEL, type Mailbox } from "@/lib/placement/mailbox"

export type PlacementReport = {
  inbox: { connected: boolean; address: string | null }
  // The database isn't ready for it yet (CarouseLabs: scripts/email-placement.sql).
  setupMissing?: boolean
  tests: PlacementTestView[]
  people: Record<string, { mailbox: Mailbox | null; via: string; stop: { reason: string | null; at: string } | null }>
}

const POLL_MS = 20_000

// Only a real report is shown: anything else (an error page, a changed
// server) leaves the column empty rather than breaking the campaign page.
const isReport = (data: unknown): data is PlacementReport =>
  !!data && typeof data === "object" && Array.isArray((data as PlacementReport).tests) && typeof (data as PlacementReport).people === "object" && !!(data as PlacementReport).inbox

/**
 * The campaign's placement report, once the campaign itself has loaded
 * (`ready`); asked again when `refreshKey` changes and while a test copy is
 * still being looked for.
 */
export function usePlacement(campaignId: string, refreshKey: unknown, ready = true) {
  const { toast } = useToast()
  const [report, setReport] = useState<PlacementReport | null>(null)
  const [retesting, setRetesting] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/campaigns/${campaignId}/placement`, { cache: "no-store" })
      const data: unknown = res.ok ? await res.json().catch(() => null) : null
      if (isReport(data)) setReport(data)
    } catch {
      // Shown again on the next look.
    }
  }, [campaignId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load() sets state after its fetch
    if (ready) void load()
  }, [load, refreshKey, ready])

  const waiting = !!report?.tests.some((t) => t.status === "waiting")
  useEffect(() => {
    if (!waiting) return
    const timer = setInterval(() => void load(), POLL_MS)
    return () => clearInterval(timer)
  }, [waiting, load])

  async function retest() {
    setRetesting(true)
    try {
      const res = await fetch(`/api/admin/campaigns/${campaignId}/placement`, { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? "Couldn't send the test copy")
      if (isReport(data)) setReport(data)
      toast("Test copy sent. Where it landed shows here in about a minute.", "success")
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't send the test copy", "error")
    } finally {
      setRetesting(false)
    }
  }

  return { report, retest, retesting }
}

const TONE: Record<Landing["tone"], string> = {
  good: "bg-success-soft text-success",
  warn: "bg-warning-soft text-warning",
  bad: "bg-danger-soft text-danger",
  muted: "bg-surface-muted text-muted-foreground",
}

/** One person's "Where it landed", once the report is in. */
export function landingFor(id: string, person: Omit<LandingPerson, "mailbox" | "via" | "stop">, report: PlacementReport | null): Landing | null {
  if (!report) return null
  const extra = report.people[id]
  return landingOf({ ...person, mailbox: extra?.mailbox ?? null, via: extra?.via ?? "brevo", stop: extra?.stop ?? null }, report.tests)
}

export function LandingBadge({ landing }: { landing: Landing | null }) {
  if (!landing) return <span className="text-muted-foreground">…</span>
  if (landing.label === "—") return <span className="text-muted-foreground">—</span>
  return (
    <span className="flex flex-col gap-0.5">
      <span className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-caption font-medium ${TONE[landing.tone]}`}>{landing.label}</span>
      {landing.detail && <span className="max-w-[240px] truncate text-caption text-muted-foreground" title={landing.detail}>{landing.detail}</span>}
    </span>
  )
}

/** The campaign's test copies: where each landed, and "Test again". */
export function PlacementSummary({ report, onRetest, retesting, canTest }: { report: PlacementReport | null; onRetest: () => void; retesting: boolean; canTest: boolean }) {
  if (!report) return null
  const latest = [...report.tests].sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
  return (
    <div className="flex flex-col gap-2 rounded-control-sm border border-border bg-surface-muted/40 p-3.5" aria-label="Where it landed">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-label font-semibold text-foreground">
          <Inbox className="size-4 text-brand" aria-hidden />
          Where it landed
        </span>
        {report.inbox.connected && !report.setupMissing && canTest && (
          <AdminButton variant="ghost" onClick={onRetest} loading={retesting}>
            <RefreshCw aria-hidden />
            Test again
          </AdminButton>
        )}
      </div>
      {report.setupMissing ? (
        <p className="text-caption text-muted-foreground">Where it landed needs scripts/email-placement.sql run in Supabase first.</p>
      ) : (
        <>
          {latest.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {latest.slice(0, 3).map((t) => {
                const result = testResult(t)
                return (
                  <li key={t.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption">
                    <span className="text-muted-foreground">
                      Test copy at {MAILBOX_LABEL[t.inbox] ?? t.inbox}, sent by {t.via === "brevo" ? "Brevo" : "Resend"} {fmtDateTime(t.sentAt)}:
                    </span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${TONE[result.tone]}`}>{result.label}</span>
                    {result.detail && <span className="text-muted-foreground">{result.detail}</span>}
                    {t.status === "waiting" && t.error && <span className="text-danger">{t.error}</span>}
                  </li>
                )
              })}
            </ul>
          )}
          {!report.inbox.connected ? (
            <p className="text-caption text-muted-foreground">
              The test inbox isn&apos;t connected{latest.length > 0 ? ", so new test copies can't be checked" : " yet, so where emails land can't be checked"}. It
              needs PLACEMENT_GMAIL_USER and PLACEMENT_GMAIL_APP_PASSWORD (an app password for the test Gmail).
            </p>
          ) : (
            latest.length === 0 && (
              <p className="text-caption text-muted-foreground">
                With its first send, this campaign also sends one test copy to {report.inbox.address}, and shows here which tab or folder
                Gmail put it in.
              </p>
            )
          )}
        </>
      )}
      <p className="text-caption text-muted-foreground/80">
        No one can see inside a person&apos;s own inbox, so each person shows what&apos;s known (bounced, marked as spam, seen, clicked) or
        else where the test copy landed at their kind of inbox: the Gmail test stands for everyone on Gmail and Google Workspace.
      </p>
    </div>
  )
}
