"use client"

// The small pieces Share a post's form is made of: a labelled text box, a
// switch, a two-way choice, and picture uploads (one picture, or a row of them).
import { useId, useRef, useState, type ReactNode } from "react"
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { controlClasses } from "@/components/ui/input"
import { AdminInput } from "@/components/admin/ui"
import { useToast } from "@/components/admin/Toast"
import type { Picture } from "@/lib/postEmail"
import type { UploadKind } from "@/lib/postEmailUpload"
import { uploadPicture } from "./upload"

export const labelCls = "text-caption font-medium text-muted-foreground"
const areaCls = cn(controlClasses, "min-h-24 px-3 py-2 text-label leading-relaxed md:text-label")

export function Field({ label, hint, children, className }: { label: string; hint?: ReactNode; children: (id: string) => ReactNode; className?: string }) {
  const id = useId()
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={id} className={labelCls}>
        {label}
      </label>
      {children(id)}
      {hint && <p className="text-caption text-muted-foreground/80">{hint}</p>}
    </div>
  )
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  max,
  hint,
  className,
  type = "text",
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  max: number
  hint?: ReactNode
  className?: string
  type?: "text" | "url" | "date"
}) {
  return (
    <Field label={label} hint={hint} className={className}>
      {(id) => <AdminInput id={id} type={type} value={value} maxLength={max} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />}
    </Field>
  )
}

export function TextArea({
  label,
  value,
  onChange,
  placeholder,
  max,
  rows = 4,
  hint,
  count,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  max: number
  rows?: number
  hint?: ReactNode
  count?: boolean
}) {
  return (
    <Field
      label={label}
      hint={
        count || hint ? (
          <span className="flex flex-wrap justify-between gap-2">
            <span>{hint}</span>
            {count && (
              <span className="tabular-nums">
                {value.length.toLocaleString("en-US")} / {max.toLocaleString("en-US")}
              </span>
            )}
          </span>
        ) : undefined
      }
    >
      {(id) => <textarea id={id} value={value} rows={rows} maxLength={max} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={areaCls} />}
    </Field>
  )
}

export function Switch({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden
        className="mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full bg-surface-muted p-0.5 ring-1 ring-border transition-colors peer-checked:bg-brand peer-focus-visible:outline-2 peer-focus-visible:outline-brand [&>span]:transition-transform peer-checked:[&>span]:translate-x-4"
      >
        <span className="size-4 rounded-full bg-white shadow-sm" />
      </span>
      <span className="flex flex-col">
        <span className="text-label font-medium text-foreground">{label}</span>
        {hint && <span className="text-caption text-muted-foreground">{hint}</span>}
      </span>
    </label>
  )
}

export function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string; hint?: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className={labelCls}>{label}</span>
      <div role="radiogroup" aria-label={label} className="grid gap-2 sm:grid-cols-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className="flex flex-col rounded-control-sm border border-border px-3 py-2 text-left transition-colors aria-checked:border-brand aria-checked:bg-brand-soft"
          >
            <span className="text-label font-semibold text-foreground">{o.label}</span>
            {o.hint && <span className="text-caption text-muted-foreground">{o.hint}</span>}
          </button>
        ))}
      </div>
    </div>
  )
}

function Thumb({ picture, round, wide }: { picture: Picture; round?: boolean; wide?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- an uploaded picture at its own address
    <img
      src={picture.url}
      alt=""
      className={cn("block border border-border bg-surface-muted object-cover", round ? "size-16 rounded-full" : wide ? "h-16 w-48 rounded-control-sm" : "h-20 w-20 rounded-control-sm")}
    />
  )
}

function useUpload(kind: UploadKind) {
  const { toast } = useToast()
  const [busy, setBusy] = useState(0)
  async function run(files: File[], each: (p: Picture) => void) {
    setBusy((n) => n + files.length)
    for (const file of files) {
      try {
        each(await uploadPicture(file, kind))
      } catch (err) {
        toast(err instanceof Error ? err.message : "Couldn't upload that picture", "error")
      } finally {
        setBusy((n) => n - 1)
      }
    }
  }
  return { busy: busy > 0, run }
}

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/avif"

/** One picture: upload, replace, remove. */
export function PictureField({
  label,
  value,
  onChange,
  kind,
  hint,
  round,
  wide,
}: {
  label: string
  value: Picture | null
  onChange: (p: Picture | null) => void
  kind: UploadKind
  hint?: ReactNode
  round?: boolean
  wide?: boolean
}) {
  const input = useRef<HTMLInputElement>(null)
  const { busy, run } = useUpload(kind)
  return (
    <div className="flex flex-col gap-1.5">
      <span className={labelCls}>{label}</span>
      <div className="flex flex-wrap items-center gap-3">
        {value ? (
          <Thumb picture={value} round={round} wide={wide} />
        ) : (
          <span
            aria-hidden
            className={cn("flex items-center justify-center border border-dashed border-border bg-surface-muted text-muted-foreground", round ? "size-16 rounded-full" : wide ? "h-16 w-48 rounded-control-sm" : "h-20 w-20 rounded-control-sm")}
          >
            <ImagePlus className="size-5" />
          </span>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-control-sm border border-border bg-surface-muted px-3 py-1.5 text-caption font-semibold text-foreground hover:bg-surface-raised disabled:opacity-60"
          >
            {busy && <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden />}
            {busy ? "Uploading…" : value ? "Replace" : "Upload"}
            <span className="sr-only"> {label}</span>
          </button>
          {value && !busy && (
            <button type="button" onClick={() => onChange(null)} className="rounded-control-sm px-2 py-1.5 text-caption font-medium text-muted-foreground hover:text-foreground">
              Remove<span className="sr-only"> {label}</span>
            </button>
          )}
        </div>
        <input
          ref={input}
          type="file"
          accept={kind === "gif" ? "image/gif" : ACCEPT}
          aria-label={label}
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            const files = [...(e.target.files ?? [])].slice(0, 1)
            e.target.value = ""
            void run(files, (p) => onChange(p))
          }}
        />
      </div>
      {hint && <p className="text-caption text-muted-foreground/80">{hint}</p>}
    </div>
  )
}

/** Several pictures in order (photos, slides): add, move, remove. */
export function PictureList({
  label,
  value,
  onChange,
  kind,
  max,
  hint,
}: {
  label: string
  value: Picture[]
  onChange: (fn: (list: Picture[]) => Picture[]) => void
  kind: UploadKind
  max: number
  hint?: ReactNode
}) {
  const input = useRef<HTMLInputElement>(null)
  const { busy, run } = useUpload(kind)
  const move = (i: number, by: number) =>
    onChange((list) => {
      const next = [...list]
      const [item] = next.splice(i, 1)
      next.splice(i + by, 0, item)
      return next
    })
  return (
    <div className="flex flex-col gap-1.5">
      <span className={labelCls}>
        {label} ({value.length} of up to {max})
      </span>
      <ol className="flex flex-wrap gap-3">
        {value.map((p, i) => (
          <li key={`${p.url}-${i}`} className="flex flex-col items-center gap-1">
            <Thumb picture={p} />
            <span className="flex items-center gap-0.5">
              <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30" aria-label={`Move ${i + 1} earlier`}>
                <ArrowLeft className="size-3.5" />
              </button>
              <span className="text-caption tabular-nums text-muted-foreground">{i + 1}</span>
              <button type="button" disabled={i === value.length - 1} onClick={() => move(i, 1)} className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30" aria-label={`Move ${i + 1} later`}>
                <ArrowRight className="size-3.5" />
              </button>
              <button type="button" onClick={() => onChange((list) => list.filter((_, j) => j !== i))} className="rounded p-1 text-muted-foreground hover:text-danger" aria-label={`Remove ${i + 1}`}>
                <X className="size-3.5" />
              </button>
            </span>
          </li>
        ))}
        {value.length < max && (
          <li>
            <button
              type="button"
              onClick={() => input.current?.click()}
              disabled={busy}
              className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-control-sm border border-dashed border-border bg-surface-muted text-caption font-semibold text-muted-foreground hover:text-foreground disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden /> : <ImagePlus className="size-5" aria-hidden />}
              {busy ? "Uploading" : "Add"}
              <span className="sr-only"> {label}</span>
            </button>
          </li>
        )}
      </ol>
      <input
        ref={input}
        type="file"
        multiple
        accept={ACCEPT}
        aria-label={label}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const files = [...(e.target.files ?? [])].slice(0, Math.max(0, max - value.length))
          e.target.value = ""
          void run(files, (p) => onChange((list) => (list.length < max ? [...list, p] : list)))
        }}
      />
      {hint && <p className="text-caption text-muted-foreground/80">{hint}</p>}
    </div>
  )
}
