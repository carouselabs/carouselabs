"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { startNavigation } from "./NavigationProgress"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { CornerDownLeft, Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { allDestinations } from "./nav"

/** "Go to…" (Ctrl/⌘ K): type to jump to any page in the app. */
export function GoToPalette({
  open,
  onOpenChange,
  isIntern,
  isAdmin,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  isIntern: boolean
  isAdmin: boolean
}) {
  const router = useRouter()
  const [query, setQuery] = React.useState("")
  const [active, setActive] = React.useState(0)
  const groups = allDestinations({ isIntern, isAdmin })
  const q = query.trim().toLowerCase()
  const results = groups.flatMap((g) =>
    g.items
      // The address counts too, so "billing" also finds each extension's billing page.
      .filter((i) => !q || `${i.label} ${g.group} ${i.href}`.toLowerCase().includes(q))
      .map((i) => ({ ...i, group: g.group }))
  )

  // Every opening starts from an empty search.
  const setOpen = (next: boolean) => {
    if (!next) {
      setQuery("")
      setActive(0)
    }
    onOpenChange(next)
  }

  const go = (href: string) => {
    setOpen(false)
    startNavigation(href)
    router.push(href)
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-(--z-dialog) bg-overlay data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup className="fixed inset-x-3 top-[12vh] z-(--z-dialog) mx-auto flex max-h-[70vh] max-w-xl flex-col overflow-hidden rounded-card border border-border bg-surface-raised font-ui text-foreground shadow-dialog outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-[0.98] data-closed:animate-out data-closed:fade-out-0">
          <DialogPrimitive.Title className="sr-only">Go to…</DialogPrimitive.Title>
          <div className="flex items-center gap-3 border-b border-border px-4">
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <input
              autoFocus
              role="combobox"
              aria-expanded
              aria-controls="goto-results"
              aria-activedescendant={results[active] ? `goto-${active}` : undefined}
              aria-label="Go to…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setActive(0)
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault()
                  setActive((i) => Math.min(i + 1, results.length - 1))
                } else if (e.key === "ArrowUp") {
                  e.preventDefault()
                  setActive((i) => Math.max(i - 1, 0))
                } else if (e.key === "Enter" && results[active]) {
                  e.preventDefault()
                  go(results[active].href)
                }
              }}
              placeholder="Go to…"
              className="h-14 flex-1 bg-transparent text-body outline-none! placeholder:text-muted-foreground"
            />
          </div>
          <ul id="goto-results" role="listbox" aria-label="Pages" className="overflow-y-auto p-2">
            {results.length === 0 && <li className="px-3 py-6 text-center text-label text-muted-foreground">—</li>}
            {results.map((r, i) => (
              <li
                key={r.href}
                id={`goto-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault()
                  go(r.href)
                }}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-3 rounded-control-sm px-3 py-2.5",
                  i === active && "bg-surface-muted"
                )}
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-label font-medium">{r.label}</span>
                  <span className="text-caption text-muted-foreground">{r.group}</span>
                </span>
                {i === active && <CornerDownLeft className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />}
              </li>
            ))}
          </ul>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
