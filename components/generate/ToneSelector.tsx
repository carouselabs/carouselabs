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
      <p className="text-[11px] font-medium text-[#ADA99F] uppercase tracking-widest">
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
                ? "border-[rgba(26,26,26,0.55)] bg-[rgba(26,26,26,0.12)]"
                : "border-[#E9E7E1] bg-[#F6F4EE] hover:border-[#E5E3DE] hover:bg-[#F4F2EC]",
            )}
          >
            <span
              className={cn(
                "text-[12px] font-semibold leading-none",
                selected === value ? "text-[#1A1A1A]" : "text-[#4B5563]",
              )}
            >
              {value}
            </span>
            <span
              className={cn(
                "text-[10px] mt-1 leading-none",
                selected === value
                  ? "text-[rgba(196,181,253,0.55)]"
                  : "text-[#ADA99F]",
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
