"use client"

import * as React from "react"
import { ArrowLeft, ChevronDown, Download, ImagePlus, Lock, RotateCcw, Send, CalendarClock } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover"
import { StepProgress } from "@/components/patterns/StepProgress"
import { CREDIT_COSTS } from "@/lib/creditActions"
import { useFrame } from "../Frame"
import { FrameSheet, PostPreview, useExampleAction } from "../shared"
import { caption as initialCaption, flowSteps, hookVariations, ratios, slides, suggestedSlot, tones, type RatioId } from "../story"
import { ShellB } from "./ShellB"

type Stage = "write" | "preview" | "finish"

function Chip({ label, value, children, locked = false }: { label: string; value: string; children?: React.ReactNode; locked?: boolean }) {
  const content = (
    <>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
      {locked ? <Lock className="size-3 text-muted-foreground" aria-hidden /> : <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />}
    </>
  )
  const cls = "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-label transition-colors hover:border-control-border"
  if (locked) {
    return (
      <span className={cn(cls, "hover:border-border")} title="Format is fixed for this session">
        {content}
      </span>
    )
  }
  return (
    <Popover>
      <PopoverTrigger render={<button type="button" className={cls} />}>{content}</PopoverTrigger>
      <PopoverContent align="start" className="w-72">
        <PopoverTitle>{label}</PopoverTitle>
        <div className="mt-3">{children}</div>
      </PopoverContent>
    </Popover>
  )
}

function Inspector({
  tone,
  setTone,
  ratio,
  setRatio,
  reference,
  setReference,
}: {
  tone: string
  setTone: (t: string) => void
  ratio: RatioId
  setRatio: (r: RatioId) => void
  reference: boolean
  setReference: (r: boolean) => void
}) {
  const act = useExampleAction()
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 @3xl/app:mx-0 @3xl/app:flex-wrap @3xl/app:px-0" aria-label="Post settings">
      <Chip label="Format" value="Caption + Slides" locked />
      <Chip label="Tone" value={tone}>
        <div role="radiogroup" aria-label="Tone" className="flex flex-col gap-1">
          {tones.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={tone === t.id}
              onClick={() => setTone(t.id)}
              className="flex flex-col rounded-control-sm px-2 py-1.5 text-left hover:bg-surface-muted aria-checked:bg-brand-soft/60"
            >
              <span className="text-label font-medium">{t.id}</span>
              <span className="text-caption text-muted-foreground">{t.hint}</span>
            </button>
          ))}
        </div>
        <Button variant="ghost" size="sm" className="mt-2" onClick={() => act(`Caption regenerated in a ${tone} tone`)}>
          <RotateCcw aria-hidden /> Apply · {CREDIT_COSTS.text_regen} credit
        </Button>
      </Chip>
      <Chip label="Ratio" value={ratio}>
        <div role="radiogroup" aria-label="Ratio" className="grid grid-cols-2 gap-2">
          {ratios.map((r) => (
            <button
              key={r.id}
              type="button"
              role="radio"
              aria-checked={ratio === r.id}
              onClick={() => setRatio(r.id)}
              className="flex flex-col items-center gap-1.5 rounded-control border border-border p-3 hover:border-control-border aria-checked:border-brand aria-checked:bg-brand-soft/50"
            >
              <span aria-hidden className={cn("w-7 rounded-[3px] border border-control-border bg-surface-muted", r.id === "4:5" ? "aspect-[4/5]" : "aspect-square")} />
              <span className="text-label font-medium">{r.label}</span>
              <span className="text-caption text-muted-foreground">{r.hint}</span>
            </button>
          ))}
        </div>
      </Chip>
      <Chip label="Style" value={reference ? "reference.png" : "Default"}>
        {reference ? (
          <Button variant="outline" size="sm" onClick={() => setReference(false)}>Remove reference</Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setReference(true)}>
            <ImagePlus aria-hidden /> Upload a reference image
          </Button>
        )}
        <p className="mt-2 text-caption text-muted-foreground">Optional. Matches the look of an image you like.</p>
      </Chip>
    </div>
  )
}

function FinishOptions({ onPosted }: { onPosted?: () => void }) {
  const act = useExampleAction()
  const [confirm, setConfirm] = React.useState(false)
  return (
    <div className="flex flex-col divide-y divide-border">
      <section className="flex flex-col gap-3 pb-5" aria-labelledby="fin-dl">
        <h3 id="fin-dl" className="flex items-center gap-2 text-body font-semibold"><Download className="size-4" aria-hidden /> Download</h3>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => act("Slides downloaded as PNG")}>Slides as PNG</Button>
          <Button variant="outline" size="sm" onClick={() => act("Carousel downloaded as PDF")}>Carousel as PDF</Button>
        </div>
      </section>
      <section className="flex flex-col gap-3 py-5" aria-labelledby="fin-sch">
        <h3 id="fin-sch" className="flex items-center gap-2 text-body font-semibold"><CalendarClock className="size-4" aria-hidden /> Schedule</h3>
        <Button variant="secondary" className="justify-between" onClick={() => act(`Scheduled for ${suggestedSlot}`)}>
          {suggestedSlot} <span className="text-caption text-muted-foreground">Suggested</span>
        </Button>
        <Button variant="ghost" size="sm" className="self-start" onClick={() => act("Opened the calendar")}>Choose date and time…</Button>
      </section>
      <section className="flex flex-col gap-3 pt-5" aria-labelledby="fin-post">
        <h3 id="fin-post" className="flex items-center gap-2 text-body font-semibold"><Send className="size-4" aria-hidden /> Post to LinkedIn now</h3>
        <p className="text-label text-muted-foreground">
          LinkedIn shows a multi-image post as separate images, not swipeable slides. For a true swipe deck, post the PDF as a document.
        </p>
        {confirm ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setConfirm(false)}>Cancel</Button>
            <Button onClick={() => { act("Posted to LinkedIn"); setConfirm(false); onPosted?.() }}>Yes, post now</Button>
          </div>
        ) : (
          <Button className="self-start" onClick={() => setConfirm(true)}>Post to LinkedIn</Button>
        )}
      </section>
    </div>
  )
}

/**
 * Direction B · Create: write on the left, see the real post on the right.
 * Settings are small chips over the preview; everything about finishing
 * lives behind one "Finish" step. Mobile becomes Write → Preview → Finish.
 */
export function CreateB() {
  const { go, container } = useFrame()
  const act = useExampleAction()
  const [stage, setStage] = React.useState<Stage>("write")
  const [finishOpen, setFinishOpen] = React.useState(false)
  const [tone, setTone] = React.useState("Candid")
  const [ratio, setRatio] = React.useState<RatioId>("4:5")
  const [reference, setReference] = React.useState(false)
  const [hook, setHook] = React.useState(hookVariations[0])
  const [body, setBody] = React.useState(initialCaption.split("\n\n").slice(1).join("\n\n"))
  const [slideIndex, setSlideIndex] = React.useState(0)
  const caption = `${hook}\n\n${body}`
  const inspector = { tone, setTone, ratio, setRatio, reference, setReference }

  const writePane = (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <label htmlFor="hook-b" className="sr-only">Hook</label>
        <textarea
          id="hook-b"
          value={hook}
          onChange={(e) => setHook(e.target.value)}
          rows={2}
          className="field-sizing-content resize-none bg-transparent text-title-sm font-semibold tracking-[-0.02em] text-balance outline-none @5xl/app:text-title"
        />
        <div className="flex flex-wrap items-center gap-2 text-label">
          <span className="text-muted-foreground">Try another hook:</span>
          {hookVariations.filter((h) => h !== hook).map((h) => (
            <button key={h} type="button" onClick={() => setHook(h)} className="rounded-full border border-border px-3 py-1 text-left hover:border-control-border hover:bg-surface-muted">
              {h}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="body-b" className="sr-only">Caption</label>
        <textarea
          id="body-b"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="field-sizing-content min-h-72 resize-none border-l-2 border-border bg-transparent pl-4 text-body-lg leading-8 outline-none focus-visible:border-brand"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <Button variant="outline" size="sm" onClick={() => act("Rewritten shorter")}>Shorter</Button>
        <Button variant="outline" size="sm" onClick={() => act("Rewritten longer")}>Longer</Button>
        <Button variant="ghost" size="sm" onClick={() => act("Caption regenerated")}>
          <RotateCcw aria-hidden /> Regenerate · {CREDIT_COSTS.text_regen} credit
        </Button>
        <span className="ml-auto text-caption text-muted-foreground tabular-nums">{caption.length} characters</span>
      </div>
    </div>
  )

  const previewPane = (
    <div className="flex flex-col gap-4">
      <Inspector {...inspector} />
      <div className="mx-auto w-full max-w-[25rem] rounded-[2rem] border border-border bg-surface-muted/60 p-3 @3xl/app:p-4">
        <PostPreview caption={caption} media="carousel" ratio={ratio} slideIndex={slideIndex} onSlideIndexChange={setSlideIndex} />
      </div>
      <div className="flex justify-center">
        <Button variant="ghost" size="sm" onClick={() => act(`Slide ${slideIndex + 1} regenerated`)}>
          <RotateCcw aria-hidden /> Regenerate slide {slideIndex + 1} of {slides.length} · {CREDIT_COSTS.slide_regen} credits
        </Button>
      </div>
    </div>
  )

  return (
    <ShellB
      active="create"
      crumb="Day two decides everything"
      hideNav
      actions={
        <>
          <Button variant="ghost" size="sm" onClick={() => go("generate")} className="hidden @3xl/app:inline-flex">
            <ArrowLeft aria-hidden /> Ideas
          </Button>
          <Button size="sm" onClick={() => ((container?.clientWidth ?? 1440) >= 768 ? setFinishOpen(true) : setStage("finish"))}>Finish</Button>
        </>
      }
    >
      <div className="border-b border-border px-4 py-3 @5xl/app:px-8">
        <StepProgress steps={flowSteps} current={stage === "write" ? 3 : stage === "preview" ? 4 : 5} label="Post progress" className="mx-auto max-w-showcase" />
      </div>

      {/* Desktop/tablet: split */}
      <div className="mx-auto hidden w-full max-w-showcase flex-1 gap-10 px-8 py-10 @3xl/app:grid @3xl/app:grid-cols-[minmax(0,1fr)_minmax(0,27rem)] @5xl/app:gap-16">
        <section aria-label="Write">{writePane}</section>
        <section aria-label="Preview" className="sticky top-20 self-start">{previewPane}</section>
      </div>

      {/* Mobile: one stage at a time */}
      <div className="flex flex-1 flex-col @3xl/app:hidden">
        <div role="tablist" aria-label="Stage" className="sticky top-14 z-(--z-sticky) grid grid-cols-3 border-b border-border bg-background">
          {(["write", "preview", "finish"] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={stage === s}
              onClick={() => setStage(s)}
              className="h-11 text-label font-medium text-muted-foreground capitalize aria-selected:text-foreground aria-selected:shadow-[inset_0_-2px_0_var(--foreground)]"
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex-1 px-4 py-6">
          {stage === "write" && writePane}
          {stage === "preview" && previewPane}
          {stage === "finish" && <FinishOptions />}
        </div>
        {stage !== "finish" && (
          <div className="sticky bottom-0 border-t border-border bg-background/95 p-3 backdrop-blur-sm">
            <Button className="w-full" onClick={() => setStage(stage === "write" ? "preview" : "finish")}>
              Next: {stage === "write" ? "Preview" : "Finish"}
            </Button>
          </div>
        )}
      </div>

      <FrameSheet open={finishOpen} onOpenChange={setFinishOpen} title="Finish your post" description="Caption + Slides · 8 slides" side="right">
        <FinishOptions onPosted={() => setFinishOpen(false)} />
      </FrameSheet>
    </ShellB>
  )
}
