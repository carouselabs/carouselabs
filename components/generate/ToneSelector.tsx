// components/generate/ToneSelector.tsx
"use client"

import { useId } from "react"

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
  const labelId = useId()
  return (
    <div className="flex flex-col gap-2.5">
      <p id={labelId} className="text-caption font-medium text-muted-foreground">
        Tone
      </p>
      <div role="group" aria-labelledby={labelId} className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
        {TONES.map(({ value, description }) => (
          <button
            key={value}
            type="button"
            onClick={() => onSelect(value)}
            disabled={disabled}
            aria-pressed={selected === value}
            className="flex flex-col items-start gap-0.5 rounded-control border border-border bg-surface px-3 py-2 text-left transition-colors duration-(--motion-fast) enabled:hover:border-control-border disabled:cursor-not-allowed disabled:opacity-45 aria-pressed:border-foreground aria-pressed:bg-surface-muted"
          >
            <span className="text-label font-semibold text-foreground">{value}</span>
            <span className="text-caption text-muted-foreground">{description}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
