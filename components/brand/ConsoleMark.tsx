import { cn } from "@/lib/utils"

/** The admin console, drawn small: a window with its sidebar lit. */
export function ConsoleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className={cn("size-3.5 shrink-0", className)}>
      <rect x="1.25" y="2.25" width="13.5" height="11.5" rx="2.25" stroke="currentColor" strokeWidth="1.5" />
      <rect x="2" y="3" width="4" height="10" rx="1" fill="var(--brand)" />
      <path d="M8.5 6h3.5M8.5 9h2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
