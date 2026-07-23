// lib/captionPlatforms.ts
// Target platforms for the Caption Only flow's platform selection screen —
// each carries the character limit and tone guidance the caption prompt will
// be tailored with.

export interface CaptionPlatform {
  id: string
  emoji: string
  name: string
  charLimit: number
  guidance: string
}

export const CAPTION_PLATFORMS: CaptionPlatform[] = [
  {
    id: "linkedin",
    emoji: "💼",
    name: "LinkedIn",
    charLimit: 3000,
    guidance: "Professional tone, up to 3,000 characters, hashtags at the end",
  },
  {
    id: "instagram",
    emoji: "📸",
    name: "Instagram",
    charLimit: 2200,
    guidance: "Casual and visual, up to 2,200 characters, hashtag-heavy (15-30 tags)",
  },
  {
    id: "x",
    emoji: "𝕏",
    name: "X (Twitter)",
    charLimit: 280,
    guidance: "Short and punchy, 280 characters, thread-friendly for longer ideas",
  },
  {
    id: "facebook",
    emoji: "📘",
    name: "Facebook",
    charLimit: 5000,
    guidance: "Conversational tone, longer form okay, link-friendly",
  },
  {
    id: "threads",
    emoji: "🧵",
    name: "Threads",
    charLimit: 500,
    guidance: "Casual and relaxed, up to 500 characters, Twitter-like but more personal",
  },
  {
    id: "tiktok",
    emoji: "🎵",
    name: "TikTok",
    charLimit: 2200,
    guidance: "Very casual, short and trend-aware, emoji-heavy, hook in first line",
  },
  {
    id: "youtube",
    emoji: "▶️",
    name: "YouTube",
    charLimit: 5000,
    guidance: "Video description style, includes timestamps and keywords for SEO",
  },
  {
    id: "pinterest",
    emoji: "📌",
    name: "Pinterest",
    charLimit: 500,
    guidance: "Short and SEO-keyword-heavy, description style, searchable phrases",
  },
]
