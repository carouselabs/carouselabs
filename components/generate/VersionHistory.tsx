"use client"

import { useState } from "react"
import { History, RotateCcw, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface VersionHistoryProps {
  versions: string[]
  onRestore: (content: string) => void
  // Optional preview transform — e.g. carousel stores JSON, so the page can
  // turn it into something readable. Defaults to the raw string.
  preview?: (content: string) => string
}

// Silent version history — a small "Previous versions" link that expands to
// show up to 2 prior versions, each restorable. Renders nothing if empty.
export function VersionHistory({ versions, onRestore, preview }: VersionHistoryProps) {
  const [open, setOpen] = useState(false)

  if (versions.length === 0) return null

  const shown = versions.slice(0, 2)
  const toPreview = preview ?? ((c: string) => c)

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 self-start rounded-detail text-label font-medium text-muted-foreground transition-colors duration-(--motion-fast) hover:text-foreground"
      >
        <History className="size-3.5" aria-hidden />
        Previous versions
        <ChevronDown
          className={cn("size-3.5 transition-transform duration-(--motion-fast)", open && "rotate-180")}
          aria-hidden
        />
      </button>

      {open && (
        <div className="flex flex-col gap-2">
          {shown.map((version, i) => (
            <div
              key={i}
              className="flex flex-col gap-2 rounded-control border border-border bg-surface p-3"
            >
              <p className="line-clamp-2 text-caption text-muted-foreground">
                {toPreview(version).slice(0, 80)}
                {toPreview(version).length > 80 ? "…" : ""}
              </p>
              <button
                type="button"
                onClick={() => onRestore(version)}
                className="inline-flex h-8 items-center gap-1.5 self-start rounded-control-sm border border-border bg-surface-raised px-2.5 text-caption font-medium text-foreground transition-colors duration-(--motion-fast) hover:bg-surface-muted"
              >
                <RotateCcw className="size-3" aria-hidden />
                Restore this version
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
