"use client"

import * as React from "react"
import { ArrowUp } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

/**
 * The Generate composer: one topic field, suggestion chips, one action.
 * Stays in place while results load so the page never jumps.
 */
function TopicComposer({
  value,
  onValueChange,
  onSubmit,
  suggestions = [],
  pending = false,
  placeholder = "What do you want to post about?",
  hint = "Leave it blank and we'll generate ideas for you.",
  className,
}: {
  value: string
  onValueChange: (value: string) => void
  onSubmit: () => void
  suggestions?: string[]
  pending?: boolean
  placeholder?: string
  hint?: string
  className?: string
}) {
  const id = React.useId()
  return (
    <form
      className={cn("flex flex-col gap-3", className)}
      onSubmit={(event) => {
        event.preventDefault()
        if (!pending) onSubmit()
      }}
    >
      <div className="flex items-end gap-2 rounded-card border border-control-border bg-surface p-2 pl-4 shadow-card transition-colors focus-within:border-brand">
        <label htmlFor={id} className="sr-only">
          Topic
        </label>
        <textarea
          id={id}
          rows={1}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault()
              if (!pending) onSubmit()
            }
          }}
          placeholder={placeholder}
          aria-describedby={`${id}-hint`}
          className="field-sizing-content max-h-40 min-h-11 flex-1 resize-none bg-transparent py-2.5 text-body text-foreground outline-none placeholder:text-muted-foreground"
        />
        <Button type="submit" size="default" pending={pending} pendingLabel="Generating ideas">
          Generate
          <ArrowUp aria-hidden />
        </Button>
      </div>
      <p id={`${id}-hint`} className="px-1 text-caption text-muted-foreground">
        {hint}
      </p>
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2" aria-label="Suggestions">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => onValueChange(suggestion)}
              className="min-h-9 rounded-full border border-border bg-surface px-3.5 py-1.5 text-label text-foreground transition-colors duration-(--motion-fast) hover:border-control-border hover:bg-surface-muted"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </form>
  )
}

export { TopicComposer }
