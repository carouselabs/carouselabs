"use client"

import * as React from "react"
import { ArrowRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { EXTENSION_PLAN } from "@/lib/plans"
import { EngageReplyDemo, PostPreview } from "../shared"
import { caption } from "../story"

type Audience = "create" | "reply"

const COPY: Record<Audience, { kicker: string; title: React.ReactNode; body: string; cta: string; note: string }> = {
  create: {
    kicker: "Content studio",
    title: (
      <>
        Your ideas. Your voice. <span className="font-display font-normal italic">Ready to publish.</span>
      </>
    ),
    body: "Find an angle, write it like you, turn it into a carousel, and post or schedule it — in one place.",
    cta: "Start for free",
    note: "Free plan · no credit card required",
  },
  reply: {
    kicker: "Engage for LinkedIn and X",
    title: (
      <>
        Your voice, <span className="font-display font-normal italic">in every reply.</span>
      </>
    ),
    body: "Comments, replies and messages drafted right where the conversation is. You choose what to insert and send.",
    cta: `Add Engage — $${EXTENSION_PLAN.price}/month`,
    note: `${EXTENSION_PLAN.freeGenerations} free generations first · sold separately from the studio`,
  },
}

function AudienceSwitch({ value, onChange, className }: { value: Audience; onChange: (a: Audience) => void; className?: string }) {
  return (
    <div role="group" aria-label="What do you want to do?" className={cn("inline-flex items-center gap-1 rounded-full border border-border bg-surface p-1", className)}>
      <span className="hidden px-2 text-caption text-muted-foreground @5xl/app:inline">I want to</span>
      {([
        ["create", "Create posts"],
        ["reply", "Reply faster"],
      ] as const).map(([v, label]) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className="h-9 flex-1 rounded-full px-4 text-label font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground aria-pressed:bg-foreground aria-pressed:text-background"
        >
          {label}
        </button>
      ))}
    </div>
  )
}

/**
 * Direction B · Landing opening: the visitor picks their job first. The proof
 * is the product inside the feed it's used in — a post made with the studio,
 * then a reply drafted by Engage.
 */
export function LandingB() {
  const [audience, setAudience] = React.useState<Audience>("create")
  const copy = COPY[audience]
  return (
    <div className="flex flex-col">
      <nav aria-label="Site" className="flex items-center gap-4 px-5 py-4 @5xl/app:px-10">
        <span className="flex items-center gap-2 text-body font-semibold tracking-[-0.02em]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.png" alt="" className="size-6" />
          CarouseLabs
        </span>
        <AudienceSwitch value={audience} onChange={setAudience} className="mx-auto hidden @3xl/app:inline-flex" />
        <div className="ml-auto flex items-center gap-2 @3xl/app:ml-0">
          <a href="#" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden @5xl/app:inline-flex")}>Pricing</a>
          <a href="#" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden @3xl/app:inline-flex")}>Sign in</a>
          <a href="#" className={buttonVariants({ size: "sm" })}>Start for free</a>
        </div>
      </nav>
      <div className="px-5 @3xl/app:hidden">
        <AudienceSwitch value={audience} onChange={setAudience} className="flex w-full" />
      </div>

      <section aria-labelledby="hero-b" className="mx-auto grid w-full max-w-showcase gap-12 px-5 pt-10 pb-16 @5xl/app:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] @5xl/app:gap-16 @5xl/app:px-10 @5xl/app:pt-20">
        <div aria-live="polite" className="flex flex-col justify-center gap-6 @5xl/app:justify-start @5xl/app:pt-10">
          <p className="text-label font-medium text-brand">{copy.kicker}</p>
          <h1 id="hero-b" className="text-display font-semibold text-balance">{copy.title}</h1>
          <p className="max-w-[32rem] text-body-lg text-muted-foreground">{copy.body}</p>
          <div className="flex flex-wrap items-center gap-3">
            <a href="#" className={buttonVariants({ size: "lg" })}>
              {copy.cta} <ArrowRight aria-hidden />
            </a>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault()
                setAudience(audience === "create" ? "reply" : "create")
              }}
              className="text-label text-muted-foreground underline decoration-border underline-offset-4 hover:text-foreground hover:decoration-foreground"
            >
              {audience === "create" ? "Or reply faster with Engage →" : "Or create posts with the studio →"}
            </a>
          </div>
          <p className="text-caption text-muted-foreground">{copy.note}</p>
        </div>

        {/* The feed */}
        <div className="relative rounded-showcase bg-surface-muted/70 p-3 @3xl/app:p-6">
          <div className="flex flex-col gap-4">
            <figure className={cn("flex flex-col gap-2 transition-all duration-(--motion-panel) ease-standard", audience === "create" ? "order-1" : "order-2 origin-top scale-[0.97]")}>
              <figcaption className="px-1 text-caption font-medium text-muted-foreground">Made with the CarouseLabs studio · example</figcaption>
              <PostPreview caption={caption} media="carousel" compact={false} />
            </figure>
            <figure className={cn("flex flex-col gap-2 transition-all duration-(--motion-panel) ease-standard", audience === "reply" ? "order-1" : "order-2 origin-top scale-[0.97]")}>
              <figcaption className="px-1 text-caption font-medium text-muted-foreground">Replied with Engage for LinkedIn · example</figcaption>
              <EngageReplyDemo key={audience} autoDraft={audience === "reply"} />
            </figure>
          </div>
        </div>
      </section>

      <section aria-label="How it connects" className="mx-auto w-full max-w-showcase border-t border-border px-5 py-8 @5xl/app:px-10">
        <ol className="flex flex-col gap-3 text-body @3xl/app:flex-row @3xl/app:items-center @3xl/app:gap-6">
          {["An idea from your niche", "A post in your voice", "A conversation that keeps going"].map((s, i) => (
            <li key={s} className="flex items-center gap-3">
              <span className="text-label text-muted-foreground tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              <span className="font-medium">{s}</span>
              {i < 2 && <ArrowRight className="hidden size-4 text-muted-foreground @3xl/app:block" aria-hidden />}
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
