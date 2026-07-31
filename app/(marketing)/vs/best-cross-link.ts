// app/(marketing)/vs/best-cross-link.ts
// Competitor category -> single most-relevant /best ranking, so every
// /vs/[slug] page (regardless of which of the 5 competitor categories it
// belongs to) can link to a genuinely on-topic /best page rather than a
// generic hub link. Mirrors the pattern used in
// app/(marketing)/answers/cross-link.ts and the CATEGORY_TO_BEST_SLUG map
// in app/(marketing)/generators/[slug]/page.tsx.

import { COMPETITOR_CATEGORY_ORDER } from "./data"

type CompetitorCategory = (typeof COMPETITOR_CATEGORY_ORDER)[number]

export const VS_CATEGORY_TO_BEST_SLUG: Record<CompetitorCategory, string> = {
  linkedin: "best-linkedin-carousel-generators",
  design: "best-carousel-tools-with-brand-kit",
  "ai-writing": "best-ai-writing-tools-for-social-media",
  twitter: "best-linkedin-content-tools-2026",
  social: "best-linkedin-scheduling-and-content-tools",
}
