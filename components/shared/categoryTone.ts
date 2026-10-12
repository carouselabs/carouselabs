import type { RawCategory } from "@/lib/ai/parsers/ideas"

// One tint per idea category (Generate, History, Pinned), on theme tokens so
// it reads in both light and dark. Text-only form for dense rows; the pill
// form adds a soft background.
export const CATEGORY_TEXT: Record<RawCategory, string> = {
  "Latest News": "text-chart-4",
  "Trending": "text-success",
  "Industry": "text-foreground",
  "Random": "text-chart-3",
}

export const CATEGORY_PILL: Record<RawCategory, string> = {
  "Latest News": "text-chart-4 bg-chart-4/10",
  "Trending": "text-success bg-success-soft",
  "Industry": "text-foreground bg-surface-muted",
  "Random": "text-chart-3 bg-chart-3/10",
}

/** Small rounded label used for categories and statuses. */
export const PILL = "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] leading-4 font-semibold"
