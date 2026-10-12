"use client"

import * as React from "react"
import { ArrowRight, ArrowUp, Bookmark, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useFrame } from "../Frame"
import { FrameSheet } from "../shared"
import { formats, ideaContext, ideas, selectedIdeaId, topic as initialTopic } from "../story"

const CATS = [
  { id: "all", label: "All" },
  { id: "news", label: "Latest News" },
  { id: "trending", label: "Trending" },
  { id: "industry", label: "Industry" },
  { id: "random", label: "Something different" },
] as const
const catLabel: Record<string, string> = { news: "Latest News", trending: "Trending", industry: "Industry", random: "Something different" }

function IdeaDetail({
  id,
  pinned,
  onPin,
  onDevelop,
  onStep,
}: {
  id: string
  pinned: boolean
  onPin: () => void
  onDevelop: () => void
  onStep?: (dir: -1 | 1) => void
}) {
  const idea = ideas.find((i) => i.id === id)!
  const ctx = ideaContext[id]
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <p className={cn("text-label font-medium", idea.category === "news" ? "text-brand" : "text-muted-foreground")}>
          {catLabel[idea.category]} · {idea.postType}
        </p>
        <h2 className="text-title-sm font-semibold text-balance">{idea.hook}</h2>
      </div>
      <dl className="grid gap-4 border-y border-border py-5 text-label">
        <div className="grid gap-1">
          <dt className="text-muted-foreground">Angle</dt>
          <dd>{ctx.angle}</dd>
        </div>
        <div className="grid gap-1">
          <dt className="text-muted-foreground">Why it fits you</dt>
          <dd>{ctx.fit}</dd>
        </div>
        <div className="grid gap-1">
          <dt className="text-muted-foreground">You can make</dt>
          <dd className="flex flex-wrap gap-x-4 gap-y-1">
            {formats.map((f) => (
              <span key={f.id}>
                {f.title} <span className="text-muted-foreground tabular-nums">· {f.cost} cr</span>
              </span>
            ))}
          </dd>
        </div>
      </dl>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="lg" onClick={onDevelop} className="flex-1 @3xl/app:flex-none">
          Develop this idea <ArrowRight aria-hidden />
        </Button>
        <Button size="lg" variant="outline" aria-pressed={pinned} onClick={onPin}>
          <Bookmark aria-hidden className={cn(pinned && "fill-current text-brand")} />
          {pinned ? "Pinned" : "Pin"}
        </Button>
      </div>
      <p className="text-caption text-muted-foreground">The breakdown is generated when you develop it (uses credits once).</p>
      {onStep && (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => onStep(-1)}>← Previous idea</Button>
          <Button variant="ghost" size="sm" onClick={() => onStep(1)}>Next idea →</Button>
        </div>
      )}
    </div>
  )
}

/**
 * Direction A · Generate: a brief at the top, ideas as a ranked editorial
 * list, and the selected idea in a sticky detail column. Scan first, decide
 * in the detail, continue with one obvious action.
 */
export function GenerateA() {
  const { go, container } = useFrame()
  const [topic, setTopic] = React.useState(initialTopic)
  const [pending, setPending] = React.useState(false)
  const [cat, setCat] = React.useState<(typeof CATS)[number]["id"]>("all")
  const [selected, setSelected] = React.useState(selectedIdeaId)
  const [pinned, setPinned] = React.useState<Record<string, boolean>>({})
  const [dismissed, setDismissed] = React.useState<string[]>([])
  const [sheetOpen, setSheetOpen] = React.useState(false)

  const visible = ideas.filter((i) => !dismissed.includes(i.id) && (cat === "all" || i.category === cat))
  const step = (dir: -1 | 1) => {
    const idx = visible.findIndex((i) => i.id === selected)
    const next = visible[(idx + dir + visible.length) % visible.length]
    if (next) setSelected(next.id)
  }
  const choose = (id: string) => {
    setSelected(id)
    // The detail column only exists at 1024px+; below that it opens as a sheet.
    if ((container?.clientWidth ?? 1440) < 1024) setSheetOpen(true)
  }

  return (
    <div className="mx-auto flex w-full max-w-showcase flex-col gap-6 px-4 py-6 @3xl/app:gap-8 @5xl/app:px-6 @5xl/app:py-10">
      {/* Brief */}
      <form
        className="flex flex-col gap-4 border-b border-border pb-6"
        onSubmit={(e) => {
          e.preventDefault()
          setPending(true)
          window.setTimeout(() => setPending(false), 1100)
        }}
      >
        <label htmlFor="brief-a" className="text-label font-medium text-muted-foreground">
          What do you want to post about?
        </label>
        <div className="flex flex-col gap-3 @3xl/app:flex-row @3xl/app:items-end">
          <input
            id="brief-a"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Leave blank to use your profile"
            className="min-w-0 flex-1 border-b-2 border-control-border bg-transparent pb-2 text-title-sm font-semibold tracking-[-0.02em] outline-none placeholder:font-normal placeholder:text-muted-foreground focus-visible:border-brand @3xl/app:text-title"
          />
          <Button type="submit" size="lg" pending={pending} pendingLabel="Generating ideas">
            Generate 10 ideas <ArrowUp aria-hidden />
          </Button>
        </div>
        <p className="text-caption text-muted-foreground">For SaaS founders · Conversational voice · from your profile</p>
      </form>

      {/* Filter */}
      <div role="group" aria-label="Filter ideas" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 @3xl/app:mx-0 @3xl/app:px-0">
        {CATS.map((c) => {
          const count = c.id === "all" ? ideas.filter((i) => !dismissed.includes(i.id)).length : ideas.filter((i) => i.category === c.id && !dismissed.includes(i.id)).length
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={cat === c.id}
              onClick={() => setCat(c.id)}
              className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full border border-border px-3.5 text-label whitespace-nowrap text-muted-foreground transition-colors hover:border-control-border hover:text-foreground aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background"
            >
              {c.label} <span className="tabular-nums opacity-70">{count}</span>
            </button>
          )
        })}
      </div>

      <div className="grid gap-8 @5xl/app:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] @5xl/app:gap-12">
        {/* Editorial list */}
        <ol aria-label="Ideas" className="flex flex-col">
          {pending
            ? Array.from({ length: 6 }, (_, i) => (
                <li key={i} className="flex gap-4 border-t border-border py-5">
                  <Skeleton className="h-5 w-6" />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-5 w-full" />
                  </div>
                </li>
              ))
            : visible.map((idea) => {
                const number = ideas.findIndex((i) => i.id === idea.id) + 1
                const isSelected = idea.id === selected
                return (
                  <li
                    key={idea.id}
                    className={cn(
                      "group/row relative flex items-start gap-4 border-t border-border py-4 transition-colors @3xl/app:py-5",
                      isSelected && "@5xl/app:bg-surface @5xl/app:before:absolute @5xl/app:before:inset-y-0 @5xl/app:before:-left-4 @5xl/app:before:w-0.5 @5xl/app:before:bg-brand"
                    )}
                  >
                    <span className="w-7 shrink-0 pt-0.5 text-label text-muted-foreground tabular-nums">{String(number).padStart(2, "0")}</span>
                    <button
                      type="button"
                      aria-current={isSelected ? "true" : undefined}
                      onClick={() => choose(idea.id)}
                      className="flex min-w-0 flex-1 flex-col gap-1 text-left after:absolute after:inset-0 after:content-['']"
                    >
                      <span className={cn("text-caption font-medium", idea.category === "news" ? "text-brand" : "text-muted-foreground")}>
                        {catLabel[idea.category]} · {idea.postType}
                      </span>
                      <span className={cn("text-body font-medium text-pretty @3xl/app:text-body-lg", isSelected && "@5xl/app:text-foreground")}>
                        {idea.hook}
                      </span>
                    </button>
                    <div className="relative z-10 flex shrink-0 items-center">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={pinned[idea.id] ? "Unpin idea" : "Pin idea"}
                        aria-pressed={Boolean(pinned[idea.id])}
                        onClick={() => setPinned((p) => ({ ...p, [idea.id]: !p[idea.id] }))}
                        className={cn(pinned[idea.id] && "text-brand")}
                      >
                        <Bookmark className={cn(pinned[idea.id] && "fill-current")} />
                      </Button>
                      <Button variant="ghost" size="icon-sm" aria-label="Dismiss idea" onClick={() => setDismissed((d) => [...d, idea.id])}>
                        <XIcon />
                      </Button>
                    </div>
                  </li>
                )
              })}
          <li className="flex flex-col items-start gap-1 border-t border-border pt-5">
            <Button variant="outline">Load 10 more ideas</Button>
            <span className="text-caption text-muted-foreground tabular-nums">10 of 30 · already-shown hooks won&apos;t repeat</span>
          </li>
        </ol>

        {/* Detail (desktop) */}
        <aside aria-label="Selected idea" className="hidden @5xl/app:block">
          <div className="sticky top-32 rounded-card border border-border bg-surface p-6 shadow-card">
            {visible.some((i) => i.id === selected) ? (
              <IdeaDetail
                id={selected}
                pinned={Boolean(pinned[selected])}
                onPin={() => setPinned((p) => ({ ...p, [selected]: !p[selected] }))}
                onDevelop={() => go("create")}
                onStep={step}
              />
            ) : (
              <p className="text-label text-muted-foreground">Pick an idea from the list to see its angle and what you can make.</p>
            )}
          </div>
        </aside>
      </div>

      {/* Detail (mobile) */}
      <FrameSheet open={sheetOpen} onOpenChange={setSheetOpen} title="Selected idea">
        <IdeaDetail
          id={selected}
          pinned={Boolean(pinned[selected])}
          onPin={() => setPinned((p) => ({ ...p, [selected]: !p[selected] }))}
          onDevelop={() => {
            setSheetOpen(false)
            go("create")
          }}
        />
      </FrameSheet>
    </div>
  )
}
