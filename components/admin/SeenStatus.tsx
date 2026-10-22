// Whether one tracked email was seen and clicked (lib/emailTracking.ts), for
// a campaign's list of people and a person's personal email history. "Seen"
// is a good guess (Apple Mail loads images by itself; some apps block them);
// a click is certain and counts as seen.
import { Eye, MousePointerClick } from "lucide-react"
import { fmtDateTime } from "@/components/admin/ui"

export type SeenInfo = {
  openedAt: string | null
  openCount: number
  clickedAt: string | null
  clickCount: number
}

export function SeenStatus({ openedAt, openCount, clickedAt, clickCount }: SeenInfo) {
  if (!openedAt) return <span className="text-muted-foreground">Not seen yet</span>
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="inline-flex items-center gap-1 text-success" title="Opened (a good guess: some email apps load images by themselves)">
        <Eye className="size-3.5" aria-hidden />
        Seen {fmtDateTime(openedAt)}
        {openCount > 1 && <span className="text-muted-foreground"> · {openCount}×</span>}
      </span>
      {clickedAt && (
        <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-caption font-medium text-brand" title={`First click ${fmtDateTime(clickedAt)}`}>
          <MousePointerClick className="size-3" aria-hidden />
          Clicked{clickCount > 1 ? ` ${clickCount}×` : ""}
        </span>
      )}
    </span>
  )
}
