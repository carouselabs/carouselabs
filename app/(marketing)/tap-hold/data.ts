import { howToArticles } from "./content/how-to"
import { freeOnlineArticles } from "./content/free-online"
import { whatIsArticles } from "./content/what-is"
import { bestArticles } from "./content/best"
import { tutorialArticles } from "./content/tutorials"
import { examplesHelpArticles } from "./content/examples-help"
import type { TapHoldArticle, TapHoldCategory } from "./types"

export const tapHoldArticles: TapHoldArticle[] = [
  ...howToArticles,
  ...freeOnlineArticles,
  ...whatIsArticles,
  ...bestArticles,
  ...tutorialArticles,
  ...examplesHelpArticles,
]

const bySlug = new Map<string, TapHoldArticle>(tapHoldArticles.map((a) => [a.slug, a]))

export function getTapHoldArticle(slug: string): TapHoldArticle | undefined {
  return bySlug.get(slug)
}

/** Resolves an article's related_slugs into full articles, dropping any that don't exist yet. */
export function getRelatedTapHoldArticles(article: TapHoldArticle): TapHoldArticle[] {
  return article.related_slugs
    .map((slug) => bySlug.get(slug))
    .filter((a): a is TapHoldArticle => Boolean(a))
    .slice(0, 3)
}

export function getTapHoldArticlesByCategory(category: TapHoldCategory): TapHoldArticle[] {
  return tapHoldArticles.filter((a) => a.category === category)
}

/**
 * Featured articles for site-wide surfaces (footer, nav) that need a small,
 * evenly-spread sample rather than the full list of 60. First pass takes the
 * first article of every category (in TAP_HOLD_CATEGORY_ORDER); if `count`
 * hasn't been reached, later passes add each category's next article,
 * round-robin, until `count` is hit or every article has been used.
 */
export function getFeaturedTapHoldArticles(count = 9): TapHoldArticle[] {
  const featured: TapHoldArticle[] = []
  const seen = new Set<string>()

  for (let pass = 0; featured.length < count; pass++) {
    let addedThisPass = false
    for (const category of TAP_HOLD_CATEGORY_ORDER) {
      if (featured.length >= count) break
      const article = getTapHoldArticlesByCategory(category)[pass]
      if (article && !seen.has(article.slug)) {
        featured.push(article)
        seen.add(article.slug)
        addedThisPass = true
      }
    }
    if (!addedThisPass) break
  }

  return featured
}

export const TAP_HOLD_CATEGORY_ORDER: TapHoldCategory[] = [
  "how-to",
  "free-online",
  "what-is",
  "best",
  "tutorials",
  "examples-help",
]
