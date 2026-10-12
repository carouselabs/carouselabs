"use client"

import * as React from "react"
import { ArrowRight, CalendarDays, ChevronDown, Menu } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { EngageReplyDemo, FrameSheet, Slide } from "../shared"
import { hookVariations, ideas, selectedIdeaId, suggestedSlot, tones } from "../story"

const STEPS = [
  { id: "find", title: "Find an angle", line: "10 ideas from your niche and this week's news." },
  { id: "write", title: "Make it sound like you", line: "Captions in your voice, with hooks to choose from." },
  { id: "design", title: "Turn it into visuals", line: "An image or a 7–8 slide carousel." },
  { id: "publish", title: "Publish on your terms", line: "Download, post to LinkedIn, or schedule." },
] as const
type StepId = (typeof STEPS)[number]["id"]

function StageView({ step }: { step: StepId }) {
  if (step === "find") {
    return (
      <ol className="flex flex-col">
        {ideas.slice(2, 7).map((idea, i) => {
          const sel = idea.id === selectedIdeaId
          return (
            <li key={idea.id} className={cn("flex gap-3 border-t border-border py-3 first:border-t-0", sel && "rounded-control border-transparent bg-brand-soft/60 px-3")}>
              <span className="w-6 shrink-0 text-caption text-muted-foreground tabular-nums">{String(i + 3).padStart(2, "0")}</span>
              <span className="flex flex-col gap-0.5">
                <span className="text-caption text-muted-foreground">{idea.postType}</span>
                <span className={cn("text-label", sel && "font-semibold")}>{idea.hook}</span>
              </span>
            </li>
          )
        })}
      </ol>
    )
  }
  if (step === "write") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-1.5">
          {tones.slice(0, 4).map((t) => (
            <span key={t.id} className={cn("rounded-full border px-2.5 py-1 text-caption", t.id === "Candid" ? "border-brand bg-brand-soft text-brand" : "border-border text-muted-foreground")}>
              {t.id}
            </span>
          ))}
        </div>
        <p className="text-title-sm font-semibold text-balance">{hookVariations[0]}</p>
        <div className="flex flex-col gap-2 text-label text-muted-foreground">
          <p>Day one is easy — they&apos;re curious, they click around. Day two is when they decide whether you&apos;re worth coming back to.</p>
          <p className="text-foreground">1. Send one useful email, not five.</p>
          <p className="text-foreground">2. Show the first win before asking for setup.</p>
        </div>
      </div>
    )
  }
  if (step === "design") {
    return (
      <div className="grid grid-cols-3 items-end gap-3">
        <Slide index={1} size="sm" className="translate-y-3 opacity-80" />
        <Slide index={0} size="md" className="shadow-popover" />
        <Slide index={2} size="sm" className="translate-y-3 opacity-80" />
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-5 gap-1.5 text-center text-caption" aria-label="Week of Oct 13 (example)">
        {["Mon 13", "Tue 14", "Wed 15", "Thu 16", "Fri 17"].map((d) => (
          <div key={d} className="flex flex-col gap-1.5">
            <span className="text-muted-foreground">{d}</span>
            <div className="flex h-24 flex-col gap-1 rounded-control-sm border border-border bg-surface p-1">
              {d === "Tue 14" && <span className="rounded-[5px] bg-primary px-1.5 py-1 text-left text-[10px] leading-tight text-primary-foreground">9:00 · Day two decides…</span>}
              {d === "Thu 16" && <span className="rounded-[5px] bg-surface-muted px-1.5 py-1 text-left text-[10px] leading-tight">Recurring slot</span>}
            </div>
          </div>
        ))}
      </div>
      <p className="flex items-center gap-2 text-label">
        <CalendarDays className="size-4 text-muted-foreground" aria-hidden /> Scheduled for {suggestedSlot}
      </p>
    </div>
  )
}

function SiteNav() {
  const [menu, setMenu] = React.useState(false)
  return (
    <nav aria-label="Site" className="flex items-center gap-6 px-5 py-4 @5xl/app:px-10">
      <span className="flex items-center gap-2 text-body font-semibold tracking-[-0.02em]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.png" alt="" className="size-6" />
        CarouseLabs
      </span>
      <div className="hidden items-center gap-1 text-label @5xl/app:flex">
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
            Product <ChevronDown aria-hidden className="opacity-60" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64">
            <DropdownMenuItem>Content studio</DropdownMenuItem>
            <DropdownMenuItem>Engage for LinkedIn</DropdownMenuItem>
            <DropdownMenuItem>Engage for X</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <a href="#pricing-a" className={buttonVariants({ variant: "ghost", size: "sm" })}>Pricing</a>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
            Resources <ChevronDown aria-hidden className="opacity-60" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64">
            <DropdownMenuItem>Tap &amp; Hold maker · Free</DropdownMenuItem>
            <DropdownMenuItem>Verify a certificate</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <a href="#contact-a" className={buttonVariants({ variant: "ghost", size: "sm" })}>Contact</a>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <a href="#" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden @3xl/app:inline-flex")}>Sign in</a>
        <a href="#" className={buttonVariants({ size: "sm" })}>Start for free</a>
        <Button variant="ghost" size="icon-sm" aria-label="Open menu" className="@5xl/app:hidden" onClick={() => setMenu(true)}><Menu /></Button>
      </div>
      <FrameSheet open={menu} onOpenChange={setMenu} title="Menu" side="full">
        <div className="flex flex-col text-body">
          {["Content studio", "Engage for LinkedIn", "Engage for X", "Pricing", "Tap & Hold maker · Free", "Verify a certificate", "Contact", "Sign in"].map((l) => (
            <a key={l} href="#" className="flex h-12 items-center border-b border-border">{l}</a>
          ))}
        </div>
      </FrameSheet>
    </nav>
  )
}

/**
 * Direction A · Landing opening: a confident headline row, then the product
 * itself as a wide, clickable stage. Engage is attached to the stage, where a
 * published post meets its first conversation.
 */
export function LandingA() {
  const [step, setStep] = React.useState<StepId>("design")
  return (
    <div className="flex flex-col">
      <SiteNav />
      <section aria-labelledby="hero-a" className="mx-auto flex w-full max-w-showcase flex-col gap-10 px-5 pt-8 pb-20 @5xl/app:px-10 @5xl/app:pt-16">
        <div className="grid gap-8 @5xl/app:grid-cols-[1.5fr_1fr] @5xl/app:items-end">
          <h1 id="hero-a" className="text-display font-semibold text-balance">
            Your ideas. Your voice. <span className="font-display font-normal italic">Ready to publish.</span>
          </h1>
          <div className="flex flex-col gap-5 @5xl/app:pb-3">
            <p className="text-body-lg text-muted-foreground">
              Create posts, images, and carousels with CarouseLabs. Write LinkedIn and X replies with Engage. Keep both in your own voice.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="#" className={buttonVariants({ size: "lg" })}>
                Start for free <ArrowRight aria-hidden />
              </a>
              <a href="#stage-a" className={buttonVariants({ size: "lg", variant: "outline" })}>See how it works</a>
            </div>
            <p className="text-caption text-muted-foreground">Free plan · no credit card required</p>
          </div>
        </div>

        {/* The stage */}
        <div id="stage-a" className="relative">
          <div className="overflow-hidden rounded-showcase border border-border bg-surface-raised shadow-dialog">
            <div className="flex h-10 items-center gap-2 border-b border-border bg-surface-muted/60 px-4" aria-hidden>
              <span className="size-2.5 rounded-full bg-control-border/50" />
              <span className="size-2.5 rounded-full bg-control-border/50" />
              <span className="size-2.5 rounded-full bg-control-border/50" />
              <span className="ml-3 text-caption text-muted-foreground">CarouseLabs · Example</span>
            </div>
            <div className="grid @3xl/app:grid-cols-[17rem_1fr]">
              <div role="tablist" aria-label="How it works" className="no-scrollbar flex gap-1 overflow-x-auto border-b border-border p-2 @3xl/app:flex-col @3xl/app:border-r @3xl/app:border-b-0 @3xl/app:p-3">
                {STEPS.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    role="tab"
                    aria-selected={step === s.id}
                    aria-controls="stage-a-panel"
                    onClick={() => setStep(s.id)}
                    className="flex shrink-0 gap-3 rounded-control px-3 py-2.5 text-left transition-colors hover:bg-surface-muted aria-selected:bg-surface-muted @3xl/app:py-3"
                  >
                    <span className="text-caption text-muted-foreground tabular-nums">{i + 1}</span>
                    <span className="flex flex-col gap-0.5">
                      <span className="text-label font-medium whitespace-nowrap">{s.title}</span>
                      <span className="hidden text-caption text-muted-foreground @3xl/app:block">{s.line}</span>
                    </span>
                  </button>
                ))}
              </div>
              <div id="stage-a-panel" role="tabpanel" className="min-h-80 p-5 @5xl/app:p-10 @5xl/app:pr-[25rem]">
                <StageView step={step} />
              </div>
            </div>
          </div>

          {/* Engage, attached to the stage */}
          <div className="mt-6 flex flex-col gap-2 rounded-showcase border border-border bg-background p-3 shadow-dialog @5xl/app:absolute @5xl/app:right-8 @5xl/app:-bottom-10 @5xl/app:mt-0 @5xl/app:w-[22rem]">
            <p className="px-1 pt-1 text-label font-medium">Then join the conversation <span className="font-normal text-muted-foreground">· Engage</span></p>
            <EngageReplyDemo />
          </div>
        </div>
      </section>
    </div>
  )
}
