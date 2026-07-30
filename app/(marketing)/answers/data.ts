// app/(marketing)/answers/data.ts
// Direct-answer SEO pages at /answers/[slug] — targets common LinkedIn
// content-creation questions in a featured-snippet format, optimized for
// citation by AI engines (ChatGPT, Perplexity, Google AI Overviews) and
// Google's featured-snippet box, distinct from the /generators and /best
// programmatic SEO systems.

import { postingStrategyAnswers } from "./content/posting-strategy"
import { hooksWritingAnswers } from "./content/hooks-writing"
import { carouselsAnswers } from "./content/carousels"
import { algorithmEngagementAnswers } from "./content/algorithm-engagement"
import { personalBrandingAnswers } from "./content/personal-branding"
import { contentIdeasAnswers } from "./content/content-ideas"
import { captionsAnswers } from "./content/captions"
import { aiToolsAnswers } from "./content/ai-tools"
import { imagesVisualsAnswers } from "./content/images-visuals"
import { strategyGrowthAnswers } from "./content/strategy-growth"
import type { AnswerPage } from "./types"

export type { AnswerPage } from "./types"

export const ANSWER_CATEGORIES = [
  "Posting Strategy",
  "Hooks & Writing",
  "Carousels",
  "Algorithm & Engagement",
  "Personal Branding",
  "Content Ideas",
  "Captions",
  "AI & Tools",
  "Images & Visuals",
  "Strategy & Growth",
] as const

export type AnswerCategory = (typeof ANSWER_CATEGORIES)[number]

export const ANSWER_PAGES_BY_CATEGORY: Record<AnswerCategory, AnswerPage[]> = {
  "Posting Strategy": postingStrategyAnswers,
  "Hooks & Writing": hooksWritingAnswers,
  Carousels: carouselsAnswers,
  "Algorithm & Engagement": algorithmEngagementAnswers,
  "Personal Branding": personalBrandingAnswers,
  "Content Ideas": contentIdeasAnswers,
  Captions: captionsAnswers,
  "AI & Tools": aiToolsAnswers,
  "Images & Visuals": imagesVisualsAnswers,
  "Strategy & Growth": strategyGrowthAnswers,
}

export const ANSWER_PAGES: AnswerPage[] = [
  ...postingStrategyAnswers,
  ...hooksWritingAnswers,
  ...carouselsAnswers,
  ...algorithmEngagementAnswers,
  ...personalBrandingAnswers,
  ...contentIdeasAnswers,
  ...captionsAnswers,
  ...aiToolsAnswers,
  ...imagesVisualsAnswers,
  ...strategyGrowthAnswers,
]
