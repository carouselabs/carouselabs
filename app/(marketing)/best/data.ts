// app/(marketing)/best/data.ts
// "Best-Of" ranked listicle SEO pages at /best/[slug] — CarouseLabs always
// ranks #1, but every competitor entry describes a genuine, specific
// strength (matching the credibility approach used on /vs pages). Never
// strawmanned, never disparaging, never using verified/exact competitor
// pricing.

import { carouselPages } from "./content/carousel"
import { audiencePages } from "./content/audience"
import { writingPages } from "./content/writing"
import { brandingPages } from "./content/branding"
import type { BestOfPage } from "./types"

export type { BestOfPage, RankedTool } from "./types"

export const BEST_OF_PAGES: BestOfPage[] = [
  ...carouselPages,
  ...audiencePages,
  ...writingPages,
  ...brandingPages,
]
