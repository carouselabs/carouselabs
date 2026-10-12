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
  /** Links a <label htmlFor>. */
  id?: string
  /** Marks the field invalid for assistive tech. */
  invalid?: boolean
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
  id,
  invalid,
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
          id={id}
          aria-invalid={invalid || undefined}
          aria-describedby={showWarning && id ? `${id}-words` : undefined}
          className={className}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => handle(e.target.value)}
          placeholder={placeholder}
          onFocus={onFocus}
          id={id}
          aria-invalid={invalid || undefined}
          aria-describedby={showWarning && id ? `${id}-words` : undefined}
          className={className}
        />
      )}
      {showWarning && (
        <p id={id ? `${id}-words` : undefined} aria-live="polite" className="text-caption font-medium text-warning">
          {Math.max(0, remaining)} word{remaining === 1 ? "" : "s"} left
        </p>
      )}
    </div>
  )
}
