// components/history/ProgressBadge.tsx
import type { HistoryStatus } from "@/lib/hooks/useHistory"

interface BadgeStyle {
  label: string
  color: string
  bg: string
  border: string
}

// Intent statuses (CAPTION / IMAGE / CAROUSEL) share styling with their
// _DONE counterpart but read as "in progress".
const BADGE: Record<HistoryStatus, BadgeStyle> = {
  BREAKDOWN: {
    label: "Viewed",
    color: "#6B7280",
    bg: "#ECEAE4",
    border: "#E5E3DE",
  },
  CAPTION: {
    label: "Caption…",
    color: "#2563EB",
    bg: "rgba(59,130,246,0.1)",
    border: "rgba(59,130,246,0.25)",
  },
  CAPTION_DONE: {
    label: "Caption Done",
    color: "#2563EB",
    bg: "rgba(59,130,246,0.1)",
    border: "rgba(59,130,246,0.25)",
  },
  IMAGE: {
    label: "Image…",
    color: "#1A1A1A",
    bg: "rgba(26,26,26,0.12)",
    border: "rgba(26,26,26,0.3)",
  },
  IMAGE_DONE: {
    label: "Image Done",
    color: "#1A1A1A",
    bg: "rgba(26,26,26,0.12)",
    border: "rgba(26,26,26,0.3)",
  },
  CAROUSEL: {
    label: "Carousel…",
    color: "#059669",
    bg: "rgba(16,185,129,0.1)",
    border: "rgba(16,185,129,0.25)",
  },
  CAROUSEL_DONE: {
    label: "Carousel Done",
    color: "#059669",
    bg: "rgba(16,185,129,0.1)",
    border: "rgba(16,185,129,0.25)",
  },
}

export function ProgressBadge({ status }: { status: HistoryStatus }) {
  const s = BADGE[status]
  return (
    <span
      className="inline-flex items-center self-start text-[10.5px] font-semibold px-2 py-0.5 rounded-full tracking-wide border"
      style={{ color: s.color, backgroundColor: s.bg, borderColor: s.border }}
    >
      {s.label}
    </span>
  )
}
