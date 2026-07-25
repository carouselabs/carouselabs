/**
 * Shared types for the /tap-hold/[slug] programmatic SEO system.
 *
 * Every article targets exactly one keyword from the approved keyword
 * database and must teach the reader to solve their problem using ONLY the
 * CarouseLabs Tap & Hold Image Maker (/tools/tap-hold-maker). No competitor
 * or alternative tool (Canva, Photoshop, Figma, etc.) may ever be named.
 */

export type TapHoldCategory =
  | "how-to"
  | "free-online"
  | "what-is"
  | "best"
  | "tutorials"
  | "examples-help"

export const TAP_HOLD_CATEGORY_LABELS: Record<TapHoldCategory, string> = {
  "how-to": "How To",
  "free-online": "Free & Online",
  "what-is": "What Is",
  best: "Best Tools",
  tutorials: "Tutorials",
  "examples-help": "Examples & Help",
}

export const TAP_HOLD_CATEGORY_DESCRIPTIONS: Record<TapHoldCategory, string> = {
  "how-to": "Step-by-step instructions for creating tap and hold images.",
  "free-online": "Free, no-login, browser-based ways to make tap and hold images.",
  "what-is": "Plain-English explanations of the tap and hold trend and how it works.",
  best: "What to look for in a tap and hold image maker, and why CarouseLabs delivers it.",
  tutorials: "Full tutorials for creating tap and hold images, from beginner to advanced.",
  "examples-help": "Examples, ideas, troubleshooting, and answers to common questions.",
}

export interface TapHoldFAQ {
  question: string
  answer: string
}

export interface TapHoldMistake {
  mistake: string
  fix: string
}

export interface TapHoldTip {
  tip: string
  detail: string
}

export interface TapHoldExample {
  title: string
  description: string
}

export interface TapHoldTutorialStep {
  title: string
  description: string
}

/**
 * One full SEO article. `tutorial_steps` must contain exactly 6 steps
 * matching the required "How to Create This with CarouseLabs" workflow:
 * open the maker, upload, brush, preview, download, share on X — each
 * rewritten in the voice of this article's specific keyword/intent.
 */
export interface TapHoldArticle {
  slug: string
  keyword: string
  category: TapHoldCategory
  seo_title: string
  seo_description: string
  h1: string
  hero_badge: string
  hero_subtitle: string
  read_time: string
  intro: string[]
  what_it_means: string[]
  why_popular: string[]
  tutorial_intro: string
  tutorial_steps: TapHoldTutorialStep[]
  tips: TapHoldTip[]
  mistakes: TapHoldMistake[]
  examples: TapHoldExample[]
  faqs: TapHoldFAQ[]
  conclusion: string[]
  related_slugs: string[]
}
