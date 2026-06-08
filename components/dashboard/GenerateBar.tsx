"use client"

import { Sparkles, Loader2 } from "lucide-react"

interface GenerateBarProps {
  value: string
  onChange: (v: string) => void
  onGenerate: () => void
  isLoading: boolean
}

export function GenerateBar({ value, onChange, onGenerate, isLoading }: GenerateBarProps) {
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !isLoading) onGenerate()
  }

  return (
    <div className="flex gap-3">
      <div className="relative flex-1">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          placeholder="What do you want to post about? (leave blank for auto)"
          className="w-full h-[44px] px-4 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-[14px] text-[rgba(255,255,255,0.82)] placeholder:text-[rgba(255,255,255,0.22)] outline-none focus:border-[rgba(124,58,237,0.5)] focus:bg-[rgba(255,255,255,0.05)] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      <button
        onClick={onGenerate}
        disabled={isLoading}
        className="flex items-center gap-2 h-[44px] px-5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] active:bg-[#5B21B6] text-white text-[13px] font-semibold transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex-shrink-0"
      >
        {isLoading ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <Sparkles size={15} strokeWidth={2.2} />
        )}
        {isLoading ? "Generating…" : "Generate"}
      </button>
    </div>
  )
}
