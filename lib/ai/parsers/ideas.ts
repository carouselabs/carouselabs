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

// Tier 1: strict format — [Category] "Hook" -> Post Type | CTA
function parseStrict(line: string): ParsedIdea | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  const catMatch = trimmed.match(/^\[([^\]]+)\]\s*/)
  if (!catMatch) return null

  const rawCatKey = catMatch[1].toLowerCase().trim()
  const rawCategory = CATEGORY_ALIASES[rawCatKey]
  if (!rawCategory) return null

  const rest = trimmed.slice(catMatch[0].length)

  const hookMatch = rest.match(/^"([^"]+)"/)
  const hook = hookMatch
    ? hookMatch[1].trim()
    : rest.split("->")[0].trim().replace(/^"|"$/g, "")

  if (!hook) return null

  const arrowIdx = rest.indexOf("->")
  const rhs = arrowIdx !== -1 ? rest.slice(arrowIdx + 2).trim() : ""

  const pipeParts = rhs.split("|")
  const postType = pipeParts[0]?.trim() || "Text Post"
  const ctaRaw = pipeParts[1]?.trim() ?? ""
  const cta = ctaRaw.replace(/^CTA:\s*/i, "").replace(/^"|"$/g, "").trim()

  const prisma = CATEGORY_TO_PRISMA[rawCategory]
  return { rawCategory, hook, postType, cta, mode: prisma.mode, category: prisma.category }
}

// Tier 2: loose — find a category keyword anywhere in the line and extract what we can
function parseLoose(line: string): ParsedIdea | null {
  const trimmed = line.trim()
  if (!trimmed || trimmed.length < 10) return null

  let rawCategory: RawCategory | null = null

  // Most-specific first to avoid partial matches
  const patterns: [RegExp, RawCategory][] = [
    [/\blatest\s+news\b/i, "Latest News"],
    [/\blatest\b/i, "Latest News"],
    [/\bnews\b/i, "Latest News"],
    [/\btrending\b/i, "Trending"],
    [/\btrend\b/i, "Trending"],
    [/\bindustry\b/i, "Industry"],
    [/\brandom\b/i, "Random"],
  ]

  for (const [re, cat] of patterns) {
    if (re.test(trimmed)) {
      rawCategory = cat
      break
    }
  }

  if (!rawCategory) return null

  // Prefer quoted strings, otherwise strip category label and take remainder
  let hook = ""
  const quotedMatch = trimmed.match(/"([^"]{10,})"/)
  if (quotedMatch) {
    hook = quotedMatch[1].trim()
  } else {
    hook = trimmed
      .replace(/^\d+\.\s*/, "")
      .replace(/\[.*?\]\s*/, "")
      .replace(/^(latest news|latest|news|trending|trend|industry|random)[:\s\-]*/i, "")
      .split("->")[0]
      .trim()
      .replace(/^"|"$/g, "")
  }

  if (!hook || hook.length < 5) return null

  const arrowIdx = trimmed.indexOf("->")
  const rhs = arrowIdx !== -1 ? trimmed.slice(arrowIdx + 2).trim() : ""
  const pipeParts = rhs.split("|")
  const postType = pipeParts[0]?.trim() || "Text Post"
  const ctaRaw = pipeParts[1]?.trim() ?? ""
  const cta = ctaRaw.replace(/^CTA:\s*/i, "").replace(/^"|"$/g, "").trim()

  const prisma = CATEGORY_TO_PRISMA[rawCategory]
  return { rawCategory, hook, postType, cta, mode: prisma.mode, category: prisma.category }
}

// Bare section headers Claude emits when web search is on (with or without ###).
const HEADER_ONLY = /^#*\s*(latest\s*news|trending(\s*topics?)?|industry(\s*topics?)?|random)\s*:?\s*$/i

// True ONLY for lines that are clearly web-search noise — headers, thinking
// preamble, empties, and too-short fragments. Everything else is kept so the
// strict/loose parser tiers can try to extract the idea (hooks aren't always
// quoted, so we must not require quotes or brackets here).
function isNoiseLine(line: string): boolean {
  const t = line.trim()
  if (!t) return true // empty line
  if (t.length < 15) return true // too short to be a real idea
  if (/^i'?ll search/i.test(t)) return true
  if (/^based on my web search/i.test(t)) return true
  if (/^now i'?ll generate/i.test(t)) return true
  if (/^#{1,}/.test(t)) return true // markdown headers (###, ##, #)
  if (HEADER_ONLY.test(t)) return true // bare "LATEST NEWS", "TRENDING", etc.
  return false
}

export function parseIdeasResponse(text: string): ParsedIdea[] {
  // Pre-filter: strip web-search thinking text and headers before parsing.
  const lines = text.split("\n").filter((line) => !isNoiseLine(line))
  const ideas: ParsedIdea[] = []

  // Tier 1: strict pass
  for (const line of lines) {
    const parsed = parseStrict(line)
    if (parsed) ideas.push(parsed)
  }

  if (ideas.length > 0) return ideas

  // Tier 2: loose pass
  for (const line of lines) {
    const parsed = parseLoose(line)
    if (parsed) ideas.push(parsed)
  }

  // Tier 3: log raw so we can see what Claude actually returned
  if (ideas.length === 0) {
    console.error("[ideas/parser] Both strict and loose parsing failed. Raw Claude response:\n", text)
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
