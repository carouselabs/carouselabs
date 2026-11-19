import type { ReactNode } from "react"

import { cn } from "@/lib/utils"
import { PlatformLogo } from "@/components/brand/PlatformLogo"
import { demoCaption, demoHook, demoIdeas, demoSlides, demoTones } from "@/components/landing/demoContent"

// "Export & Publish" lives in the product demo above, so it isn't repeated
// here. All copy is unchanged; each feature now carries a picture of itself,
// in anantgoyal.in's capability cards.

function IdeasArt() {
  return (
    <div className="absolute inset-x-6 top-6 flex flex-col gap-2">
      {demoIdeas.slice(0, 3).map((idea, i) => (
        <div
          key={idea.hook}
          className={cn(
            "flex items-start gap-3 rounded-[16px] bg-white px-4 py-3 shadow-float ring-1 ring-[#100C33]/5",
            i === 1 ? "translate-x-3 ring-[#4B30EE]/30" : "opacity-90",
            i === 2 && "max-sm:hidden"
          )}
        >
          <span className="font-display text-lg leading-none text-[#4B30EE] italic">{String(i + 1).padStart(2, "0")}</span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[11px] text-[#5C5884]">{idea.kicker}</span>
            <span className={cn("line-clamp-2 text-[13px] text-[#100C33] sm:line-clamp-1", i === 1 && "font-semibold")}>{idea.hook}</span>
          </span>
        </div>
      ))}
    </div>
  )
}

function GhostwritingArt() {
  return (
    <div className="absolute inset-x-6 top-6 rounded-[18px] bg-white p-4 shadow-float ring-1 ring-[#100C33]/5">
      <div className="flex flex-wrap gap-1">
        {demoTones.slice(0, 4).map((tone) => (
          <span
            key={tone}
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-medium",
              tone === "Candid" ? "bg-[#EFEAFF] text-[#4B30EE]" : "text-[#5C5884] ring-1 ring-[#E5E2F4]"
            )}
          >
            {tone}
          </span>
        ))}
      </div>
      <p className="mt-3 text-[15px] leading-[1.3] font-semibold tracking-[-0.01em] text-[#100C33]">{demoHook}</p>
      <p className="mt-2 text-[12.5px] leading-[1.5] text-[#5C5884]">
        {demoCaption[0]}
        <span className="ml-0.5 inline-block h-3.5 w-px translate-y-0.5 bg-[#4B30EE]" />
      </p>
    </div>
  )
}

const BREAKDOWN = ["Objective", "Emotion", "Talking points", "Storytelling angle", "CTA"]

function BreakdownArt() {
  return (
    <div className="absolute inset-x-6 top-6 rounded-[18px] bg-white p-4 shadow-float ring-1 ring-[#100C33]/5">
      <ul className="flex flex-col gap-2.5">
        {BREAKDOWN.map((row, i) => (
          <li key={row} className="flex items-center gap-3">
            <span className="w-[7.5rem] shrink-0 text-[12px] font-medium text-[#100C33]">{row}</span>
            <span className="h-1.5 rounded-full bg-[#E9E5FB]" style={{ width: `${[78, 54, 92, 66, 40][i]}%` }} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function CarouselArt() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {[1, 0, 2].map((index, i) => {
        const slide = demoSlides[index]
        const cover = index === 0
        return (
          <div
            key={index}
            className={cn(
              "flex aspect-[4/5] w-[34%] max-w-[132px] flex-col justify-between rounded-[14px] p-3",
              cover
                ? "z-10 -mx-2 w-[40%] max-w-[150px] bg-[#0B0920] text-white shadow-[0_24px_40px_-18px_rgb(10_0_60/0.8)]"
                : "bg-white text-[#100C33] shadow-float ring-1 ring-[#100C33]/5",
              i !== 1 && "translate-y-3"
            )}
          >
            <span className={cn("text-[10px]", cover ? "text-white/65" : "text-[#5C5884]")}>{slide.kicker}</span>
            <span className={cn("font-display leading-[1.02]", cover ? "text-[19px]" : "text-[14px]")}>{slide.title}</span>
          </div>
        )
      })}
    </div>
  )
}

// One post, adapted for each platform: pulses run from CarouseLabs out to
// the six platforms the create flow offers (the platforms' real marks).
const HUB = [
  { p: "linkedin", x: 46, y: 42 },
  { p: "instagram", x: 150, y: 24 },
  { p: "x", x: 254, y: 42 },
  { p: "facebook", x: 46, y: 178 },
  { p: "threads", x: 150, y: 196 },
  { p: "pinterest", x: 254, y: 178 },
] as const

function PlatformsArt() {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <div className="relative h-[220px] w-[300px]">
        <svg viewBox="0 0 300 220" className="absolute inset-0 size-full" aria-hidden>
          {HUB.map((h) => (
            <line key={h.p} x1="150" y1="110" x2={h.x} y2={h.y} stroke="#BDB3F2" strokeWidth="1.5" strokeDasharray="3 5" />
          ))}
        </svg>
        {HUB.map((h, i) => (
          <span
            key={`pulse-${h.p}`}
            className="pulse-run absolute top-0 left-0 size-2 rounded-full bg-[#4B30EE] shadow-[0_0_0_4px_rgb(75_48_238/0.15)]"
            style={{ offsetPath: `path("M150 110 L${h.x} ${h.y}")`, ["--delay" as string]: `${i * 0.45}s`, ["--dur" as string]: "2.8s" }}
          />
        ))}
        {HUB.map((h) => (
          <span
            key={h.p}
            className="absolute grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[14px] bg-white shadow-float ring-1 ring-[#100C33]/5"
            style={{ left: h.x, top: h.y }}
          >
            <PlatformLogo platform={h.p} size={20} />
          </span>
        ))}
        <span className="absolute top-1/2 left-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[20px] bg-white shadow-float ring-1 ring-[#4B30EE]/20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.png" alt="" className="size-9" />
        </span>
      </div>
    </div>
  )
}

const FEATURES: { title: string; description: string; art: () => ReactNode; stage: string; span: string }[] = [
  {
    title: "AI Idea Engine",
    description: "Get 10 post ideas every session, grounded in trending news and shaped by your niche and goals.",
    art: IdeasArt,
    stage: "bg-[linear-gradient(150deg,#E9ECFF,#F3E9FF)]",
    span: "md:col-span-2 lg:col-span-7",
  },
  {
    title: "AI Ghostwriting",
    description: "Full-length captions written in your voice, with a tone selector and multiple hook variations.",
    art: GhostwritingArt,
    stage: "bg-[linear-gradient(150deg,#F3E9FF,#FBEFFF)]",
    span: "lg:col-span-5",
  },
  {
    title: "Deep Dive Breakdowns",
    description: "Structured breakdowns — objective, emotion, talking points, storytelling angle, and CTA — for every post.",
    art: BreakdownArt,
    stage: "bg-[linear-gradient(150deg,#EEF0F6,#E4E9FF)]",
    span: "lg:col-span-4",
  },
  {
    title: "AI Carousels",
    description: "Multi-slide carousel decks with AI-generated visuals, sized perfectly for each platform.",
    art: CarouselArt,
    stage: "bg-[linear-gradient(150deg,#E7F6EF,#E9ECFF)]",
    span: "lg:col-span-4",
  },
  {
    title: "Built for Every Platform",
    description: "Create and adapt content for LinkedIn, Instagram, and Twitter/X from a single workflow.",
    art: PlatformsArt,
    stage: "ground-dots",
    span: "md:col-span-2 lg:col-span-4",
  },
]

export function FeaturesGrid() {
  return (
    <section id="features" aria-labelledby="features-title" className="scroll-mt-24 font-ui">
      <div className="wrap-site flex flex-col gap-12 py-24 lg:py-[120px]">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="flex flex-col gap-4 lg:col-span-7">
            <p className="text-[13px] font-medium text-brand">Features</p>
            <h2 id="features-title" className="text-[clamp(2rem,1.1rem+2.5vw,3.25rem)] leading-[1] font-semibold tracking-[-0.04em] text-balance">
              Everything you need to <span className="serif-accent gradient-word pr-[0.04em] text-[1.08em]">own social media</span>
            </h2>
          </div>
          <p className="text-lg leading-[1.6] text-ink-2 lg:col-span-5">
            From idea to published post on LinkedIn, Instagram, and Twitter/X — CarouseLabs handles every step of your content workflow.
          </p>
        </div>

        <ul className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-12">
          {FEATURES.map((f) => {
            const Art = f.art
            return (
              <li key={f.title} className={cn("flex flex-col rounded-[28px] bg-surface p-3 shadow-card ring-1 ring-[#100C33]/5", f.span)}>
                <div aria-hidden className={cn("relative h-[240px] overflow-hidden rounded-[20px]", f.stage)}>
                  <Art />
                </div>
                <div className="flex flex-col gap-2 px-4 pt-6 pb-4">
                  <h3 className="text-2xl font-semibold tracking-[-0.03em]">{f.title}</h3>
                  <p className="text-base leading-[1.55] text-ink-2">{f.description}</p>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
