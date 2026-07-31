// app/(marketing)/formats/data.ts
// Format-type × topic SEO pages at /formats/[slug] — 6 format types × 36
// evergreen (subject-based, not profession-based) topics = 216 pages.
// Content is split by format type into content/*.ts (mirrors the /best
// pattern), each covering all 36 topics.

import { carouselIdeasPages } from "./content/carousel-ideas"
import { captionExamplesPages } from "./content/caption-examples"
import { hookExamplesPages } from "./content/hook-examples"
import { postIdeasPages } from "./content/post-ideas"
import { contentCalendarPages } from "./content/content-calendar"
import { linkedinPostExamplesPages } from "./content/linkedin-post-examples"

export type { FormatPage } from "./types"
export { FORMATS, FORMAT_LABELS, FORMAT_EMOJI, TOPICS, topicLabel } from "./types"

export const FORMAT_PAGES = [
  ...carouselIdeasPages,
  ...captionExamplesPages,
  ...hookExamplesPages,
  ...postIdeasPages,
  ...contentCalendarPages,
  ...linkedinPostExamplesPages,
]
