// lib/ai/parsers/ideas.ts
import type { IdeaCategory, IdeaMode } from "@prisma/client"

export type RawCategory = "Latest News" | "Trending" | "Industry" | "Random"

export interface ParsedIdea {
  rawCategory: RawCategory
  hook: string
  postType: string
  cta: string
  mode: IdeaMode
  category: IdeaCategory
}

const CATEGORY_ALIASES: Record<string, RawCategory> = {
  "latest news": "Latest News",
  "latest": "Latest News",
  "news": "Latest News",
  "trending": "Trending",
  "trend": "Trending",
  "industry": "Industry",
  "random": "Random",
  "random but relevant": "Random",
}

// Maps Claude's display categories to the Prisma enums stored in DB
const CATEGORY_TO_PRISMA: Record<
  RawCategory,
  { mode: IdeaMode; category: IdeaCategory }
> = {
  "Latest News": { mode: "TRENDING", category: "INDUSTRY" },
  "Trending": { mode: "TRENDING", category: "GROWTH" },
  "Industry": { mode: "EVERGREEN", category: "INDUSTRY" },
  "Random": { mode: "PERSONAL", category: "OTHER" },
}

// Parses a single line: [Category] "Hook" -> Post Type | CTA: "..."
function parseLine(line: string): ParsedIdea | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  // Match [Category] at the start
  const catMatch = trimmed.match(/^\[([^\]]+)\]\s*/)
  if (!catMatch) return null

  const rawCatKey = catMatch[1].toLowerCase().trim()
  const rawCategory = CATEGORY_ALIASES[rawCatKey]
  if (!rawCategory) return null

  const rest = trimmed.slice(catMatch[0].length)

  // Extract quoted hook
  const hookMatch = rest.match(/^"([^"]+)"/)
  const hook = hookMatch ? hookMatch[1].trim() : rest.split("->")[0].trim().replace(/^"|"$/g, "")

  // Split on -> to get the right-hand side
  const arrowIdx = rest.indexOf("->")
  const rhs = arrowIdx !== -1 ? rest.slice(arrowIdx + 2).trim() : ""

  // Split rhs on | to get post type and CTA
  const pipeParts = rhs.split("|")
  const postType = pipeParts[0]?.trim() ?? "Text Post"
  const ctaRaw = pipeParts[1]?.trim() ?? ""
  const cta = ctaRaw.replace(/^CTA:\s*/i, "").replace(/^"|"$/g, "").trim()

  const prisma = CATEGORY_TO_PRISMA[rawCategory]

  return {
    rawCategory,
    hook,
    postType,
    cta,
    mode: prisma.mode,
    category: prisma.category,
  }
}

export function parseIdeasResponse(text: string): ParsedIdea[] {
  const lines = text.split("\n")
  const ideas: ParsedIdea[] = []

  for (const line of lines) {
    const parsed = parseLine(line)
    if (parsed) ideas.push(parsed)
  }

  return ideas
}

// Reverses DB enums back to display category (used when loading pinned ideas from DB)
export function dbEnumsToRawCategory(
  mode: IdeaMode,
  category: IdeaCategory,
): RawCategory {
  if (mode === "TRENDING" && category === "INDUSTRY") return "Latest News"
  if (mode === "TRENDING" && category === "GROWTH") return "Trending"
  if (mode === "EVERGREEN" && category === "INDUSTRY") return "Industry"
  return "Random"
}
