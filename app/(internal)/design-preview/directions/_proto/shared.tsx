"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { ChevronLeft, ChevronRight, Globe2, MessageCircle, Repeat2, Send, ThumbsUp, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { useFrame } from "./Frame"
import { destinations, type DestinationId } from "./nav"
import { author, engageExample, slides, type RatioId } from "./story"

/* Sheets ──────────────────────────────────────────────────────────────── */

/**
 * A modal sheet that opens inside the prototype frame (phone frame on
 * mobile). Built on the Dialog primitive: focus trap, Escape, focus return.
 */
export function FrameSheet({
  open,
  onOpenChange,
  title,
  description,
  side = "bottom",
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  side?: "bottom" | "right" | "full"
  children: React.ReactNode
}) {
  const { container } = useFrame()
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal container={container}>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-(--z-dialog) bg-overlay duration-(--motion-panel) data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup
          className={cn(
            "fixed z-(--z-dialog) flex flex-col gap-4 overflow-y-auto border-border bg-surface-raised p-5 text-label text-foreground shadow-dialog duration-(--motion-panel) ease-entry outline-none data-open:animate-in data-closed:animate-out",
            side === "bottom" &&
              "inset-x-0 bottom-0 max-h-[82%] rounded-t-showcase border-t pb-8 data-open:slide-in-from-bottom data-closed:slide-out-to-bottom",
            side === "right" &&
              "inset-y-0 right-0 w-full max-w-sm border-l data-open:slide-in-from-right data-closed:slide-out-to-right",
            side === "full" && "inset-0 data-open:fade-in-0 data-closed:fade-out-0"
          )}
        >
          {side === "bottom" && <span aria-hidden className="mx-auto -mt-2 h-1 w-10 rounded-full bg-control-border/60" />}
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <DialogPrimitive.Title className="text-body-lg font-semibold">{title}</DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="text-label text-muted-foreground">{description}</DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close render={<Button variant="ghost" size="icon-sm" className="-mt-1 -mr-1" />}>
              <XIcon />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>
          {children}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

/* Example-only actions ─────────────────────────────────────────────── */

export function useExampleAction() {
  const toast = useToast()
  return React.useCallback(
    (what: string) =>
      toast.show({ title: what, description: "Example only — nothing was generated, posted or scheduled.", tone: "success" }),
    [toast]
  )
}

/* Slides ──────────────────────────────────────────────────────────────── */

export function Slide({
  index,
  ratio = "4:5",
  size = "md",
  className,
}: {
  index: number
  ratio?: RatioId
  size?: "sm" | "md" | "lg"
  className?: string
}) {
  const slide = slides[index]
  const first = index === 0
  if (size === "sm") {
    // Thumbnail: number and a clipped title only — anything more is unreadable.
    return (
      <div
        aria-hidden
        className={cn(
          "relative flex flex-col gap-1 overflow-hidden rounded-control-sm border p-2",
          ratio === "4:5" ? "aspect-[4/5]" : "aspect-square",
          first ? "border-transparent bg-primary text-primary-foreground" : "border-border bg-surface-raised text-foreground",
          className
        )}
      >
        <span className="text-[9px] opacity-60 tabular-nums">{index + 1}</span>
        <span className="line-clamp-4 font-display text-[11px] leading-tight">{slide.title}</span>
      </div>
    )
  }
  return (
    <div
      className={cn(
        "relative flex flex-col justify-between overflow-hidden rounded-control border",
        ratio === "4:5" ? "aspect-[4/5]" : "aspect-square",
        first ? "border-transparent bg-primary text-primary-foreground" : "border-border bg-surface-raised text-foreground",
        size === "md" ? "gap-3 p-5" : "gap-4 p-7",
        className
      )}
    >
      <div className={cn("flex items-center justify-between text-caption opacity-70")}>
        <span className="truncate">{slide.kicker}</span>
        <span className="tabular-nums">
          {index + 1}/{slides.length}
        </span>
      </div>
      <p
        className={cn(
          "font-display leading-[1.05] text-balance",
          size === "md" ? "text-title-sm" : "text-[2.5rem]"
        )}
      >
        {slide.title}
      </p>
      <div className={cn("flex items-center gap-1.5 text-caption opacity-70")}>
        <span className={cn("grid size-5 place-items-center rounded-full bg-current/15 text-[9px] font-semibold")}>
          {author.initials}
        </span>
        <span className="truncate">{author.name}</span>
      </div>
    </div>
  )
}

export function SlideViewer({
  ratio,
  index,
  onIndexChange,
  size = "md",
  className,
}: {
  ratio: RatioId
  index: number
  onIndexChange: (i: number) => void
  size?: "md" | "lg"
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="relative">
        <Slide index={index} ratio={ratio} size={size} className="shadow-popover" />
        <div className="absolute inset-y-0 -left-4 flex items-center">
          <Button variant="outline" size="icon-sm" aria-label="Previous slide" disabled={index === 0} onClick={() => onIndexChange(index - 1)} className="rounded-full shadow-card">
            <ChevronLeft />
          </Button>
        </div>
        <div className="absolute inset-y-0 -right-4 flex items-center">
          <Button variant="outline" size="icon-sm" aria-label="Next slide" disabled={index === slides.length - 1} onClick={() => onIndexChange(index + 1)} className="rounded-full shadow-card">
            <ChevronRight />
          </Button>
        </div>
      </div>
      <div className="flex justify-center gap-1.5" role="tablist" aria-label="Slides">
        {slides.map((s, i) => (
          <button
            key={s.title}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`Slide ${i + 1}: ${s.title}`}
            onClick={() => onIndexChange(i)}
            className={cn("h-1.5 rounded-full transition-all duration-(--motion-normal)", i === index ? "w-5 bg-foreground" : "w-1.5 bg-control-border/60 hover:bg-control-border")}
          />
        ))}
      </div>
    </div>
  )
}

/* LinkedIn-style post preview ─────────────────────────────────────── */

export function PostPreview({
  caption,
  media,
  ratio = "4:5",
  slideIndex = 0,
  onSlideIndexChange,
  compact = false,
  className,
}: {
  caption: string
  media: "none" | "image" | "carousel"
  ratio?: RatioId
  slideIndex?: number
  onSlideIndexChange?: (i: number) => void
  compact?: boolean
  className?: string
}) {
  const [expanded, setExpanded] = React.useState(false)
  const paragraphs = caption.split("\n\n")
  const shown = expanded || compact ? paragraphs : paragraphs.slice(0, 2)
  return (
    <article aria-label="Post preview" className={cn("overflow-hidden rounded-card border border-border bg-surface-raised", className)}>
      <header className="flex items-center gap-3 px-4 pt-4">
        <span className="grid size-10 place-items-center rounded-full bg-brand-soft text-label font-semibold text-brand">{author.initials}</span>
        <div className="min-w-0">
          <p className="truncate text-label font-semibold">{author.name}</p>
          <p className="flex items-center gap-1 truncate text-caption text-muted-foreground">
            {author.role} · now <Globe2 className="size-3" aria-hidden />
          </p>
        </div>
      </header>
      <div className="flex flex-col gap-3 px-4 py-3 text-label whitespace-pre-line">
        {shown.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
        {!expanded && !compact && paragraphs.length > 2 && (
          <button type="button" onClick={() => setExpanded(true)} className="self-start text-muted-foreground hover:text-foreground hover:underline">
            …see more
          </button>
        )}
      </div>
      {media === "carousel" && (
        <div className="border-t border-border bg-surface-muted/50 px-8 py-5">
          <SlideViewer ratio={ratio} index={slideIndex} onIndexChange={onSlideIndexChange ?? (() => undefined)} className="mx-auto w-full max-w-[17rem]" />
        </div>
      )}
      {media === "image" && (
        <div className="border-t border-border bg-surface-muted/50 p-4">
          <Slide index={0} ratio={ratio} className="mx-auto w-full max-w-[17rem]" />
        </div>
      )}
      <footer className="flex items-center justify-around border-t border-border px-2 py-1.5 text-caption text-muted-foreground" aria-hidden>
        {[
          [ThumbsUp, "Like"],
          [MessageCircle, "Comment"],
          [Repeat2, "Repost"],
          [Send, "Send"],
        ].map(([Icon, label]) => {
          const I = Icon as typeof ThumbsUp
          return (
            <span key={label as string} className="inline-flex items-center gap-1.5 px-2 py-2">
              <I className="size-4" /> <span className="hidden @sm/app:inline">{label as string}</span>
            </span>
          )
        })}
      </footer>
    </article>
  )
}

/* Engage reply demo ───────────────────────────────────────────────── */

export function EngageReplyDemo({ className, autoDraft = false }: { className?: string; autoDraft?: boolean }) {
  const [drafted, setDrafted] = React.useState(autoDraft)
  const act = useExampleAction()
  return (
    <div className={cn("flex flex-col gap-3 rounded-card border border-border bg-surface-raised p-4", className)}>
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-full bg-surface-muted text-caption font-semibold">PN</span>
        <div className="min-w-0">
          <p className="text-label font-semibold">{engageExample.postAuthor}</p>
          <p className="text-caption text-muted-foreground">{engageExample.postRole}</p>
        </div>
      </div>
      <p className="text-label">{engageExample.post}</p>
      <div className="rounded-control border border-dashed border-control-border/70 bg-surface p-3">
        {drafted ? (
          <div className="flex flex-col gap-3">
            <p className="flex items-center gap-1.5 text-caption font-medium text-brand">Engage for LinkedIn · your voice</p>
            <p className="text-label">{engageExample.draft}</p>
            <div className="flex flex-wrap gap-2">
              <Button size="xs" onClick={() => act("Inserted into the comment box")}>Insert</Button>
              <Button size="xs" variant="outline" onClick={() => act("Copied")}>Copy</Button>
              <Button size="xs" variant="ghost" onClick={() => act("Rewritten shorter")}>Shorter</Button>
            </div>
            <p className="text-caption text-muted-foreground">You choose what to insert and send.</p>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <span className="text-label text-muted-foreground">Add a comment…</span>
            <Button size="xs" variant="brand" onClick={() => setDrafted(true)}>Draft a reply</Button>
          </div>
        )}
      </div>
    </div>
  )
}

/* Destinations that keep their current page ────────────────────────── */

export function DestinationStub({ id }: { id: DestinationId }) {
  const d = destinations[id]
  return (
    <div className="mx-auto flex w-full max-w-reading flex-col gap-3 px-5 py-16 @3xl/app:py-24">
      <p className="text-label font-medium text-muted-foreground">Existing page — layout comes in its phase</p>
      <h1 className="text-title-sm font-semibold @3xl/app:text-title">{d.label}</h1>
      <p className="text-body text-muted-foreground">{d.purpose}</p>
      <code className="w-fit rounded-control-sm bg-surface-muted px-2 py-1 text-caption">{d.route}</code>
    </div>
  )
}

export function CreditPill({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-label text-muted-foreground tabular-nums", className)}>
      <span className="relative h-1.5 w-12 overflow-hidden rounded-full bg-surface-muted" aria-hidden>
        <span className="absolute inset-y-0 left-0 w-[64%] rounded-full bg-brand" />
      </span>
      642 credits
    </span>
  )
}

export function Avatar({ className }: { className?: string }) {
  return (
    <span className={cn("grid size-8 place-items-center rounded-full bg-brand-soft text-caption font-semibold text-brand", className)}>
      {author.initials}
    </span>
  )
}
