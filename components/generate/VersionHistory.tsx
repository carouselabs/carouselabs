"use client"

import { useState } from "react"
import { History, RotateCcw, ChevronDown } from "lucide-react"

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
        onClick={() => setOpen((o) => !o)}
        className="self-start inline-flex items-center gap-1.5 text-[12px] font-medium text-[rgba(255,255,255,0.4)] hover:text-[rgba(255,255,255,0.7)] transition-colors"
      >
        <History size={12} strokeWidth={2.2} />
        Previous versions
        <ChevronDown
          size={12}
          strokeWidth={2.2}
          className={open ? "rotate-180 transition-transform" : "transition-transform"}
        />
      </button>

      {open && (
        <div className="flex flex-col gap-2 p-2 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)]">
          {shown.map((version, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)]"
            >
              <p className="text-[12px] text-[rgba(255,255,255,0.5)] leading-[1.4] line-clamp-2">
                {toPreview(version).slice(0, 80)}
                {toPreview(version).length > 80 ? "…" : ""}
              </p>
              <button
                onClick={() => onRestore(version)}
                className="flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[rgba(124,58,237,0.1)] hover:bg-[rgba(124,58,237,0.18)] border border-[rgba(124,58,237,0.2)] text-[11px] font-medium text-[#A78BFA] transition-colors"
              >
                <RotateCcw size={11} strokeWidth={2.2} />
                Restore this version
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
