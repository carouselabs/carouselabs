// components/generate/ToneSelector.tsx
"use client"

import { cn } from "@/lib/utils"

export type Tone = "Analytical" | "Candid" | "Playful" | "Authoritative" | "Story-driven"

const TONES: { value: Tone; description: string }[] = [
  { value: "Analytical", description: "Data-led, logical" },
  { value: "Candid", description: "Direct, honest" },
  { value: "Playful", description: "Light, witty" },
  { value: "Authoritative", description: "Expert, confident" },
  { value: "Story-driven", description: "Narrative, emotional" },
]

interface ToneSelectorProps {
  selected: Tone | null
  onSelect: (tone: Tone) => void
  disabled?: boolean
}

export function ToneSelector({ selected, onSelect, disabled }: ToneSelectorProps) {
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-[11px] font-medium text-[rgba(255,255,255,0.28)] uppercase tracking-widest">
        Tone
      </p>
      <div className="flex flex-wrap gap-2">
        {TONES.map(({ value, description }) => (
          <button
            key={value}
            onClick={() => onSelect(value)}
            disabled={disabled}
            className={cn(
              "flex flex-col items-start px-3 py-2 rounded-xl border text-left transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed",
              selected === value
                ? "border-[rgba(124,58,237,0.55)] bg-[rgba(124,58,237,0.12)]"
                : "border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.02)] hover:border-[rgba(255,255,255,0.13)] hover:bg-[rgba(255,255,255,0.03)]",
            )}
          >
            <span
              className={cn(
                "text-[12px] font-semibold leading-none",
                selected === value ? "text-[#C4B5FD]" : "text-[rgba(255,255,255,0.6)]",
              )}
            >
              {value}
            </span>
            <span
              className={cn(
                "text-[10px] mt-1 leading-none",
                selected === value
                  ? "text-[rgba(196,181,253,0.55)]"
                  : "text-[rgba(255,255,255,0.25)]",
              )}
            >
              {description}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
