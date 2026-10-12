"use client"

import * as React from "react"
import { ArrowLeft, Check, Download, History, ImagePlus, Lock, PanelRightClose, PanelRightOpen, RotateCcw, SlidersHorizontal } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { SwitchField } from "@/components/ui/switch"
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { CREDIT_COSTS } from "@/lib/creditActions"
import { useFrame } from "../Frame"
import { FrameSheet, PostPreview, Slide, SlideViewer, useExampleAction } from "../shared"
import { caption as initialCaption, flowSteps, formats, hookVariations, ratios, slides, suggestedSlot, tones, type RatioId } from "../story"
import { ShellA } from "./ShellA"

type View = "write" | "slides" | "preview"
const CURRENT_STEP = 4 // Design

function StepTrail({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <span className="text-caption text-muted-foreground tabular-nums">
        {flowSteps[CURRENT_STEP]} · {CURRENT_STEP + 1}/{flowSteps.length}
      </span>
    )
  }
  return (
    <ol aria-label="Progress" className="flex items-center gap-1 text-caption">
      {flowSteps.map((s, i) => (
        <li key={s} aria-current={i === CURRENT_STEP ? "step" : undefined} className="flex items-center gap-1">
          <span
            className={cn(
              "inline-flex h-7 items-center gap-1 rounded-full px-2.5",
              i < CURRENT_STEP && "text-muted-foreground",
              i === CURRENT_STEP && "bg-foreground font-medium text-background",
              i > CURRENT_STEP && "text-muted-foreground/70"
            )}
          >
            {i < CURRENT_STEP && <Check className="size-3" aria-hidden />}
            {s}
            {i < CURRENT_STEP && <span className="sr-only"> (done)</span>}
          </span>
          {i < flowSteps.length - 1 && <span aria-hidden className="h-px w-3 bg-border" />}
        </li>
      ))}
    </ol>
  )
}

function SettingsPanel({
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
  const fmt = formats.find((f) => f.id === "carousel")!
  const act = useExampleAction()
  return (
    <div className="flex flex-col divide-y divide-border">
      <section aria-labelledby="set-format" className="flex flex-col gap-2 pb-5">
        <h3 id="set-format" className="text-caption font-medium text-muted-foreground">Format</h3>
        <div className="flex items-center justify-between gap-3">
          <p className="text-label font-medium">{fmt.title}</p>
          <span className="inline-flex items-center gap-1 text-caption text-muted-foreground"><Lock className="size-3" aria-hidden /> Locked</span>
        </div>
        <p className="text-caption text-muted-foreground">Format is fixed for this session. Start a new session from History to try another.</p>
      </section>

      <div role="radiogroup" aria-labelledby="set-tone" className="flex flex-col gap-1 py-5">
        <h3 id="set-tone" className="mb-1 text-caption font-medium text-muted-foreground">Tone</h3>
        {tones.map((t) => (
          <label key={t.id} className="flex cursor-pointer items-center justify-between gap-3 rounded-control-sm px-2 py-2 hover:bg-surface-muted has-checked:bg-brand-soft/60">
            <span className="flex flex-col">
              <span className="text-label font-medium">{t.id}</span>
              <span className="text-caption text-muted-foreground">{t.hint}</span>
            </span>
            <input type="radio" name="tone-a" value={t.id} checked={tone === t.id} onChange={() => setTone(t.id)} className="size-4 accent-[var(--brand)]" />
          </label>
        ))}
        <Button variant="ghost" size="sm" className="mt-2 self-start" onClick={() => act(`Caption regenerated in a ${tone} tone`)}>
          <RotateCcw aria-hidden /> Apply to caption · {CREDIT_COSTS.text_regen} credit
        </Button>
      </div>

      <div role="radiogroup" aria-labelledby="set-ratio" className="flex flex-col gap-2 py-5">
        <h3 id="set-ratio" className="text-caption font-medium text-muted-foreground">Ratio</h3>
        <div className="grid grid-cols-2 gap-2">
          {ratios.map((r) => (
            <label key={r.id} className="flex cursor-pointer flex-col items-center gap-2 rounded-control border border-border p-3 text-center hover:border-control-border has-checked:border-brand has-checked:bg-brand-soft/50">
              <input type="radio" name="ratio-a" value={r.id} checked={ratio === r.id} onChange={() => setRatio(r.id)} className="sr-only" />
              <span aria-hidden className={cn("w-8 rounded-[3px] border border-control-border bg-surface-muted", r.id === "4:5" ? "aspect-[4/5]" : "aspect-square")} />
              <span className="text-label font-medium">{r.label}</span>
              <span className="text-caption text-muted-foreground">{r.hint}</span>
            </label>
          ))}
        </div>
      </div>

      <section aria-labelledby="set-style" className="flex flex-col gap-3 py-5">
        <h3 id="set-style" className="text-caption font-medium text-muted-foreground">Style reference · optional</h3>
        {reference ? (
          <div className="flex items-center justify-between gap-3 rounded-control border border-border p-2.5">
            <span className="flex items-center gap-2 text-label">
              <span className="size-8 rounded-[6px] bg-[linear-gradient(135deg,var(--brand-soft),var(--surface-muted))]" aria-hidden />
              reference.png
            </span>
            <Button variant="ghost" size="xs" onClick={() => setReference(false)}>Remove</Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setReference(true)}
            className="flex flex-col items-center gap-1.5 rounded-control border border-dashed border-control-border/70 px-4 py-5 text-center text-label text-muted-foreground hover:border-control-border hover:text-foreground"
          >
            <ImagePlus className="size-5" aria-hidden />
            Match the look of an image you like
          </button>
        )}
      </section>

      <div className="pt-5">
        <SwitchField defaultChecked label="Use my voice guidelines" description="Applies your saved rules to this post." />
      </div>
    </div>
  )
}

/**
 * Direction A · Create: the post occupies the middle. Settings live in a
 * collapsible side panel (a sheet on mobile); finishing actions sit in one
 * fixed bar.
 */
export function CreateA() {
  const { go } = useFrame()
  const act = useExampleAction()
  const [view, setView] = React.useState<View>("slides")
  const [panelOpen, setPanelOpen] = React.useState(true)
  const [settingsSheet, setSettingsSheet] = React.useState(false)
  const [confirmPost, setConfirmPost] = React.useState(false)
  const [tone, setTone] = React.useState("Candid")
  const [ratio, setRatio] = React.useState<RatioId>("4:5")
  const [reference, setReference] = React.useState(false)
  const [hook, setHook] = React.useState(0)
  const [text, setText] = React.useState(initialCaption)
  const [slideIndex, setSlideIndex] = React.useState(0)

  const captionWithHook = [hookVariations[hook], ...text.split("\n\n").slice(1)].join("\n\n")
  const settings = { tone, setTone, ratio, setRatio, reference, setReference }

  const toolbar = (
    <div className="flex w-full min-w-0 items-center gap-3 py-1.5">
      <Button variant="ghost" size="sm" onClick={() => go("generate")} className="-ml-2 shrink-0">
        <ArrowLeft aria-hidden /> <span className="hidden @3xl/app:inline">Ideas</span>
      </Button>
      <span className="min-w-0 truncate text-label font-medium">Day two decides everything</span>
      <span className="hidden @5xl/app:block">
        <StepTrail />
      </span>
      <span className="@5xl/app:hidden">
        <StepTrail compact />
      </span>
      <div className="ml-auto flex shrink-0 items-center gap-1">
        <Popover>
          <PopoverTrigger render={<Button variant="ghost" size="sm" className="hidden @3xl/app:inline-flex" />}>
            <History aria-hidden /> Versions
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64">
            <PopoverTitle>Versions</PopoverTitle>
            <ul className="mt-2 flex flex-col gap-1 text-label">
              {["v3 · now (current)", "v2 · 4 min ago", "v1 · 9 min ago"].map((v, i) => (
                <li key={v} className="flex items-center justify-between rounded-control-sm px-2 py-1.5 hover:bg-surface-muted">
                  {v}
                  {i > 0 && <Button variant="link" size="xs" onClick={() => act(`Restored ${v.split(" ")[0]}`)}>Restore</Button>}
                </li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>
        <Button
          variant="ghost"
          size="sm"
          aria-expanded={panelOpen}
          aria-controls="settings-panel-a"
          onClick={() => setPanelOpen((o) => !o)}
          className="hidden @5xl/app:inline-flex"
        >
          {panelOpen ? <PanelRightClose aria-hidden /> : <PanelRightOpen aria-hidden />} Settings
        </Button>
      </div>
    </div>
  )

  return (
    <ShellA active="create" subbar={toolbar}>
      <div className={cn("grid flex-1", panelOpen && "@5xl/app:grid-cols-[minmax(0,1fr)_22rem]")}>
        <div className="flex min-w-0 flex-col">
          {/* Canvas */}
          <div className="flex flex-1 flex-col items-center gap-6 px-4 py-6 @5xl/app:px-10 @5xl/app:py-10">
            <div role="tablist" aria-label="View" className="inline-flex rounded-control bg-surface-muted p-1">
              {([
                ["write", "Write"],
                ["slides", "Slides"],
                ["preview", "Post preview"],
              ] as const).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  role="tab"
                  aria-selected={view === v}
                  onClick={() => setView(v)}
                  className="h-9 rounded-control-sm px-4 text-label font-medium text-muted-foreground aria-selected:bg-surface-raised aria-selected:text-foreground aria-selected:shadow-card"
                >
                  {label}
                </button>
              ))}
            </div>

            {view === "write" && (
              <div className="flex w-full max-w-reading flex-col gap-6">
                <div className="flex flex-col gap-3">
                  <p className="text-caption font-medium text-muted-foreground">Hook</p>
                  <div role="radiogroup" aria-label="Hook" className="flex flex-col gap-2">
                    {hookVariations.map((h, i) => (
                      <button
                        key={h}
                        type="button"
                        role="radio"
                        aria-checked={hook === i}
                        onClick={() => setHook(i)}
                        className="rounded-control border border-border px-4 py-3 text-left text-body transition-colors hover:border-control-border aria-checked:border-brand aria-checked:bg-brand-soft/50 aria-checked:font-medium"
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="caption-a" className="text-caption font-medium text-muted-foreground">Caption</label>
                  <textarea
                    id="caption-a"
                    value={text.split("\n\n").slice(1).join("\n\n")}
                    onChange={(e) => setText(`${hookVariations[hook]}\n\n${e.target.value}`)}
                    className="field-sizing-content min-h-64 w-full resize-none rounded-card border border-transparent bg-surface p-5 text-body-lg leading-8 outline-none hover:border-border focus-visible:border-brand"
                  />
                  <p className="text-caption text-muted-foreground tabular-nums">{captionWithHook.length} characters · LinkedIn shows about 210 before “see more”</p>
                </div>
              </div>
            )}

            {view === "slides" && (
              <div className="flex w-full max-w-[34rem] flex-col gap-6">
                <SlideViewer ratio={ratio} index={slideIndex} onIndexChange={setSlideIndex} size="lg" className="mx-auto w-full max-w-[26rem] px-4" />
                <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="All slides">
                  {slides.map((s, i) => (
                    <button
                      key={s.title}
                      type="button"
                      aria-label={`Slide ${i + 1}`}
                      aria-current={i === slideIndex ? "true" : undefined}
                      onClick={() => setSlideIndex(i)}
                      className="w-16 shrink-0 rounded-control opacity-70 ring-offset-2 ring-offset-background transition hover:opacity-100 aria-[current=true]:opacity-100 aria-[current=true]:ring-2 aria-[current=true]:ring-brand"
                    >
                      <Slide index={i} ratio={ratio} size="sm" />
                    </button>
                  ))}
                </div>
                <div className="flex justify-center">
                  <Button variant="outline" size="sm" onClick={() => act(`Slide ${slideIndex + 1} regenerated`)}>
                    <RotateCcw aria-hidden /> Regenerate this slide · {CREDIT_COSTS.slide_regen} credits
                  </Button>
                </div>
              </div>
            )}

            {view === "preview" && (
              <PostPreview caption={captionWithHook} media="carousel" ratio={ratio} slideIndex={slideIndex} onSlideIndexChange={setSlideIndex} className="w-full max-w-[34rem]" />
            )}
          </div>

          {/* Action bar */}
          <div className="sticky bottom-0 z-(--z-sticky) border-t border-border bg-background/95 backdrop-blur-sm">
            <div className="flex items-center gap-2 px-4 py-3 @5xl/app:px-10">
              <p className="hidden text-label text-muted-foreground @3xl/app:block">
                Caption + Slides · {slides.length} slides · {ratio} · {tone}
              </p>
              <Button variant="outline" size="sm" className="@5xl/app:hidden" onClick={() => setSettingsSheet(true)}>
                <SlidersHorizontal aria-hidden /> Settings
              </Button>
              <div className="ml-auto flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="sm" aria-label="Download" />}>
                    <Download aria-hidden /> <span className="hidden @3xl/app:inline">Download</span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => act("Slides downloaded as PNG")}>Slides as PNG</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => act("Carousel downloaded as PDF")}>Carousel as PDF</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Popover>
                  <PopoverTrigger render={<Button variant="outline" size="sm" />}>Schedule</PopoverTrigger>
                  <PopoverContent side="top" align="end" className="w-72">
                    <PopoverTitle>Schedule on LinkedIn</PopoverTitle>
                    <div className="mt-3 flex flex-col gap-2">
                      <Button variant="secondary" className="justify-between" onClick={() => act(`Scheduled for ${suggestedSlot}`)}>
                        {suggestedSlot} <span className="text-caption text-muted-foreground">Suggested</span>
                      </Button>
                      <Button variant="ghost" onClick={() => act("Opened the calendar")}>Choose date and time…</Button>
                    </div>
                  </PopoverContent>
                </Popover>
                <Button size="sm" onClick={() => setConfirmPost(true)}>
                  <span className="@3xl/app:hidden">Post</span>
                  <span className="hidden @3xl/app:inline">Post to LinkedIn</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Settings panel (desktop) */}
        {panelOpen && (
          <aside id="settings-panel-a" aria-label="Post settings" className="hidden border-l border-border bg-surface @5xl/app:block">
            <div className="sticky top-[6.25rem] max-h-[calc(100svh-6.25rem)] overflow-y-auto p-6">
              <SettingsPanel {...settings} />
            </div>
          </aside>
        )}
      </div>

      <FrameSheet open={settingsSheet} onOpenChange={setSettingsSheet} title="Post settings">
        <SettingsPanel {...settings} />
      </FrameSheet>

      <FrameSheet
        open={confirmPost}
        onOpenChange={setConfirmPost}
        title="Post to LinkedIn now?"
        description="LinkedIn shows a multi-image post as separate images, not swipeable slides. For a true swipe deck, download the PDF and upload it as a document."
      >
        <div className="flex flex-col-reverse gap-2 @sm/app:flex-row @sm/app:justify-end">
          <Button variant="outline" autoFocus onClick={() => setConfirmPost(false)}>Cancel</Button>
          <Button
            onClick={() => {
              setConfirmPost(false)
              act("Posted to LinkedIn")
            }}
          >
            Post now
          </Button>
        </div>
      </FrameSheet>
    </ShellA>
  )
}
