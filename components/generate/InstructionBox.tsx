"use client"

import { countWords } from "@/lib/wordCount"

interface InstructionBoxProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  rows?: number
}

const DEFAULT_PLACEHOLDER =
  "Describe what you want changed or added... (e.g. 'make the background darker', 'add more energy to the illustration', 'use warmer colors')"

// Hard character cap. Typing past this is blocked (extra characters are dropped).
const MAX_CHARS = 1000

// Reusable "Custom instructions (optional)" input used across the image and
// carousel generation flows. Hard-caps at 1000 characters, shows a live word
// count (left) + character counter (right) once the user starts typing, and never
// submits on Enter — Enter inserts a newline, the user submits via the normal
// generate/regenerate button.
export function InstructionBox({
  value,
  onChange,
  placeholder = DEFAULT_PLACEHOLDER,
  disabled = false,
  rows = 3,
}: InstructionBoxProps) {
  const words = countWords(value)

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-medium text-[#ADA99F] uppercase tracking-widest">
        Custom instructions (optional)
      </label>
      <textarea
        value={value}
        // Hard block past MAX_CHARS by truncating on every change.
        onChange={(e) => onChange(e.target.value.slice(0, MAX_CHARS))}
        disabled={disabled}
        rows={rows}
        placeholder={placeholder}
        className="w-full px-3.5 py-2.5 rounded-lg border border-[#E5E3DE] bg-[#F4F2EC] text-[13px] text-[#374151] leading-[1.5] resize-none placeholder:text-[#ADA99F] focus:outline-none focus:border-[rgba(26,26,26,0.4)] transition-colors disabled:opacity-50"
      />
      {value.length > 0 && (
        <div className="flex items-center justify-between text-[11px] text-[#ADA99F] tabular-nums">
          <span>{words > 0 ? `${words} words` : ""}</span>
          <span>
            {value.length}/{MAX_CHARS}
          </span>
        </div>
      )}
    </div>
  )
}
