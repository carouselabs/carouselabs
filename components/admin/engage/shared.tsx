"use client"

// Building blocks shared by the Engage admin pages, in the admin's dark
// palette (components/admin/ui.tsx). Text never uses the series colours;
// status colours always come with a word, never colour alone.
import { useCallback, useEffect, useState, type ReactNode } from "react"
import { AlertTriangle, Download, Loader2, RotateCw } from "lucide-react"
import { AdminButton, fmtDate } from "@/components/admin/ui"
import type { EngageFeature } from "@/lib/engage/features"

// Series colours for the four LinkedIn features, validated as a set (all
// pairs: lightness, chroma, colour-blind separation, contrast) on the dark
// card surface (#201E1B): violet, teal, amber, rose — the same set as the
// admin charts (components/admin/charts.tsx). Fixed by feature, never by rank.
// X's two features are only ever charted on their own, so they reuse the
// set's first two slots.
export const FEATURE_COLORS: Record<EngageFeature, string> = {
  comments: "#8B5CF6",
  replies: "#0D9488",
  connection_notes: "#D97706",
  messages: "#E11D48",
  x_replies: "#8B5CF6",
  x_messages: "#0D9488",
}

// ── Data loading ────────────────────────────────────────────────────────

export interface ApiState<T> {
  data: T | null
  error: string | null
  loading: boolean
  reload: () => void
}

// GETs an admin API route; refetches when the url changes, and drops stale
// answers (a slow page-1 response never overwrites page 2). State changes only
// when a response arrives; "loading" is derived from whether the latest
// request has answered yet, and the previous data stays on screen meanwhile.
export function useAdminApi<T>(url: string | null): ApiState<T> {
  const [nonce, setNonce] = useState(0)
  const reload = useCallback(() => setNonce((n) => n + 1), [])
  const key = url ? `${nonce}:${url}` : null
  const [result, setResult] = useState<{ key: string; data: T | null; error: string | null } | null>(null)

  useEffect(() => {
    if (!key || !url) return
    const controller = new AbortController()
    fetch(url, { signal: controller.signal, cache: "no-store" })
      .then(async (res) => {
        const body = await res.json().catch(() => null)
        if (!res.ok) throw new Error(body?.error ?? (res.status === 403 ? "You don't have access to this." : `Request failed (${res.status})`))
        setResult({ key, data: body as T, error: null })
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        const error =
          err instanceof TypeError ? "Can't reach the server. Check your connection." : err instanceof Error ? err.message : "Something went wrong"
        setResult((prev) => ({ key, data: prev?.data ?? null, error }))
      })
    return () => controller.abort()
  }, [key, url])

  const answered = result?.key === key
  return {
    data: result?.data ?? null,
    error: answered ? (result?.error ?? null) : null,
    loading: !!key && !answered,
    reload,
  }
}

// POST/PATCH/DELETE to an admin API route; resolves to the parsed body or
// throws with the server's message.
export async function adminSend<T = unknown>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const parsed = await res.json().catch(() => null)
  if (!res.ok) throw new Error(parsed?.error ?? `Request failed (${res.status})`)
  return parsed as T
}

// ── States ──────────────────────────────────────────────────────────────

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-control border border-danger/35 bg-danger-soft px-6 py-10 text-center">
      <AlertTriangle className="h-5 w-5 text-danger" aria-hidden />
      <p className="max-w-md text-label text-danger">{message}</p>
      {onRetry && (
        <AdminButton variant="secondary" onClick={onRetry}>
          <RotateCw className="h-3.5 w-3.5" aria-hidden />
          Try again
        </AdminButton>
      )}
    </div>
  )
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-control border border-dashed border-border px-6 py-12 text-center">
      <p className="text-label font-semibold text-foreground">{title}</p>
      {body && <p className="max-w-md text-caption leading-relaxed text-muted-foreground">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-md bg-surface-muted ${className}`} />
}

export function InlineSpinner() {
  return <Loader2 className="h-3.5 w-3.5 animate-spin text-brand" aria-label="Loading" />
}

// ── Badges ──────────────────────────────────────────────────────────────

const TONES = {
  violet: "bg-brand/15 text-brand",
  green: "bg-success/12 text-success",
  amber: "bg-warning/12 text-warning",
  red: "bg-danger/12 text-danger",
  gray: "bg-surface-muted text-muted-foreground",
} as const

export function Pill({ tone = "gray", children, title }: { tone?: keyof typeof TONES; children: ReactNode; title?: string }) {
  return (
    <span title={title} className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-caption font-medium ${TONES[tone]}`}>
      {children}
    </span>
  )
}

export function AccessPill({
  access,
  status,
  grantEndsAt,
  grantLifetime,
  freeUsed,
  freeLimit,
  paidFor,
}: {
  access: "paid" | "granted" | "free"
  status: "active" | "suspended" | "account_suspended"
  grantEndsAt?: string | null
  grantLifetime?: boolean
  freeUsed?: number
  freeLimit?: number
  // Which extensions they pay for (LinkedIn and X are sold separately).
  paidFor?: ("linkedin" | "x")[]
}) {
  if (status === "account_suspended") return <Pill tone="red">Account suspended</Pill>
  if (status === "suspended") return <Pill tone="red">Engage paused</Pill>
  if (access === "paid") {
    const which = paidFor?.map((p) => (p === "x" ? "X" : "LinkedIn")).join(" + ")
    return <Pill tone="green">{which ? `Paid · ${which}` : "Paid"}</Pill>
  }
  if (access === "granted") {
    return <Pill tone="violet">{grantLifetime ? "Free access · lifetime" : `Free access · until ${fmtDate(grantEndsAt)}`}</Pill>
  }
  return (
    <Pill tone="gray">
      Free plan{freeLimit !== undefined ? ` · ${freeUsed ?? 0}/${freeLimit} used` : ""}
    </Pill>
  )
}

// ── Tabs and segmented controls ────────────────────────────────────────

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: { value: T; label: string; count?: number }[]
  value: T
  onChange: (value: T) => void
  label: string
}) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto border-b border-border">
      {tabs.map((t) => {
        const active = t.value === value
        return (
          <button
            key={t.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-caption font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
              active ? "border-brand text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            {t.count !== undefined && <span className="ml-1.5 text-caption tabular-nums text-muted-foreground">{t.count}</span>}
          </button>
        )
      })}
    </div>
  )
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap rounded-control-sm border border-border bg-background p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={`rounded-md px-2.5 py-1.5 text-caption font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
            o.value === value ? "bg-surface-raised text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// A CSV download of what the page shows (/api/admin/engage/export?type=…);
// each download is recorded in the Engage audit log.
export function CsvLink({ type, query = "" }: { type: string; query?: string }) {
  return (
    <a
      href={`/api/admin/engage/export?type=${type}${query ? `&${query}` : ""}`}
      download
      className="inline-flex items-center gap-1.5 rounded-control-sm border border-border px-3 py-2 text-caption font-medium text-foreground/90 hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      <Download className="h-3.5 w-3.5" aria-hidden />
      Download CSV
    </a>
  )
}

// ── Preferences remembered in this browser ─────────────────────────────

export { useStoredState } from "@/components/admin/useStoredState"

// ── Formatting ──────────────────────────────────────────────────────────

// AI cost: cents shown, tiny amounts as "<$0.01".
export function fmtDollars(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—"
  if (n === 0) return "$0"
  if (n < 0.01) return "<$0.01"
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function fmtNumber(n: number | null | undefined): string {
  return n === null || n === undefined ? "—" : n.toLocaleString("en-US")
}

export function fmtRelative(iso: string | Date | null | undefined): string {
  if (!iso) return "Never"
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.round(ms / 60_000)
  if (min < 1) return "Just now"
  if (min < 60) return `${min} min ago`
  const h = Math.round(min / 60)
  if (h < 24) return `${h} h ago`
  const d = Math.round(h / 24)
  if (d < 30) return `${d} d ago`
  return fmtDate(iso)
}
