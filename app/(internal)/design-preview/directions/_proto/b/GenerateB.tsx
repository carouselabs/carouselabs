"use client"

import * as React from "react"
import { ArrowLeft, ArrowRight, Bookmark, List, RotateCcw, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useFrame } from "../Frame"
import { FrameSheet } from "../shared"
import { formats, ideaContext, ideas, selectedIdeaId, topic as initialTopic } from "../story"
import { ShellB } from "./ShellB"

const GROUPS = [
  { id: "news", label: "Latest News" },
  { id: "trending", label: "Trending" },
  { id: "industry", label: "Industry" },
  { id: "random", label: "Something different" },
] as const
const catLabel: Record<string, string> = { news: "Latest News", trending: "Trending", industry: "Industry", random: "Something different" }

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="hidden rounded-[4px] border border-border px-1 text-[11px] text-muted-foreground @5xl/app:inline">{children}</kbd>
}

function IdeaIndex({
  current,
  pinned,
  dismissed,
  onPick,
}: {
  current: string
  pinned: Record<string, boolean>
  dismissed: string[]
  onPick: (id: string) => void
}) {
  return (
    <nav aria-label="All ideas" className="flex flex-col gap-5">
      {GROUPS.map((g) => {
        const items = ideas.filter((i) => i.category === g.id)
        return (
          <section key={g.id} aria-label={g.label} className="flex flex-col gap-1">
            <h3 className="px-2 text-caption font-medium text-muted-foreground">
              {g.label} <span className="tabular-nums">· {items.length}</span>
            </h3>
            {items.map((idea) => {
              const gone = dismissed.includes(idea.id)
              return (
                <button
                  key={idea.id}
                  type="button"
                  aria-current={idea.id === current ? "true" : undefined}
                  onClick={() => onPick(idea.id)}
                  className={cn(
                    "flex items-start gap-2 rounded-control-sm px-2 py-2 text-left text-label transition-colors hover:bg-surface-muted aria-[current=true]:bg-surface-muted aria-[current=true]:font-medium",
                    gone && "text-muted-foreground line-through decoration-control-border"
                  )}
                >
                  <span className="line-clamp-2 flex-1">{idea.hook}</span>
                  {pinned[idea.id] && <Bookmark className="mt-0.5 size-3.5 shrink-0 fill-current text-brand" aria-label="Pinned" />}
                </button>
              )
            })}
          </section>
        )
      })}
    </nav>
  )
}

/**
 * Direction B · Generate: one idea at a time, large, with a quick decision
 * (use, pin, skip). The full set stays one glance away in a grouped index
 * (a sheet on mobile). Built for deciding, not scanning.
 */
export function GenerateB() {
  const { go } = useFrame()
  const [topic, setTopic] = React.useState(initialTopic)
  const [pending, setPending] = React.useState(false)
  const [current, setCurrent] = React.useState(selectedIdeaId)
  const [pinned, setPinned] = React.useState<Record<string, boolean>>({})
  const [dismissed, setDismissed] = React.useState<string[]>([])
  const [indexOpen, setIndexOpen] = React.useState(false)

  const order = React.useMemo(() => ideas.map((i) => i.id), [])
  const position = order.indexOf(current)
  const idea = ideas[position]
  const ctx = ideaContext[current]

  const move = React.useCallback(
    (dir: -1 | 1) => setCurrent((id) => order[(order.indexOf(id) + dir + order.length) % order.length]),
    [order]
  )
  const skip = React.useCallback(() => {
    setDismissed((d) => (d.includes(current) ? d : [...d, current]))
    move(1)
  }, [current, move])
  const togglePin = React.useCallback(() => setPinned((p) => ({ ...p, [current]: !p[current] })), [current])

  // Keyboard: ← → move, P pin, X skip, Enter use (ignored while typing).
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.closest("input, textarea, [role=dialog], [role=menu]")) return
      if (e.key === "ArrowRight") move(1)
      else if (e.key === "ArrowLeft") move(-1)
      else if (e.key.toLowerCase() === "p") togglePin()
      else if (e.key.toLowerCase() === "x") skip()
      else if (e.key === "Enter" && t === document.body) go("create")
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [move, togglePin, skip, go])

  return (
    <ShellB active="generate">
      <div className="mx-auto flex w-full max-w-showcase flex-1 flex-col gap-6 px-4 pt-6 pb-10 @3xl/app:pb-28 @5xl/app:px-8 @5xl/app:pt-10">
        {/* The prompt reads as a sentence */}
        <form
          className="flex flex-col gap-3 @3xl/app:flex-row @3xl/app:items-center @3xl/app:justify-between"
          onSubmit={(e) => {
            e.preventDefault()
            setPending(true)
            window.setTimeout(() => setPending(false), 1100)
          }}
        >
          <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-lead">
            <span className="text-muted-foreground">Ideas about</span>
            <label htmlFor="topic-b" className="sr-only">Topic</label>
            <input
              id="topic-b"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="anything in your niche"
              size={Math.max(topic.length, 18)}
              className="max-w-full border-b-2 border-dashed border-control-border bg-transparent font-semibold outline-none focus-visible:border-solid focus-visible:border-brand"
            />
            <span className="text-muted-foreground">for SaaS founders</span>
          </p>
          <Button type="submit" variant="outline" pending={pending} pendingLabel="Generating ideas" className="self-start">
            <RotateCcw aria-hidden /> New set of 10
          </Button>
        </form>

        <div className="grid flex-1 gap-8 @5xl/app:grid-cols-[17rem_minmax(0,1fr)] @5xl/app:gap-14">
          <aside className="hidden @5xl/app:block">
            <IdeaIndex current={current} pinned={pinned} dismissed={dismissed} onPick={setCurrent} />
          </aside>

          {/* Spotlight */}
          <section aria-label="Current idea" aria-live="polite" className={cn("flex flex-col gap-8 transition-opacity", pending && "opacity-40")}>
            <div className="flex items-center justify-between gap-3 text-label text-muted-foreground">
              <span className={cn("font-medium", idea.category === "news" && "text-brand")}>
                {catLabel[idea.category]} · {idea.postType}
              </span>
              <span className="tabular-nums">
                {position + 1} of {ideas.length}
              </span>
            </div>
            <h1 className="text-title font-semibold text-balance @5xl/app:text-section">{idea.hook}</h1>
            <dl className="grid gap-5 text-body @3xl/app:grid-cols-2">
              <div className="flex flex-col gap-1">
                <dt className="text-label text-muted-foreground">Angle</dt>
                <dd>{ctx.angle}</dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-label text-muted-foreground">Why it fits you</dt>
                <dd>{ctx.fit}</dd>
              </div>
            </dl>
            <p className="text-label text-muted-foreground">
              Make it as{" "}
              {formats.map((f, i) => (
                <span key={f.id}>
                  <span className="text-foreground">{f.title}</span> ({f.cost} cr){i < formats.length - 1 ? " · " : ""}
                </span>
              ))}
            </p>

            <div className="flex flex-wrap items-center gap-2 border-t border-border pt-6">
              <Button size="lg" onClick={() => go("create")} className="order-first w-full @3xl/app:w-auto">
                Use this idea <ArrowRight aria-hidden /> <Kbd>Enter</Kbd>
              </Button>
              <Button size="lg" variant="outline" aria-pressed={Boolean(pinned[current])} onClick={togglePin}>
                <Bookmark aria-hidden className={cn(pinned[current] && "fill-current text-brand")} /> {pinned[current] ? "Pinned" : "Pin"} <Kbd>P</Kbd>
              </Button>
              <Button size="lg" variant="ghost" onClick={skip}>
                <XIcon aria-hidden /> Skip <Kbd>X</Kbd>
              </Button>
              <div className="ml-auto flex items-center gap-1">
                <Button variant="ghost" size="icon" aria-label="Previous idea" onClick={() => move(-1)}><ArrowLeft /></Button>
                <Button variant="ghost" size="icon" aria-label="Next idea" onClick={() => move(1)}><ArrowRight /></Button>
              </div>
            </div>

            {/* Progress through the set */}
            <div className="flex items-center gap-3">
              <div className="flex flex-1 gap-1" aria-hidden>
                {order.map((id) => (
                  <span
                    key={id}
                    className={cn(
                      "h-1 flex-1 rounded-full",
                      id === current ? "bg-foreground" : dismissed.includes(id) ? "bg-surface-muted" : pinned[id] ? "bg-brand" : "bg-control-border/40"
                    )}
                  />
                ))}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setIndexOpen(true)} className="@5xl/app:hidden">
                <List aria-hidden /> All ideas
              </Button>
            </div>
            <p className="text-caption text-muted-foreground">Load 10 more from the index when you&apos;ve been through these · 10 of 30</p>
          </section>
        </div>
      </div>

      <FrameSheet open={indexOpen} onOpenChange={setIndexOpen} title="All ideas">
        <IdeaIndex
          current={current}
          pinned={pinned}
          dismissed={dismissed}
          onPick={(id) => {
            setCurrent(id)
            setIndexOpen(false)
          }}
        />
      </FrameSheet>
    </ShellB>
  )
}
