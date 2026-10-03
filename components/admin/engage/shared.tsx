"use client"

// Building blocks shared by the Engage admin pages, in the admin's dark
// palette (components/admin/ui.tsx). Text never uses the series colours;
// status colours always come with a word, never colour alone.
import { useCallback, useEffect, useState, type ReactNode } from "react"
import { AlertTriangle, Loader2, RotateCw } from "lucide-react"
import { AdminButton, fmtDate } from "@/components/admin/ui"
import type { EngageFeature } from "@/lib/engage/features"

// Series colours for the four LinkedIn features, validated as a set on the
// admin card surface (#1A1A1A): the admin's own violet, teal, amber, plus a
// magenta. Fixed by feature, never by rank. X's two features are only ever
// charted on their own, so they reuse the set's first two slots.
export const FEATURE_COLORS: Record<EngageFeature, string> = {
  comments: "#8B5CF6",
  replies: "#0D9488",
  connection_notes: "#D97706",
  messages: "#d55181",
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
    <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-[#5A2030] bg-[#2A1218] px-6 py-10 text-center">
      <AlertTriangle className="h-5 w-5 text-red-400" aria-hidden />
      <p className="max-w-md text-[13px] text-red-200">{message}</p>
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
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[#2A2A2A] px-6 py-12 text-center">
      <p className="text-[13.5px] font-semibold text-white">{title}</p>
      {body && <p className="max-w-md text-[12.5px] leading-relaxed text-[#8A8A8A]">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-md bg-[#232323] ${className}`} />
}

export function InlineSpinner() {
  return <Loader2 className="h-3.5 w-3.5 animate-spin text-[#A78BFA]" aria-label="Loading" />
}

// ── Badges ──────────────────────────────────────────────────────────────

const TONES = {
  violet: "bg-[#7C3AED]/15 text-[#C4B5FD]",
  green: "bg-emerald-500/12 text-emerald-300",
  amber: "bg-amber-500/12 text-amber-300",
  red: "bg-red-500/12 text-red-300",
  gray: "bg-[#262626] text-[#B0B0B0]",
} as const

export function Pill({ tone = "gray", children, title }: { tone?: keyof typeof TONES; children: ReactNode; title?: string }) {
  return (
    <span title={title} className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-medium ${TONES[tone]}`}>
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
}: {
  access: "paid" | "granted" | "free"
  status: "active" | "suspended" | "account_suspended"
  grantEndsAt?: string | null
  grantLifetime?: boolean
  freeUsed?: number
  freeLimit?: number
}) {
  if (status === "account_suspended") return <Pill tone="red">Account suspended</Pill>
  if (status === "suspended") return <Pill tone="red">Engage paused</Pill>
  if (access === "paid") return <Pill tone="green">Paid</Pill>
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
    <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto border-b border-[#2A2A2A]">
      {tabs.map((t) => {
        const active = t.value === value
        return (
          <button
            key={t.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-[12.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] ${
              active ? "border-[#7C3AED] text-white" : "border-transparent text-[#8A8A8A] hover:text-white"
            }`}
          >
            {t.label}
            {t.count !== undefined && <span className="ml-1.5 text-[11px] tabular-nums text-[#8A8A8A]">{t.count}</span>}
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
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap rounded-lg border border-[#2A2A2A] bg-[#141414] p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={`rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] ${
            o.value === value ? "bg-[#2A2A2A] text-white" : "text-[#8A8A8A] hover:text-white"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ── Preferences remembered in this browser ─────────────────────────────

export { useStoredState } from "@/components/admin/useStoredState"

// ── Formatting ──────────────────────────────────────────────────────────

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
