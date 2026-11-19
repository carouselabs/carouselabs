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
        "flex aspect-[4/5] flex-col justify-between overflow-hidden rounded-[16px]",
        cover ? "bg-[#0B0920] text-white shadow-[0_30px_60px_-24px_rgb(10_0_60/0.8)]" : "border border-border bg-surface text-foreground shadow-float",
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

/** The white card each step's picture sits in, floating on the dotted stage. */
function Sheet({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-[22px] bg-surface p-5 shadow-float ring-1 ring-[#100C33]/5 sm:p-6", className)}>{children}</div>
}

function Visual({ id }: { id: StageStep["id"] }) {
  if (id === "ideas") {
    return (
      <Sheet className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3 rounded-full border border-border bg-background py-1.5 pr-1.5 pl-4">
          <span className="truncate text-label text-muted-foreground">{demoPrompt}</span>
          <span className="shrink-0 rounded-full bg-primary px-3.5 py-1.5 text-caption font-medium text-primary-foreground">Generate</span>
        </div>
        <ol className="flex flex-col">
          {demoIdeas.map((idea, i) => (
            <li
              key={idea.hook}
              className={cn(
                "flex gap-3 border-t border-border px-2 py-3 first:border-t-0",
                idea.selected && "rounded-[14px] border-transparent bg-brand-soft px-3"
              )}
            >
              <span className="w-5 shrink-0 font-display text-body text-brand italic">{String(i + 1).padStart(2, "0")}</span>
              <span className="flex flex-col gap-0.5">
                <span className="text-caption text-muted-foreground">{idea.kicker}</span>
                <span className={cn("text-label", idea.selected && "font-semibold")}>{idea.hook}</span>
              </span>
            </li>
          ))}
        </ol>
      </Sheet>
    )
  }
  if (id === "caption") {
    return (
      <Sheet className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-1.5">
          {demoTones.map((tone) => (
            <span
              key={tone}
              className={cn(
                "rounded-full px-2.5 py-1 text-caption font-medium",
                tone === "Candid" ? "bg-brand-soft text-brand" : "text-muted-foreground ring-1 ring-border"
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
      </Sheet>
    )
  }
  if (id === "visuals") {
    return (
      <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[1fr_1.35fr_1fr]">
        <div className="hidden translate-y-4 sm:block"><SlideCard index={1} size="sm" /></div>
        <div className="mx-auto w-full max-w-[15rem] sm:max-w-none"><SlideCard index={0} size="md" /></div>
        <div className="hidden translate-y-4 sm:block"><SlideCard index={2} size="sm" /></div>
      </div>
    )
  }
  return (
    <Sheet className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-2 text-label"><Download className="size-4" /> Download PDF</span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-2 text-label"><CalendarDays className="size-4" /> Schedule</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-label text-primary-foreground"><Send className="size-4" /> Post to LinkedIn</span>
      </div>
      <div className="grid grid-cols-5 gap-1.5 text-center text-caption">
        {demoWeek.map((day) => (
          <div key={day} className="flex min-w-0 flex-col gap-1.5">
            <span className="text-muted-foreground">{day}</span>
            <div className="flex h-24 flex-col gap-1 rounded-[12px] bg-background p-1">
              {day === "Tue 14" && (
                <span className="truncate rounded-[8px] bg-[#0B0920] px-1.5 py-1 text-left text-[10px] leading-tight text-white">9:00 · Day two…</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </Sheet>
  )
}

/**
 * The home page's product demo: one app window, four steps, clickable. The
 * window is anantgoyal.in's (traffic lights, the address in a pill); each
 * step's picture floats on the dotted lavender stage. Visuals are built from
 * example content (labelled), never live data.
 */
export function ProductStage({ label, steps }: { label: string; steps: StageStep[] }) {
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
    <div className="overflow-hidden rounded-[28px] bg-surface shadow-float ring-1 ring-[#100C33]/5">
      <div className="relative flex h-12 items-center gap-2 border-b border-border px-5" aria-hidden>
        <span className="size-3 rounded-full bg-[#FF5F57]" />
        <span className="size-3 rounded-full bg-[#FEBC2E]" />
        <span className="size-3 rounded-full bg-[#28C840]" />
        <span className="absolute left-1/2 hidden -translate-x-1/2 rounded-full bg-background px-4 py-1 text-caption text-muted-foreground sm:block">
          app.carouselabs.com
        </span>
        <span className="ml-auto text-caption text-muted-foreground">Example</span>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="flex flex-col gap-4 border-b border-border p-3 lg:border-r lg:border-b-0 lg:p-5">
          <div ref={list} role="tablist" aria-label={label} onKeyDown={onKeyDown} className="relative grid grid-cols-2 gap-1 lg:flex lg:flex-col">
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
                className="flex min-w-0 gap-2.5 rounded-[18px] px-3 py-3 text-left lg:gap-3 lg:px-3.5 transition-colors duration-(--motion-fast) hover:bg-background aria-selected:bg-background aria-selected:ring-1 aria-selected:ring-border lg:py-4"
              >
                <span className="font-display text-[22px] leading-none text-brand italic">{String(i + 1).padStart(2, "0")}</span>
                <span className="flex flex-col gap-1">
                  <span className="text-label font-semibold lg:text-body">{s.title}</span>
                  <span className="hidden text-label text-muted-foreground lg:block">{s.description}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
        <div id="stage-panel" role="tabpanel" aria-labelledby={`stage-tab-${active}`} className="ground-dots flex flex-col gap-5 p-5 sm:p-8 lg:min-h-[30rem] lg:justify-center lg:p-12">
          <p className="text-label text-muted-foreground lg:hidden">{step.description}</p>
          <div key={active} aria-hidden className="mx-auto w-full max-w-[34rem] animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
            <Visual id={active} />
          </div>
        </div>
      </div>
    </div>
  )
}
