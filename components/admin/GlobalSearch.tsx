"use client"

// Cmd+K (Ctrl+K on Windows/Linux) global search overlay: users by email,
// plus recent audit-log actions matching the query. Arrow keys navigate,
// Enter opens the selected result, Escape closes.
import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Search, User as UserIcon, ScrollText, CornerDownLeft } from "lucide-react"
import { PlanBadge } from "@/components/admin/ui"

type UserResult = {
  type: "user"
  id: string
  email: string
  name: string | null
  plan: "FREE" | "PRO" | "GROWTH"
}

type ActionResult = {
  type: "action"
  id: string
  label: string
  targetUserId: string | null
}

type Result = UserResult | ActionResult

export function GlobalSearch() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Result[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const close = useCallback(() => {
    setOpen(false)
    setQuery("")
    setResults([])
    setActiveIndex(0)
  }, [])

  // Cmd+K / Ctrl+K toggles the overlay from anywhere in the admin panel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((o) => !o)
      } else if (e.key === "Escape" && open) {
        close()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, close])

  // The topbar's "⌘K" hint is a plain button (not a keyboard shortcut), so it
  // opens the overlay via this custom event instead of duplicating state.
  useEffect(() => {
    const onOpenEvent = () => setOpen(true)
    window.addEventListener("admin:open-search", onOpenEvent)
    return () => window.removeEventListener("admin:open-search", onOpenEvent)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0)
  }, [open])

  // Debounced fetch — users matching the query, plus recent audit actions.
  useEffect(() => {
    if (!open || !query.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([])
      return
    }
    const q = query.trim()
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const [usersRes, logsRes] = await Promise.all([
          fetch(`/api/admin/users?email=${encodeURIComponent(q)}`),
          fetch(`/api/admin/audit-logs?email=${encodeURIComponent(q)}&limit=5`),
        ])
        const users: Result[] = usersRes.ok
          ? ((await usersRes.json()).users ?? []).slice(0, 8).map(
              (u: { id: string; email: string; name: string | null; plan: "FREE" | "PRO" | "GROWTH" }) => ({
                type: "user" as const,
                id: u.id,
                email: u.email,
                name: u.name,
                plan: u.plan,
              }),
            )
          : []
        const actions: Result[] = logsRes.ok
          ? ((await logsRes.json()).logs ?? []).map(
              (l: { id: string; action: string; targetEmail: string | null; targetUserId: string | null; details: string }) => ({
                type: "action" as const,
                id: l.id,
                label: `${l.action.replaceAll("_", " ")} — ${l.targetEmail ?? l.details}`,
                targetUserId: l.targetUserId,
              }),
            )
          : []
        setResults([...users, ...actions])
        setActiveIndex(0)
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => clearTimeout(t)
  }, [query, open])

  const goTo = useCallback(
    (r: Result) => {
      if (r.type === "user") router.push(`/admin/users/${r.id}`)
      else if (r.targetUserId) router.push(`/admin/users/${r.targetUserId}`)
      else router.push("/admin/audit-logs")
      close()
    },
    [router, close],
  )

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter" && results[activeIndex]) {
      e.preventDefault()
      goTo(results[activeIndex])
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/70 pt-[15vh]"
      onClick={close}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-control border border-border bg-surface shadow-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground/80" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search users, posts…"
            className="w-full bg-transparent text-label text-foreground placeholder:text-muted-foreground/80 outline-none"
          />
          <kbd className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground/80">
            ESC
          </kbd>
        </div>

        {query.trim() && (
          <div className="max-h-80 overflow-y-auto py-1.5">
            {loading && results.length === 0 && (
              <p className="px-4 py-6 text-center text-caption text-muted-foreground/80">Searching…</p>
            )}
            {!loading && results.length === 0 && (
              <p className="px-4 py-6 text-center text-caption text-muted-foreground/80">No results</p>
            )}
            {results.length > 0 && (
              <div className="px-2 pb-1 pt-2 text-[11px] font-semibold text-muted-foreground/80">
                Users
              </div>
            )}
            {results.map((r, i) => (
              <button
                key={`${r.type}-${r.id}`}
                onClick={() => goTo(r)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-label transition-colors ${
                  i === activeIndex ? "bg-brand/15 text-foreground" : "text-foreground/90"
                }`}
              >
                {r.type === "user" ? (
                  <>
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/20 text-[11px] font-bold text-brand">
                      {(r.name ?? r.email)[0]?.toUpperCase()}
                    </div>
                    <span className="truncate">{r.email}</span>
                    <PlanBadge plan={r.plan} />
                  </>
                ) : (
                  <>
                    <ScrollText className="h-4 w-4 shrink-0 text-muted-foreground/80" />
                    <span className="truncate text-muted-foreground">{r.label}</span>
                  </>
                )}
                {i === activeIndex && <CornerDownLeft className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground/80" />}
              </button>
            ))}
          </div>
        )}

        {!query.trim() && (
          <div className="flex items-center justify-center gap-4 px-4 py-6 text-caption text-muted-foreground/80">
            <span className="flex items-center gap-1">
              <UserIcon className="h-3 w-3" /> Search users by email
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
