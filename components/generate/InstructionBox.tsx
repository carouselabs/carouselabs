"use client"

import { useId } from "react"
import { cn } from "@/lib/utils"
import { controlClasses } from "@/components/ui/input"
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
  const id = useId()

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-caption font-medium text-muted-foreground">
        Custom instructions (optional)
      </label>
      <textarea
        id={id}
        value={value}
        // Hard block past MAX_CHARS by truncating on every change.
        onChange={(e) => onChange(e.target.value.slice(0, MAX_CHARS))}
        disabled={disabled}
        rows={rows}
        placeholder={placeholder}
        className={cn(controlClasses, "resize-none px-3 py-2.5 leading-normal md:text-label")}
      />
      {value.length > 0 && (
        <div className="flex items-center justify-between text-caption text-muted-foreground tabular-nums">
          <span>{words > 0 ? `${words} words` : ""}</span>
          <span>
            {value.length}/{MAX_CHARS}
          </span>
        </div>
      )}
    </div>
  )
}
