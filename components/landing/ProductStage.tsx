"use client"

import * as React from "react"
import { CalendarDays, Download, Send } from "lucide-react"

import { cn } from "@/lib/utils"
import { demoCaption, demoHook, demoIdeas, demoPrompt, demoSlides, demoTones, demoWeek } from "./demoContent"

export type StageStep = { id: "ideas" | "caption" | "visuals" | "publish"; title: string; description: string }

function SlideCard({ index, size }: { index: number; size: "sm" | "md" }) {
  const slide = demoSlides[index]
  const cover = index === 0
  return (
    <div
      className={cn(
        "flex aspect-[4/5] flex-col justify-between overflow-hidden rounded-control border",
        cover ? "border-transparent bg-primary text-primary-foreground shadow-popover" : "border-border bg-surface-raised text-foreground",
        size === "md" ? "gap-3 p-4 sm:p-5" : "gap-2 p-3"
      )}
    >
      <div className="flex justify-between text-caption opacity-70">
        <span className="truncate">{slide.kicker}</span>
        <span className="tabular-nums">{index + 1}/8</span>
      </div>
      <p className={cn("font-display leading-[1.05] text-balance", size === "md" ? "text-title-sm" : "text-body-lg")}>{slide.title}</p>
      <span className="text-caption opacity-70">Example</span>
    </div>
  )
}

function Visual({ id }: { id: StageStep["id"] }) {
  if (id === "ideas") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3 rounded-control border border-control-border/60 bg-surface px-4 py-3">
          <span className="truncate text-label text-muted-foreground">{demoPrompt}</span>
          <span className="shrink-0 rounded-control-sm bg-primary px-3 py-1.5 text-caption font-medium text-primary-foreground">Generate</span>
        </div>
        <ol className="flex flex-col">
          {demoIdeas.map((idea, i) => (
            <li
              key={idea.hook}
              className={cn(
                "flex gap-3 border-t border-border px-2 py-3 first:border-t-0",
                idea.selected && "rounded-control border-transparent bg-brand-soft/70 px-3"
              )}
            >
              <span className="w-5 shrink-0 text-caption text-muted-foreground tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              <span className="flex flex-col gap-0.5">
                <span className="text-caption text-muted-foreground">{idea.kicker}</span>
                <span className={cn("text-label", idea.selected && "font-semibold")}>{idea.hook}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    )
  }
  if (id === "caption") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-1.5">
          {demoTones.map((tone) => (
            <span
              key={tone}
              className={cn(
                "rounded-full border px-2.5 py-1 text-caption",
                tone === "Candid" ? "border-brand bg-brand-soft text-brand" : "border-border text-muted-foreground"
              )}
            >
              {tone}
            </span>
          ))}
        </div>
        <p className="text-title-sm font-semibold text-balance">{demoHook}</p>
        <div className="flex flex-col gap-2 text-label">
          <p className="text-muted-foreground">{demoCaption[0]}</p>
          {demoCaption.slice(1).map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </div>
    )
  }
  if (id === "visuals") {
    return (
      <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[1fr_1.35fr_1fr]">
        <div className="hidden translate-y-4 opacity-90 sm:block"><SlideCard index={1} size="sm" /></div>
        <div className="mx-auto w-full max-w-[15rem] sm:max-w-none"><SlideCard index={0} size="md" /></div>
        <div className="hidden translate-y-4 opacity-90 sm:block"><SlideCard index={2} size="sm" /></div>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-control-sm border border-border bg-surface px-3 py-2 text-label"><Download className="size-4" /> Download PDF</span>
        <span className="inline-flex items-center gap-1.5 rounded-control-sm border border-border bg-surface px-3 py-2 text-label"><CalendarDays className="size-4" /> Schedule</span>
        <span className="inline-flex items-center gap-1.5 rounded-control-sm bg-primary px-3 py-2 text-label text-primary-foreground"><Send className="size-4" /> Post to LinkedIn</span>
      </div>
      <div className="grid grid-cols-5 gap-1.5 text-center text-caption">
        {demoWeek.map((day) => (
          <div key={day} className="flex min-w-0 flex-col gap-1.5">
            <span className="text-muted-foreground">{day}</span>
            <div className="flex h-24 flex-col gap-1 rounded-control-sm border border-border bg-surface p-1">
              {day === "Tue 14" && (
                <span className="truncate rounded-[5px] bg-primary px-1.5 py-1 text-left text-[10px] leading-tight text-primary-foreground">9:00 · Day two…</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * The home page's product demo: one window, four steps, clickable. Visuals
 * are illustrations built from example content (labeled), never live data.
 */
export function ProductStage({ eyebrow, title, steps }: { eyebrow: string; title: string; steps: StageStep[] }) {
  const [active, setActive] = React.useState<StageStep["id"]>("visuals")
  const tabs = React.useRef<(HTMLButtonElement | null)[]>([])
  const list = React.useRef<HTMLDivElement>(null)
  const index = steps.findIndex((s) => s.id === active)
  const step = steps[index]

  // On phones the steps are a sideways-scrolling row: keep the selected one in
  // view without moving the page (scrollIntoView could scroll vertically).
  React.useEffect(() => {
    const row = list.current
    const tab = tabs.current[index]
    if (!row || !tab || row.scrollWidth <= row.clientWidth) return
    row.scrollTo({ left: Math.max(0, tab.offsetLeft - 16), behavior: "smooth" })
  }, [index])

  const onKeyDown = (event: React.KeyboardEvent) => {
    const keys: Record<string, number> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }
    let next = index
    if (event.key in keys) next = (index + keys[event.key] + steps.length) % steps.length
    else if (event.key === "Home") next = 0
    else if (event.key === "End") next = steps.length - 1
    else return
    event.preventDefault()
    setActive(steps[next].id)
    tabs.current[next]?.focus()
  }

  return (
    <div className="overflow-hidden rounded-showcase border border-border bg-surface-raised shadow-dialog">
      <div className="flex h-10 items-center gap-2 border-b border-border bg-surface-muted/60 px-4" aria-hidden>
        <span className="size-2.5 rounded-full bg-control-border/50" />
        <span className="size-2.5 rounded-full bg-control-border/50" />
        <span className="size-2.5 rounded-full bg-control-border/50" />
        <span className="ml-auto text-caption text-muted-foreground">Example</span>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[20rem_minmax(0,1fr)]">
        <div className="flex flex-col gap-4 border-b border-border p-4 lg:border-r lg:border-b-0 lg:p-6">
          <div className="hidden flex-col gap-1 lg:flex">
            <p className="text-label font-medium text-brand">{eyebrow}</p>
            <h2 className="text-title-sm font-semibold text-balance">{title}</h2>
          </div>
          <div ref={list} role="tablist" aria-label={title} onKeyDown={onKeyDown} className="no-scrollbar relative -mx-1 flex gap-1 overflow-x-auto px-1 lg:flex-col lg:overflow-visible">
            {steps.map((s, i) => (
              <button
                key={s.id}
                ref={(el) => {
                  tabs.current[i] = el
                }}
                type="button"
                role="tab"
                id={`stage-tab-${s.id}`}
                aria-selected={s.id === active}
                aria-controls="stage-panel"
                tabIndex={s.id === active ? 0 : -1}
                onClick={() => setActive(s.id)}
                className="flex shrink-0 gap-3 rounded-control px-3 py-2.5 text-left transition-colors duration-(--motion-fast) hover:bg-surface-muted aria-selected:bg-surface-muted lg:py-3"
              >
                <span className="pt-px text-caption text-muted-foreground tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                <span className="flex flex-col gap-1">
                  <span className="text-label font-semibold whitespace-nowrap lg:whitespace-normal">{s.title}</span>
                  <span className="hidden text-caption text-muted-foreground lg:block">{s.description}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
        <div id="stage-panel" role="tabpanel" aria-labelledby={`stage-tab-${active}`} className="flex flex-col gap-5 p-5 sm:p-8 lg:min-h-[26rem] lg:justify-center lg:p-12">
          <p className="text-label text-muted-foreground lg:hidden">{step.description}</p>
          <div key={active} aria-hidden className="mx-auto w-full max-w-[34rem] animate-in fade-in-0 duration-200">
            <Visual id={active} />
          </div>
        </div>
      </div>
    </div>
  )
}
