// components/history/ProgressBadge.tsx
import type { HistoryStatus } from "@/lib/hooks/useHistory"
import { cn } from "@/lib/utils"
import { PILL } from "@/components/shared/categoryTone"

const TONES = {
  neutral: "border-border bg-surface-muted text-muted-foreground",
  caption: "border-chart-4/25 bg-chart-4/10 text-chart-4",
  image: "border-foreground/20 bg-foreground/[0.06] text-foreground",
  carousel: "border-success/25 bg-success-soft text-success",
} as const

// Intent statuses (CAPTION / IMAGE / CAROUSEL) share styling with their
// _DONE counterpart but read as "in progress".
const BADGE: Record<HistoryStatus, { label: string; tone: keyof typeof TONES }> = {
  BREAKDOWN: { label: "Viewed", tone: "neutral" },
  CAPTION: { label: "Caption…", tone: "caption" },
  CAPTION_DONE: { label: "Caption Done", tone: "caption" },
  IMAGE: { label: "Image…", tone: "image" },
  IMAGE_DONE: { label: "Image Done", tone: "image" },
  CAROUSEL: { label: "Carousel…", tone: "carousel" },
  CAROUSEL_DONE: { label: "Carousel Done", tone: "carousel" },
}

export function ProgressBadge({ status }: { status: HistoryStatus }) {
  const s = BADGE[status]
  return <span className={cn(PILL, "border", TONES[s.tone])}>{s.label}</span>
}
