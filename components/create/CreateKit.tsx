"use client"

// Building blocks shared by the idea page and the three creation flows
// (caption, image, carousel) — approved layout A: a toolbar with the step
// trail, card pickers for the setup steps, and a workspace (canvas + side
// panel + action bar) for the result. Presentation only: every flow keeps its
// own state, requests and copy.
import * as React from "react"
import Link from "next/link"
import { AlertCircle, ArrowLeft, Check, History, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { controlClasses } from "@/components/ui/input"
import { PlatformLogo } from "@/components/brand/PlatformLogo"
import { CAPTION_PLATFORMS } from "@/lib/captionPlatforms"
import { CAPTION_TEMPLATES } from "@/lib/captionTemplates"

/* Toolbar ─────────────────────────────────────────────────────────── */

const backClasses =
  "inline-flex h-9 items-center gap-1.5 rounded-control-sm px-2 -ml-2 text-label font-medium text-muted-foreground transition-colors duration-(--motion-fast) hover:bg-surface-muted hover:text-foreground"

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={backClasses}>
      <ArrowLeft className="size-4" aria-hidden />
      {children}
    </Link>
  )
}

/** In-flow back control. `arrow={false}` for labels that already carry "←". */
export function BackButton({
  onClick,
  children,
  arrow = true,
  className,
}: {
  onClick: () => void
  children: React.ReactNode
  arrow?: boolean
  className?: string
}) {
  return (
    <button type="button" onClick={onClick} className={cn(backClasses, "self-start", className)}>
      {arrow && <ArrowLeft className="size-4" aria-hidden />}
      {children}
    </button>
  )
}

/** Where you are in a flow. Display only — the flow's own buttons move you. */
export function StepTrail({ steps, current }: { steps: string[]; current: number }) {
  return (
    <>
      <ol aria-label="Progress" className="hidden items-center gap-1 text-caption xl:flex">
        {steps.map((s, i) => (
          <li key={s} aria-current={i === current ? "step" : undefined} className="flex items-center gap-1">
            <span
              className={cn(
                "inline-flex h-7 items-center gap-1 rounded-full px-2.5 whitespace-nowrap",
                i < current && "text-muted-foreground",
                i === current && "bg-foreground font-medium text-background",
                i > current && "text-muted-foreground/70"
              )}
            >
              {i < current && <Check className="size-3" aria-hidden />}
              {s}
              {i < current && <span className="sr-only"> (done)</span>}
            </span>
            {i < steps.length - 1 && <span aria-hidden className="h-px w-3 bg-border" />}
          </li>
        ))}
      </ol>
      <p className="text-caption whitespace-nowrap text-muted-foreground tabular-nums xl:hidden">
        <span className="font-medium text-foreground">{steps[current]}</span> · {current + 1}/{steps.length}
      </p>
    </>
  )
}

/**
 * Sticky bar at the top of a creation page, edge to edge inside the app's
 * scroll area (it cancels `main`'s padding). Replaces the header's sub-tabs,
 * which are hidden on these pages.
 */
export function CreateToolbar({
  back,
  label,
  title,
  steps,
  current,
  right,
}: {
  back: React.ReactNode
  /** Small lead-in before the title, e.g. "Caption for". */
  label?: React.ReactNode
  title: React.ReactNode
  steps?: string[]
  current?: number
  right?: React.ReactNode
}) {
  return (
    // Sticky offsets count main's own padding, so -top-8 keeps the bar flush
    // with the top of the scroll area (it starts there via -mt-8).
    <div className="sticky -top-8 z-(--z-sticky) -mx-6 -mt-8 mb-8 border-b border-border bg-background/95 backdrop-blur-sm md:-mx-10">
      <div className="flex min-h-14 flex-wrap items-center gap-x-4 gap-y-1 px-6 py-2 md:flex-nowrap md:px-10">
        <div className="shrink-0">{back}</div>
        <span aria-hidden className="hidden h-5 w-px shrink-0 bg-border md:block" />
        <p className="order-last line-clamp-2 w-full min-w-0 text-label md:order-none md:line-clamp-1 md:w-auto md:flex-1">
          {label && <span className="text-muted-foreground">{label} </span>}
          <span className="font-medium text-foreground">{title}</span>
        </p>
        <div className="ml-auto flex shrink-0 items-center gap-3">
          {steps && current !== undefined && <StepTrail steps={steps} current={current} />}
          {right}
        </div>
      </div>
    </div>
  )
}

/* Choice screens ──────────────────────────────────────────────────── */

export function ChoiceHeader({ title, description }: { title: React.ReactNode; description?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-title-sm font-semibold text-balance text-foreground">{title}</h1>
      {description && <p className="text-body text-muted-foreground">{description}</p>}
    </div>
  )
}

/** One option on a setup step. Picking it moves the flow on, as before. */
export function ChoiceCard({
  icon,
  art,
  aside,
  title,
  subtitle,
  steps,
  meta,
  onClick,
  disabled,
  className,
}: {
  /** A logo or mark above the title. */
  icon?: React.ReactNode
  /** A small diagram of the option, on a plate across the top. */
  art?: React.ReactNode
  /** A figure pinned to the top-right corner (read after the title). */
  aside?: React.ReactNode
  title: React.ReactNode
  subtitle?: React.ReactNode
  /** A framework's parts, drawn as a rail instead of "A → B → C". */
  steps?: readonly string[]
  meta?: React.ReactNode
  onClick: () => void
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group relative flex flex-col items-start gap-2 rounded-card border border-border bg-surface p-4 text-left transition-[border-color,background-color,box-shadow] duration-(--motion-fast) enabled:hover:border-control-border enabled:hover:bg-surface-raised enabled:hover:shadow-card disabled:cursor-not-allowed disabled:opacity-55 md:p-5",
        className
      )}
    >
      {art && (
        <span
          aria-hidden
          className="mb-2 grid h-24 w-full place-items-center rounded-control bg-surface-muted text-muted-foreground transition-colors duration-(--motion-fast) group-enabled:group-hover:bg-brand-soft group-enabled:group-hover:text-foreground"
        >
          {art}
        </span>
      )}
      {icon && <span className="mb-3 flex">{icon}</span>}
      <span className={cn("text-label font-semibold text-foreground transition-colors duration-(--motion-fast) group-enabled:group-hover:text-brand", aside && !icon && "pr-20")}>
        {title}
      </span>
      {aside && <span className="absolute top-4 right-4 md:top-5 md:right-5">{aside}</span>}
      {meta}
      {subtitle && <span className="text-caption text-muted-foreground">{subtitle}</span>}
      {steps && <StepRail steps={steps} />}
    </button>
  )
}

/** A framework's parts in order: dots on a thin rail, the first one lit. */
export function StepRail({ steps }: { steps: readonly string[] }) {
  return (
    <ol className="relative mt-1 flex flex-col gap-1.5 pl-4 before:absolute before:top-2 before:bottom-2 before:left-[3px] before:w-px before:bg-border">
      {steps.map((s, i) => (
        <li key={`${i}-${s}`} className="relative text-caption text-muted-foreground">
          <span
            aria-hidden
            className={cn(
              "absolute top-[0.45em] -left-4 size-[7px] rounded-full border",
              i === 0 ? "border-brand bg-brand" : "border-control-border bg-surface group-enabled:group-hover:bg-surface-raised"
            )}
          />
          {s}
        </li>
      ))}
    </ol>
  )
}

/** A platform's character limit as a figure, for a platform choice card. */
export function CharLimit({ value }: { value: number }) {
  return (
    <span className="flex flex-col items-end leading-none">
      <span className="font-display text-[1.75rem] leading-none text-foreground tabular-nums">{value.toLocaleString()}</span>{" "}
      <span className="mt-1 text-caption leading-none text-muted-foreground">chars</span>
    </span>
  )
}

/** The diagrams on the structure choices — what each option does, drawn. */
export function StructureArt({ kind }: { kind: "auto" | "custom" | "template" | "reference" }) {
  const line = "fill-current opacity-45"
  return (
    <svg viewBox="0 0 120 64" width="120" height="64" fill="none" aria-hidden>
      {kind === "auto" && (
        <>
          {/* loose parts, put in order */}
          <rect x="10" y="12" width="22" height="6" rx="3" className={line} transform="rotate(-9 21 15)" />
          <rect x="16" y="29" width="18" height="6" rx="3" className={line} transform="rotate(7 25 32)" />
          <rect x="8" y="45" width="24" height="6" rx="3" className={line} transform="rotate(-4 20 48)" />
          <path d="M46 32h18m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-60" />
          <rect x="76" y="8" width="36" height="48" rx="5" className="fill-surface stroke-current opacity-90" strokeWidth="1.25" />
          <rect x="83" y="17" width="22" height="6" rx="3" className="fill-brand" />
          <rect x="83" y="29" width="18" height="6" rx="3" className={line} />
          <rect x="83" y="41" width="14" height="6" rx="3" className={line} />
        </>
      )}
      {kind === "custom" && (
        <>
          <rect x="18" y="8" width="84" height="48" rx="5" className="fill-surface stroke-current opacity-90" strokeWidth="1.25" />
          <rect x="27" y="17" width="58" height="6" rx="3" className={line} />
          <rect x="27" y="29" width="46" height="6" rx="3" className={line} />
          <rect x="27" y="41" width="26" height="6" rx="3" className={line} />
          <rect x="57" y="38" width="2" height="12" rx="1" className="fill-brand" />
        </>
      )}
      {kind === "template" && (
        <>
          {[
            [26, 6],
            [62, 6],
            [26, 34],
            [62, 34],
          ].map(([x, y], i) => (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width="32"
                height="24"
                rx="4"
                className={i === 1 ? "fill-surface stroke-brand" : "fill-surface stroke-current opacity-70"}
                strokeWidth={i === 1 ? 1.75 : 1.25}
              />
              <rect x={x + 6} y={y + 7} width="16" height="4" rx="2" className={i === 1 ? "fill-brand" : line} />
              <rect x={x + 6} y={y + 14} width="11" height="4" rx="2" className={line} />
            </g>
          ))}
        </>
      )}
      {kind === "reference" && (
        <>
          {/* the picture, and the same layout taken from it */}
          <rect x="12" y="8" width="38" height="48" rx="4" className="fill-surface stroke-current opacity-90" strokeWidth="1.25" />
          <circle cx="40" cy="19" r="4" className={line} />
          <path d="m16 50 11-14 7 8 5-5 9 11z" className={line} />
          <path d="M56 32h10m-4-4 4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-60" />
          <rect x="72" y="8" width="38" height="48" rx="4" className="fill-surface stroke-current opacity-90" strokeWidth="1.25" />
          <rect x="78" y="14" width="26" height="20" rx="2.5" className="fill-brand opacity-85" />
          <rect x="78" y="40" width="22" height="4" rx="2" className={line} />
          <rect x="78" y="48" width="14" height="4" rx="2" className={line} />
        </>
      )}
    </svg>
  )
}

/** Category filter above a template grid. */
export function CategoryChips({
  categories,
  value,
  onChange,
}: {
  categories: readonly string[]
  value: string
  onChange: (category: string) => void
}) {
  return (
    <div role="group" aria-label="Categories" className="no-scrollbar -mx-6 flex gap-2 overflow-x-auto px-6 pb-1 md:mx-0 md:flex-wrap md:px-0">
      {categories.map((cat) => (
        <button
          key={cat}
          type="button"
          aria-pressed={value === cat}
          onClick={() => onChange(cat)}
          className="inline-flex h-9 shrink-0 items-center rounded-full border border-border px-3.5 text-label whitespace-nowrap text-muted-foreground transition-colors duration-(--motion-fast) hover:border-control-border hover:text-foreground aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background"
        >
          {cat}
        </button>
      ))}
    </div>
  )
}

/** A centered column for one setup step. */
export function StepColumn({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return <div className={cn("mx-auto flex w-full flex-col gap-8", wide ? "max-w-4xl" : "max-w-2xl")}>{children}</div>
}

/** Back / skip / continue row under a step. */
export function StepActions({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3 border-t border-border pt-6">{children}</div>
}

/* Status ──────────────────────────────────────────────────────────── */

export function LoadingState({ label }: { label: string }) {
  return (
    <div role="status" className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
      <Loader2 className="size-6 animate-spin text-brand motion-reduce:animate-none" aria-hidden />
      <p className="text-label text-muted-foreground">{label}</p>
    </div>
  )
}

/** Generation error with the flow's own retry. */
export function ErrorNotice({
  message,
  onRetry,
  retryDisabled,
}: {
  message: React.ReactNode
  onRetry?: () => void
  retryDisabled?: boolean
}) {
  return (
    <div className="flex flex-col items-start gap-3">
      <div
        role="alert"
        className="flex w-full items-start gap-3 rounded-control border border-danger/25 bg-danger-soft px-4 py-3 text-label text-danger"
      >
        <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span className="min-w-0">{message}</span>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} disabled={retryDisabled}>
          Try Again
        </Button>
      )}
    </div>
  )
}

/** Platform-limit messages under a caption (same validator as Content Hub). */
export function PlatformChecks({ errors, warnings }: { errors: string[]; warnings: string[] }) {
  if (errors.length === 0 && warnings.length === 0) return null
  return (
    <div className="flex flex-col gap-1">
      {errors.map((msg, i) => (
        <p key={`e${i}`} className="text-caption text-danger">
          {msg}
        </p>
      ))}
      {warnings.map((msg, i) => (
        <p key={`w${i}`} className="text-caption text-warning">
          {msg}
        </p>
      ))}
    </div>
  )
}

/* Tags ────────────────────────────────────────────────────────────── */

const tagClasses = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-caption font-medium"

export function RestoredTag() {
  return (
    <span className={cn(tagClasses, "border border-border bg-surface-muted text-foreground")}>
      <History className="size-3" aria-hidden />
      Restored from last session
    </span>
  )
}

export function PlatformTag({ platformId }: { platformId: string }) {
  const p = CAPTION_PLATFORMS.find((p) => p.id === platformId)
  return (
    <span className={cn(tagClasses, "border border-border bg-surface text-foreground")}>
      {p && <PlatformLogo platform={p.id} size={14} />}
      {p ? p.name : platformId}
    </span>
  )
}

/** The caption structure chosen in setup (absent on restored sessions). */
export function StructureTag({
  mode,
  templateId,
}: {
  mode: "auto" | "custom" | "template"
  templateId: string | null
}) {
  return (
    <span className={cn(tagClasses, "bg-brand-soft text-brand")}>
      {mode === "auto" && "Auto structure"}
      {mode === "custom" && "Custom structure"}
      {mode === "template" && (CAPTION_TEMPLATES.find((t) => t.id === templateId)?.name ?? "Template")}
    </span>
  )
}

/* Workspace ───────────────────────────────────────────────────────── */

/** Small heading for a field or panel group. */
export function FieldLabel({
  children,
  htmlFor,
  id,
  className,
}: {
  children: React.ReactNode
  htmlFor?: string
  id?: string
  className?: string
}) {
  const cls = cn("text-caption font-medium text-muted-foreground", className)
  return htmlFor ? (
    <label htmlFor={htmlFor} id={id} className={cls}>
      {children}
    </label>
  ) : (
    <p id={id} className={cls}>
      {children}
    </p>
  )
}

/** A titled group inside the side panel. */
export function PanelSection({
  title,
  children,
  className,
}: {
  title?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  const id = React.useId()
  return (
    <section aria-labelledby={title ? id : undefined} className={cn("flex flex-col gap-3", className)}>
      {title && (
        <h2 id={id} className="text-label font-semibold text-foreground">
          {title}
        </h2>
      )}
      {children}
    </section>
  )
}

/**
 * The result screen: the post on the canvas, its settings (or caption) in a
 * side panel on wide screens and below the canvas on smaller ones.
 */
export function Workspace({
  canvas,
  panel,
  panelLabel,
  panelId,
  panelOpen = true,
}: {
  canvas: React.ReactNode
  panel: React.ReactNode
  panelLabel: string
  panelId?: string
  /** Wide screens only — on phones and tablets the panel always shows below. */
  panelOpen?: boolean
}) {
  return (
    <div className={cn("grid gap-8", panelOpen && "lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_24rem]")}>
      <div className="flex min-w-0 flex-col gap-6">{canvas}</div>
      <aside
        id={panelId}
        aria-label={panelLabel}
        className={cn(
          "flex min-w-0 flex-col gap-6 border-t border-border pt-8 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10",
          !panelOpen && "lg:hidden"
        )}
      >
        {panel}
      </aside>
    </div>
  )
}

/**
 * Finishing actions. From tablet width up they float at the bottom of the
 * canvas while it scrolls; on phones they follow the content as full-width
 * buttons (primary last in the markup, first on screen) so nothing covers
 * the text being edited.
 */
export function ActionBar({ start, children }: { start?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="z-(--z-sticky) md:sticky md:bottom-0">
      <div className="flex flex-col gap-3 rounded-card border border-border bg-surface-raised/95 p-3 shadow-popover backdrop-blur-sm md:flex-row md:flex-wrap md:items-center md:px-4 md:py-2.5">
        {start && <div className="flex min-w-0 items-center gap-2">{start}</div>}
        <div className="flex flex-col-reverse gap-2 max-md:[&_a]:w-full max-md:[&_a]:justify-center max-md:[&_button]:w-full max-md:[&_button]:justify-center md:ml-auto md:flex-row md:flex-wrap md:items-start md:justify-end">
          {children}
        </div>
      </div>
    </div>
  )
}

/** Large text area for a caption (canvas or panel). */
export const captionFieldClasses = cn(controlClasses, "px-4 py-3 text-body leading-relaxed md:text-label md:leading-relaxed")

/** Image ratio option on the format step. */
export function RatioCard({
  ratio,
  selected,
  onClick,
  title,
  hint,
}: {
  ratio: "4:5" | "1:1"
  selected: boolean
  onClick: () => void
  title: React.ReactNode
  hint: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className="group flex flex-col items-center gap-5 rounded-card border border-border bg-surface p-6 text-center transition-[border-color,background-color,box-shadow] duration-(--motion-fast) hover:border-control-border aria-pressed:border-foreground aria-pressed:bg-surface-raised aria-pressed:shadow-card"
    >
      <span
        aria-hidden
        className={cn(
          "rounded-[6px] border border-control-border bg-surface-muted transition-colors duration-(--motion-fast) group-aria-pressed:border-foreground group-aria-pressed:bg-foreground/15",
          ratio === "4:5" ? "aspect-[4/5] w-10" : "aspect-square w-12"
        )}
      />
      <span className="flex flex-col gap-1">
        <span className="text-label font-semibold text-foreground">{title}</span>
        <span className="text-caption text-muted-foreground">{hint}</span>
      </span>
    </button>
  )
}

/** Placeholder lines while a caption streams in. */
export function CaptionSkeleton() {
  return (
    <div className="flex flex-col gap-2.5" aria-hidden>
      {["88%", "72%", "95%", "65%", "80%", "55%", "70%", "40%"].map((w, i) => (
        <div key={i} className="h-3.5 animate-pulse rounded-full bg-skeleton motion-reduce:animate-none" style={{ width: w }} />
      ))}
    </div>
  )
}
