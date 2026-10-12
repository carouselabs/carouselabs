"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface VoiceGuidelinesToggleProps {
  hasGuidelines: boolean
  value: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
}

// Optional "Apply my voice guidelines" checkbox shown above caption generation.
// Fully prop-driven: the parent (server page) already knows whether the user has
// saved voice guidelines, so the toggle renders instantly with no client fetch.
// Renders nothing when the user has no saved guidelines.
export function VoiceGuidelinesToggle({
  hasGuidelines,
  value,
  onChange,
  disabled,
}: VoiceGuidelinesToggleProps) {
  if (!hasGuidelines) return null

  return (
    <label
      className={cn(
        "flex items-center gap-2.5 self-start select-none",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
      )}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={value}
        disabled={disabled}
        onClick={() => onChange(!value)}
        className={cn(
          "relative flex size-5 shrink-0 items-center justify-center rounded-detail border transition-colors duration-(--motion-fast) after:absolute after:-inset-3 after:content-['']",
          value
            ? "border-primary bg-primary text-primary-foreground"
            : "border-control-border bg-surface hover:border-foreground"
        )}
      >
        {value && <Check className="size-3.5" strokeWidth={3} aria-hidden />}
      </button>
      <span className="text-label font-medium text-foreground">Apply my voice guidelines</span>
    </label>
  )
}
