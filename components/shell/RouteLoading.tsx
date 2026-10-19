// components/shell/RouteLoading.tsx
// The instant placeholders each signed-in page shows while it loads (used by
// the pages' loading.tsx files). Next.js prefetches these, so a click swaps
// the page for its outline straight away instead of waiting on the server.
// Each shape follows its page's real layout and width so nothing jumps when
// the page arrives. The top bar, section tabs and Engage header stay put
// around them (they live in the layouts).

import { Skeleton } from "@/components/ui/skeleton"
import { SettingsHeader } from "@/components/settings/SettingsHeader"

export type RouteLoadingShape =
  | "dashboard"
  | "notepad"
  | "list"
  | "list-detail"
  | "calendar"
  | "cards"
  | "canvas"
  | "settings"
  | "sheet"

export function RouteLoading({ shape, label }: { shape: RouteLoadingShape; label: string }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {SHAPES[shape]}
    </div>
  )
}

function Lines({ widths }: { widths: string[] }) {
  return (
    <div className="flex flex-col gap-2.5">
      {widths.map((w, i) => (
        <Skeleton key={i} className="h-3.5 rounded-full" style={{ width: w }} />
      ))}
    </div>
  )
}

function Rows({ count }: { count: number }) {
  return (
    <div className="flex flex-col divide-y divide-border rounded-card border border-border bg-surface-raised">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <Skeleton className="size-9 shrink-0 rounded-control-sm" />
          <div className="min-w-0 flex-1">
            <Lines widths={[`${62 - ((i * 13) % 30)}%`, `${38 + ((i * 7) % 20)}%`]} />
          </div>
          <Skeleton className="hidden h-3.5 w-16 rounded-full sm:block" />
        </div>
      ))}
    </div>
  )
}

/** Label column + fields: the two-column sheet the Settings tabs and Engage settings use. */
function Sheet() {
  return (
    <div className="flex flex-col gap-8">
      {[3, 2, 3].map((fields, i) => (
        <div key={i} className="grid gap-4 border-t border-border pt-8 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:gap-x-12">
          <Lines widths={["55%", "85%"]} />
          <div className="flex flex-col gap-4">
            {Array.from({ length: fields }, (_, f) => (
              <div key={f} className="flex flex-col gap-2">
                <Skeleton className="h-3 w-24 rounded-full" />
                <Skeleton className="h-10 w-full rounded-control" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

const SHAPES: Record<RouteLoadingShape, React.ReactNode> = {
  // Generate bar on top, then the idea rows under "Tailored to your profile".
  dashboard: (
    <div className="mx-auto flex w-full max-w-showcase flex-col gap-6 md:gap-8">
      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-72 max-w-full" />
        <Skeleton className="h-16 w-full rounded-card" />
      </div>
      <Skeleton className="h-3 w-40 rounded-full" />
      <Rows count={4} />
    </div>
  ),
  // The ruled "Work on your own idea" sheet.
  notepad: (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 pt-6">
      <Skeleton className="h-9 w-64 max-w-full" />
      <div className="flex flex-col gap-4 rounded-card border border-border bg-surface-raised p-6">
        <Lines widths={["92%", "86%", "90%", "70%", "80%", "45%"]} />
      </div>
      <Skeleton className="h-10 w-40 rounded-control" />
    </div>
  ),
  // History, Pinned, Ideas Board, Engage history.
  list: (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-32 rounded-control" />
      </div>
      <Rows count={6} />
    </div>
  ),
  // Engage voice profiles and AI agents: the list beside the open one.
  "list-detail": (
    <div className="grid w-full gap-6 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-control" />
        ))}
      </div>
      <div className="flex flex-col gap-5 rounded-card border border-border bg-surface-raised p-6">
        <Skeleton className="h-8 w-56 max-w-full" />
        <Lines widths={["90%", "82%", "60%"]} />
        <Skeleton className="h-24 w-full rounded-control" />
        <Lines widths={["75%", "50%"]} />
      </div>
    </div>
  ),
  // Content Hub: toolbar, then the month grid.
  calendar: (
    <div className="mx-auto flex w-full max-w-showcase flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-8 w-52" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-control" />
          <Skeleton className="h-9 w-28 rounded-control" />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-card border border-border bg-border">
        {Array.from({ length: 35 }, (_, i) => (
          <div key={i} className="flex h-20 flex-col gap-2 bg-surface-raised p-2 md:h-24">
            <Skeleton className="h-4 w-5 rounded-full" />
            {i % 5 === 2 && <Skeleton className="h-3 w-4/5 rounded-full" />}
          </div>
        ))}
      </div>
    </div>
  ),
  // Toolkit catalogue and the Engage overview.
  cards: (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-3.5 w-96 max-w-full rounded-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex flex-col gap-4 rounded-card border border-border bg-surface-raised p-5">
            <Skeleton className="size-10 rounded-control-sm" />
            <Lines widths={["70%", "95%", "60%"]} />
          </div>
        ))}
      </div>
    </div>
  ),
  // Thumbnail: toolbar, canvas, side panel.
  canvas: (
    <div className="flex w-full flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-28 rounded-control" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Skeleton className="aspect-video w-full rounded-card" />
        <div className="flex flex-col gap-4 rounded-card border border-border bg-surface-raised p-5">
          <Lines widths={["60%", "90%", "80%"]} />
          <Skeleton className="h-10 w-full rounded-control" />
          <Skeleton className="h-10 w-full rounded-control" />
        </div>
      </div>
    </div>
  ),
  // Settings tabs: the same "Settings" title the pages open with, then the sheet.
  settings: (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <SettingsHeader />
      <Sheet />
    </div>
  ),
  // Engage settings and plan pages (under the Engage header).
  sheet: (
    <div className="flex w-full flex-col gap-8">
      <Sheet />
    </div>
  ),
}
