// lib/captionPlatforms.ts
// Target platforms for the Caption Only flow's platform selection screen —
// each carries the tone guidance the caption prompt is tailored with, plus
// display metadata (emoji/name). Character limits are NOT duplicated here —
// they're read from lib/platforms.ts's PLATFORM_LIMITS (the single source of
// truth also used by Content Hub's validation), so the two can never drift
// apart the way this file's old hardcoded Facebook limit (5000) once did
// versus the real 63,206.
//
// TikTok and YouTube were removed — see lib/platforms.ts's Platform union.

import { PLATFORM_LIMITS, type Platform } from "@/lib/platforms"

export interface CaptionPlatform {
  id: Platform
  emoji: string
  name: string
  charLimit: number
  guidance: string
}

const CAPTION_GUIDANCE: Record<Platform, { emoji: string; name: string; guidance: string }> = {
  linkedin: {
    emoji: "💼",
    name: "LinkedIn",
    guidance: "Professional tone, up to 3,000 characters, hashtags at the end",
  },
  instagram: {
    emoji: "📸",
    name: "Instagram",
    guidance: "Casual and visual, up to 2,200 characters, hashtag-heavy (15-30 tags)",
  },
  x: {
    emoji: "𝕏",
    name: "X (Twitter)",
    guidance: "Short and punchy, 280 characters, thread-friendly for longer ideas",
  },
  facebook: {
    emoji: "📘",
    name: "Facebook",
    guidance: "Conversational tone, longer form okay, link-friendly",
  },
  threads: {
    emoji: "🧵",
    name: "Threads",
    guidance: "Casual and relaxed, up to 500 characters, Twitter-like but more personal",
  },
  pinterest: {
    emoji: "📌",
    name: "Pinterest",
    guidance: "Short and SEO-keyword-heavy, description style, searchable phrases",
  },
}

export const CAPTION_PLATFORMS: CaptionPlatform[] = (
  Object.keys(CAPTION_GUIDANCE) as Platform[]
).map((id) => ({
  id,
  ...CAPTION_GUIDANCE[id],
  charLimit: PLATFORM_LIMITS[id].maxChars,
}))
