import Link from "next/link"
import { ArrowRight, Calendar, Repeat, TrendingUp, ShieldCheck } from "lucide-react"

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

// Example week for the visual (replaces the old "coming soon" placeholder).
const WEEK = [
  { day: "Mon", posts: [] as { time: string; title: string; kind: "post" | "slot" }[] },
  { day: "Tue", posts: [{ time: "9:00", title: "Day two decides everything", kind: "post" as const }] },
  { day: "Wed", posts: [] },
  { day: "Thu", posts: [{ time: "8:30", title: "Recurring slot", kind: "slot" as const }] },
  { day: "Fri", posts: [{ time: "12:00", title: "Pricing pages that convert", kind: "post" as const }] },
]

function CalendarExample() {
  return (
    <figure aria-label="Example week in Content Hub" className="flex flex-col gap-2">
      <div aria-hidden className="grid grid-cols-5 gap-1.5 rounded-control border border-border bg-surface-raised p-2 text-caption">
        {WEEK.map((d) => (
          <div key={d.day} className="flex min-w-0 flex-col gap-1.5">
            <span className="px-1 text-muted-foreground">{d.day}</span>
            <div className="flex h-28 flex-col gap-1 rounded-control-sm bg-surface-muted/60 p-1">
              {d.posts.map((p) => (
                <span
                  key={p.title}
                  className={cn(
                    "rounded-[6px] px-1.5 py-1 text-[10px] leading-tight",
                    p.kind === "post" ? "bg-primary text-primary-foreground" : "border border-dashed border-control-border text-muted-foreground"
                  )}
                >
                  <span className="block tabular-nums opacity-70">{p.time}</span>
                  <span className="line-clamp-2">{p.title}</span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <figcaption className="text-caption text-muted-foreground">Example week</figcaption>
    </figure>
  )
}

/** Panel in the tools section (see app/(marketing)/page.tsx). Copy unchanged. */
export function ContentHubFeature() {
  return (
    <article id="content-hub" aria-labelledby="content-hub-title" className="flex scroll-mt-20 flex-col gap-6 rounded-showcase border border-border bg-surface p-5 sm:p-8">
      <CalendarExample />

      <div className="flex flex-col gap-3">
        <p className="inline-flex items-center gap-1.5 text-label font-medium text-brand">
          <Calendar className="size-3.5" strokeWidth={2.2} aria-hidden />
          New — Content Hub
        </p>
        <h2 id="content-hub-title" className="text-title-sm font-semibold text-balance sm:text-title">
          Plan Your Entire Content Calendar — Not Just One Post
        </h2>
        <p className="text-body text-muted-foreground">
          Schedule posts weeks in advance, set up recurring slots, and let CarouseLabs publish automatically — while you focus on
          creating, not remembering to hit publish.
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        {DIFFERENTIATORS.map((d) => (
          <li key={d.text} className="flex gap-3 text-label">
            <d.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" strokeWidth={1.8} aria-hidden />
            <span>{d.text}</span>
          </li>
        ))}
      </ul>

      <Link href="/content-hub" className="mt-auto inline-flex items-center gap-1.5 self-start text-label font-semibold text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground">
        Try Content Hub
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </article>
  )
}
