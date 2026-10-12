"use client"

import { countWords, truncateToWords } from "@/lib/wordCount"

interface WordLimitedFieldProps {
  as?: "input" | "textarea"
  value: string
  onChange: (value: string) => void
  maxWords: number
  // Show the "N words left" warning only once remaining ≤ this. Tune per field
  // so small limits (e.g. 5 words) don't warn from the very first character.
  warnWithin?: number
  className?: string
  placeholder?: string
  rows?: number
  onFocus?: () => void
}

// A text input / textarea with a hard word-count limit. Typing past the limit is
// blocked (the value is truncated to `maxWords`), and a subtle amber "N words
// left" hint appears only when the user is within `warnWithin` words of the cap.
export function WordLimitedField({
  as = "input",
  value,
  onChange,
  maxWords,
  warnWithin = 10,
  className,
  placeholder,
  rows,
  onFocus,
}: WordLimitedFieldProps) {
  const remaining = maxWords - countWords(value)
  const showWarning = remaining <= warnWithin

  const handle = (next: string) => {
    onChange(countWords(next) <= maxWords ? next : truncateToWords(next, maxWords))
  }

  return (
    <div className="flex flex-col gap-1">
      {as === "textarea" ? (
        <textarea
          value={value}
          onChange={(e) => handle(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          onFocus={onFocus}
          className={className}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => handle(e.target.value)}
          placeholder={placeholder}
          onFocus={onFocus}
          className={className}
        />
      )}
      {showWarning && (
        <p className="text-[11px] text-[#D97706]">
          {Math.max(0, remaining)} word{remaining === 1 ? "" : "s"} left
        </p>
      )}
    </div>
  )
}
