// components/generate/HashtagChips.tsx
"use client"

import { Hash } from "lucide-react"

interface HashtagChipsProps {
  hashtags: string[]
  onAppend: (tag: string) => void
}

export function HashtagChips({ hashtags, onAppend }: HashtagChipsProps) {
  if (!hashtags.length) return null

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-1.5">
        <Hash size={11} className="text-[rgba(255,255,255,0.28)]" strokeWidth={2.2} />
        <p className="text-[11px] font-medium text-[rgba(255,255,255,0.28)] uppercase tracking-widest">
          Hashtags
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {hashtags.map((tag, i) => (
          <button
            key={i}
            onClick={() => onAppend(tag)}
            className="px-2.5 py-1 rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] text-[12px] font-medium text-[rgba(255,255,255,0.45)] hover:border-[rgba(124,58,237,0.4)] hover:bg-[rgba(124,58,237,0.08)] hover:text-[#C4B5FD] transition-all duration-150"
          >
            {tag}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-[rgba(255,255,255,0.18)]">
        Click to append to caption
      </p>
    </div>
  )
}
