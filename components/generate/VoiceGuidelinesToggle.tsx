"use client"

import { Check } from "lucide-react"

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
      className={[
        "flex items-center gap-2.5 self-start select-none",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
      ].join(" ")}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={value}
        disabled={disabled}
        onClick={() => onChange(!value)}
        className={[
          "flex items-center justify-center w-[18px] h-[18px] rounded-[5px] border transition-colors",
          value
            ? "bg-[#1A1A1A] border-[#1A1A1A] text-white"
            : "bg-[#F4F2EC] border-[#D6D3CC] hover:border-[#1A1A1A]",
        ].join(" ")}
      >
        {value && <Check size={12} strokeWidth={3} />}
      </button>
      <span className="text-[13px] font-medium text-[#4B5563]">
        Apply my voice guidelines
      </span>
    </label>
  )
}
