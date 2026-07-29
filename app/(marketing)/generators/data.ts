// app/(marketing)/generators/data.ts
// Generic product/feature-keyword SEO pages at /generators/[slug] — distinct
// from the niche-specific /tools/[slug] pages (which target "AI tools for
// SaaS founders" style keywords). These target the underlying product/feature
// terms themselves ("LinkedIn carousel maker", "AI caption generator") with
// no audience attached.

import { carouselPages } from "./content/carousel"
import { captionPages } from "./content/caption"
import { imagePages } from "./content/image"
import { ideasPages } from "./content/ideas"
import { freePages } from "./content/free"
import { formatPages } from "./content/format"
import type { GeneratorPage } from "./types"

export type { GeneratorPage } from "./types"

export const GENERATOR_CATEGORY_ORDER = ["Carousel", "Caption", "Image", "Ideas & Strategy", "Free", "Format"] as const
export type GeneratorCategory = (typeof GENERATOR_CATEGORY_ORDER)[number]

export const GENERATOR_PAGES_BY_CATEGORY: Record<GeneratorCategory, GeneratorPage[]> = {
  Carousel: carouselPages,
  Caption: captionPages,
  Image: imagePages,
  "Ideas & Strategy": ideasPages,
  Free: freePages,
  Format: formatPages,
}

export const GENERATOR_PAGES = [
  ...carouselPages,
  ...captionPages,
  ...imagePages,
  ...ideasPages,
  ...freePages,
  ...formatPages,
]
