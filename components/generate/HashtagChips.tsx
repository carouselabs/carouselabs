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
        <Hash size={11} className="text-[#ADA99F]" strokeWidth={2.2} />
        <p className="text-[11px] font-medium text-[#ADA99F] uppercase tracking-widest">
          Hashtags
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {hashtags.map((tag, i) => (
          <button
            key={i}
            onClick={() => onAppend(tag)}
            className="px-2.5 py-1 rounded-full border border-[#E5E3DE] bg-[#F4F2EC] text-[12px] font-medium text-[#6B7280] hover:border-[rgba(26,26,26,0.4)] hover:bg-[rgba(26,26,26,0.08)] hover:text-[#1A1A1A] transition-all duration-150"
          >
            {tag}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-[#D6D3CC]">
        Click to append to caption
      </p>
    </div>
  )
}
