import Link from "next/link"
import { ArrowRight, Calendar, Repeat, ShieldCheck, TrendingUp } from "lucide-react"

import { cn } from "@/lib/utils"

const DIFFERENTIATORS = [
  {
    icon: Calendar,
    text: "Visual calendar with drag-and-drop rescheduling",
  },
  {
    icon: Repeat,
    text: "Recurring slots — set it once, post every week automatically",
  },
  {
    icon: TrendingUp,
    text: "Smart best-time suggestions based on real engagement research",
  },
  {
    icon: ShieldCheck,
    text: "Automatic retries and failure alerts — never lose a scheduled post",
  },
]

// Example week for the visual.
const WEEK = [
  { day: "Mon", posts: [] as { time: string; title: string; kind: "post" | "slot" }[] },
  { day: "Tue", posts: [{ time: "9:00", title: "Day two decides everything", kind: "post" as const }] },
  { day: "Wed", posts: [] },
  { day: "Thu", posts: [{ time: "8:30", title: "Recurring slot", kind: "slot" as const }] },
  { day: "Fri", posts: [{ time: "12:00", title: "Pricing pages that convert", kind: "post" as const }] },
]

function CalendarExample() {
  return (
    <div aria-hidden className="ground-dots relative overflow-hidden rounded-[20px] p-4 sm:p-5">
      <div className="zoom grid grid-cols-5 gap-1.5 rounded-[18px] bg-surface p-2 text-caption shadow-float">
        {WEEK.map((d) => (
          <div key={d.day} className="flex min-w-0 flex-col gap-1.5">
            <span className="px-1 pt-1 text-muted-foreground">{d.day}</span>
            <div className="flex h-[118px] flex-col gap-1 rounded-[12px] bg-background p-1">
              {d.posts.map((p) => (
                <span
                  key={p.title}
                  className={cn(
                    "rounded-[8px] px-1.5 py-1 text-[10px] leading-tight",
                    p.kind === "post" ? "bg-[#0B0920] text-white" : "border border-dashed border-control-border text-muted-foreground"
                  )}
                >
                  <span className="block tabular-nums opacity-70">{p.time}</span>
                  <span className="block [overflow-wrap:anywhere] hyphens-auto">{p.title}</span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <span className="absolute right-3 bottom-3 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium text-[#5C5884]">Example week</span>
    </div>
  )
}

/** A linked card in the More tools section (see app/(marketing)/page.tsx). Copy unchanged. */
export function ContentHubFeature() {
  return (
    <article id="content-hub" aria-labelledby="content-hub-title" className="scroll-mt-24">
      <Link href="/content-hub" className="lift group flex h-full flex-col rounded-[28px] bg-surface p-3 shadow-card ring-1 ring-[#100C33]/5">
        <CalendarExample />

        <div className="flex flex-1 flex-col gap-4 px-4 pt-6 pb-4">
          <p className="inline-flex items-center gap-1.5 self-start rounded-full bg-brand-soft px-3 py-1 text-[13px] font-medium text-brand">
            <Calendar className="size-3.5" strokeWidth={2.2} aria-hidden />
            New — Content Hub
          </p>
          <h3 id="content-hub-title" className="text-2xl leading-[1.15] font-semibold tracking-[-0.03em] text-balance">
            Plan Your Entire Content Calendar — Not Just One Post
          </h3>
          <p className="text-base leading-[1.55] text-ink-2">
            Schedule posts weeks in advance, set up recurring slots, and let CarouseLabs publish automatically — while you focus on
            creating, not remembering to hit publish.
          </p>
          <ul className="flex flex-col gap-3">
            {DIFFERENTIATORS.map((d) => (
              <li key={d.text} className="flex gap-3 text-[15px] leading-[1.5]">
                <d.icon className="mt-0.5 size-4 shrink-0 text-brand" strokeWidth={1.9} aria-hidden />
                <span>{d.text}</span>
              </li>
            ))}
          </ul>
          <span className="mt-auto inline-flex items-center gap-2 pt-2 text-[15px] font-medium text-foreground">
            <span className="link-draw">Try Content Hub</span>
            <ArrowRight className="nudge size-4" aria-hidden />
          </span>
        </div>
      </Link>
    </article>
  )
}
