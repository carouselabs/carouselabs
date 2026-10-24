"use client"

// Whether one tracked email was seen and clicked (lib/emailTracking.ts), for
// a campaign's list of people and a person's personal email history: when
// they first saw it, and when they first (and last) clicked. Only a person's
// activity counts (lib/emailScanners.ts): a company's security scanner
// checking the email is shown apart and never counts, and Apple Mail opening
// it by itself is only a "maybe". A click is confirmed by a real browser, and
// counts as seen. History opens everything that happened, with times
// (EmailActivityDialog).
import { useState } from "react"
import { Eye, History, MousePointerClick, ShieldCheck } from "lucide-react"
import { fmtDateTime } from "@/components/admin/ui"
import { EmailActivityDialog } from "./EmailActivityDialog"

export type SeenInfo = {
  openedAt: string | null
  openCount: number
  clickedAt: string | null
  clickCount: number
  lastClickedAt?: string | null
  scannedAt?: string | null
  scanReason?: string | null
  autoOpenedAt?: string | null
}

export function SeenStatus({
  openedAt,
  openCount,
  clickedAt,
  clickCount,
  lastClickedAt,
  scannedAt,
  scanReason,
  autoOpenedAt,
  activity,
}: SeenInfo & {
  // The email, to open its history; who it went to, for the history's title.
  activity?: { kind: "campaign" | "personal"; id: string; who: string }
}) {
  const [showing, setShowing] = useState(false)
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      {openedAt ? (
        <span className="inline-flex items-center gap-1 text-success" title="Opened by them (a good guess: some email apps block images)">
          <Eye className="size-3.5" aria-hidden />
          Seen {fmtDateTime(openedAt)}
          {openCount > 1 && <span className="text-muted-foreground"> · {openCount}×</span>}
        </span>
      ) : autoOpenedAt ? (
        <span className="text-muted-foreground" title="Apple Mail opens every email by itself, so this can't tell whether they read it">
          Maybe seen (Apple Mail)
        </span>
      ) : (
        <span className="text-muted-foreground">Not seen yet</span>
      )}
      {clickedAt && (
        <span
          className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-caption font-medium text-brand"
          title="Clicked by them in a real browser"
        >
          <MousePointerClick className="size-3" aria-hidden />
          Clicked {fmtDateTime(clickedAt)}
          {clickCount > 1 && (
            <span className="font-normal">
              {" "}
              · {clickCount}×{lastClickedAt && lastClickedAt !== clickedAt ? ` · last ${fmtDateTime(lastClickedAt)}` : ""}
            </span>
          )}
        </span>
      )}
      {scannedAt && (
        <span
          className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5 text-caption text-muted-foreground"
          title={`Their email's security system checked it ${fmtDateTime(scannedAt)}${scanReason ? ` (${scanReason.toLowerCase()})` : ""}. Not counted as seen or clicked.`}
        >
          <ShieldCheck className="size-3" aria-hidden />
          Security scanner
        </span>
      )}
      {activity && (openedAt || clickedAt || scannedAt || autoOpenedAt) && (
        <button
          type="button"
          onClick={() => setShowing(true)}
          aria-label={`History for ${activity.who}`}
          className="inline-flex items-center gap-1 text-caption font-medium text-brand hover:underline"
        >
          <History className="size-3" aria-hidden />
          History
        </button>
      )}
      {showing && activity && <EmailActivityDialog kind={activity.kind} id={activity.id} who={activity.who} onClose={() => setShowing(false)} />}
    </span>
  )
}
